"""Safe orchestration tests; mocks are not a measure of game-image accuracy."""
import importlib.util
from pathlib import Path
from unittest import mock
import unittest
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-pot-auto-sequence.py'
spec=importlib.util.spec_from_file_location('auto_sequence',SCRIPT)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


def frame(value):return np.full((288,512,3),value,np.uint8)


def proposals(img):
    return [{'x':160,'y':145},{'x':225,'y':112},{'x':275,'y':82}]


def link(old,new,dt):
    if new[0,0,0]==40:
        return {'matched':[],'abstained':True,'reason':'unverified-board-continuity','board_status':'abstain'}
    return {'matched':[{'before':i,'after':i} for i in range(3)],
            'abstained':False,'reason':'geometric-pairs-only','board_status':'same-view-candidate'}


class AutoSequenceTests(unittest.TestCase):
    def test_lifecycle_and_camera_reset_without_manual_centers(self):
        frames=[(1000,frame(10)),(1600,frame(20)),(2200,frame(30)),
                (2800,frame(40)),(3400,frame(50))]
        with mock.patch.object(m.links.pots,'propose',side_effect=proposals), \
             mock.patch.object(m.links,'assess_frames',side_effect=link):
            report=m.evaluate_frames(frames,'private-game')
        self.assertEqual(report['segments'],2)
        self.assertEqual(report['candidate_observations'],3)
        self.assertEqual(report['events'][3]['reason'],'unverified-board-continuity')
        self.assertEqual(report['events'][4]['status'],'collecting')
        self.assertNotIn('private-game',str(report))
        self.assertNotIn('slot_id',str(report))

    def test_no_water_does_not_claim_occupied(self):
        def blank(img):return []
        def failed(old,new,dt):
            return {'matched':[],'abstained':True,'reason':'missing-water-proposals',
                    'board_status':'same-view-candidate'}
        with mock.patch.object(m.links.pots,'propose',side_effect=blank), \
             mock.patch.object(m.links,'assess_frames',side_effect=failed):
            report=m.evaluate_frames([(1000,frame(10)),(1600,frame(20))],'g')
        self.assertEqual(report['candidate_observations'],0)
        self.assertEqual(report['events'][1]['reason'],'unverified-rim-correspondences')

    def test_invalid_game_and_timestamps(self):
        with self.assertRaises(ValueError):m.evaluate_frames([],'game')
        with self.assertRaises(ValueError):m.evaluate_frames([(1000,frame(10))],'')
        with self.assertRaises(ValueError):m.evaluate_frames([(float('nan'),frame(10))],'game')


if __name__=='__main__':unittest.main()
