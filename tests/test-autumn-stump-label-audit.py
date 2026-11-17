#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-label-audit.py'
spec = importlib.util.spec_from_file_location('stump_labels', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class LabelAuditTests(unittest.TestCase):
    def test_partial_labels_never_claim_precision(self):
        candidates = [{'x': 102, 'y': 120}, {'x': 300, 'y': 90}]
        r = m.audit(candidates, {'positive_centers': [{'x': 100, 'y': 120}],
                                 'exhaustive': False})
        self.assertEqual(r['matched_positive_count'], 1)
        self.assertIsNone(r['precision'])
        self.assertIsNone(r['false_positive_count'])
        self.assertEqual(r['unreviewed_candidate_count'], 1)
        self.assertFalse(r['slot_ids_verified'])

    def test_exhaustively_labeled_candidates_report_false_positive(self):
        candidates = [{'x': 100, 'y': 120}, {'x': 300, 'y': 90}]
        r = m.audit(candidates, {'positive_centers': [{'x': 100, 'y': 120}],
                                 'exhaustive': True})
        self.assertEqual(r['false_positive_count'], 1)
        self.assertEqual(r['precision'], 0.5)

    def test_one_candidate_cannot_match_two_labels(self):
        r = m.audit([{'x': 100, 'y': 100}],
                    {'positive_centers': [{'x': 100, 'y': 100},
                                          {'x': 105, 'y': 100}]})
        self.assertEqual(r['matched_positive_count'], 1)
        self.assertEqual(r['missed_labeled_positives'], 1)

    def test_competing_candidates_maximize_recall_not_greedy(self):
        # Label A is slightly closer to C1 but can also match C2.
        # Label B can only match C1. Greedy would incorrectly return one.
        candidates = [{'x': 0, 'y': 0}, {'x': 9, 'y': 0}]
        labels = {'positive_centers': [
            {'x': 2, 'y': 0}, {'x': -2, 'y': 0}], 'exhaustive': False}
        report = m.audit(candidates, labels, max_distance=9.0)
        self.assertEqual(report['matched_positive_count'], 2)
        self.assertEqual(report['missed_labeled_positives'], 0)
        self.assertEqual({m['candidate_index'] for m in report['matches']},
                         {0, 1})
        self.assertIsNone(report['precision'])

    def test_invalid_inputs_rejected(self):
        with self.assertRaises(ValueError):
            m.audit([], {}, 20)
        with self.assertRaises(ValueError):
            m.audit([], {'positive_centers': []}, 0)
        with self.assertRaises(ValueError):
            m.audit([{'x': float('nan'), 'y': 1}], {'positive_centers': []})


if __name__ == '__main__':
    unittest.main()
