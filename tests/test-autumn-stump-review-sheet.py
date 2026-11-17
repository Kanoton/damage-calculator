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

    def test_no_images_or_unreadable_image_fail(self):
        with self.assertRaises(ValueError):
            m.review([])
        with self.assertRaises(ValueError):
            m.review([Path('/missing-image.png')])


if __name__ == '__main__':
    unittest.main()
