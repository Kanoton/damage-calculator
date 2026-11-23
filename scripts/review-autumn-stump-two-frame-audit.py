#!/usr/bin/env python3
"""Research-only end-to-end two-frame stump-side audit.

Decodes two already-resized 512x288 screenshots. Independently detects
anonymous water-stump and mutable-colored tile candidates, verifies board
continuity, and checks both centers across frames. No map IDs, occupancy,
plant recognition, source screenshots, or production writes.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import cv2

HERE = Path(__file__).resolve().parent


def _load(name, key):
    spec = importlib.util.spec_from_file_location(key, HERE / name)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


frames = _load('review-autumn-stump-frame-audit.py', 'stump_two_frame_detector')
camera = _load('review-autumn-camera-transition.py', 'stump_two_frame_camera')
temporal = _load('review-autumn-stump-side-temporal.py', 'stump_two_frame_temporal')


def analyze(first, second):
    if (first is None or second is None or
            first.shape != (288, 512, 3) or second.shape != (288, 512, 3)):
        raise ValueError('Both images must be 512x288 BGR')
    one = frames.analyze(first)
    two = frames.analyze(second)
    continuity = camera.continuity(first, second)
    valid = continuity['status'] == 'same-view-candidate'
    stable = temporal.consensus(one['anonymous_pairs'], two['anonymous_pairs'],
                                continuity.get('affine_2x3'), valid)
    return {
        'status': stable['status'],
        'reason': stable['reason'],
        'first_stump_candidates': one['water_stump_candidates'],
        'second_stump_candidates': two['water_stump_candidates'],
        'first_local_pairs': len(one['anonymous_pairs']),
        'second_local_pairs': len(two['anonymous_pairs']),
        'camera_status': continuity['status'],
        'camera_reason': continuity['reason'],
        'camera_inliers': continuity.get('inliers', 0),
        'camera_inlier_ratio': continuity.get('inlier_ratio', 0),
        'stable_pairs': stable['matches'],
        'slot_ids_verified': False,
        'occupancy': 'unknown',
        'plant_type': 'unknown',
        'production_application': 'forbidden',
        'caveat': ('Color and water candidates are not independently verified '
                   'game objects; same-view is not a slot ID. A planted stump '
                   'may be missed. Five symbol types are never required.')
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--first', type=Path, required=True)
    parser.add_argument('--second', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    first, second = cv2.imread(str(args.first)), cv2.imread(str(args.second))
    report = analyze(first, second)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)
                           + chr(10), encoding='utf-8')
    print(json.dumps({'status': report['status'],
                      'first_pairs': report['first_local_pairs'],
                      'second_pairs': report['second_local_pairs'],
                      'stable_pairs': len(report['stable_pairs'])}))


if __name__ == '__main__':
    main()
