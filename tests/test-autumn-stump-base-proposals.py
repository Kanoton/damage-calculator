#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

import cv2
import numpy as np

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-base-proposals.py'
spec = importlib.util.spec_from_file_location('stump_base', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class BaseTests(unittest.TestCase):
    def test_brown_base_detected_without_cyan(self):
        frame = np.zeros((288,512,3), dtype=np.uint8)
        # Synthetic platform-like brown shape, with no water-color pixels.
        cv2.rectangle(frame, (180,110), (216,130), (60,100,155), -1)
        result = m.compare(frame, [])
        self.assertGreaterEqual(result['base_candidate_count'], 1)
        self.assertFalse(result['planted_stumps_verified'])
        self.assertFalse(result['slot_ids_verified'])
        self.assertEqual(result['production_application'], 'forbidden')

    def test_blank_and_wrong_size(self):
        self.assertEqual(m.propose(np.zeros((288,512,3),dtype=np.uint8)), [])
        with self.assertRaises(ValueError):
            m.propose(np.zeros((100,100,3),dtype=np.uint8))

    def test_tile_overlap_is_separated_but_raw_preserved(self):
        frame = np.zeros((288,512,3), dtype=np.uint8)
        cv2.rectangle(frame, (180,110), (216,130), (60,100,155), -1)
        baseline = m.compare(frame, [])
        self.assertGreater(baseline['base_candidate_count'], 0)
        p = baseline['brown_base_candidates'][0]
        report = m.compare(frame, [], [{'x': p['x'], 'y': p['y']}])
        self.assertEqual(report['tile_overlap_count'], 1)
        self.assertEqual(report['non_tile_overlap_count'], 0)
        self.assertEqual(report['base_candidate_count'], 1)
        self.assertFalse(report['planted_stumps_verified'])

    def test_tile_overlap_radius_guard(self):
        with self.assertRaises(ValueError):
            m.exclude_tile_overlaps([], [], 0)

    def test_no_occupancy_inference(self):
        frame = np.zeros((288,512,3),dtype=np.uint8)
        result = m.compare(frame, [{'x':180,'y':90}])
        self.assertEqual(result['water_anchor_count'], 1)
        self.assertNotIn('occupancy', result)


if __name__ == '__main__':
    unittest.main()
