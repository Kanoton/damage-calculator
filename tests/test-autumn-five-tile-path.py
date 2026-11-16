"""Five-icon path matching: unique topology still NOT an approved building ID."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-five-tile-path.py'
spec=importlib.util.spec_from_file_location('five_tiles',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

NODES=('O02','O03','O04','O05','O06')
T={'nodes':[{'id':id,'type':kind} for id,kind in zip(NODES,m.KINDS)],
   'edges':[{'a':a,'b':b,'status':'layout_inferred'}
            for a,b in zip(NODES,NODES[1:])]}
POINTS=[{'tile_kind_candidate':kind,'x':x,'y':y}
        for kind,x,y in zip(m.KINDS,
                          (111,143,178,222,277),(73,97,123,157,200))]


class FiveTileTests(unittest.TestCase):
    def test_five_candidate_sequence_returns_unverified_path_only(self):
        r=m.assess(POINTS,T)
        self.assertEqual(r['status'],'unique-visual-context-proposal-only',r)
        self.assertEqual(r['path_candidate'],list(NODES))
        self.assertEqual(r['building_slots'],'not-assigned')
        self.assertIn('not-user-verified',r['confidence'])

    def test_missing_unknown_or_duplicate_glyph_abstains(self):
        for row in (POINTS[:4],
                    POINTS+[dict(POINTS[0])],
                    POINTS+[{'tile_kind_candidate':'unknown-blue-tile',
                             'x':80,'y':60}]):
            self.assertEqual(m.assess(row,T)['status'],'abstain')

    def test_out_of_line_and_wrong_order_abstains(self):
        bent=[dict(x) for x in POINTS]
        bent[2]['y']+=30
        self.assertEqual(m.assess(bent,T)['status'],'abstain')
        reversed_types=list(reversed(POINTS))
        self.assertEqual(m.assess(reversed_types,T)['status'],
                         'unique-visual-context-proposal-only')
        # Classification keys determine ordering, not incidental list order.
        wrong_type=[dict(x) for x in POINTS]
        wrong_type[0]['tile_kind_candidate']='Monster'
        self.assertEqual(m.assess(wrong_type,T)['status'],'abstain')

    def test_unrelated_topology_cannot_assign_pot(self):
        r=m.assess(POINTS,{'nodes':[],'edges':[]})
        self.assertEqual(r['reason'],'topology-ambiguous-or-unmatched')


if __name__=='__main__':
    unittest.main()
