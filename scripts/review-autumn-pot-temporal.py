#!/usr/bin/env python3
"""Offline temporal pot-rim pairing for manually selected same-view crops.
No detection of 16 slot IDs, occupancy or plant types.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import numpy as np

RIM = Path(__file__).with_name('review-autumn-pot-rim.py')
spec = importlib.util.spec_from_file_location('autumn_rim', RIM)
rim = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rim)

MIN_DELTA_MS = 300.0
MIN_PIXEL_CHANGE = 0.5


def assess_pair(before, after, before_ms, after_ms):
    if not all(isinstance(t, (int, float)) and np.isfinite(t) for t in (before_ms, after_ms)):
        return {'status': 'abstain', 'reason': 'invalid-timestamp'}
    if after_ms - before_ms < MIN_DELTA_MS:
        return {'status': 'abstain', 'reason': 'not-independent-in-time'}
    if before.shape != (96, 96, 3) or after.shape != (96, 96, 3):
        return {'status': 'abstain', 'reason': 'invalid-crop'}
    change = float(np.abs(before.astype(np.float32) - after.astype(np.float32)).mean())
    if change < MIN_PIXEL_CHANGE:
        return {'status': 'abstain', 'reason': 'identical-or-near-duplicate'}
    alignment = rim.track_rim(before, after)
    if alignment['status'] != 'candidate-only':
        return alignment
    return {'status': 'temporal-rim-candidate', 'dx': alignment['dx'],
            'dy': alignment['dy'], 'score': alignment['score'],
            'delta_ms': round(after_ms - before_ms, 3),
            'pixel_change': round(change, 4)}


def assess_grid(before, after, before_ms, after_ms):
    """Reject duplicate source/target assignments, do not assign real slot IDs."""
    if not before or not after:
        return {'matched': [], 'abstained': True, 'reason': 'missing-crops'}
    candidates = []
    for i, old in enumerate(before):
        for j, new in enumerate(after):
            result = assess_pair(old, new, before_ms, after_ms)
            if result['status'] == 'temporal-rim-candidate':
                candidates.append({'before': i, 'after': j, **result})
    selected = []
    for c in candidates:
        if (sum(x['before'] == c['before'] for x in candidates) == 1
                and sum(x['after'] == c['after'] for x in candidates) == 1):
            selected.append(c)
    partial = len(selected) != len(before) or len(selected) != len(after)
    return {'matched': selected, 'abstained': partial,
            'reason': 'partial-or-conflicting-pairs' if partial else 'same-view-candidates-only'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--images-dir', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    data = json.loads(args.manifest.read_text(encoding='utf-8'))

    def load(which):
        crops = []
        for entry in data[which]['crops']:
            filename = entry['file']
            if not isinstance(filename, str) or Path(filename).name != filename or filename in ('.', '..'):
                raise ValueError('File must be inside images-dir')
            crops.append(rim.crop(args.images_dir / filename, entry['cx'], entry['cy']))
        return crops

    result = assess_grid(load('before'), load('after'),
                         data['before']['timestamp_ms'], data['after']['timestamp_ms'])
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'matched': len(result['matched']), 'abstained': result['abstained']}))


if __name__ == '__main__':
    main()
