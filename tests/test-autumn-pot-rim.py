"""Synthetic rim-edge research contract, not evidence of real-world accuracy."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-pot-rim.py'
spec = importlib.util.spec_from_file_location('rim_research', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture(seed=21):
    rng = np.random.default_rng(seed)
    a = np.full((96, 96, 3), 100, np.uint8)
    for _ in range(35):
        x = int(rng.integers(22, 80))
        y = int(rng.integers(75, 92))
        cv2.line(a, (x, y), (min(95, x+2), min(95, y+1)),
                 tuple(map(int, rng.integers(0, 255, 3))), 1)
    return a


class RimResearchTests(unittest.TestCase):
    def test_shifted_rim_recovers_translation(self):
        ref = fixture()
        for dx, dy in ((-3, 2), (4, -4), (0, 0)):
            observed = cv2.warpAffine(ref, np.float32([[1, 0, dx], [0, 1, dy]]), (96, 96))
            result = module.track_rim(ref, observed)
            self.assertEqual(result['status'], 'candidate-only', result)
            self.assertEqual((result['dx'], result['dy']), (dx, dy))

    def test_unrelated_rims_and_flat_crop_abstain(self):
        ref = fixture()
        self.assertEqual(module.track_rim(ref, np.zeros((96, 96, 3), np.uint8))['status'], 'abstain')
        self.assertEqual(module.track_rim(np.zeros((96, 96, 3), np.uint8), ref)['reason'],
                         'insufficient-rim-edges')
        self.assertEqual(module.track_rim(ref, fixture(seed=92))['status'], 'abstain')

    def test_invalid_crop_and_offsets(self):
        ref = fixture()
        with self.assertRaises(ValueError):
            module.track_rim(ref, ref, max_offset=True)
        with self.assertRaises(ValueError):
            module.track_rim(ref, ref, max_offset=-1)
        with self.assertRaises(ValueError):
            module.edges(ref[:90])

    def test_manifest_audit_never_exposes_filename(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            img = root / 'secret.png'
            Image.fromarray(np.tile(fixture(), (3, 6, 1))[:288, :512]).save(img)
            row = {'file': img.name, 'cx': 100, 'cy': 110}
            out = module.evaluate([{'reference': row, 'observation': row}], root)
            self.assertEqual(out['pairs'], 1)
            self.assertNotIn('secret.png', str(out))
            with self.assertRaises(ValueError):
                module.evaluate([{'reference': {**row, 'file': '../secret.png'},
                                  'observation': row}], root)


if __name__ == '__main__':
    unittest.main()
