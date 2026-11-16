#!/usr/bin/env python3
"""Offline, conservative plant-crop similarity audit for the 08 reader.

Input is manually reviewed crop centers in 512x288 screenshot coordinates.
Images stay local. Output contains decisions, not source filenames or images.
This is a research tool, not the browser's plant detector or placement logic.
Requires numpy, Pillow and opencv-python-headless.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

VIEW = (512, 288)
RADIUS = (48, 54, 48, 42)
BINS = (18, 8)
MAX_DISTANCE = 1.35
MIN_MARGIN = .16
EMPTY_LABEL = '__empty__'  # Never emitted as a recognized building.


def descriptor(rgb):
    if rgb.shape != (96, 96, 3):
        raise ValueError('Crop must be 96x96 RGB')
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[5:74, 15:85]
    blocks = (hsv, hsv[:36], hsv[36:], hsv[:, :35], hsv[:, 35:])
    vector = []
    for block in blocks:
        hist = cv2.calcHist([block], [0, 1], None, list(BINS), [0, 180, 0, 256])
        hist /= max(float(hist.sum()), 1)
        vector.extend(np.sqrt(hist.flatten()).tolist())
    return np.array(vector, dtype=np.float32)


def crop(path, cx, cy):
    im = Image.open(path).convert('RGB').resize(VIEW)
    l, t, r, b = RADIUS
    if cx-l < 0 or cy-t < 0 or cx+r > VIEW[0] or cy+b > VIEW[1]:
        raise ValueError('Crop is outside image: '+str(path))
    return np.asarray(im.crop((cx-l, cy-t, cx+r, cy+b)))


def predict(vector, references, exclude=None, max_distance=MAX_DISTANCE, margin=MIN_MARGIN):
    scores = {}
    nearest_empty = float('inf')
    for i, sample in enumerate(references):
        if i == exclude:
            continue
        distance = float(np.linalg.norm(vector - sample['vector']))
        key = sample['plant']
        if key == EMPTY_LABEL:
            nearest_empty = min(nearest_empty, distance)
            continue
        scores[key] = min(scores.get(key, float('inf')), distance)
    ranked = sorted(scores.items(), key=lambda item: item[1])
    if not ranked:
        return {'plant': None, 'reason': 'no-references'}
    # A single reference class cannot establish a margin against another species.
    # This occurs naturally in leave-one-game-out evaluation.
    if len(ranked) < 2:
        return {'plant': None, 'reason': 'insufficient-reference-classes'}
    name, best = ranked[0]
    gap = ranked[1][1]-best if len(ranked) > 1 else float('inf')
    # If an empty pot is as plausible as the closest plant, never emit a plant.
    if nearest_empty <= best + margin:
        return {'plant': None, 'reason': 'empty-or-ambiguous',
                'nearest': name, 'distance': round(best, 4),
                'empty_distance': round(nearest_empty, 4)}
    if best > max_distance:
        return {'plant': None, 'reason': 'unfamiliar-appearance',
                'nearest': name, 'distance': round(best, 4), 'margin': round(gap, 4)}
    if gap < margin:
        return {'plant': None, 'reason': 'ambiguous-plant',
                'nearest': name, 'distance': round(best, 4), 'margin': round(gap, 4)}
    return {'plant': name, 'reason': 'candidate-only',
            'distance': round(best, 4), 'margin': round(gap, 4)}



def evaluate_by_game(references):
    """Hold out every crop from the same game to prevent frame leakage."""
    groups = {sample.get('game') for sample in references}
    if len(groups) < 2 or any(not isinstance(g, str) or not g.strip() for g in groups):
        raise ValueError('At least two named independent games are required')
    results = []
    for i, sample in enumerate(references):
        training = [ref for ref in references if ref['game'] != sample['game']]
        decision = predict(sample['vector'], training)
        results.append({'sample': i, 'expected': sample['plant'], **decision,
                        'correct': decision['plant'] == sample['plant'] if decision['plant'] else None})
    return summarize(results, 'Leave-one-game-out; game IDs must identify independent plays.')


def summarize(results, note):
    empty = [x for x in results if x['expected'] == EMPTY_LABEL]
    return {'samples': len(results),
            'accepted': sum(x['plant'] is not None for x in results),
            'correct_accepted': sum(x['correct'] is True for x in results),
            'false_accepted': sum(x['correct'] is False for x in results),
            'empty_samples': len(empty),
            'empty_false_accepted': sum(x['plant'] is not None for x in empty),
            'empty_abstained': sum(x['plant'] is None for x in empty),
            'reasons': dict(Counter(x['reason'] for x in results)),
            'results': results, 'note': note}


def evaluate(references):
    results = []
    for i, sample in enumerate(references):
        decision = predict(sample['vector'], references, exclude=i)
        results.append({'sample': i, 'expected': sample['plant'], **decision,
                        'correct': decision['plant'] == sample['plant'] if decision['plant'] else None})
    return summarize(results, 'Leave-one-crop-out; nearby frames may leak between samples.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--images-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--evaluation', choices=['crop', 'game'], default='game')
    args = parser.parse_args()
    rows = json.loads(args.manifest.read_text(encoding='utf-8'))['samples']
    references = []
    for row in rows:
        if row['plant'] != EMPTY_LABEL and (not isinstance(row['plant'], str) or not row['plant'].strip()):
            raise ValueError('Plant must be a nonempty name or __empty__')
        if not isinstance(row['cx'], int) or not isinstance(row['cy'], int):
            raise ValueError('Centers must be integers')
        if Path(row['file']).name != row['file']:
            raise ValueError('Only filenames in images-dir are allowed')
        image = crop(args.images_dir / row['file'], row['cx'], row['cy'])
        references.append({'plant': row['plant'], 'game': row.get('game'), 'vector': descriptor(image)})
    audit = evaluate_by_game(references) if args.evaluation == 'game' else evaluate(references)
    args.output.write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key: audit[key] for key in ('samples','accepted','correct_accepted','false_accepted','empty_samples','empty_false_accepted','empty_abstained','reasons')}, ensure_ascii=False))
    if audit['false_accepted']:
        print('WARNING: accepted false positives; results must remain research-only')


if __name__ == '__main__':
    main()
