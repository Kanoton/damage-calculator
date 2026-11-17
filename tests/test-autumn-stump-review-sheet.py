#!/usr/bin/env python3
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-review-sheet.py'
spec = importlib.util.spec_from_file_location('stump_sheet', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ReviewSheetTests(unittest.TestCase):
    def test_two_images_make_read_only_contact_sheet(self):
        with tempfile.TemporaryDirectory() as d:
            paths = [Path(d) / (str(i)+'.png') for i in range(2)]
            for path in paths:
                self.assertTrue(cv2.imwrite(str(path),
                                            np.zeros((288,512,3),dtype=np.uint8)))
            sheet, result = m.review(paths)
            self.assertEqual(sheet.shape, (288, 1024, 3))
            self.assertEqual(len(result['images']), 2)
            self.assertFalse(result['slot_ids_verified'])
            self.assertFalse(result['manual_verified'])
            self.assertEqual(result['production_application'], 'forbidden')

    def test_annotations_do_not_mutate_source_image(self):
        original = np.zeros((288, 512, 3), dtype=np.uint8)
        data = {'anonymous_pairs': [{
            'stump': {'x': 100, 'y': 100},
            'tile': {'x': 150, 'y': 110},
            'tile_side_of_stump': 'right'
        }]}
        marked = m.annotate(original, data)
        self.assertGreater(np.count_nonzero(marked), 0)
        self.assertEqual(np.count_nonzero(original), 0)

    def test_brown_candidate_review_ids_are_not_slot_ids(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'brown.png'
            frame = np.zeros((288, 512, 3), dtype=np.uint8)
            cv2.rectangle(frame, (180,110), (216,130), (60,100,155), -1)
            self.assertTrue(cv2.imwrite(str(path), frame))
            sheet, result = m.review([path])
            candidates = result['images'][0]['brown_candidates']
            self.assertGreaterEqual(len(candidates), 1)
            self.assertEqual(candidates[0]['candidate_id'], 'B1')
            self.assertEqual(candidates[0]['human_label'], 'unreviewed')
            self.assertFalse(result['slot_ids_verified'])
            self.assertEqual(sheet.shape, (288, 1024, 3))

    def test_tan_platform_review_remains_unverified(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'pale.png'
            frame = np.zeros((288, 512, 3), dtype=np.uint8)
            cv2.rectangle(frame, (200, 115), (250, 143), (175, 204, 244), -1)
            self.assertTrue(cv2.imwrite(str(path), frame))
            sheet, result = m.review([path])
            candidates = result['images'][0]['pale_platform_candidates']
            self.assertGreaterEqual(len(candidates), 1)
            self.assertEqual(candidates[0]['candidate_id'], 'T1')
            self.assertEqual(candidates[0]['human_label'], 'unreviewed')
            self.assertFalse(result['slot_ids_verified'])
            self.assertEqual(sheet.shape, (288, 1024, 3))

    def test_cyan_structure_hint_is_separate_unreviewed_channel(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'cyan-structure.png'
            frame = np.zeros((288, 512, 3), dtype=np.uint8)
            cv2.ellipse(frame, (230, 120), (27, 20), 0, 0, 360,
                        (230, 210, 90), -1)
            self.assertTrue(cv2.imwrite(str(path), frame))
            _, result = m.review([path])
            hints = result['images'][0]['cyan_structure_hints']
            self.assertGreaterEqual(len(hints), 1)
            self.assertEqual(hints[0]['candidate_id'], 'S1')
            self.assertEqual(hints[0]['human_label'], 'unreviewed')
            self.assertFalse(result['slot_ids_verified'])

    def test_no_images_or_unreadable_image_fail(self):
        with self.assertRaises(ValueError):
            m.review([])
        with self.assertRaises(ValueError):
            m.review([Path('/missing-image.png')])


if __name__ == '__main__':
    unittest.main()
