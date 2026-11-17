#!/usr/bin/env python3
"""Read-only, bounded sampling of stump-side proposals from a gameplay video.

Every sampled frame is independently evaluated; no five-icon gate. This is a
diagnostic, not a recognition accuracy test or proof of unique map slot IDs.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path

import cv2

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    'stump_video_frame', HERE / 'review-autumn-stump-frame-audit.py')
frame_audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(frame_audit)


def contiguous_runs(frames, field):
    """Group adjacent positive sampled frames, never claim distinct objects."""
    runs = []
    current = None
    for item in frames:
        positive = item.get('status') != 'unreadable' and item.get(field, 0) > 0
        if not positive:
            current = None
            continue
        if current is None:
            current = {'start_index': item['index'], 'end_index': item['index'],
                       'sample_count': 1}
            runs.append(current)
        else:
            current['end_index'] = item['index']
            current['sample_count'] += 1
    return runs


def audit(video, interval_seconds=1.0, max_frames=150, capture_factory=None):
    if not (math.isfinite(interval_seconds) and interval_seconds > 0
            and isinstance(max_frames, int) and 1 <= max_frames <= 10000):
        raise ValueError('Invalid sampling settings')
    if capture_factory is None:
        capture_factory = cv2.VideoCapture
    cap = capture_factory(str(video))
    try:
        if not cap.isOpened():
            raise ValueError('Video could not be opened')
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        frame_count = float(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if not (math.isfinite(fps) and fps > 0 and math.isfinite(frame_count)
                and frame_count > 0):
            raise ValueError('Missing valid video timing metadata')
        duration = frame_count / fps
        frames = []
        seen_indices = set()
        for i in range(max_frames):
            timestamp = i * interval_seconds
            index = int(round(timestamp * fps))
            if index >= frame_count:
                break
            if index in seen_indices:
                raise ValueError('Duplicate sampled frame index')
            seen_indices.add(index)
            if not cap.set(cv2.CAP_PROP_POS_FRAMES, index):
                frames.append({'index': index, 'time_seconds': round(timestamp, 3),
                               'status': 'unreadable'})
                continue
            ok, raw = cap.read()
            if not ok or raw is None or len(raw.shape) != 3:
                frames.append({'index': index, 'time_seconds': round(timestamp, 3),
                               'status': 'unreadable'})
                continue
            image = cv2.resize(raw, (512, 288), interpolation=cv2.INTER_AREA)
            result = frame_audit.analyze(image)
            frames.append({
                'index': index, 'time_seconds': round(timestamp, 3),
                'status': result['status'],
                'water_stump_candidates': result['water_stump_candidates'],
                'color_tile_candidates': result['color_tile_candidates'],
                'local_pair_count': len(result['local_side_matches']),
                'left_pairs': sum(p['tile_side_of_stump'] == 'left'
                                  for p in result['local_side_matches']),
                'right_pairs': sum(p['tile_side_of_stump'] == 'right'
                                   for p in result['local_side_matches'])
            })
        unreadable = [f['index'] for f in frames if f['status'] == 'unreadable']
        last_index = frames[-1]['index'] if frames else -1
        full_coverage = bool(frames and last_index + round(interval_seconds * fps)
                             >= frame_count and not unreadable)
        return {
            'status': ('incomplete-or-unreadable' if unreadable or not full_coverage
                       else 'diagnostic-sampled-only'),
            'duration_seconds_estimate': round(duration, 3),
            'sampled_frames': len(frames),
            'full_video_covered': full_coverage,
            'unreadable_indices': unreadable,
            'frames_with_water_stump_candidates': sum(
                f.get('water_stump_candidates', 0) > 0 for f in frames),
            'frames_with_local_pairs': sum(
                f.get('local_pair_count', 0) > 0 for f in frames),
            'local_pair_proposals': sum(f.get('local_pair_count', 0) for f in frames),
            'frames': frames,
            'stump_positive_runs': contiguous_runs(frames, 'water_stump_candidates'),
            'local_pair_positive_runs': contiguous_runs(frames, 'local_pair_count'),
            'slot_ids_verified': False,
            'plant_type': 'unknown',
            'production_application': 'forbidden',
            'caution': ('Unlabeled color and water-pot proposals, not verified '
                        'matches. Consecutive positive samples may be the same object; '
                        'camera continuity and planted stumps untested.')
        }
    finally:
        cap.release()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--interval-seconds', type=float, default=1.0)
    parser.add_argument('--max-frames', type=int, default=150)
    args = parser.parse_args()
    result = audit(args.video, args.interval_seconds, args.max_frames)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)
                           + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'],
                      'sampled_frames': result['sampled_frames'],
                      'local_pair_proposals': result['local_pair_proposals']}))


if __name__ == '__main__':
    main()
