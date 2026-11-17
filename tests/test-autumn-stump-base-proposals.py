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

    def test_pale_platform_without_blue_water(self):
        frame = np.zeros((288, 512, 3), dtype=np.uint8)
        cv2.rectangle(frame, (200, 115), (250, 143), (175, 204, 244), -1)
        candidates = m.pale_platform_proposals(frame)
        self.assertGreaterEqual(len(candidates), 1)
        self.assertEqual(candidates[0]['surrounding_water_ratio'], 0.0)
        self.assertEqual(candidates[0]['status'], 'pale-platform-looking-unverified')

    def test_pale_platform_water_context_is_optional(self):
        frame = np.zeros((288, 512, 3), dtype=np.uint8)
        cv2.rectangle(frame, (180, 85), (275, 169), (100, 130, 70), -1)
        cv2.rectangle(frame, (200, 110), (247, 143), (175, 204, 244), -1)
        candidates = m.pale_platform_proposals(frame)
        self.assertGreaterEqual(len(candidates), 1)
        self.assertGreater(candidates[0]['surrounding_water_ratio'], 0.0)
        self.assertFalse(m.compare(frame, [])['planted_stumps_verified'])

    def test_pale_platform_input_guard(self):
        with self.assertRaises(ValueError):
            m.pale_platform_proposals(np.zeros((50, 50, 3), dtype=np.uint8))

    def test_cyan_structural_hint_without_empty_water(self):
        frame = np.zeros((288, 512, 3), dtype=np.uint8)
        # Cyan flower-like structure, no brown base or empty water bowl.
        cv2.ellipse(frame, (230, 120), (27, 20), 0, 0, 360,
                    (230, 210, 90), -1)
        hints = m.cyan_structure_base_proposals(frame)
        self.assertGreaterEqual(len(hints), 1)
        self.assertEqual(hints[0]['status'],
                         'cyan-structure-base-hint-unverified')
        self.assertGreater(hints[0]['y'], hints[0]['cyan_structure_y'])
        self.assertFalse(m.compare(frame, [])['planted_stumps_verified'])

    def test_cyan_structural_blank_and_input_validation(self):
        self.assertEqual(m.cyan_structure_base_proposals(
            np.zeros((288, 512, 3), dtype=np.uint8)), [])
        with self.assertRaises(ValueError):
            m.cyan_structure_base_proposals(
                np.zeros((120, 512, 3), dtype=np.uint8))

    def test_no_occupancy_inference(self):
        frame = np.zeros((288,512,3),dtype=np.uint8)
        result = m.compare(frame, [{'x':180,'y':90}])
        self.assertEqual(result['water_anchor_count'], 1)
        self.assertNotIn('occupancy', result)


if __name__ == '__main__':
    unittest.main()
