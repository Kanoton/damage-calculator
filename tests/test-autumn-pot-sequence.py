"""Orchestration-only synthetic contract; dependency stubs are NOT vision accuracy."""
import importlib.util
import unittest
from pathlib import Path
import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-pot-sequence.py'
spec = importlib.util.spec_from_file_location('sequence', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def image(value):
    return np.full((288, 512, 3), value, np.uint8)


def board_good(a, b):
    return {'status': 'same-view-candidate'}


def rim_good(a, b, t, u):
    return {'matched':[{'before':i,'after':i} for i in range(len(a))],
            'abstained':False}


class SequenceTests(unittest.TestCase):
    def test_good_pipeline_preserves_only_local_candidates(self):
        frames=[(1000,image(10)),(1600,image(20)),(2400,image(30))]
        r=m.evaluate_frames(frames,[[100,120],[200,130]],'private-game',board_good,rim_good)
        self.assertEqual(r['segments'],1)
        self.assertEqual(r['candidate_observations'],2)
        self.assertNotIn('private-game',str(r))
        self.assertNotIn('slot_id',str(r))

    def test_bad_camera_resets_ledger(self):
        frames=[(1000,image(10)),(1600,image(20)),(2400,image(30)),
                (3100,image(40)),(3900,image(50))]
        def board(a,b):
            return {'status':'abstain' if b[0,0,0] == 40 else 'same-view-candidate'}
        r=m.evaluate_frames(frames,[[100,120]],'game',board,rim_good)
        self.assertEqual(r['segments'],2)
        self.assertEqual(r['candidate_observations'],1)
        self.assertEqual(r['events'][3]['reason'],'unverified-board-continuity')
        self.assertEqual(r['events'][4]['status'],'collecting')

    def test_partial_rim_match_causes_reacquisition(self):
        frames=[(1000,image(10)),(1600,image(20)),(2200,image(30))]
        def partial(a,b,t,u):
            return {'matched':[{'before':0,'after':0}], 'abstained':True}
        r=m.evaluate_frames(frames,[[100,120],[200,130]],'game',board_good,partial)
        self.assertEqual(r['candidate_observations'],0)
        self.assertEqual(r['segments'],3)

    def test_invalid_centers_and_frames_rejected(self):
        with self.assertRaises(ValueError):
            m.evaluate_frames([(1000,image(10))],[[10,10]],'game')
        with self.assertRaises(ValueError):
            m.evaluate_frames([(1000,image(10))],[[100,120],[100,120]],'game')
        with self.assertRaises(ValueError):
            m.evaluate_frames([(1000,image(10))],[[100,120]],'')
        with self.assertRaises(ValueError):
            m.evaluate_frames([(1000,np.zeros((200,300,3),np.uint8))],[[100,120]],'game')
        with self.assertRaises(ValueError):
            m.read_video('does-not-exist.mp4',[1,1])
        with self.assertRaises(ValueError):
            m.read_video('does-not-exist.mp4',[float('nan')])


if __name__=='__main__':
    unittest.main()
