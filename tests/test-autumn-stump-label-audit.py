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

    def test_invalid_inputs_rejected(self):
        with self.assertRaises(ValueError):
            m.audit([], {}, 20)
        with self.assertRaises(ValueError):
            m.audit([], {'positive_centers': []}, 0)
        with self.assertRaises(ValueError):
            m.audit([{'x': float('nan'), 'y': 1}], {'positive_centers': []})


if __name__ == '__main__':
    unittest.main()
