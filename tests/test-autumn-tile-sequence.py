"""Topology row disambiguation tests; no screenshots or video frames."""
import importlib.util
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-tile-sequence.py'
spec=importlib.util.spec_from_file_location('tiles',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

TYPES={'O02':'TeleportPoint','O03':'MoveAgain','O04':'Event',
       'O05':'Monster','O06':'Damage','O18':'MoveAgain',
       'O17':'Event','O16':'Monster','O15':'Damage','O19':'3rd',
       'O23':'Event','O24':'Monster','O25':'Damage',
       'O31':'Event','O32':'Monster','O33':'Damage'}
TOPOLOGY={'nodes':[{'id':k,'type':v} for k,v in TYPES.items()],
 'edges':[{'a':a,'b':b,'status':'layout_inferred'} for a,b in [
 ('O02','O03'),('O03','O04'),('O04','O05'),('O05','O06'),
 ('O19','O18'),('O18','O17'),('O17','O16'),('O16','O15'),
 ('O23','O24'),('O24','O25'),('O31','O32'),('O32','O33')]]}


class SequenceTests(unittest.TestCase):
    def test_three_symbols_ambiguous_across_four_rows(self):
        r=m.match_type_path(TOPOLOGY,['Event','Monster','Damage'])
        self.assertEqual(r['status'],'ambiguous-topology')
        self.assertEqual(len(r['matches']),4)

    def test_four_symbols_still_ambiguous(self):
        r=m.match_type_path(TOPOLOGY,['MoveAgain','Event','Monster','Damage'])
        self.assertEqual(len(r['matches']),2)

    def test_fifth_symbol_makes_topology_unique(self):
        r=m.match_type_path(TOPOLOGY,
              ['TeleportPoint','MoveAgain','Event','Monster','Damage'])
        self.assertEqual(r['status'],'unique-topology-candidate-only')
        self.assertEqual(r['matches'][0]['node_ids'],
                         ['O02','O03','O04','O05','O06'])
        self.assertTrue(all(x=='layout_inferred' for x in r['matches'][0]['edge_statuses']))
        bottom=m.match_type_path(TOPOLOGY,
              ['3rd','MoveAgain','Event','Monster','Damage'])
        self.assertEqual(bottom['matches'][0]['node_ids'],
                         ['O19','O18','O17','O16','O15'])

    def test_missing_edge_invalidates_match(self):
        topology={**TOPOLOGY,'edges':[e for e in TOPOLOGY['edges']
                  if not (e['a']=='O03' and e['b']=='O04')]}
        r=m.match_type_path(topology,
              ['TeleportPoint','MoveAgain','Event','Monster','Damage'])
        self.assertEqual(r['status'],'no-matching-path')

    def test_invalid_or_nonexistent_pattern(self):
        with self.assertRaises(ValueError):
            m.match_type_path(TOPOLOGY,['Monster'])
        with self.assertRaises(ValueError):
            m.match_type_path(TOPOLOGY,['Monster',None])
        self.assertEqual(m.match_type_path(TOPOLOGY,['Shop','Shop'])['status'],
                         'no-matching-path')


if __name__=='__main__':
    unittest.main()
