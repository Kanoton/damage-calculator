#!/usr/bin/env python3
"""Research only: project the three manually confirmed 04 A/B/C stump centers.

Never assigns an automatically verified MAP0105 slot. A confirmed slot set in
another image does not prove pixel-to-slot correspondence. Invalid camera
continuity, out-of-view anchors and other slot groups must ABSTAIN. User images,
private pixel centers and camera frames are never included in this repository.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
LABELS = HERE.parent / 'docs/research/autumn-map0105-13-screen-slot-confirmations.json'
VIEW = (512, 288)


def _camera_module():
    spec = importlib.util.spec_from_file_location(
        'autumn_anchor_camera', HERE / 'review-autumn-camera-transition.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def evaluate(anchors, target_number, camera_result, reference):
    """Return unverified pixel hypotheses, never a confirmed building state."""
    base = {'status': 'abstain', 'reason': 'not-reviewed',
            'slot_ids_verified_automatically': False,
            'plant_type': 'unknown', 'occupancy': 'unknown',
            'production_application': 'forbidden', 'projections': []}
    if not isinstance(reference, dict) or reference.get('map_id') != 'MAP0105':
        raise ValueError('MAP0105 reference required')
    scenes = reference.get('screenshots')
    if not isinstance(scenes, list):
        raise ValueError('Missing screenshot list')
    by_number = {row['image_number']: row for row in scenes}
    if len(by_number) != len(scenes) or target_number not in by_number:
        raise ValueError('Target image must be in user-confirmed reference')
    source = by_number.get('04')
    if not isinstance(source, dict) or source.get('marker_to_slot') != {
            'A': 'O17', 'B': 'O16', 'C': 'O15'}:
        raise ValueError('Reference image 04 markers are not confirmed')
    if not isinstance(anchors, dict) or set(anchors) != {'A', 'B', 'C'}:
        raise ValueError('Expected three manually reviewed A/B/C anchors')
    for marker in ('A', 'B', 'C'):
        row = anchors[marker]
        if (not isinstance(row, dict) or row.get('human_verified') is not True or
                row.get('slot_id') != source['marker_to_slot'][marker]):
            raise ValueError('Anchor slot must match manually reviewed 04 marker')
        x, y = row.get('x'), row.get('y')
        if (isinstance(x, bool) or isinstance(y, bool) or
                not isinstance(x, (int, float)) or
                not isinstance(y, (int, float)) or
                not all(math.isfinite(v) for v in (x, y)) or
                not (0 <= x < VIEW[0] and 0 <= y < VIEW[1])):
            raise ValueError('Anchor pixels must be finite 512x288 coordinates')
    if target_number == '04':
        return {**base, 'reason': 'source-is-target-not-independent'}
    target_set = set(by_number[target_number]['listed_slot_ids'])
    source_set = set(source['marker_to_slot'].values())
    if target_set != source_set:
        return {**base, 'reason': 'different-or-incomplete-slot-group'}
    if (not isinstance(camera_result, dict) or
            camera_result.get('status') != 'same-view-candidate'):
        return {**base, 'reason': 'camera-continuity-not-verified'}
    try:
        m = np.asarray(camera_result['affine_2x3'], dtype=float)
    except (KeyError, ValueError, TypeError):
        return {**base, 'reason': 'invalid-camera-matrix'}
    if m.shape != (2, 3) or not np.isfinite(m).all():
        return {**base, 'reason': 'invalid-camera-matrix'}
    left = m[:, :2]
    similarity = left.T @ left
    scale = float(np.sqrt(np.linalg.det(left))) if np.linalg.det(left) > 0 else 0
    if (not .85 <= scale <= 1.15 or
            np.max(np.abs(similarity - np.eye(2) * scale**2)) > .04):
        return {**base, 'reason': 'unsafe-camera-scale-or-skew'}
    source_points = np.asarray([[anchors[k]['x'], anchors[k]['y']]
                                for k in ('A', 'B', 'C')])
    projected = source_points @ left.T + m[:, 2]
    # Stay in the portion of the frame where board continuity was tested,
    # rather than claiming a slot outside the observed board.
    if not all(90 <= x < 490 and 30 <= y < 224 for x, y in projected):
        return {**base, 'reason': 'projection-outside-reviewed-board'}
    if any(np.linalg.norm(projected[i]-projected[j]) < 20
           for i in range(3) for j in range(i+1, 3)):
        return {**base, 'reason': 'overlapping-projected-stumps'}
    return {**base, 'status': 'hypotheses-for-human-review-only',
            'reason': 'camera-and-group-compatible-not-pixel-verified',
            'projections': [
                {'marker': marker, 'slot_id_hypothesis': anchors[marker]['slot_id'],
                 'x': round(float(projected[i][0]), 1),
                 'y': round(float(projected[i][1]), 1),
                 'target_pixel_verified': False}
                for i, marker in enumerate(('A', 'B', 'C'))]}



def cross_check_candidates(projection_result, detected_centers, radius=15,
                           separation=5):
    """Audit projected stumps against independently detected *anonymous* centers.

    Any ambiguity or missing detection abstains for the entire triplet.
    These are candidate positions, not identity verification: a tile or water
    pot can be falsely detected and planted stumps are often absent.
    """
    base = {'status': 'abstain', 'reason': 'unverified-projections',
            'matches': [], 'slot_ids_verified_automatically': False,
            'production_application': 'forbidden'}
    if (not isinstance(radius, (int, float)) or isinstance(radius, bool) or
            not math.isfinite(radius) or radius <= 0 or
            not isinstance(separation, (int, float)) or isinstance(separation, bool) or
            not math.isfinite(separation) or separation < 0):
        raise ValueError('Invalid matching gates')
    if not isinstance(detected_centers, list):
        raise ValueError('Expected anonymous target centers')
    points = []
    for center in detected_centers:
        if not isinstance(center, dict):
            raise ValueError('Invalid target center')
        x, y = center.get('x'), center.get('y')
        if (isinstance(x, bool) or isinstance(y, bool) or
                not isinstance(x, (int, float)) or
                not isinstance(y, (int, float)) or
                not all(math.isfinite(v) for v in (x, y)) or
                not (0 <= x < VIEW[0] and 0 <= y < VIEW[1])):
            raise ValueError('Invalid target center coordinates')
        points.append(np.asarray([x, y], dtype=float))
    if (not isinstance(projection_result, dict) or
            projection_result.get('status') != 'hypotheses-for-human-review-only'):
        return base
    projections = projection_result.get('projections')
    if not isinstance(projections, list) or len(projections) != 3:
        return base
    assignments = []
    for row in projections:
        target = np.asarray([row['x'], row['y']], dtype=float)
        distances = sorted((float(np.linalg.norm(target-p)), j)
                           for j, p in enumerate(points))
        if not distances or distances[0][0] > radius:
            return {**base, 'reason': 'missing-independent-stump-candidate'}
        if len(distances) > 1 and distances[1][0]-distances[0][0] < separation:
            return {**base, 'reason': 'ambiguous-nearby-stump-candidates'}
        assignments.append((row['marker'], row['slot_id_hypothesis'],
                            distances[0][1], round(distances[0][0], 2)))
    if len({item[2] for item in assignments}) < 3:
        return {**base, 'reason': 'conflicting-stump-candidate-assignment'}
    return {**base, 'status': 'anonymous-candidate-cross-check-only',
            'reason': 'three-unique-candidates-not-verified-slot-ids',
            'matches': [
                {'marker': marker, 'slot_id_hypothesis': slot,
                 'candidate_index': index, 'distance_px': dist,
                 'target_pixel_verified': False}
                for marker, slot, index, dist in assignments]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--target', type=Path, required=True)
    p.add_argument('--target-image-number', required=True)
    p.add_argument('--private-anchors', type=Path, required=True,
                   help='Private JSON with A/B/C x,y,slot_id,human_verified')
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    one = cv2.imread(str(args.source))
    two = cv2.imread(str(args.target))
    if one is None or two is None or one.shape != (288, 512, 3) or two.shape != one.shape:
        raise ValueError('Inputs must be decoded 512x288 BGR frames')
    result = evaluate(json.loads(args.private_anchors.read_text(encoding='utf-8')),
                      args.target_image_number, _camera_module().continuity(one, two),
                      json.loads(LABELS.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n',
                           encoding='utf-8')
    print(json.dumps({'status': result['status'], 'reason': result['reason'],
                      'hypotheses': len(result['projections'])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
