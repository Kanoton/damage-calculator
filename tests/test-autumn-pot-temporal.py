"""Temporal rim association tests; synthetic data is not real-video accuracy."""
import importlib.util
import unittest
import numpy as np
import cv2
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-pot-temporal.py'
spec = importlib.util.spec_from_file_location('temporal_rim', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture(seed):
    rng = np.random.default_rng(seed)
    frame = np.full((96, 96, 3), 100, np.uint8)
    for _ in range(40):
        x = int(rng.integers(22, 80))
        y = int(rng.integers(75, 91))
        cv2.line(frame, (x, y), (min(95, x + 2), min(95, y + 1)),
                 tuple(map(int, rng.integers(0, 255, 3))), 1)
    return frame


class TemporalRimTests(unittest.TestCase):
    def test_timestamp_and_near_duplicate_rejected(self):
        old = fixture(5)
        changed = old.copy()
        changed[0, 0] = 0
        self.assertEqual(module.assess_pair(old, changed, 1000, 1000)['reason'],
                         'not-independent-in-time')
        self.assertEqual(module.assess_pair(old, old, 1000, 2000)['reason'],
                         'identical-or-near-duplicate')
        self.assertEqual(module.assess_pair(old, changed, 1000, 2000)['reason'],
                         'identical-or-near-duplicate')
        self.assertEqual(module.assess_pair(old, changed, float('nan'), 2000)['reason'],
                         'invalid-timestamp')

    def test_separate_shifted_frames_can_be_candidates(self):
        old = fixture(11)
        new = cv2.warpAffine(old, np.float32([[1, 0, 3], [0, 1, -2]]), (96, 96))
        result = module.assess_pair(old, new, 1000, 1600)
        self.assertEqual(result['status'], 'temporal-rim-candidate', result)
        self.assertEqual((result['dx'], result['dy']), (3, -2))

    def test_unique_correspondences_and_wrong_crops(self):
        old_a, old_b = fixture(21), fixture(47)
        shift = lambda v: cv2.warpAffine(v, np.float32([[1, 0, 2], [0, 1, 1]]), (96, 96))
        result = module.assess_grid([old_a, old_b], [shift(old_a), shift(old_b)],
                                    1000, 1800)
        self.assertFalse(result['abstained'], result)
        self.assertEqual([(x['before'], x['after']) for x in result['matched']],
                         [(0, 0), (1, 1)])

    def test_duplicate_crops_do_not_get_multiple_slot_matches(self):
        old = fixture(81)
        shifted = cv2.warpAffine(old, np.float32([[1, 0, 2], [0, 1, 1]]), (96, 96))
        result = module.assess_grid([old, old], [shifted, shifted], 1000, 1800)
        self.assertTrue(result['abstained'])
        self.assertEqual(result['matched'], [])


if __name__ == '__main__':
    unittest.main()
