#!/usr/bin/env python3
"""Research-only comparison of predicted MAP0105 slot sets with human labels.

This audit checks scene-level SET MEMBERSHIP, not individual stump pixels,
plant type, built/empty status, tracking continuity or safe production writes.
No screenshots, crop positions, usernames or source filenames are needed.
"""
import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
LABELS = HERE.parent / 'docs/research/autumn-map0105-13-screen-slot-confirmations.json'


def audit(predictions, reference, canonical_slots):
    if not isinstance(predictions, list) or not isinstance(reference, dict):
        raise ValueError('Expected predictions array and reference object')
    scenes = reference.get('screenshots')
    if reference.get('map_id') != 'MAP0105' or not isinstance(scenes, list):
        raise ValueError('Expected MAP0105 scene reference')
    if not isinstance(canonical_slots, (set, frozenset)) or len(canonical_slots) != 16:
        raise ValueError('Expected 16 canonical slots')
    known = {}
    for scene in scenes:
        if not isinstance(scene, dict):
            raise ValueError('Invalid reference scene')
        key, slots = scene.get('image_number'), scene.get('listed_slot_ids')
        if (not isinstance(key, str) or not key or key in known or
                not isinstance(slots, list) or len(set(slots)) != len(slots) or
                any(slot not in canonical_slots for slot in slots)):
            raise ValueError('Invalid reference scene or slot IDs')
        known[key] = set(slots)
    observed = set()
    results = []
    for row in predictions:
        if not isinstance(row, dict):
            raise ValueError('Invalid prediction')
        key, slots = row.get('image_number'), row.get('candidate_slot_ids')
        if (not isinstance(key, str) or key not in known or key in observed or
                not isinstance(slots, list) or any(not isinstance(s, str) for s in slots)
                or len(set(slots)) != len(slots) or
                any(s not in canonical_slots for s in slots)):
            raise ValueError('Unknown/duplicate image or invalid slot candidates')
        observed.add(key)
        predicted = set(slots)
        correct = predicted & known[key]
        extra = predicted - known[key]
        missing = known[key] - predicted
        results.append({
            'image_number': key,
            'reference_slot_count': len(known[key]),
            'predicted_slot_count': len(slots),
            'matched_slot_count': len(correct),
            'extra_slot_ids': sorted(extra),
            'missing_slot_ids': sorted(missing),
            'group_set_exact': not extra and not missing,
            'per_stump_correspondence_verified': False,
        })
    results.sort(key=lambda item: item['image_number'])
    return {
        'status': 'scene-slot-set-audit-only',
        'scenes_scored': len(results),
        'scenes_not_scored': len(known) - len(observed),
        'scene_sets_exact': sum(row['group_set_exact'] for row in results),
        'matched_slot_mentions': sum(row['matched_slot_count'] for row in results),
        'extra_slot_mentions': sum(len(row['extra_slot_ids']) for row in results),
        'missing_slot_mentions': sum(len(row['missing_slot_ids']) for row in results),
        'results': results,
        'slot_ids_verified_automatically': False,
        'pixel_positions_verified': False,
        'plant_type_verified': False,
        'production_application': 'forbidden',
        'note': ('Only a user-confirmed slot SET for each image is evaluated. '
                 'Matching sets does not establish which pixel belongs to '
                 'which slot, nor does it prove independent games.'),
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--predictions', type=Path, required=True,
                   help='Private JSON: {"screenshots":[{"image_number":"04","candidate_slot_ids":["O17"]}]}')
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--fail-on-extra-slot', action='store_true')
    args = p.parse_args()
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'stump_slot_reference', HERE / 'review-autumn-stump-map-track.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    labels = json.loads(LABELS.read_text(encoding='utf-8'))
    data = json.loads(args.predictions.read_text(encoding='utf-8'))
    report = audit(data['screenshots'], labels, module.canonical_slots())
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n',
                           encoding='utf-8')
    print(json.dumps({k: report[k] for k in
                      ('scenes_scored','scene_sets_exact','extra_slot_mentions',
                       'missing_slot_mentions')}, ensure_ascii=False))
    if args.fail_on_extra_slot and report['extra_slot_mentions']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
