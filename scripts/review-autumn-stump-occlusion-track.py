#!/usr/bin/env python3
"""Research-only short-occlusion geometric identity proposals.

Requires camera-continuity verification at EACH transition. Reappearing slots
are review candidates, never verified O identities or occupancy updates.
"""
import argparse
import json
import math
from pathlib import Path

MAX_RESIDUAL = 9.0
MIN_MARGIN = 5.0


def _pair(pair):
    try:
        s, t = pair['stump'], pair['tile']
        points = ((float(s['x']), float(s['y'])),
                  (float(t['x']), float(t['y'])))
        side = pair['tile_side_of_stump']
        if not all(math.isfinite(v) for p in points for v in p):
            raise ValueError
        if side not in ('left', 'right') or ((points[1][0] > points[0][0]) != (side == 'right')):
            raise ValueError
        return points, side
    except (TypeError, ValueError, KeyError, OverflowError):
        raise ValueError('Invalid stump + adjacent tile geometry') from None


def _affine(matrix):
    try:
        if len(matrix) != 2 or any(len(row) != 3 for row in matrix):
            raise ValueError
        a = [[float(v) for v in row] for row in matrix]
        if not all(math.isfinite(v) for row in a for v in row):
            raise ValueError
        sx, sy = math.hypot(a[0][0], a[1][0]), math.hypot(a[0][1], a[1][1])
        dot = a[0][0]*a[0][1] + a[1][0]*a[1][1]
        if not (.85 <= sx <= 1.15 and .85 <= sy <= 1.15 and abs(dot) <= .03):
            raise ValueError
        return a
    except (TypeError, ValueError, OverflowError):
        return None


def _project(pair, matrix):
    points, side = pair
    return tuple((matrix[0][0]*x+matrix[0][1]*y+matrix[0][2],
                  matrix[1][0]*x+matrix[1][1]*y+matrix[1][2])
                 for x, y in points), side


def _distance(a, b):
    pa, side_a = a
    pb, side_b = b
    if side_a != side_b:
        return None
    sd = math.dist(pa[0], pb[0])
    td = math.dist(pa[1], pb[1])
    return sd+td if sd <= MAX_RESIDUAL and td <= MAX_RESIDUAL else None


def evaluate(frames, anchors=None, max_missing=2):
    """Track local pairs through short absences; never infer canonical O IDs."""
    if (not isinstance(frames, list) or not frames or
            type(max_missing) is not int or not (0 <= max_missing <= 5)):
        raise ValueError('frames required; max_missing must be 0..5')
    pairs = []
    for frame in frames:
        if not isinstance(frame, dict) or not isinstance(frame.get('pairs'), list):
            raise ValueError('Frame must contain pairs')
        pairs.append([_pair(p) for p in frame['pairs']])
    anchors = [] if anchors is None else anchors
    if not isinstance(anchors, list):
        raise ValueError('anchors must be list')
    slot_by_index, seen_slots = {}, set()
    for a in anchors:
        if not isinstance(a, dict) or type(a.get('pair_index')) is not int:
            raise ValueError('Bad anchor')
        i, slot = a['pair_index'], a.get('slot_id')
        if (i < 0 or i >= len(pairs[0]) or i in slot_by_index
                or not isinstance(slot, str)
                or slot not in {f'O{k}' for k in range(1,17)}
                or slot in seen_slots or a.get('human_verified') is not True):
            raise ValueError('Canonical O slots require unique human-verified anchors')
        slot_by_index[i] = slot
        seen_slots.add(slot)
    active = {i: {'pair': p, 'missing': 0, 'anchor': slot_by_index.get(i),
                  'continuous': True} for i, p in enumerate(pairs[0])}
    logs = [{'frame_index': 0, 'status': 'initial-anonymous-pairs',
             'visible': [{'pair_index': i, 'temporary_track_id': f'local-{i+1}',
                          'confirmed_anchor': slot_by_index.get(i),
                          'reacquired_candidate': False}
                         for i in range(len(pairs[0]))],
             'missing_track_ids': []}]
    disconnected = False
    for step in range(1, len(frames)):
        frame = frames[step]
        affine = (_affine(frame.get('affine_from_previous'))
                  if frame.get('camera_verified') is True else None)
        if disconnected or affine is None:
            active = {}
            disconnected = True
            logs.append({'frame_index': step, 'status': 'abstain',
                         'reason': 'camera-continuity-lost-reanchor-required',
                         'visible': [], 'missing_track_ids': []})
            continue
        predicted = {i: _project(t['pair'], affine) for i, t in active.items()}
        edges = []
        for track_id, expected in predicted.items():
            for j, detected in enumerate(pairs[step]):
                score = _distance(expected, detected)
                if score is not None:
                    edges.append((score, track_id, j))
        valid = []
        for score, track_id, j in edges:
            from_scores = sorted(v[0] for v in edges if v[1] == track_id)
            to_scores = sorted(v[0] for v in edges if v[2] == j)
            if (score != from_scores[0] or score != to_scores[0]
                    or (len(from_scores) > 1 and from_scores[1]-score < MIN_MARGIN)
                    or (len(to_scores) > 1 and to_scores[1]-score < MIN_MARGIN)):
                continue
            valid.append((track_id, j, score))
        updated, visible = {}, []
        for track_id, j, score in valid:
            t = active[track_id]
            reacquired = t['missing'] > 0
            updated[track_id] = {'pair': pairs[step][j], 'missing': 0,
                                 'anchor': t['anchor'],
                                 'continuous': t['continuous'] and not reacquired}
            visible.append({
                'pair_index': j, 'temporary_track_id': f'local-{track_id+1}',
                'confirmed_anchor': t['anchor'] if t['continuous'] and not reacquired else None,
                'reacquired_candidate': reacquired,
                'slot_id_review_candidate': (
                    t['anchor'] if (reacquired or not t['continuous']) else None),
                'stump_tile_residual_sum_px': round(score, 2)})
        for track_id, t in active.items():
            if track_id not in updated and t['missing'] < max_missing:
                updated[track_id] = {**t, 'pair': predicted[track_id],
                                     'missing': t['missing']+1}
        active = updated
        missing = [f'local-{i+1}' for i, t in active.items() if t['missing']]
        logs.append({'frame_index': step, 'status': 'research-tracks-only',
                     'visible': sorted(visible, key=lambda v: v['pair_index']),
                     'missing_track_ids': sorted(missing),
                     'unassociated_detection_count': len(pairs[step])-len(visible)})
    return {'frames': logs, 'camera_tracking_disconnected': disconnected,
            'human_verified_anchor_count': len(anchors),
            'slot_ids_verified_automatically': False,
            'building_state_applied': False,
            'production_application': 'forbidden',
            'caveat': ('Reacquisition is a geometric review hypothesis, not confirmed O identity. '
                       'Every frame needs independent camera continuity; never apply building writes.')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--observations', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.observations.read_text(encoding='utf-8'))
    result = evaluate(data['frames'], data.get('anchors'),
                      data.get('max_missing', 2))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)
                           + '\n', encoding='utf-8')
    print(json.dumps({'frames': len(result['frames']),
                      'camera_tracking_disconnected': result['camera_tracking_disconnected']}))


if __name__ == '__main__':
    main()
