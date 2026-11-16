#!/usr/bin/env python3
"""Offline safe segmenting of board/rim observations. NEVER assign a map slot.

Input is an ordered, manually prepared JSON array of frames. Each frame has:
{game, timestamp_ms, continuity:{status:"same-view-candidate"},
 tracking:{matched:[{before:0, after:0}, ...], abstained:false}}
First frame of a segment may omit continuity/tracking (acquires anchor only).
All metadata is untrusted, research-only. No raw frames required.
"""
import argparse
import json
from pathlib import Path

MIN_DELTA_MS = 300
MAX_GAP_MS = 5000


def _valid_timestamp(value):
    return type(value) in (int, float) and value == value and abs(value) != float('inf') and value >= 0


def _clean_matches(rows):
    if not isinstance(rows, list) or not rows:
        return None
    pairs = []
    for item in rows:
        if not isinstance(item, dict):
            return None
        i, j = item.get('before'), item.get('after')
        if type(i) is not int or type(j) is not int or i < 0 or j < 0:
            return None
        pairs.append((i, j))
    if len({p[0] for p in pairs}) != len(pairs) or len({p[1] for p in pairs}) != len(pairs):
        return None
    return sorted(pairs)


def run(frames):
    """Never carry identities across uncertain transitions or sessions.

    Track IDs are ephemeral segment-local indices, NOT the 16 slot IDs.
    Candidates need two consecutive *valid transitions* (three real frames).
    A rejected transition resets the streak completely, not a soft pause.
    """
    if not isinstance(frames, list):
        raise ValueError('frames must be a list')
    state = None
    epoch = 0
    events = []
    for idx, frame in enumerate(frames):
        if not isinstance(frame, dict):
            raise ValueError('frame must be an object')
        game, ts = frame.get('game'), frame.get('timestamp_ms')
        if not isinstance(game, str) or not game.strip() or not _valid_timestamp(ts):
            raise ValueError('each frame needs a game label and nonnegative timestamp')
        result = {'frame': idx, 'timestamp_ms': ts, 'status': 'abstain',
                  'reason': 'uninitialized', 'segment': None, 'track_candidates': []}
        if state is None or game != state['game']:
            epoch += 1
            state = {'game': game, 'timestamp': ts, 'epoch': epoch,
                     'streaks': {}}
            result.update(status='anchor-only', reason='new-segment', segment=epoch)
            events.append(result)
            continue
        delta = ts - state['timestamp']
        if delta <= 0 or delta < MIN_DELTA_MS or delta > MAX_GAP_MS:
            reason = 'timestamp-regression-or-duplicate' if delta <= 0 else (
                'insufficient-time-separation' if delta < MIN_DELTA_MS else 'gap-too-large')
        elif (not isinstance(frame.get('continuity'), dict)
              or frame['continuity'].get('status') != 'same-view-candidate'):
            reason = 'unverified-board-continuity'
        elif (not isinstance(frame.get('tracking'), dict)
              or frame['tracking'].get('abstained') is not False):
            reason = 'unverified-rim-correspondences'
        else:
            pairs = _clean_matches(frame['tracking'].get('matched'))
            reason = 'invalid-or-duplicate-correspondences' if pairs is None else None
        if reason is not None:
            # A failed transition cannot preserve a previous slot hypothesis.
            epoch += 1
            state = {'game': game, 'timestamp': ts, 'epoch': epoch, 'streaks': {}}
            result.update(status='anchor-only', reason=reason, segment=epoch)
            events.append(result)
            continue
        previous = state['streaks']
        new_streaks = {}
        candidates = []
        for before, after in pairs:
            old = previous.get(before)
            # A local index is not evidence of a MAP0105 slot.
            count = old['count'] + 1 if old is not None else 1
            source = old['source'] if old is not None else before
            new_streaks[after] = {'count': count, 'source': source}
            if count >= 2:
                candidates.append({'local_track': source, 'current_index': after,
                                   'confirmed_transitions': count})
        state = {'game': game, 'timestamp': ts, 'epoch': epoch, 'streaks': new_streaks}
        result.update(status='temporal-candidate-only' if candidates else 'collecting',
                      reason='same-view-not-slot-verified', segment=epoch,
                      track_candidates=candidates)
        events.append(result)
    return {'frames': len(events), 'segments': epoch,
            'candidates': sum(len(row['track_candidates']) for row in events),
            'events': events,
            'note': ('Segment-local track indexes are NOT MAP0105 slot IDs. '
                     'Camera verification and rim pairing must be independently derived. '
                     'No plant type, occupancy or state update is allowed.')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    frames = json.loads(args.manifest.read_text(encoding='utf-8'))['frames']
    result = run(frames)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key: result[key] for key in ('frames', 'segments', 'candidates')}))


if __name__ == '__main__':
    main()
