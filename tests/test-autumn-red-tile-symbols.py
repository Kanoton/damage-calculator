"""Safety contract for experimental red tile symbol proposals: synthetic only."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-red-tile-symbols.py'
spec=importlib.util.spec_from_file_location('red_tiles',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def synthetic(glyph,with_rim=True,where=(210,140)):
    frame=np.full((288,512,3),125,dtype=np.uint8)
    if with_rim:
        cv2.ellipse(frame,where,(23,18),0,0,360,(255,190,45),-1)
    cv2.ellipse(frame,where,(18,14),0,0,360,(20,20,230),-1)
    cv2.circle(frame,where,8,glyph,-1)
    return frame


class RedTileTests(unittest.TestCase):
    def test_monster_pink_glyph_is_candidate_only(self):
        r=m.propose(synthetic((200,30,220)))
        self.assertEqual(len(r),1,r)
        self.assertEqual(r[0]['tile_kind_candidate'],'Monster')
        self.assertEqual(r[0]['status'],'screen-symbol-proposal-only')
        self.assertNotIn('slot_id',r[0])

    def test_damage_yellow_glyph_is_candidate_only(self):
        r=m.propose(synthetic((20,240,240)))
        self.assertEqual(len(r),1,r)
        self.assertEqual(r[0]['tile_kind_candidate'],'Damage')

    def test_white_icon_abstains_from_type(self):
        r=m.propose(synthetic((225,225,225)))
        self.assertEqual(len(r),1,r)
        self.assertEqual(r[0]['tile_kind_candidate'],'unknown-red-tile')

    def test_no_rim_means_no_candidate(self):
        self.assertEqual(m.propose(synthetic((200,30,220),False)),[])

    def test_outside_safe_roi_and_bad_size_are_rejected(self):
        self.assertEqual(m.propose(synthetic((200,30,220),where=(25,140))),[])
        self.assertEqual(m.propose(np.full((288,512,3),125,dtype=np.uint8)),[])
        with self.assertRaises(ValueError):
            m.propose(np.zeros((200,512,3),dtype=np.uint8))


if __name__=='__main__':
    unittest.main()
