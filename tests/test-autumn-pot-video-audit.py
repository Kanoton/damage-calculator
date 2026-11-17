"""Replay sampler fail-closed regressions; synthetic video reader stub only."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
import cv2

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-pot-video-audit.py'
spec=importlib.util.spec_from_file_location('pot_video_audit',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class FakeVideo:
    def __init__(self):
        self.index=0
        self.released=False

    def isOpened(self): return True

    def get(self,code):
        return {cv2.CAP_PROP_FPS:10,cv2.CAP_PROP_FRAME_COUNT:40}[code]

    def set(self,code,value):
        self.index=int(value)
        return True

    def read(self):
        return True,np.zeros((288,512,3),dtype=np.uint8)

    def release(self): self.released=True


def positive(_frame,_topology):
    return {'status':'provisional-three-pot-slot-association-only',
            'production_application':'forbidden',
            'candidate_pot_slots':[
                {'slot_candidate':s,'pot_x':x,'pot_y':y}
                for s,x,y in [('O04',234,66),('O05',281,93),('O06',339,127)]]}


class ReplayAuditTests(unittest.TestCase):
    def test_multiple_separate_frames_can_support_geometry_only(self):
        video=FakeVideo()
        with patch.object(m.cv2,'VideoCapture',return_value=video),patch.object(m.offsets,'analyze',side_effect=positive):
            result=m.sample('unused.mp4',{},step_s=1,max_frames=4)
        self.assertEqual(result['status'],'cross-frame-geometry-consistent-proposal-only')
        self.assertEqual(result['suitable_frames'],4)
        self.assertEqual(result['production_application'],'forbidden')
        self.assertTrue(video.released)

    def test_only_one_positive_frame_abstains(self):
        video=FakeVideo()
        calls=[positive(None,None)]+[{'status':'abstain','reason':'missing-icons'}]*3
        with patch.object(m.cv2,'VideoCapture',return_value=video),patch.object(m.offsets,'analyze',side_effect=calls):
            result=m.sample('unused.mp4',{},step_s=1,max_frames=4)
        self.assertEqual(result['reason'] if 'reason' in result else result['verdict']['reason'],
                         'not-enough-independent-positive-frames')
        self.assertEqual(result['suitable_frames'],1)

    def test_invalid_inputs_do_not_open_video(self):
        for step in (0,0.1,float('nan')):
            with self.assertRaises(ValueError):
                m.sample('unused.mp4',{},step_s=step)
        with self.assertRaises(ValueError):
            m.sample('unused.mp4',{},max_frames=0)

    def test_inconsistent_frames_abstain(self):
        video=FakeVideo()
        changed=positive(None,None)
        changed['candidate_pot_slots'][1]['pot_y']+=40
        with patch.object(m.cv2,'VideoCapture',return_value=video),patch.object(m.offsets,'analyze',side_effect=[positive(None,None),changed]):
            result=m.sample('unused.mp4',{},step_s=1,max_frames=2)
        self.assertEqual(result['status'],'abstain')
        self.assertEqual(result['verdict']['reason'],'geometry-changed-or-mismatched-pots')

    def test_low_fps_duplicate_indices_are_not_independent_evidence(self):
        video=FakeVideo()
        original_get=video.get
        video.get=lambda code: 1 if code==cv2.CAP_PROP_FPS else original_get(code)
        with patch.object(m.cv2,'VideoCapture',return_value=video),patch.object(
                m.offsets,'analyze',side_effect=positive) as analyze:
            result=m.sample('unused.mp4',{},step_s=0.2,max_frames=5)
        self.assertGreater(result['duplicate_frame_indices'],0)
        self.assertEqual(result['suitable_frames'],2)
        self.assertEqual(analyze.call_count,2)

    def test_seek_failure_is_abstained_without_analysis(self):
        video=FakeVideo()
        video.set=lambda code,value: False
        with patch.object(m.cv2,'VideoCapture',return_value=video),patch.object(
                m.offsets,'analyze',side_effect=positive) as analyze:
            result=m.sample('unused.mp4',{},step_s=1,max_frames=3)
        self.assertEqual(result['suitable_frames'],0)
        self.assertEqual(result['verdict']['reason'],
                         'not-enough-independent-positive-frames')
        self.assertEqual(analyze.call_count,0)



if __name__=='__main__':
    unittest.main()
