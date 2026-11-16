"""Synthetic contract for board-wide continuity; not real-game success proof."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-camera-transition.py'
spec = importlib.util.spec_from_file_location('camera_gate', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def board(seed=3):
    rng = np.random.default_rng(seed)
    image = np.zeros((288, 512, 3), np.uint8)
    for _ in range(260):
        x = int(rng.integers(100, 480))
        y = int(rng.integers(45, 210))
        color = tuple(map(int, rng.integers(45, 250, 3)))
        cv2.circle(image, (x, y), int(rng.integers(2, 5)), color, -1)
    return image


class CameraTransitionTests(unittest.TestCase):
    def test_same_view_with_new_frame_noise_is_candidate(self):
        a = board()
        b = a.copy()
        b[2:10, 3:10] = 140
        answer = module.continuity(a, b)
        self.assertEqual(answer['status'], 'same-view-candidate', answer)
        self.assertGreaterEqual(answer['regions_before'], 3)

    def test_unrelated_board_abstains(self):
        answer = module.continuity(board(1), board(2))
        self.assertEqual(answer['status'], 'abstain', answer)

    def test_missing_or_wrong_size_abstains(self):
        answer = module.continuity(np.zeros((288, 512, 3), np.uint8), board())
        self.assertEqual(answer['reason'], 'missing-board-features')
        with self.assertRaises(ValueError):
            module.continuity(board(), np.zeros((200, 512, 3), np.uint8))

    def test_hud_only_changes_do_not_create_board_evidence(self):
        a = np.zeros((288, 512, 3), np.uint8)
        b = a.copy()
        a[:30] = board()[:30]
        b[:30] = board(4)[:30]
        self.assertEqual(module.continuity(a, b)['status'], 'abstain')


if __name__ == '__main__':
    unittest.main()
