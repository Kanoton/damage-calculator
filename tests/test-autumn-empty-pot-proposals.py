"""Synthetic contract; not real-game precision or recall."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-empty-pot-proposals.py'
spec=importlib.util.spec_from_file_location('empty_proposals',SCRIPT)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


def frame(pots=(),fake_water=()):
    image=np.zeros((288,512,3),np.uint8)
    for x,y in pots:
        cv2.rectangle(image,(x-24,y+6),(x+24,y+38),(40,125,210),-1)
    for x,y in [*pots,*fake_water]:
        cv2.ellipse(image,(x,y),(21,13),0,0,360,(255,190,50),-1)
    return image


class EmptyProposalTests(unittest.TestCase):
    def test_requires_cyan_water_and_stump(self):
        candidates=m.propose(frame(pots=[(170,145)],fake_water=[(330,145)]))
        self.assertEqual(len(candidates),1,candidates)
        self.assertAlmostEqual(candidates[0]['x'],170,delta=2)

    def test_empty_no_plant_assertion_and_no_slots(self):
        proposals=m.propose(frame(pots=[(160,145),(225,110),(275,80)]))
        self.assertEqual(len(proposals),3)
        self.assertTrue(all(p['status']=='water-pot-looking-candidate-only' for p in proposals))
        self.assertNotIn('slot_id',str(proposals))

    def test_hud_or_partial_edge_discards(self):
        self.assertEqual(m.propose(frame(pots=[(40,145)])),[])
        self.assertEqual(m.propose(frame(pots=[(490,145)])),[])
        self.assertEqual(m.propose(frame(pots=[(200,12)])),[])

    def test_wrong_frame_and_uniform_water_rejected(self):
        with self.assertRaises(ValueError):m.propose(np.zeros((96,96,3),np.uint8))
        canvas=np.full((288,512,3),(255,190,50),np.uint8)
        self.assertEqual(m.propose(canvas),[])

    def test_magenta_icon_veto_rejects_blue_tile_on_brown_ground(self):
        image=frame(pots=[(170,145)])
        cv2.ellipse(image,(170,145),(12,8),0,0,360,(210,50,230),-1)
        self.assertEqual(m.propose(image),[])
        clean=frame(pots=[(170,145)])
        self.assertEqual(len(m.propose(clean)),1)


if __name__=='__main__':unittest.main()
