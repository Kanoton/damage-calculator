"""Research-only screen pot-to-icon offset association synthetic regressions."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/review-autumn-pot-tile-offsets.py'
spec=importlib.util.spec_from_file_location('pot_offset',SCRIPT)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

PATH={'status':'unique-visual-context-proposal-only',
      'path_candidate':['O02','O03','O04','O05','O06']}
SYMBOLS=[{'tile_kind_candidate':k,'x':x,'y':y}
         for k,x,y in [('Event',178,123),('Monster',222,157),
                       ('Damage',277,200)]]
POTS=[{'x':234,'y':66},{'x':281,'y':93},{'x':339,'y':127}]


class PotOffsetTests(unittest.TestCase):
    def test_provisional_three_slot_association_does_not_apply(self):
        result=m.associate(PATH,SYMBOLS,POTS)
        self.assertEqual(result['status'],
                         'provisional-three-pot-slot-association-only',result)
        self.assertEqual([p['slot_candidate'] for p in result['candidate_pot_slots']],
                         ['O04','O05','O06'])
        self.assertEqual(result['production_application'],'forbidden')
        self.assertEqual(result['plant_type'],'unknown')

    def test_missing_context_and_wrong_topology_abstain(self):
        self.assertEqual(m.associate({},SYMBOLS,POTS)['status'],'abstain')
        self.assertEqual(m.associate({**PATH,'path_candidate':['O31']},
                         SYMBOLS,POTS)['status'],'abstain')

    def test_missing_and_duplicated_pot_abstain(self):
        self.assertEqual(m.associate(PATH,SYMBOLS,POTS[:2])['status'],'abstain')
        duplicates=[POTS[0],POTS[0],POTS[2]]
        self.assertEqual(m.associate(PATH,SYMBOLS,duplicates)['status'],'abstain')

    def test_incompatible_geometry_abstains(self):
        shifted=[dict(p) for p in POTS]
        shifted[1]['y']+=35
        self.assertEqual(m.associate(PATH,SYMBOLS,shifted)['status'],'abstain')

    def test_view_or_unknown_glyph_does_not_infer(self):
        self.assertEqual(m.associate(PATH,SYMBOLS[:2],POTS)['status'],'abstain')


if __name__=='__main__':
    unittest.main()
