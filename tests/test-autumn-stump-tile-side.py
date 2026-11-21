#!/usr/bin/env python3
"""Tests for icon-agnostic anonymous stump/tile left-right association."""
import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-tile-side.py'
spec = importlib.util.spec_from_file_location('stump_side', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class StumpTileSideTests(unittest.TestCase):
    def test_left_and_right_without_tile_types(self):
        result = m.assess([{'x': 150, 'y': 90}, {'x': 350, 'y': 90}],
                          [{'x': 100, 'y': 105, 'tile_kind_candidate': 'Shop'},
                           {'x': 405, 'y': 105, 'tile_kind_candidate': 'Event'}])
        self.assertEqual(result['status'], 'local-side-proposals-only')
        self.assertEqual([p['tile_side_of_stump'] for p in result['matches']],
                         ['left', 'right'])
        self.assertFalse(result['slot_ids_verified'])
        self.assertEqual(result['production_application'], 'forbidden')

    def test_tile_type_changes_do_not_affect_pairing(self):
        stumps = [{'x': 200, 'y': 80}]
        a = m.assess(stumps, [{'x': 250, 'y': 90, 'tile_kind_candidate': 'Event'}])
        b = m.assess(stumps, [{'x': 250, 'y': 90, 'tile_kind_candidate': 'Shop'}])
        self.assertEqual(a, b)

    def test_ambiguous_neighbors_abstain(self):
        result = m.assess([{'x': 200, 'y': 80}],
                          [{'x': 150, 'y': 80}, {'x': 250, 'y': 80}])
        self.assertEqual(result['status'], 'abstain')
        self.assertEqual(result['matches'], [])

    def test_competing_stumps_cannot_claim_same_tile(self):
        result = m.assess([{'x': 100, 'y': 80}, {'x': 200, 'y': 80}],
                          [{'x': 150, 'y': 80}])
        self.assertEqual(result['status'], 'abstain')

    def test_no_tile_or_invalid_coordinate_abstains(self):
        self.assertEqual(m.assess([{'x': 100, 'y': 80}], [])['status'], 'abstain')
        self.assertEqual(m.assess([{'x': float('nan'), 'y': 80}],
                                  [{'x': 150, 'y': 80}])['status'], 'abstain')

    def test_duplicate_centers_abstain(self):
        self.assertEqual(m.assess([{'x': 100, 'y': 80}, {'x': 100, 'y': 80}],
                                  [{'x': 150, 'y': 80}])['reason'],
                         'duplicate-centers')


if __name__ == '__main__':
    unittest.main()
