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
        cv2.ellipse(frame, (230, 120), (24, 16), 0, 0, 360,
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

    def test_cyan_tile_conflict_is_warning_not_rejection(self):
        hint = {'x': 230, 'y': 136,
                'cyan_structure_x': 230, 'cyan_structure_y': 120,
                'status': 'cyan-structure-base-hint-unverified'}
        results = m.annotate_cyan_tile_conflicts(
            [hint], [{'x': 231, 'y': 121}])
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['colored_tile_overlap'])
        self.assertEqual(results[0]['overlapping_tile_indices'], [0])
        self.assertEqual(results[0]['human_label'], 'unreviewed')
        self.assertEqual(hint['status'], 'cyan-structure-base-hint-unverified')
        safe = m.annotate_cyan_tile_conflicts(
            [hint], [{'x': 231, 'y': 140}])
        self.assertTrue(safe[0]['colored_tile_overlap'])
        # Source-center comparison means the predicted y+16 is not used.
        far = m.annotate_cyan_tile_conflicts(
            [hint], [{'x': 230, 'y': 147}], radius=20)
        self.assertFalse(far[0]['colored_tile_overlap'])
        with self.assertRaises(ValueError):
            m.annotate_cyan_tile_conflicts([], [], float('nan'))

    def test_edge_geometry_detects_two_strong_horizontal_bands(self):
        frame = np.full((288,512,3), 70, np.uint8)
        cv2.rectangle(frame, (170,105), (230,110), (240,240,240), -1)
        cv2.rectangle(frame, (170,123), (230,128), (240,240,240), -1)
        point = {'x': 200, 'y': 137}
        profile = m.horizontal_edge_profiles(frame, [point])[0]
        self.assertEqual(profile['status'], 'unverified-edge-geometry-profile')
        self.assertGreater(profile['horizontal_double_edge_score'], 0.1)
        self.assertLessEqual(profile['horizontal_separated_12px_score'],
                             profile['horizontal_double_edge_score'])
        self.assertGreaterEqual(profile['edge_band_separation_px'], 7)
        self.assertLessEqual(profile['edge_band_separation_px'], 26)

    def test_flat_edges_and_out_of_bounds_do_not_verify_stumps(self):
        frame = np.zeros((288,512,3), np.uint8)
        result = m.horizontal_edge_profiles(
            frame, [{'x': 200, 'y': 130}, {'x': 15, 'y': 10}])
        self.assertEqual(result[0]['horizontal_double_edge_score'], 0)
        self.assertEqual(result[1]['status'], 'edge-window-out-of-bounds')
        self.assertNotIn('verified_stump', result[0])
        with self.assertRaises(ValueError):
            m.horizontal_edge_profiles(np.zeros((120,512,3),np.uint8), [])

    def test_no_occupancy_inference(self):
        frame = np.zeros((288,512,3),dtype=np.uint8)
        result = m.compare(frame, [{'x':180,'y':90}])
        self.assertEqual(result['water_anchor_count'], 1)
        self.assertNotIn('occupancy', result)


if __name__ == '__main__':
    unittest.main()
