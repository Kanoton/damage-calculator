#!/usr/bin/env python3
"""Offline icon-agnostic stump/tile candidate audit on a 512x288 BGR image.

Tile center proposals use color/size geometry only, never symbol type. Existing
water+stump pot proposals supply conservative stump-like anchors. This cannot
detect planted stumps reliably and must not update game state or slot IDs.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np

HERE = Path(__file__).resolve().parent


def _load(filename, name):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pots = _load('review-autumn-empty-pot-proposals.py', 'stump_frame_pots')
sides = _load('review-autumn-stump-tile-side.py', 'stump_frame_sides')
SIZE = (512, 288)


def tile_centers(frame):
    """Broad color-body candidates, not tile glyph classification.

    This intentionally accepts changing icon contents and makes no claim of
    finding every tile color or rejecting all decorative colored disks.
    """
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    masks = [
        cv2.inRange(hsv, (90, 80, 60), (125, 255, 255)),
        cv2.inRange(hsv, (135, 100, 85), (175, 255, 255)),
        cv2.inRange(hsv, (0, 120, 100), (10, 255, 255))
        | cv2.inRange(hsv, (170, 120, 100), (179, 255, 255)),
    ]
    centers = []
    for mask in masks:
        count, _, stats, centroids = cv2.connectedComponentsWithStats(mask)
        for i in range(1, count):
            x, y, w, h, area = map(int, stats[i])
            cx, cy = map(float, centroids[i])
            if not (200 <= area <= 1050 and 22 <= w <= 55 and
                    16 <= h <= 43 and 85 <= cx <= 465 and 40 <= cy <= 215):
                continue
            centers.append({'x': round(cx, 1), 'y': round(cy, 1)})
    # A multi-colored rim may trigger more than one mask; do not double count.
    result = []
    for p in sorted(centers, key=lambda v: (v['y'], v['x'])):
        if not any((p['x']-q['x'])**2 + (p['y']-q['y'])**2 < 14**2
                   for q in result):
            result.append(p)
    return result


def analyze(frame):
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    stumps = pots.propose(frame)
    tiles = tile_centers(frame)
    paired = sides.assess(stumps, tiles)
    return {
        'status': paired['status'],
        'water_stump_candidates': len(stumps),
        'color_tile_candidates': len(tiles),
        'local_side_matches': paired.get('matches', []),
        'slot_ids_verified': False,
        'plant_type': 'unknown',
        'production_application': 'forbidden',
        'caveat': ('Only empty-water-pot-looking stumps; planted stumps can be '
                   'missed. Color-body tile proposals are not verified tiles. '
                   'No five-symbol requirement, no slot or occupancy inference.')
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    frame = cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Cannot decode image')
    report = analyze(frame)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)
                           + '\n', encoding='utf-8')
    print(json.dumps({'stumps': report['water_stump_candidates'],
                      'tiles': report['color_tile_candidates'],
                      'pairs': len(report['local_side_matches'])}))


if __name__ == '__main__':
    main()
