#!/usr/bin/env python3
"""Exploratory brown-base proposals, independent of visible cyan pot water.

This intentionally has high false-positive risk on autumn terrain. It must
remain a separate diagnostic channel, not merged into confirmed pot positions.
"""
import argparse
import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np

SIZE = (512, 288)


def propose(frame):
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    brown = cv2.inRange(hsv, (5, 35, 65), (30, 220, 255))
    n, _, stats, centers = cv2.connectedComponentsWithStats(brown)
    candidates = []
    for i in range(1, n):
        x, y, w, h, area = map(int, stats[i])
        cx, cy = map(float, centers[i])
        if not (90 <= cx <= 470 and 50 <= cy <= 230 and
                20 <= w <= 75 and 13 <= h <= 65 and
                150 <= area <= 1500 and .3 <= w/h <= 3.2):
            continue
        candidates.append({
            'x': round(cx, 1), 'y': round(cy, 1),
            'area': area, 'width': w, 'height': h,
            'status': 'brown-base-shape-candidate-unverified'
        })
    return sorted(candidates, key=lambda v: (v['y'], v['x']))


def exclude_tile_overlaps(base_candidates, tile_centers, radius=24):
    """Separate nearby colored tile bodies; retain raw proposals for review.

    Exclusion is diagnostic triage, not proof of false detection:
    genuine stump pixels can be near a colored tile in perspective.
    """
    if radius <= 0:
        raise ValueError('radius must be positive')
    filtered, overlaps = [], []
    for candidate in base_candidates:
        if any((candidate['x']-tile['x'])**2
               + (candidate['y']-tile['y'])**2 < radius**2
               for tile in tile_centers):
            overlaps.append(candidate)
        else:
            filtered.append(candidate)
    return filtered, overlaps


def compare(frame, water_proposals, tile_centers=None):
    """Show independent base detections alongside water-derived anchors.

    No spatial overlap is asserted as a match: water center is above the base.
    """
    bases = propose(frame)
    kept, overlaps = exclude_tile_overlaps(bases, tile_centers or [])
    return {'brown_base_candidates': bases,
            'non_tile_overlap_candidates': kept,
            'tile_overlap_candidates': overlaps,
            'water_anchor_count': len(water_proposals),
            'base_candidate_count': len(bases),
            'non_tile_overlap_count': len(kept),
            'tile_overlap_count': len(overlaps),
            'planted_stumps_verified': False,
            'slot_ids_verified': False,
            'production_application': 'forbidden',
            'warning': ('Brown terrain, rocks, and tree trunks can match this '
                        'mask. Candidate count is not stump recall or precision.')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    frame = cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Cannot decode image')
    if frame.shape[:2] != (288, 512):
        frame = cv2.resize(frame, SIZE, interpolation=cv2.INTER_AREA)
    spec = importlib.util.spec_from_file_location(
        'stump_base_tile_context',
        Path(__file__).resolve().parent / 'review-autumn-stump-frame-audit.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = compare(frame, [], module.tile_centers(frame))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)
                           + chr(10), encoding='utf-8')
    print(json.dumps({'base_candidate_count': result['base_candidate_count']}))


if __name__ == '__main__':
    main()
