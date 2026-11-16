"""Fixed-camera known-row research contract: synthetic + measured screen coordinates."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-fixed-camera-row.py'
spec=importlib.util.spec_from_file_location('fixed_row',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

# Screen coordinates from a manually reviewed single replay, not a saved screenshot.
REF={'O31':{'x':130.0,'y':130},'O32':{'x':188.0,'y':96.0},
     'O33':{'x':239.0,'y':65.0}}
IDENTITY=[[1,0,0],[0,1,0]]


class FixedRowTests(unittest.TestCase):
    def test_user_verified_row_calibrates_but_not_13_slots(self):
        r=m.fit_verified_row(REF)
        self.assertEqual(r['status'],'calibrated-row-only',r)
        self.assertEqual(r['verified_slots'],['O31','O32','O33'])
        self.assertEqual(r['remaining_slots'],'not-inferred')
        self.assertLess(r['max_residual_px'],6)

    def test_observed_three_slots_independent_of_detection_order(self):
        proposals=[{'x':239.2,'y':65.2},{'x':130.2,'y':129.9},
                   {'x':189.0,'y':96.3}]
        r=m.match_known_row(REF,proposals,IDENTITY)
        self.assertEqual(r['status'],'three-known-slots-candidate-only',r)
        self.assertEqual([x['proposal_index'] for x in r['observations']],[1,2,0])

    def test_translation_requires_verified_board_transform(self):
        shifted=[{'x':p['x']+25,'y':p['y']-12} for p in REF.values()]
        self.assertEqual(m.match_known_row(REF,shifted,None)['status'],'abstain')
        r=m.match_known_row(REF,shifted,[[1,0,25],[0,1,-12]])
        self.assertEqual(r['status'],'three-known-slots-candidate-only',r)

    def test_reverse_slope_other_row_and_missing_pots_abstain(self):
        other=[{'x':250.0,'y':50.0},{'x':295.0,'y':75.0},
               {'x':340.0,'y':100.0}]
        self.assertEqual(m.match_known_row(REF,other,IDENTITY)['status'],'abstain')
        self.assertNotEqual(m.fit_verified_row(dict(zip(m.ANCHOR_IDS,other)))['status'],
                            'calibrated-row-only')
        self.assertEqual(m.match_known_row(REF,other[:2],IDENTITY)['status'],'abstain')

    def test_rotation_and_zoom_conflicts_rejected(self):
        for affine in ([[1.15,0,0],[0,1.15,0]],
                       [[.98,-.2,0],[.2,.98,0]]):
            r=m.match_known_row(REF,list(REF.values()),affine)
            self.assertEqual(r['reason'],'fixed-camera-model-conflict',r)

    def test_missing_or_invalid_ground_truth_abstains(self):
        self.assertEqual(m.fit_verified_row({'O31':REF['O31']})['status'],'abstain')
        bad={**REF,'O32':{'x':float('nan'),'y':1}}
        self.assertEqual(m.fit_verified_row(bad)['status'],'abstain')
        self.assertEqual(m.match_known_row(REF,[],IDENTITY)['status'],'abstain')


if __name__=='__main__':
    unittest.main()
