"""Pure geometry contracts; synthetic positions do not show real recognition success."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-empty-pot-links.py'
spec=importlib.util.spec_from_file_location('auto_links', SCRIPT)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


def point(x,y):
    return {'x':x,'y':y,'status':'water-pot-looking-candidate-only'}


class LinkTests(unittest.TestCase):
    def test_unique_translated_three_pots(self):
        before=[point(160,147),point(225,112),point(275,82)]
        after=[point(178,153),point(243,118),point(293,88)]
        affine=[[1,0,18],[0,1,6]]
        result=m.link_proposals(before,after,affine)
        self.assertFalse(result['abstained'],result)
        self.assertEqual(len(result['matched']),3)
        self.assertTrue(all(x['residual_px']==0 for x in result['matched']))

    def test_ambiguous_targets_rejected(self):
        before=[point(160,147),point(161,147)]
        after=[point(160,147),point(161,147)]
        result=m.link_proposals(before,after,[[1,0,0],[0,1,0]])
        self.assertTrue(result['abstained'])
        self.assertEqual(result['matched'],[])

    def test_missing_and_partial_targets_are_not_disappearance(self):
        before=[point(160,147),point(225,112)]
        after=[point(160,147)]
        result=m.link_proposals(before,after,[[1,0,0],[0,1,0]])
        self.assertTrue(result['abstained'])
        self.assertEqual(len(result['matched']),1)
        self.assertEqual(result['reason'],'partial-or-ambiguous-visibility')

    def test_bad_affine_and_frame_interval_rejected(self):
        p=[point(160,147)]
        for transform in ([[1,0],[0,1]],[[float('nan'),0,0],[0,1,0]],
                          [[1.5,0,0],[0,1.5,0]]):
            self.assertTrue(m.link_proposals(p,p,transform)['abstained'])
        a=np.zeros((288,512,3),np.uint8)
        self.assertEqual(m.assess_frames(a,a,200)['reason'],'unverified-frame-interval')
        self.assertEqual(m.assess_frames(a,a,5500)['reason'],'unverified-frame-interval')


if __name__=='__main__':unittest.main()
