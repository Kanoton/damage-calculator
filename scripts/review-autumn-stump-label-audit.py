#!/usr/bin/env python3
"""Review-only evaluation of tan candidate centers against independent labels.

Missing/partial labels must not create a fabricated precision or false-positive
rate. No photos or videos are stored in the repository and no state is written.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import cv2

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    'stump_label_platform', HERE / 'review-autumn-stump-base-proposals.py')
bases = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bases)


def audit(candidates, annotations, max_distance=20.0):
    if not math.isfinite(max_distance) or max_distance <= 0:
        raise ValueError('Invalid max distance')
    if not isinstance(annotations, dict) or 'positive_centers' not in annotations:
        raise ValueError('positive_centers required')
    positives = annotations['positive_centers']
    if not isinstance(positives, list) or not isinstance(candidates, list):
        raise ValueError('Expected candidate and label arrays')
    for point in candidates + positives:
        if not isinstance(point, dict) or not all(
                isinstance(point.get(k), (int, float)) and
                math.isfinite(point[k]) for k in ('x', 'y')):
            raise ValueError('Invalid candidate or label coordinates')
    # Maximum-cardinality bipartite matching. A greedy nearest-first choice
    # can strand a label which has only one viable candidate.
    edges = []
    for positive in positives:
        nearby = sorted(
            (math.hypot(positive['x']-candidate['x'],
                        positive['y']-candidate['y']), j)
            for j, candidate in enumerate(candidates))
        edges.append([(j, distance) for distance, j in nearby
                      if distance <= max_distance])
    candidate_to_label = {}

    def assign(label_index, seen):
        for candidate_index, _ in edges[label_index]:
            if candidate_index in seen:
                continue
            seen.add(candidate_index)
            previous = candidate_to_label.get(candidate_index)
            if previous is None or assign(previous, seen):
                candidate_to_label[candidate_index] = label_index
                return True
        return False

    for label_index in sorted(range(len(positives)),
                              key=lambda i: (len(edges[i]), i)):
        assign(label_index, set())
    matches = sorted(
        [{'label_index': label_index, 'candidate_index': candidate_index,
          'distance': round(math.hypot(
              positives[label_index]['x']-candidates[candidate_index]['x'],
              positives[label_index]['y']-candidates[candidate_index]['y']), 2)}
         for candidate_index, label_index in candidate_to_label.items()],
        key=lambda match: match['label_index'])
    complete = annotations.get('exhaustive', False) is True
    unmatched = len(candidates)-len(candidate_to_label)
    return {
        'status': 'complete-label-evaluation' if complete else 'partial-label-evaluation',
        'labeled_positive_count': len(positives),
        'matched_positive_count': len(matches),
        'missed_labeled_positives': len(positives)-len(matches),
        'candidate_count': len(candidates),
        'matches': matches,
        'positive_recall_on_labeled_points': (
            round(len(matches)/len(positives), 4) if positives else None),
        'false_positive_count': unmatched if complete else None,
        'precision': (round(len(matches)/len(candidates), 4)
                      if complete and candidates else None),
        'unreviewed_candidate_count': None if complete else unmatched,
        'slot_ids_verified': False,
        'production_application': 'forbidden'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', type=Path, required=True)
    parser.add_argument('--labels', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    frame = cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Cannot decode image')
    frame = cv2.resize(frame, (512, 288), interpolation=cv2.INTER_AREA)
    annotations = json.loads(args.labels.read_text(encoding='utf-8'))
    if annotations.get('image') != args.image.name:
        raise ValueError('Annotation file does not match input image name')
    proposals = bases.pale_platform_proposals(frame)
    report = audit(proposals, annotations)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)
                           + chr(10), encoding='utf-8')
    print(json.dumps({'status': report['status'],
                      'matched': report['matched_positive_count'],
                      'labeled': report['labeled_positive_count']}))


if __name__ == '__main__':
    main()
