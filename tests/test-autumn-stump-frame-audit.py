#!/usr/bin/env python3
"""Research-only stump-frame pipeline regression; synthetic pixels are not footage."""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch
import cv2
import numpy as np

P = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-frame-audit.py'
spec = importlib.util.spec_from_file_location('stump_frame', P)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class StumpFrameTests(unittest.TestCase):
    def test_blank_image_abstains_without_five_symbols(self):
        frame = np.zeros((288, 512, 3), dtype=np.uint8)
        report = m.analyze(frame)
        self.assertEqual(report['status'], 'abstain')
        self.assertEqual(report['local_side_matches'], [])
        self.assertEqual(report['production_application'], 'forbidden')

    def test_color_body_center_without_icon_glyph(self):
        frame = np.zeros((288, 512, 3), dtype=np.uint8)
        # BGR blue, 33x25 body: no center symbol and no five-symbol sequence.
        cv2.rectangle(frame, (200, 95), (233, 119), (220, 80, 15), -1)
        self.assertGreaterEqual(len(m.tile_centers(frame)), 1)

    def test_side_association_does_not_need_tile_kind(self):
        frame = np.zeros((288, 512, 3), dtype=np.uint8)
        with patch.object(m.pots, 'propose',
                          return_value=[{'x': 180, 'y': 100}]), patch.object(
                m, 'tile_centers', return_value=[{'x': 230, 'y': 108}]):
            report = m.analyze(frame)
        self.assertEqual(report['status'], 'local-side-proposals-only')
        self.assertEqual(report['local_side_matches'][0]['tile_side_of_stump'],
                         'right')
        self.assertFalse(report['slot_ids_verified'])
        self.assertEqual(report['plant_type'], 'unknown')

    def test_invalid_frame_rejected(self):
        with self.assertRaises(ValueError):
            m.analyze(np.zeros((100, 100, 3), dtype=np.uint8))


if __name__ == '__main__':
    unittest.main()
