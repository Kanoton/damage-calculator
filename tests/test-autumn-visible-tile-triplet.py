"""Synthetic tile icon triplets must never assign an Autumn building ID."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-visible-tile-triplet.py'
spec=importlib.util.spec_from_file_location('triplet',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

GROUPS=(('O04','O05','O06'),('O17','O16','O15'),
        ('O23','O24','O25'),('O31','O32','O33'))
TOPOLOGY={'nodes':[{'id':id,'type':kind}
                   for group in GROUPS for id,kind in
                   zip(group,('Event','Monster','Damage'))],
          'edges':[{'a':group[i],'b':group[i+1]}
                   for group in GROUPS for i in (0,1)]}


def point(kind,x,y):
    return {'tile_kind_candidate':kind,'x':x,'y':y}


def render_icons():
    frame=np.full((288,512,3),125,dtype=np.uint8)
    for (cx,cy),kind in zip(((150,80),(198,116),(248,154)),
                            ('Event','Monster','Damage')):
        cv2.ellipse(frame,(cx,cy),(23,18),0,0,360,(255,190,45),-1)
        if kind=='Event':
            cv2.ellipse(frame,(cx,cy),(18,13),0,0,360,(190,20,245),-1)
            cv2.circle(frame,(cx,cy),8,(10,230,255),-1)
        else:
            cv2.ellipse(frame,(cx,cy),(18,14),0,0,360,(20,20,230),-1)
            cv2.circle(frame,(cx,cy),8,
                       (200,30,220) if kind=='Monster' else (20,240,240),-1)
    return frame


class TripletTests(unittest.TestCase):
    def test_independently_detected_synthetic_symbols_stay_ambiguous(self):
        result=m.analyze(render_icons(),TOPOLOGY)
        self.assertEqual(result['status'],'ambiguous-triplet',result)
        self.assertEqual(len(result['candidate_paths']),4)
        self.assertEqual(result['building_slots'],'not-assigned')

    def test_missing_and_unknown_symbols_abstain(self):
        event=[point('Event',150,80)]
        reds=[point('Monster',200,116)]
        self.assertEqual(m.assess_triplet(event,reds,TOPOLOGY)['status'],'abstain')
        reds.append(point('Damage',250,154))
        reds.append(point('unknown-red-tile',300,190))
        self.assertEqual(m.assess_triplet(event,reds,TOPOLOGY)['status'],'abstain')

    def test_noncollinear_masquerade_rejected(self):
        events=[point('Event',150,80)]
        reds=[point('Monster',200,160),point('Damage',250,154)]
        r=m.assess_triplet(events,reds,TOPOLOGY)
        self.assertEqual(r['status'],'abstain',r)

    def test_no_unique_path_does_not_assign_id(self):
        events=[point('Event',150,80)]
        reds=[point('Monster',200,116),point('Damage',250,154)]
        result=m.assess_triplet(events,reds,{'nodes':[],'edges':[]})
        self.assertEqual(result['reason'],'no-topology-type-path')


if __name__=='__main__':
    unittest.main()
