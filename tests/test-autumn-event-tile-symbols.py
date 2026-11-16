"""Synthetic-only magenta Event tile proposal safety tests."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-event-tile-symbols.py'
spec=importlib.util.spec_from_file_location('event_tile',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def make_event(glyph=(10,230,255),rim=True,center=(230,140)):
    image=np.full((288,512,3),130,dtype=np.uint8)
    if rim:
        cv2.ellipse(image,center,(24,18),0,0,360,(255,180,40),-1)
    cv2.ellipse(image,center,(18,13),0,0,360,(190,20,245),-1)
    cv2.circle(image,center,8,glyph,-1)
    return image


class EventTileTests(unittest.TestCase):
    def test_event_glyph_returns_unconfirmed_candidate(self):
        results=m.propose(make_event())
        self.assertEqual(len(results),1,results)
        self.assertEqual(results[0]['tile_kind_candidate'],'Event')
        self.assertEqual(results[0]['status'],'screen-symbol-proposal-only')
        self.assertNotIn('slot_id',results[0])

    def test_no_blue_rim_abstains(self):
        self.assertEqual(m.propose(make_event(rim=False)),[])

    def test_white_or_missing_question_glyph_abstains(self):
        self.assertEqual(m.propose(make_event((255,255,255))),[])

    def test_outside_roi_and_bad_dimensions(self):
        self.assertEqual(m.propose(make_event(center=(25,145))),[])
        with self.assertRaises(ValueError):
            m.propose(np.zeros((288,600,3),dtype=np.uint8))


if __name__=='__main__':
    unittest.main()
