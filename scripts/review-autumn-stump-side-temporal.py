#!/usr/bin/env python3
"""Read-only two-frame consensus for anonymous stump/tile geometric pairs.

Only externally verified camera transforms may be supplied. No map IDs,
building status, occupancy, plant types or automatic production writes.
"""
import argparse
import json
import math
from pathlib import Path

MAX_STUMP_RESIDUAL = 9.0
MAX_TILE_RESIDUAL = 9.0
MIN_COMPETITOR_GAP = 5.0


def _point(item, key):
    try:
        p = item[key]
        x, y = float(p['x']), float(p['y'])
    except (TypeError, KeyError, ValueError, OverflowError):
        return None
    return (x, y) if math.isfinite(x) and math.isfinite(y) else None


def _project(point, affine):
    x, y = point
    return (affine[0][0]*x + affine[0][1]*y + affine[0][2],
            affine[1][0]*x + affine[1][1]*y + affine[1][2])


def _distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def consensus(before, after, affine, camera_verified=False):
    """Require distinct unambiguous matches and a verified camera transform."""
    base = {'status': 'abstain', 'matches': [], 'slot_ids_verified': False,
            'occupancy': 'unknown', 'plant_type': 'unknown',
            'production_application': 'forbidden'}
    if camera_verified is not True:
        return {**base, 'reason': 'camera-continuity-not-verified'}
    try:
        if (len(affine) != 2 or any(len(row) != 3 for row in affine)
                or not all(math.isfinite(float(v)) for row in affine for v in row)):
            raise ValueError
        affine = [[float(v) for v in row] for row in affine]
        sx = math.hypot(affine[0][0], affine[1][0])
        sy = math.hypot(affine[0][1], affine[1][1])
        dot = affine[0][0]*affine[0][1] + affine[1][0]*affine[1][1]
        if not (.85 <= sx <= 1.15 and .85 <= sy <= 1.15
                and abs(dot) <= .03):
            return {**base, 'reason': 'implausible-camera-transform'}
        if not isinstance(before, list) or not isinstance(after, list):
            raise ValueError
        if not before or not after:
            return {**base, 'reason': 'missing-pairs'}
        a, b = [], []
        for source, dest in ((before, a), (after, b)):
            for row in source:
                stump, tile = _point(row, 'stump'), _point(row, 'tile')
                if stump is None or tile is None:
                    raise ValueError
                side = row['tile_side_of_stump']
                if side not in ('left', 'right') or (tile[0] > stump[0]) != (side == 'right'):
                    raise ValueError
                dest.append((stump, tile, side))
    except (ValueError, TypeError, KeyError, OverflowError):
        return {**base, 'reason': 'invalid-input'}
    # Require one-to-one matches of both stump AND tile, not just one center.
    candidates = []
    for i, (stump, tile, side) in enumerate(a):
        ps, pt = _project(stump, affine), _project(tile, affine)
        for j, (other_stump, other_tile, other_side) in enumerate(b):
            sd, td = _distance(ps, other_stump), _distance(pt, other_tile)
            if side == other_side and sd <= MAX_STUMP_RESIDUAL and td <= MAX_TILE_RESIDUAL:
                candidates.append((sd+td, i, j, sd, td))
    matches = []
    for score, i, j, sd, td in candidates:
        from_scores = sorted(v[0] for v in candidates if v[1] == i)
        to_scores = sorted(v[0] for v in candidates if v[2] == j)
        if (score != from_scores[0] or score != to_scores[0]
                or (len(from_scores)>1 and from_scores[1]-score<MIN_COMPETITOR_GAP)
                or (len(to_scores)>1 and to_scores[1]-score<MIN_COMPETITOR_GAP)):
            continue
        matches.append({'before_index': i, 'after_index': j,
                        'tile_side_of_stump': a[i][2],
                        'stump_residual_px': round(sd, 2),
                        'tile_residual_px': round(td, 2)})
    if not matches:
        return {**base, 'reason': 'no-unambiguous-stable-pairs'}
    if len(matches) != len(a) or len(matches) != len(b):
        return {**base, 'reason': 'partial-or-ambiguous-visibility'}
    return {**base, 'status': 'stable-local-side-proposals-only',
            'reason': 'verified-camera-and-two-frame-geometry',
            'matches': sorted(matches, key=lambda m:m['before_index'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--observations', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.observations.read_text(encoding='utf-8'))
    report = consensus(data['before'], data['after'],
                       data.get('affine_2x3'), data.get('camera_verified', False))
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)
                           + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'matches': len(report['matches'])}))


if __name__ == '__main__':
    main()
