"""Blue tile icon proposal regression, synthetic only."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-blue-tile-symbols.py'
spec=importlib.util.spec_from_file_location('blue_tiles',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def frame(kind):
    a=np.full((288,512,3),130,dtype=np.uint8)
    center=(220,135)
    cv2.ellipse(a,center,(22,15),0,0,360,(255,170,30),-1)
    if kind=='MoveAgain':
        cv2.circle(a,center,10,(200,30,220),-1)
        cv2.rectangle(a,(208,128),(218,137),(240,240,240),-1)
    elif kind=='TeleportPoint':
        cv2.circle(a,center,8,(160,240,70),-1)
        cv2.circle(a,(220,141),4,(200,30,220),-1)
        cv2.rectangle(a,(207,127),(218,134),(240,240,240),-1)
    return a


class BlueTests(unittest.TestCase):
    def test_move_symbol_is_proposal_only(self):
        results=m.propose(frame('MoveAgain'))
        self.assertEqual(len(results),1,results)
        self.assertEqual(results[0]['tile_kind_candidate'],'MoveAgain')
        self.assertEqual(results[0]['status'],'screen-symbol-proposal-only')
        self.assertNotIn('slot_id',results[0])

    def test_teleport_symbol_requires_turquoise_and_small_pink(self):
        results=m.propose(frame('TeleportPoint'))
        self.assertEqual(len(results),1,results)
        self.assertEqual(results[0]['tile_kind_candidate'],'TeleportPoint')

    def test_plain_blue_water_without_glyph_is_rejected(self):
        self.assertEqual(m.propose(frame('plain')),[])

    def test_invalid_frame_size_rejected(self):
        with self.assertRaises(ValueError):
            m.propose(np.zeros((576,1024,3),dtype=np.uint8))


if __name__=='__main__':
    unittest.main()
