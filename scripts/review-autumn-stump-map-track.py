#!/usr/bin/env python3
"""Research-only camera-continuous anonymous stump tracking and slot review.

Requires an EXTERNALLY human-reviewed slot anchor in the first frame for O IDs.
A same-view transform can propagate that anchor but can NEVER invent it. Two
explicit independently reviewed built observations yield a proposed review
item, not a production write. Missing frames, bad transforms, or disagreement
abstain; previously seen occupancy is never erased by disappearance.
"""
import argparse
import csv
import importlib.util
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
SLOTS_CSV = HERE.parent / 'csv/map_building_slots.csv'


def canonical_slots(path=SLOTS_CSV):
    """Load MAP0105's actual O/I slot identifiers; never invent O1..O16."""
    with path.open(encoding='utf-8-sig', newline='') as handle:
        ids = [row['slot_id'] for row in csv.DictReader(handle)
               if row['map_id'] == 'MAP0105']
    if len(ids) != 16 or len(set(ids)) != 16:
        raise ValueError('Expected 16 unique canonical MAP0105 slots')
    return frozenset(ids)




def _load_temporal():
    spec = importlib.util.spec_from_file_location(
        'stump_track_temporal', HERE / 'review-autumn-stump-side-temporal.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _valid_pair(pair):
    try:
        s, t = pair['stump'], pair['tile']
        sx, sy = float(s['x']), float(s['y'])
        tx, ty = float(t['x']), float(t['y'])
        side = pair['tile_side_of_stump']
        return (all(math.isfinite(v) for v in (sx, sy, tx, ty)) and
                side in ('left', 'right') and ((tx > sx) == (side == 'right')))
    except (KeyError, TypeError, ValueError, OverflowError):
        return False


def _validate_frame(frame):
    if not isinstance(frame, dict) or not isinstance(frame.get('pairs'), list):
        raise ValueError('Each frame must supply pairs')
    if not all(_valid_pair(pair) for pair in frame['pairs']):
        raise ValueError('Invalid pair geometry')
    # A repeated still image is not a second observation. Legacy untimed
    # frames remain useful for tracking, but cannot support build reviews.
    identity = frame.get('observation_id')
    time_ms = frame.get('observed_at_ms')
    if identity is not None and (not isinstance(identity, str) or not identity.strip()):
        raise ValueError('Invalid observation ID')
    if time_ms is not None and (isinstance(time_ms, bool) or
            not isinstance(time_ms, (int, float)) or
            not math.isfinite(time_ms) or time_ms < 0):
        raise ValueError('Invalid observation time')
    evidence = frame.get('building_evidence', [])
    if not isinstance(evidence, list):
        raise ValueError('building_evidence must be a list')
    seen = set()
    for item in evidence:
        if not isinstance(item, dict) or type(item.get('pair_index')) is not int:
            raise ValueError('Invalid building evidence')
        index = item['pair_index']
        if index < 0 or index >= len(frame['pairs']) or index in seen:
            raise ValueError('Duplicate or out-of-range evidence index')
        seen.add(index)
        if item.get('state') not in ('built', 'empty', 'unknown') or not isinstance(
                item.get('human_reviewed'), bool):
            raise ValueError('Invalid evidence state or review flag')


def track(frames, anchors=None):
    """Track candidate identity; never mutate a map or auto-approve buildings."""
    if not isinstance(frames, list) or not frames:
        raise ValueError('At least one frame required')
    seen_ids = set()
    last_time = None
    for frame in frames:
        _validate_frame(frame)
        identity = frame.get('observation_id')
        time_ms = frame.get('observed_at_ms')
        # Duplicate identifiers, even at later timestamps, cannot prove
        # independent frames. Reject these instead of silently counting.
        if identity is not None:
            if identity in seen_ids:
                raise ValueError('Duplicate observation ID')
            seen_ids.add(identity)
        if time_ms is not None:
            if last_time is not None and time_ms <= last_time:
                raise ValueError('Observation times must increase')
            last_time = time_ms
    anchors = [] if anchors is None else anchors
    if not isinstance(anchors, list):
        raise ValueError('anchors must be a list')
    valid_slots = canonical_slots()
    anchor_map, slot_set = {}, set()
    for anchor in anchors:
        if not isinstance(anchor, dict) or type(anchor.get('pair_index')) is not int:
            raise ValueError('Invalid anchor')
        idx, slot = anchor['pair_index'], anchor.get('slot_id')
        if (idx < 0 or idx >= len(frames[0]['pairs']) or idx in anchor_map
                or not isinstance(slot, str) or slot not in valid_slots or slot in slot_set
                or anchor.get('human_verified') is not True):
            raise ValueError('Anchors require unique human-verified MAP0105 O/I slots')
        anchor_map[idx] = slot
        slot_set.add(slot)
    temporal = _load_temporal()
    # Track IDs are temporary and NEVER map slot IDs on their own.
    mapping = {i: f'local-{i+1}' for i in range(len(frames[0]['pairs']))}
    slots = {f'local-{i+1}': anchor_map.get(i) for i in mapping}
    observations = {local: [] for local in slots}
    rows, disconnection = [], False
    for frame_index, frame in enumerate(frames):
        status = 'initial-anonymous-pairs' if frame_index == 0 else 'abstain'
        reason = 'unverified-map-identity' if frame_index == 0 else 'not-evaluated'
        if frame_index:
            if disconnection:
                mapping = {}
                reason = 'tracking-disconnected-reanchor-required'
            else:
                prior = frames[frame_index-1]
                affine = frame.get('affine_from_previous')
                result = temporal.consensus(prior['pairs'], frame['pairs'], affine,
                                            frame.get('camera_verified') is True)
                if result['status'] == 'stable-local-side-proposals-only':
                    mapping = {m['after_index']: mapping[m['before_index']]
                               for m in result['matches']}
                    status, reason = 'tracked-anonymous-pairs', result['reason']
                else:
                    mapping = {}
                    reason = result['reason']
                    disconnection = True
        for item in frame.get('building_evidence', []):
            local = mapping.get(item['pair_index'])
            if (local is not None and slots[local] is not None and
                    item['human_reviewed'] is True and item['state'] != 'unknown'):
                observations[local].append((frame_index, item['state']))
        rows.append({'frame_index': frame_index, 'status': status,
                     'reason': reason,
                     'tracked': [{'pair_index': i, 'temporary_track_id': local,
                                  'slot_id_if_human_anchored': slots[local]}
                                 for i, local in sorted(mapping.items())]})
    pending = []
    for local, indices in observations.items():
        built = [index for index, state in indices if state == 'built']
        empty = [index for index, state in indices if state == 'empty']
        # Count only truly different observations. Two mentions of the
        # same screenshot, or observations only milliseconds apart, must not
        # qualify as a supported building review.
        eligible = [(index, frames[index]['observed_at_ms'])
                    for index in built
                    if isinstance(frames[index].get('observation_id'), str)
                    and isinstance(frames[index].get('observed_at_ms'), (int, float))]
        independent = (len(eligible) >= 2 and
                       eligible[-1][1] - eligible[0][1] >= 300)
        if independent and not empty:
            pending.append({'slot_id': slots[local],
                            'temporary_track_id': local,
                            'supporting_frame_indices': built,
                            'status': 'human-review-only-not-applied'})
    conflicting = [slots[local] for local, records in observations.items()
                   if any(state == 'built' for _, state in records) and
                   any(state == 'empty' for _, state in records)]
    return {'frames': rows, 'human_verified_anchor_count': len(anchor_map),
            'conflicting_reviewed_build_states': conflicting,
            'pending_build_review': pending,
            'camera_tracking_disconnected': disconnection,
            'slot_ids_verified_automatically': False,
            'building_state_applied': False,
            'production_application': 'forbidden',
            'caveat': ('Only externally human-anchored slot IDs propagate through '
                       'verified two-center camera continuity. Explicit reviewed '
                       'building evidence is not a building classifier. Two observations '
                       'must have distinct IDs and timestamps at least 300ms apart.')}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--observations', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    data = json.loads(args.observations.read_text(encoding='utf-8'))
    report = track(data['frames'], data.get('anchors'))
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)
                           + '\n', encoding='utf-8')
    print(json.dumps({'tracked_frames': len(report['frames']),
                      'pending_review': len(report['pending_build_review'])}))


if __name__ == '__main__':
    main()
