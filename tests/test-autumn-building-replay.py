"""Synthetic regression for safe replay registration. No real user images required."""
import importlib.util
import pathlib
import unittest
import numpy as np

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts/review-autumn-building-replay.py"
spec = importlib.util.spec_from_file_location("autumn_review", SCRIPT)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


class TestAutumnBuildingViewpoints(unittest.TestCase):
    def setUp(self):
        self.landmarks = {"damage": (100, 100), "move": (250, 105), "monster": (180, 210)}
        self.slots = {"O04": (175, 155), "O05": (180, 185)}
        matrix = np.array([[1.10, -.10], [.10, 1.10]])
        shift = np.array([250, 80])
        self.found = {key: [(.95, tuple(matrix @ np.asarray(pos) + shift))]
                      for key, pos in self.landmarks.items()}

    def test_three_independent_landmarks(self):
        result = review.solve_geometry(self.landmarks, self.found, self.slots)
        self.assertTrue(result and result["registration_verified"])
        self.assertEqual(result["slots"]["O04"], [427, 268])
        self.assertFalse(result["auto_apply"])
        self.assertIsNone(result["plant_type"])

    def test_third_landmark_required(self):
        self.found["monster"] = [(.96, (490, 420))]
        self.assertIsNone(review.solve_geometry(self.landmarks, self.found, self.slots))

    def test_two_landmarks_not_enough(self):
        self.assertIsNone(review.solve_geometry(
            {"damage": (100, 100), "move": (250, 105)}, self.found, self.slots))

    def test_collinear_landmarks_not_enough(self):
        straight = {"damage": (100, 100), "move": (180, 100), "monster": (260, 100)}
        self.assertIsNone(review.solve_geometry(straight, self.found, self.slots))

    def test_ambiguous_repeated_landmarks_rejected(self):
        for key in self.found:
            score, point = self.found[key][0]
            self.found[key].append((score, (point[0] + 95, point[1])))
        result = review.solve_geometry(self.landmarks, self.found, self.slots)
        self.assertEqual(result["reason"], "ambiguous-viewpoint")
        self.assertFalse(result["registration_verified"])

    def test_offscreen_placement_rejected(self):
        self.slots["O06"] = (1100, 155)
        self.assertIsNone(review.solve_geometry(self.landmarks, self.found, self.slots))


if __name__ == "__main__":
    unittest.main()
