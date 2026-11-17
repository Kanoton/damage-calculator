#!/usr/bin/env python3
"""End-to-end research pipeline contract tests; synthetic images only."""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-two-frame-audit.py'
spec = importlib.util.spec_from_file_location('stump_two_frame', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def pair(sx, sy, tx, ty):
    return {'stump': {'x': sx, 'y': sy},
            'tile': {'x': tx, 'y': ty},
            'tile_side_of_stump': 'right' if tx > sx else 'left'}


def report(pairs):
    return {'water_stump_candidates': len(pairs), 'anonymous_pairs': pairs}


class TwoFrameAuditTests(unittest.TestCase):
    def setUp(self):
        self.image = np.zeros((288, 512, 3), dtype=np.uint8)

    def test_rejects_bad_shape(self):
        with self.assertRaises(ValueError):
            m.analyze(self.image, np.zeros((50, 50, 3), dtype=np.uint8))

    def test_no_board_continuity_cannot_approve_pair(self):
        pairs = [pair(120, 100, 170, 110)]
        with patch.object(m.frames, 'analyze', return_value=report(pairs)), patch.object(
                m.camera, 'continuity',
                return_value={'status': 'abstain', 'reason': 'weak-board-geometry'}):
            result = m.analyze(self.image, self.image)
        self.assertEqual(result['status'], 'abstain')
        self.assertEqual(result['reason'], 'camera-continuity-not-verified')
        self.assertEqual(result['production_application'], 'forbidden')

    def test_verified_camera_translation_tracks_both_centers(self):
        before = [pair(120, 100, 170, 110)]
        after = [pair(130, 106, 180, 116)]
        with patch.object(m.frames, 'analyze', side_effect=[
                report(before), report(after)]), patch.object(
                m.camera, 'continuity',
                return_value={'status': 'same-view-candidate',
                              'reason': 'board-continuity-only',
                              'affine_2x3': [[1, 0, 10], [0, 1, 6]],
                              'inliers': 52, 'inlier_ratio': 0.91}):
            result = m.analyze(self.image, self.image)
        self.assertEqual(result['status'], 'stable-local-side-proposals-only')
        self.assertEqual(len(result['stable_pairs']), 1)
        self.assertFalse(result['slot_ids_verified'])
        self.assertEqual(result['plant_type'], 'unknown')

    def test_one_frame_missing_pairs_abstains(self):
        with patch.object(m.frames, 'analyze', side_effect=[
                report([pair(120, 100, 170, 110)]), report([])]), patch.object(
                m.camera, 'continuity',
                return_value={'status': 'same-view-candidate',
                              'reason': 'board-continuity-only',
                              'affine_2x3': [[1, 0, 0], [0, 1, 0]]}):
            result = m.analyze(self.image, self.image)
        self.assertEqual(result['status'], 'abstain')
        self.assertEqual(result['reason'], 'missing-pairs')

    def test_real_blank_frames_abstain(self):
        result = m.analyze(self.image, self.image)
        self.assertEqual(result['status'], 'abstain')
        self.assertEqual(result['stable_pairs'], [])


if __name__ == '__main__':
    unittest.main()
