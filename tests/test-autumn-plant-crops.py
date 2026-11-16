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


    def test_game_holdout_rejects_leaked_same_game_duplicate(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        rows=[{'plant':'電流タンポポ','game':'play-A','vector':a},
              {'plant':'電流タンポポ','game':'play-A','vector':a.copy()},
              {'plant':'芳香ピーチ','game':'play-B','vector':b}]
        crop_audit=module.evaluate(rows)
        self.assertGreater(crop_audit['accepted'],0)
        game_audit=module.evaluate_by_game(rows)
        self.assertEqual(game_audit['accepted'],0)

    def test_one_reference_species_must_abstain(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        refs=[{'plant':'電流タンポポ','vector':a}]
        result=module.predict(a,refs)
        self.assertIsNone(result['plant'])
        self.assertEqual(result['reason'],'insufficient-reference-classes')

    def test_game_holdout_with_only_one_reference_species_abstains(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        rows=[{'plant':'電流タンポポ','game':'A','vector':a},
              {'plant':'芳香ピーチ','game':'B','vector':b}]
        audit=module.evaluate_by_game(rows)
        self.assertEqual(audit['accepted'],0)
        self.assertEqual(audit['reasons']['insufficient-reference-classes'],2)

    def test_game_holdout_requires_independent_games(self):
        a=np.zeros(720,dtype=np.float32)
        with self.assertRaises(ValueError):
            module.evaluate_by_game([{'plant':'x','game':'one','vector':a}])
        with self.assertRaises(ValueError):
            module.evaluate_by_game([{'plant':'x','vector':a},
                                     {'plant':'y','game':'two','vector':a}])


    def test_empty_pot_competing_with_plant_abstains(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        empty=a.copy()
        refs=[{'plant':'電流タンポポ','vector':a},
              {'plant':'芳香ピーチ','vector':b},
              {'plant':module.EMPTY_LABEL,'vector':empty}]
        result=module.predict(a,refs)
        self.assertIsNone(result['plant'])
        self.assertEqual(result['reason'],'empty-or-ambiguous')

    def test_distant_empty_does_not_prevent_plant_candidate(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        empty=np.zeros(720,dtype=np.float32);empty[2]=1
        refs=[{'plant':'電流タンポポ','vector':a},
              {'plant':'芳香ピーチ','vector':b},
              {'plant':module.EMPTY_LABEL,'vector':empty}]
        result=module.predict(a,refs)
        self.assertEqual(result['plant'],'電流タンポポ')

    def test_empty_negative_holdout_must_not_train_on_same_game(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        c=np.zeros(720,dtype=np.float32);c[2]=1
        rows=[{'plant':module.EMPTY_LABEL,'game':'A','vector':a},
              {'plant':'電流タンポポ','game':'B','vector':a.copy()},
              {'plant':'芳香ピーチ','game':'B','vector':b},
              {'plant':'花咲くサボテン','game':'A','vector':c}]
        audit=module.evaluate_by_game(rows)
        self.assertGreaterEqual(audit['false_accepted'],1)
        self.assertEqual(audit['empty_samples'],1)
        self.assertEqual(audit['empty_false_accepted'],1)
        self.assertEqual(audit['empty_abstained'],0)
        self.assertTrue(any(x['expected']==module.EMPTY_LABEL and x['correct'] is False
                            for x in audit['results']))
    def test_empty_crop_abstentions_reported_separately(self):
        a=np.zeros(720,dtype=np.float32);a[0]=1
        b=np.zeros(720,dtype=np.float32);b[1]=1
        refs=[{'plant':module.EMPTY_LABEL,'game':'A','vector':a},
              {'plant':'電流タンポポ','game':'B','vector':b},
              {'plant':'芳香ピーチ','game':'B','vector':a}]
        # Use game holdout to ensure no frame leakage.
        audit=module.evaluate_by_game(refs)
        self.assertEqual(audit['empty_samples'],1)
        self.assertEqual(audit['empty_false_accepted'] + audit['empty_abstained'],1)
        self.assertEqual(audit['false_accepted'],
                         sum(x['correct'] is False for x in audit['results']))



if __name__=='__main__':
    unittest.main()
