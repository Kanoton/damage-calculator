"""Research-only pot water-core tests; decisions never change game state."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import numpy as np
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-pot-interior.py'
spec = importlib.util.spec_from_file_location('pot_interior', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PotInteriorTests(unittest.TestCase):
    def test_water_core_veto_and_neutral_unknown(self):
        a = np.zeros((96, 96, 3), dtype=np.uint8)
        x1, x2, y1, y2 = module.WATER_ROI
        a[y1:y2, x1:x2] = (60, 190, 240)
        self.assertEqual(module.inspect(a)['decision'], 'empty-like-veto')
        b = np.zeros_like(a)
        b[y1:y2, x1:x2] = (255, 205, 50)
        self.assertEqual(module.inspect(b)['decision'], 'unknown')

    def test_nonwater_must_not_claim_occupied(self):
        a = np.full((96, 96, 3), 150, dtype=np.uint8)
        self.assertEqual(module.inspect(a)['decision'], 'unknown')

    def test_invalid_image_and_crop_center_rejected(self):
        with self.assertRaises(ValueError):
            module.water_ratio(np.zeros((94, 96, 3), dtype=np.uint8))
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'frame.png'
            Image.new('RGB', (512, 288), (0, 180, 220)).save(path)
            with self.assertRaises(ValueError):
                module.crop(path, 10, 30)
            with self.assertRaises(ValueError):
                module.crop(path, True, 80)

    def test_audit_reports_occupied_veto_and_excludes_source(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'private_frame.png'
            Image.new('RGB', (512, 288), (60, 190, 240)).save(path)
            rows = [{'file': path.name, 'cx': 120, 'cy': 120, 'expected': '__empty__'},
                    {'file': path.name, 'cx': 240, 'cy': 120, 'expected': '疾走キノコ'}]
            report = module.audit(rows, Path(root))
            self.assertEqual(report['empty_vetoed'], 1)
            self.assertEqual(report['occupied_wrongly_vetoed'], 1)
            self.assertNotIn(path.name, str(report))
            with self.assertRaises(ValueError):
                module.audit([{'file': '../private_frame.png', 'cx': 120, 'cy': 120}], Path(root))


    def test_stability_gate_abstains_when_water_is_offset_sensitive(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'frame.png'
            frame = np.zeros((288, 512, 3), dtype=np.uint8)
            # Place a cyan patch just large enough at the nominal location;
            # the shifted ROI exposes black pixels and must abstain.
            frame[120-54+61:120-54+73, 120-48+26:120-48+70] = (60, 190, 240)
            Image.fromarray(frame).save(path)
            base = module.inspect(module.crop(path, 120, 120))
            self.assertEqual(base['decision'], 'empty-like-veto')
            gate = module.inspect_stability(path, 120, 120, radius=4)
            self.assertEqual(gate['decision'], 'unknown')
            self.assertLess(gate['min_water_ratio'], module.MIN_WATER_RATIO)
            self.assertGreater(gate['max_water_ratio'], gate['min_water_ratio'])

    def test_stability_gate_rejects_invalid_radius_and_unsafe_crop(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'frame.png'
            Image.new('RGB', (512, 288), (60, 190, 240)).save(path)
            with self.assertRaises(ValueError):
                module.inspect_stability(path, 120, 120, radius=-1)
            with self.assertRaises(ValueError):
                module.inspect_stability(path, 120, 120, radius=True)
            with self.assertRaises(ValueError):
                module.inspect_stability(path, 48, 54, radius=4)

    def test_stability_audit_discloses_false_veto_and_hides_file(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'private.png'
            Image.new('RGB', (512, 288), (60, 190, 240)).save(path)
            rows = [{'file': path.name, 'cx': 120, 'cy': 120, 'expected': '__empty__'},
                    {'file': path.name, 'cx': 240, 'cy': 120, 'expected': 'unknown-plant'}]
            report = module.stability_audit(rows, Path(root), radius=4)
            self.assertEqual(report['empty_vetoed'], 1)
            self.assertEqual(report['occupied_wrongly_vetoed'], 1)
            self.assertNotIn(path.name, str(report))

if __name__ == '__main__':
    unittest.main()
