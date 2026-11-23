"""Offline cross-frame pot geometry research regression tests."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-pot-cross-frame.py'
spec=importlib.util.spec_from_file_location('pot_cross_frame',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

BASE=[(234,66),(281,93),(339,127)]


def record(t,dx=0,dy=0,points=None):
    points=points or BASE
    return {'time_s':t,'result':{
        'status':'provisional-three-pot-slot-association-only',
        'production_application':'forbidden',
        'candidate_pot_slots':[
            {'slot_candidate':s,'pot_x':x+dx,'pot_y':y+dy}
            for s,(x,y) in zip(m.SLOTS,points)]}}


class CrossFrameTests(unittest.TestCase):
    def test_translation_only_is_consistent_but_not_confirmed(self):
        result=m.assess([record(1),record(2,15,-9),record(3,-8,6)])
        self.assertEqual(result['status'],'cross-frame-geometry-consistent-proposal-only')
        self.assertFalse(result['slot_ids_verified'])
        self.assertEqual(result['production_application'],'forbidden')

    def test_mismatched_one_pot_abstains(self):
        changed=[BASE[0],(281,130),BASE[2]]
        result=m.assess([record(1),record(2,points=changed)])
        self.assertEqual(result['reason'],'geometry-changed-or-mismatched-pots')

    def test_bad_or_missing_frame_abstains(self):
        self.assertEqual(m.assess([record(1)])['status'],'abstain')
        self.assertEqual(m.assess([record(1),record(1.01)])['reason'],
                         'frames-not-temporally-independent')
        bad=record(2)
        bad['result']['candidate_pot_slots'][0]['pot_x']=float('nan')
        self.assertEqual(m.assess([record(1),bad])['status'],'abstain')

    def test_unverified_and_duplicate_ids_abstain(self):
        bad=record(2)
        bad['result']['candidate_pot_slots'][1]['slot_candidate']='O04'
        self.assertEqual(m.assess([record(1),bad])['status'],'abstain')
        bad=record(2)
        bad['result']['production_application']='allowed'
        self.assertEqual(m.assess([record(1),bad])['status'],'abstain')


if __name__=='__main__':
    unittest.main()
