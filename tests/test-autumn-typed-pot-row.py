"""Synthetic provisional row tests; screenshot type reading is manual."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-typed-pot-row.py'
spec=importlib.util.spec_from_file_location('typed',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

T={'nodes':[{'id':x,'type':t} for x,t in
   zip(['O02','O03','O04','O05','O06'],m.EXPECTED)],
   'edges':[{'a':a,'b':b,'status':'layout_inferred'} for a,b in
   zip(['O02','O03','O04','O05'],['O03','O04','O05','O06'])]}
GOOD=[{'x':160,'y':40},{'x':210,'y':70},{'x':260,'y':100}]


class TypedTests(unittest.TestCase):
    def test_unique_typed_row_is_only_provisional(self):
        r=m.assess_typed_row(T,m.EXPECTED,GOOD)
        self.assertEqual(r['status'],'provisional-typed-row-only',r)
        self.assertEqual(r['slot_candidates'],['O04','O05','O06'])
        self.assertEqual(r['confidence'],'not-user-verified')

    def test_pot_candidate_order_does_not_matter(self):
        self.assertEqual(m.assess_typed_row(T,m.EXPECTED,GOOD[::-1])['status'],
                         'provisional-typed-row-only')

    def test_missing_or_opposite_slope_abstains(self):
        bad=[{'x':p['x'],'y':150-p['y']} for p in GOOD]
        self.assertEqual(m.assess_typed_row(T,m.EXPECTED,bad)['status'],'abstain')
        self.assertEqual(m.assess_typed_row(T,m.EXPECTED,GOOD[:2])['status'],'abstain')

    def test_unverified_type_sequence_or_missing_edge_abstains(self):
        self.assertEqual(m.assess_typed_row(T,['Event','Monster','Damage'],GOOD)['status'],
                         'abstain')
        no_edge={**T,'edges':T['edges'][:-1]}
        self.assertEqual(m.assess_typed_row(no_edge,m.EXPECTED,GOOD)['status'],
                         'abstain')


if __name__=='__main__':
    unittest.main()
