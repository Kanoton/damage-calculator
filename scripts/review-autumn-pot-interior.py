#!/usr/bin/env python3
"""Offline pot-water diagnostic. Strong water may veto a plant candidate.
Weak water is UNKNOWN, never evidence of an occupied pot. Research only.
Input manifest: {"samples":[{"file":"frame.png","cx":123,"cy":100,
"expected":"__empty__"}]}. Output excludes filenames and coordinates.
Requires numpy, Pillow and opencv-python-headless.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

VIEW = (512, 288)
RADIUS = (48, 54, 48, 42)
WATER_ROI = (26, 70, 49, 73)
MIN_WATER_RATIO = 0.38  # Exploratory cutoff selected on seven same-game crops.
EMPTY_LABEL = '__empty__'


def crop(path, cx, cy):
    if (not isinstance(cx, int) or isinstance(cx, bool) or
            not isinstance(cy, int) or isinstance(cy, bool)):
        raise ValueError('Integer center required')
    l, t, r, b = RADIUS
    if cx-l < 0 or cy-t < 0 or cx+r > VIEW[0] or cy+b > VIEW[1]:
        raise ValueError('Crop outside image')
    with Image.open(path) as src:
        rgb = src.convert('RGB').resize(VIEW, Image.Resampling.BILINEAR)
        return np.asarray(rgb.crop((cx-l, cy-t, cx+r, cy+b)))


def water_ratio(rgb):
    if rgb.shape != (96, 96, 3):
        raise ValueError('Expected 96x96 RGB crop')
    x1, x2, y1, y2 = WATER_ROI
    hsv = cv2.cvtColor(rgb[y1:y2, x1:x2], cv2.COLOR_RGB2HSV)
    water = (hsv[:, :, 0] >= 80) & (hsv[:, :, 0] <= 105) & (hsv[:, :, 1] > 75)
    return float(water.mean())


def inspect(rgb, threshold=MIN_WATER_RATIO):
    score = water_ratio(rgb)
    return {'decision': 'empty-like-veto' if score >= threshold else 'unknown',
            'water_ratio': round(score, 4)}


def audit(rows, images_dir):
    if not isinstance(rows, list):
        raise ValueError('samples must be an array')
    results = []
    for i, row in enumerate(rows):
        name = row['file']
        if not isinstance(name, str) or Path(name).name != name or name in ('.', '..'):
            raise ValueError('Only filenames in images-dir are allowed')
        expected = row.get('expected')
        if expected is not None and (not isinstance(expected, str) or not expected.strip()):
            raise ValueError('Invalid label')
        result = inspect(crop(images_dir / name, row['cx'], row['cy']))
        results.append({'sample': i, 'expected': expected, **result})
    empty = [x for x in results if x['expected'] == EMPTY_LABEL]
    occupied = [x for x in results if x['expected'] not in (EMPTY_LABEL, None)]
    return {'samples': len(results), 'empty_labeled': len(empty),
            'occupied_labeled': len(occupied),
            'empty_vetoed': sum(x['decision']=='empty-like-veto' for x in empty),
            'occupied_wrongly_vetoed': sum(x['decision']=='empty-like-veto' for x in occupied),
            'unknown_label': len(results)-len(empty)-len(occupied),
            'note': ('Exploratory same-game crop observations; cutoff not validated '
                     'on independent plays. Non-veto is UNKNOWN, not occupied.'),
            'results': results}



def inspect_stability(path, cx, cy, radius=4, threshold=MIN_WATER_RATIO):
    """Diagnostic: all nine nearby crops must show water to allow a veto.

    This is an uncertainty gate, not a pot-localization model.
    A failed gate means UNKNOWN, never 'occupied'.
    """
    if not isinstance(radius, int) or isinstance(radius, bool) or radius < 0 or radius > 8:
        raise ValueError('radius must be an integer in [0, 8]')
    offsets = ((0, 0), (-radius, 0), (radius, 0), (0, -radius),
               (0, radius), (-radius, -radius), (-radius, radius),
               (radius, -radius), (radius, radius))
    ratios = [water_ratio(crop(path, cx+dx, cy+dy)) for dx, dy in dict.fromkeys(offsets)]
    minimum, maximum = min(ratios), max(ratios)
    return {'decision': 'stable-empty-like-veto' if minimum >= threshold else 'unknown',
            'min_water_ratio': round(minimum, 4),
            'max_water_ratio': round(maximum, 4),
            'radius': radius}


def stability_audit(rows, images_dir, radius=4):
    """Aggregate explicitly labeled research crops; never emit source paths."""
    results = []
    for i, row in enumerate(rows):
        name = row['file']
        if not isinstance(name, str) or Path(name).name != name or name in ('.', '..'):
            raise ValueError('Only filenames in images-dir are allowed')
        expected = row.get('expected')
        if expected is not None and (not isinstance(expected, str) or not expected.strip()):
            raise ValueError('Invalid label')
        result = inspect_stability(images_dir / name, row['cx'], row['cy'], radius)
        results.append({'sample': i, 'expected': expected, **result})
    empty = [x for x in results if x['expected'] == EMPTY_LABEL]
    occupied = [x for x in results if x['expected'] not in (EMPTY_LABEL, None)]
    stable = lambda x: x['decision'] == 'stable-empty-like-veto'
    return {'samples': len(results), 'radius': radius,
            'empty_labeled': len(empty), 'occupied_labeled': len(occupied),
            'empty_vetoed': sum(map(stable, empty)),
            'occupied_wrongly_vetoed': sum(map(stable, occupied)),
            'unknown_label': len(results)-len(empty)-len(occupied),
            'note': ('Same-game, manually selected crops; alignment perturbations '
                     'are NOT independent samples. A non-veto is UNKNOWN. '
                     'Never connect this diagnostic to a production bridge.'),
            'results': results}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--images-dir', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--stability-radius', type=int, default=None,
                   help='Opt-in perturbation gate; e.g. 4 (research only)')
    args = p.parse_args()
    rows = json.loads(args.manifest.read_text(encoding='utf-8'))['samples']
    report = (stability_audit(rows, args.images_dir, args.stability_radius)
              if args.stability_radius is not None else audit(rows, args.images_dir))
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in
          ('samples', 'empty_labeled', 'occupied_labeled',
           'empty_vetoed', 'occupied_wrongly_vetoed')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
