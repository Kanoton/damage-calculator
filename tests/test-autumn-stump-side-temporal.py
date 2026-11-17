#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

p=Path(__file__).resolve().parents[1]/'scripts/review-autumn-stump-side-temporal.py'
spec=importlib.util.spec_from_file_location('stump_temporal',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def pair(sx,sy,tx,ty):
    return {'stump':{'x':sx,'y':sy},'tile':{'x':tx,'y':ty},
            'tile_side_of_stump':'right' if tx>sx else 'left'}


IDENTITY=[[1,0,0],[0,1,0]]


class TemporalTests(unittest.TestCase):
    def test_translation_preserves_two_sides(self):
        before=[pair(100,100,150,110),pair(300,120,240,130)]
        after=[pair(320,128,260,138),pair(120,108,170,118)]
        result=m.consensus(before,after,[[1,0,20],[0,1,8]],True)
        self.assertEqual(result['status'],'stable-local-side-proposals-only')
        self.assertEqual([x['after_index'] for x in result['matches']],[1,0])
        self.assertEqual(result['production_application'],'forbidden')
        self.assertFalse(result['slot_ids_verified'])

    def test_missing_verified_camera_rejected(self):
        x=[pair(100,100,150,110)]
        self.assertEqual(m.consensus(x,x,IDENTITY)['reason'],
                         'camera-continuity-not-verified')

    def test_changing_tile_type_irrelevant(self):
        x=[pair(100,100,150,110)]
        x[0]['tile_kind_candidate']='Event'
        y=[pair(100,100,150,110)]
        y[0]['tile_kind_candidate']='Shop'
        self.assertEqual(m.consensus(x,y,IDENTITY,True)['status'],
                         'stable-local-side-proposals-only')

    def test_left_right_flip_rejected(self):
        a=[pair(100,100,150,110)]
        b=[pair(100,100,50,110)]
        self.assertEqual(m.consensus(a,b,IDENTITY,True)['status'],'abstain')

    def test_partial_visibility_rejected(self):
        a=[pair(100,100,150,110),pair(300,100,350,110)]
        b=[pair(100,100,150,110)]
        self.assertEqual(m.consensus(a,b,IDENTITY,True)['reason'],
                         'partial-or-ambiguous-visibility')

    def test_invalid_transform_and_coordinates_rejected(self):
        x=[pair(100,100,150,110)]
        self.assertEqual(m.consensus(x,x,[[2,0,0],[0,2,0]],True)['reason'],
                         'implausible-camera-transform')
        x[0]['stump']['x']=float('nan')
        self.assertEqual(m.consensus(x,x,IDENTITY,True)['reason'],'invalid-input')


if __name__=='__main__':
    unittest.main()
