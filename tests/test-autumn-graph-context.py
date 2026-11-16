"""Synthetic branching-topology context tests; no screenshot accuracy claims."""
import importlib.util
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-graph-context.py'
spec=importlib.util.spec_from_file_location('graph',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
T={'nodes':[{'id':k,'type':v} for k,v in {
 'I03':'Heal','I04':'Monster','I05':'Damage','I06':'TeleportPoint',
 'I10':'TeleportPoint','I11':'Damage','I12':'Event','I13':'Card',
 'O04':'Event','O05':'Monster','O06':'Damage'}.items()],
 'edges':[{'a':a,'b':b,'status':'layout_inferred'} for a,b in [
 ('I03','I04'),('I04','I05'),('I05','I06'),
 ('I10','I11'),('I11','I12'),('I12','I13'),
 ('O04','O05'),('O05','O06')]]}


class GraphTests(unittest.TestCase):
    def test_inner_context_is_unique_but_only_candidate(self):
        for slot in ['I04','I05','I11','I12']:
            r=m.shortest_context(T,slot)
            self.assertEqual(r['status'],'unique-graph-context-candidate-only',r)
            self.assertEqual(r['path'][r['slot_offset']],slot)

    def test_missing_slot_and_invalid_length(self):
        self.assertEqual(m.shortest_context(T,'I99')['status'],'unknown-slot')
        with self.assertRaises(ValueError):
            m.shortest_context(T,'I11',1)

    def test_three_identical_icons_cannot_be_unique(self):
        topo={'nodes':[{'id':x,'type':'Event'} for x in 'ABC'],
              'edges':[{'a':'A','b':'B'},{'a':'B','b':'C'}]}
        self.assertEqual(m.shortest_context(topo,'B',3)['status'],
                         'no-unique-context')

    def test_shop_replacement_invalidates_original_icon_pattern(self):
        before=m.shortest_context(T,'I12')
        self.assertIn('Event',before['tile_types'])
        import copy
        changed=copy.deepcopy(T)
        for node in changed['nodes']:
            if node['id']=='I12':
                node['type']='Shop'
        after=m.shortest_context(changed,'I12')
        self.assertNotEqual(before.get('tile_types'),after.get('tile_types'))


    def test_observed_inner_path_unique_when_types_unchanged(self):
        r=m.match_observed_graph_path(T,['Heal','Monster','Damage'])
        self.assertEqual(r['status'],'unique-graph-path-candidate-only',r)
        self.assertEqual(r['matches'][0]['node_ids'],['I03','I04','I05'])

    def test_changed_i12_abstains_instead_of_trusting_old_event(self):
        # I12 can become Shop; even an otherwise unique initial pattern
        # cannot be trusted if the changed node can mimic a visible type.
        r=m.match_observed_graph_path(T,['Damage','Event'],['I12'])
        self.assertEqual(r['status'],'abstain',r)
        self.assertEqual(r['reason'],'changed-tile-may-alias-path')
        # A different path, not adjacent to I12, can still be assessed.
        r=m.match_observed_graph_path(T,['Heal','Monster','Damage'],['I12'])
        self.assertEqual(r['status'],'unique-graph-path-candidate-only',r)

    def test_ambiguous_and_invalid_observations(self):
        r=m.match_observed_graph_path(T,['Monster','Damage'])
        self.assertEqual(r['status'],'ambiguous-graph-path',r)
        with self.assertRaises(ValueError):
            m.match_observed_graph_path(T,['Damage'])
        with self.assertRaises(ValueError):
            m.match_observed_graph_path(T,['Damage','Event'],['UNKNOWN'])


if __name__=='__main__':
    unittest.main()
