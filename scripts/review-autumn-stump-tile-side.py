#!/usr/bin/env python3
"""Research-only icon-agnostic stump-to-tile side association.

Inputs are independently observed anonymous stump/pot and tile centers in
512x288 pixels. Tile *type* is deliberately ignored because game events can
replace tile icons. A match is a local geometric proposal, NOT a map slot ID.
"""
import argparse
import json
import math
from pathlib import Path

MIN_HORIZONTAL_GAP = 15.0
MAX_HORIZONTAL_GAP = 125.0
MAX_VERTICAL_GAP = 105.0
MIN_SCORE_MARGIN = 0.15


def _points(value):
    if not isinstance(value, list):
        return None
    points = []
    for item in value:
        if not isinstance(item, dict):
            return None
        try:
            x, y = float(item['x']), float(item['y'])
        except (KeyError, TypeError, ValueError, OverflowError):
            return None
        if not (math.isfinite(x) and math.isfinite(y)):
            return None
        points.append((x, y))
    return points


def assess(stumps, tiles):
    """Pair unique nearby centers, abstaining on ambiguity and duplicates."""
    sp, tp = _points(stumps), _points(tiles)
    if sp is None or tp is None:
        return {'status': 'abstain', 'reason': 'invalid-coordinates',
                'production_application': 'forbidden'}
    if not sp or not tp:
        return {'status': 'abstain', 'reason': 'missing-stumps-or-tiles',
                'production_application': 'forbidden'}
    if len(set(sp)) != len(sp) or len(set(tp)) != len(tp):
        return {'status': 'abstain', 'reason': 'duplicate-centers',
                'production_application': 'forbidden'}
    candidates = []
    for i, (sx, sy) in enumerate(sp):
        for j, (tx, ty) in enumerate(tp):
            dx, dy = tx - sx, ty - sy
            if not (MIN_HORIZONTAL_GAP <= abs(dx) <= MAX_HORIZONTAL_GAP
                    and abs(dy) <= MAX_VERTICAL_GAP):
                continue
            # Prefer nearby horizontal neighbors; don't assume tile icon/type.
            score = abs(dx) / MAX_HORIZONTAL_GAP + abs(dy) / MAX_VERTICAL_GAP
            candidates.append((score, i, j, dx, dy))
    matches = []
    for score, i, j, dx, dy in candidates:
        competing_stump = sorted(c[0] for c in candidates if c[1] == i)
        competing_tile = sorted(c[0] for c in candidates if c[2] == j)
        if (score != competing_stump[0] or score != competing_tile[0]
                or (len(competing_stump) > 1
                    and competing_stump[1] - score < MIN_SCORE_MARGIN)
                or (len(competing_tile) > 1
                    and competing_tile[1] - score < MIN_SCORE_MARGIN)):
            continue
        matches.append({'stump_index': i, 'tile_index': j,
                        'tile_side_of_stump': 'right' if dx > 0 else 'left',
                        'dx_px': round(dx, 2), 'dy_px': round(dy, 2)})
    matches.sort(key=lambda row: row['stump_index'])
    return {'status': ('local-side-proposals-only' if matches else 'abstain'),
            'reason': ('anonymous-geometric-pairs' if matches
                       else 'no-unambiguous-nearby-pairs'),
            'matches': matches, 'stumps_seen': len(sp), 'tiles_seen': len(tp),
            'slot_ids_verified': False, 'occupancy': 'unknown',
            'plant_type': 'unknown', 'production_application': 'forbidden'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--observations', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    data = json.loads(args.observations.read_text(encoding='utf-8'))
    result = assess(data['stumps'], data['tiles'])
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)
                           + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'],
                      'matches': len(result['matches'])}))


if __name__ == '__main__':
    main()
