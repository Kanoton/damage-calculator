#!/usr/bin/env python3
"""Research-only video runner: board continuity -> rim links -> track segments.

Private JSON manifest:
{"game":"play-id", "video":"local.mp4", "seconds":[8,9.5,...],
 "centers":[[160,149],[221,113],[273,84]]}
Crop centers are manually selected for a SAME near-static viewpoint; if camera
moves, subsequent local crops can be wrong and must abstain. This runner does
NOT locate pots, identify 16 map slots, plants, empty/occupied or apply results.
No frame, filename or input game ID is included in the report.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np

HERE = Path(__file__).resolve().parent


def _load(name, alias):
    spec = importlib.util.spec_from_file_location(alias, HERE / name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


camera = _load('review-autumn-camera-transition.py', 'board_continuity')
correspond = _load('review-autumn-pot-temporal.py', 'pot_temporal')
sessions = _load('review-autumn-pot-track-session.py', 'pot_sessions')


def _validate_centers(centers):
    if not isinstance(centers, list) or not centers or len(centers) > 16:
        raise ValueError('Provide 1..16 manually reviewed pot centers')
    checked = []
    for center in centers:
        if not isinstance(center, (list, tuple)) or len(center) != 2:
            raise ValueError('Invalid crop center')
        x, y = center
        if any(type(v) is not int for v in (x, y)):
            raise ValueError('Centers must be integers')
        if x < 48 or x + 48 > 512 or y < 54 or y + 42 > 288:
            raise ValueError('Crop center outside frame')
        checked.append((x, y))
    if len(set(checked)) != len(checked):
        raise ValueError('Duplicate manually selected pot center')
    return checked


def evaluate_frames(frames, centers, game, camera_fn=None, rim_fn=None):
    """List of (actual video timestamp milliseconds, 512x288 BGR frame).

    Optional injected functions are only for the isolated synthetic orchestration
    tests; do not treat them as real algorithm evaluations.
    """
    centers = _validate_centers(centers)
    if not isinstance(game, str) or not game.strip():
        raise ValueError('A nonempty independent game label is required')
    if not isinstance(frames, list) or not frames:
        raise ValueError('At least one decoded frame required')
    camera_fn = camera_fn or camera.continuity
    rim_fn = rim_fn or correspond.assess_grid
    previous = None
    observations = []
    pair_summaries = []
    for ts, frame in frames:
        if not sessions._valid_timestamp(ts):
            raise ValueError('Invalid timestamp')
        if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
            raise ValueError('Frame must be 512x288 BGR')
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        crops = [rgb[y-54:y+42, x-48:x+48] for x, y in centers]
        item = {'game': game, 'timestamp_ms': ts}
        if previous is not None:
            p_ts, p_frame, p_crops = previous
            board = camera_fn(p_frame, frame)
            rim = rim_fn(p_crops, crops, p_ts, ts)
            item['continuity'] = {'status': board['status']}
            item['tracking'] = rim
            pair_summaries.append({'from_ms': round(p_ts, 3), 'to_ms': round(ts, 3),
                                   'board_status': board['status'],
                                   'rim_pairs': len(rim['matched']),
                                   'rim_abstained': rim['abstained']})
        observations.append(item)
        previous = (ts, frame, crops)
    record = sessions.run(observations)
    # Only generic statistics, no input path, game name, screenshots or coords.
    return {'frames': record['frames'], 'segments': record['segments'],
            'candidate_observations': record['candidates'],
            'pair_summaries': pair_summaries,
            'events': record['events'],
            'note': ('Same-game research with manually selected screen crop centers; '
                     'no verified slot IDs, plant names or actual occupancy. '
                     'Never call applyRecognized from this report.')}


def read_video(path, seconds):
    if not isinstance(seconds, list) or len(seconds) < 1 or len(seconds) > 300:
        raise ValueError('Supply 1..300 timestamps')
    if not all(type(x) in (float, int) and np.isfinite(x) and x >= 0 for x in seconds):
        raise ValueError('Timestamps must be nonnegative finite numbers')
    if any(b <= a for a, b in zip(seconds, seconds[1:])):
        raise ValueError('Timestamps must increase strictly')
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError('Could not open video')
    frames = []
    try:
        for sec in seconds:
            cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
            ok, raw = cap.read()
            if not ok:
                raise ValueError('Could not decode requested timestamp')
            frames.append((float(cap.get(cv2.CAP_PROP_POS_MSEC)),
                           cv2.resize(raw, (512, 288))))
    finally:
        cap.release()
    return frames


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    info = json.loads(args.manifest.read_text(encoding='utf-8'))
    report = evaluate_frames(read_video(info['video'], info['seconds']),
                             info['centers'], info['game'])
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({x:report[x] for x in ('frames','segments','candidate_observations')}))


if __name__ == '__main__':
    main()
