"""Conservative candidate/abstain contract for offline plant crop research."""
import importlib.util
import pathlib
import unittest
import numpy as np

SCRIPT=pathlib.Path(__file__).resolve().parents[1]/'scripts/review-autumn-plant-crops.py'
spec=importlib.util.spec_from_file_location('plant_crop_review',SCRIPT)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PlantResearchTests(unittest.TestCase):
    def test_feature_length_and_no_raw_pixels(self):
        src=np.zeros((96,96,3),dtype=np.uint8)
        result=module.descriptor(src)
        self.assertEqual(result.shape,(5*18*8,))
        self.assertTrue(np.isfinite(result).all())

    def test_distinct_reference_accepted_only_as_candidate(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        samples=[{'plant':'電流タンポポ','vector':a},
                 {'plant':'芳香ピーチ','vector':b}]
        result=module.predict(a,samples)
        self.assertEqual(result['plant'],'電流タンポポ')
        self.assertEqual(result['reason'],'candidate-only')

    def test_ambiguous_or_unfamiliar_crop_abstains(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        samples=[{'plant':'電流タンポポ','vector':a},
                 {'plant':'芳香ピーチ','vector':b}]
        ambiguous=module.predict((a+b)/2,samples)
        self.assertIsNone(ambiguous['plant'])
        self.assertEqual(ambiguous['reason'],'ambiguous-plant')
        unfamiliar=module.predict(np.ones(720,dtype=np.float32),samples)
        self.assertIsNone(unfamiliar['plant'])
        self.assertEqual(unfamiliar['reason'],'unfamiliar-appearance')

    def test_leave_one_out_does_not_use_sample_itself(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        samples=[{'plant':'電流タンポポ','vector':a},
                 {'plant':'芳香ピーチ','vector':b}]
        audit=module.evaluate(samples)
        self.assertEqual(audit['accepted'],0)


if __name__=='__main__':
    unittest.main()
