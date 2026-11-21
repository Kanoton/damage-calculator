"""Synthetic regression for safe replay registration. No real user images required."""
import importlib.util
import pathlib
import unittest
import numpy as np
import cv2

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

    def test_actual_template_registration_on_synthetic_frame(self):
        anchors = {"landmarks": {"damage": [110, 110], "move": [300, 110],
                                "monster": [210, 280]},
                   "slots": {"O04": [200, 190], "O05": [220, 260]}}
        image = np.full((540, 960, 3), 48, dtype=np.uint8)
        for index, ((_, (x, y)), color) in enumerate(zip(
                anchors["landmarks"].items(),
                [(25, 30, 230), (245, 95, 35), (75, 225, 90)])):
            cv2.rectangle(image, (x - 22, y - 22), (x + 22, y + 22), (70, 70, 70), -1)
            cv2.circle(image, (x, y), 16, color, -1)
            if index == 0:
                cv2.line(image, (x - 16, y + 16), (x + 16, y - 16), (255, 255, 255), 4)
            elif index == 1:
                cv2.rectangle(image, (x - 12, y - 9), (x + 12, y + 9), (245, 245, 245), 3)
            else:
                cv2.drawMarker(image, (x, y), (230, 230, 230), cv2.MARKER_STAR, 20, 3)
        transform = np.float32([[1.1, 0, 160], [0, 1.1, 45]])
        target = cv2.warpAffine(image, transform, (960, 540),
                                borderValue=(0, 0, 0))
        result = review.locate(image, target, anchors)
        self.assertTrue(result and result["registration_verified"])
        self.assertEqual(result["slots"]["O04"], [380, 254])
        self.assertFalse(result["auto_apply"])
        # Occlusion of one necessary unique landmark must block registration.
        cv2.rectangle(target, (366, 333), (440, 396), (48, 48, 48), -1)
        self.assertIsNone(review.locate(image, target, anchors))

    def test_offscreen_placement_rejected(self):
        self.slots["O06"] = (1100, 155)
        self.assertIsNone(review.solve_geometry(self.landmarks, self.found, self.slots))


if __name__ == "__main__":
    unittest.main()
