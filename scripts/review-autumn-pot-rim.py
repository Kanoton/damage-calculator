#!/usr/bin/env python3
"""Research-only rim-edge same-view tracker, not a pot detector.

Given two already aligned 96x96 pot crops, compare the stump's lower rim
and estimate up to 6 px translation. Abstain if the match is weak or ambiguous.
Never infer slot ID, plant type or occupancy from this tool.
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

VIEW = (512, 288)
RADIUS = (48, 54, 48, 42)
RIM = (18, 86, 73, 96)  # excludes the water core and plant
MAX_OFFSET = 6
MIN_SCORE = 0.80  # deliberately high; no calibration on independent games
MIN_GAP = 0.10


def crop(path, cx, cy):
    if any(isinstance(v, bool) or not isinstance(v, int) for v in (cx, cy)):
        raise ValueError('Integer center required')
    l, t, r, b = RADIUS
    if cx-l < 0 or cy-t < 0 or cx+r > VIEW[0] or cy+b > VIEW[1]:
        raise ValueError('Crop outside image')
    with Image.open(path) as image:
        rgb = image.convert('RGB').resize(VIEW, Image.Resampling.BILINEAR)
        return np.asarray(rgb.crop((cx-l, cy-t, cx+r, cy+b)))


def edges(rgb):
    if rgb.shape != (96, 96, 3):
        raise ValueError('Expected 96x96 RGB')
    return cv2.Canny(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), 30, 85)


def track_rim(reference_rgb, observation_rgb, max_offset=MAX_OFFSET,
              min_score=MIN_SCORE, min_gap=MIN_GAP):
    if isinstance(max_offset, bool) or not isinstance(max_offset, int) or not 0 <= max_offset <= 8:
        raise ValueError('max_offset must be an integer 0..8')
    x1, x2, y1, y2 = RIM
    template = edges(reference_rgb)[y1:y2, x1:x2]
    if np.count_nonzero(template) < 24:
        return {'status': 'abstain', 'reason': 'insufficient-rim-edges'}
    edge = edges(observation_rgb)
    padded = cv2.copyMakeBorder(edge, max_offset, max_offset, max_offset,
                                max_offset, cv2.BORDER_CONSTANT, value=0)
    patch = padded[y1:y2+2*max_offset, x1:x2+2*max_offset]
    scores = cv2.matchTemplate(patch, template, cv2.TM_CCOEFF_NORMED)
    _, score, _, at = cv2.minMaxLoc(scores)
    if not np.isfinite(score) or score < min_score:
        return {'status': 'abstain', 'reason': 'weak-rim-match',
                'score': round(float(score), 4)}
    competing = scores.copy()
    col, row = at
    competing[max(0,row-2):min(scores.shape[0],row+3),
              max(0,col-2):min(scores.shape[1],col+3)] = -1
    rival = float(competing.max()) if competing.size else -1.
    if score-rival < min_gap:
        return {'status': 'abstain', 'reason': 'ambiguous-rim-match',
                'score': round(float(score), 4), 'second_score': round(rival, 4)}
    return {'status': 'candidate-only', 'dx': col-max_offset,
            'dy': row-max_offset, 'score': round(float(score), 4)}


def evaluate(pairs, image_dir):
    results = []
    for i, item in enumerate(pairs):
        crops = []
        for side in ('reference', 'observation'):
            entry = item[side]
            filename = entry['file']
            if not isinstance(filename, str) or Path(filename).name != filename or filename in ('.', '..'):
                raise ValueError('Use a filename inside the image directory')
            crops.append(crop(image_dir / filename, entry['cx'], entry['cy']))
        value = track_rim(*crops)
        results.append({'pair': i, **value})
    return {'pairs': len(results),
            'candidate': sum(x['status']=='candidate-only' for x in results),
            'abstained': sum(x['status']=='abstain' for x in results),
            'note': ('Diagnostic of already cropped same-view images only; '
                     'no pot detection, slot ID or occupancy confirmation.'),
            'results': results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--images-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    entries = json.loads(args.manifest.read_text(encoding='utf-8'))['pairs']
    result = evaluate(entries, args.images_dir)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    print(json.dumps({k:result[k] for k in ('pairs','candidate','abstained')}))


if __name__ == '__main__':
    main()
