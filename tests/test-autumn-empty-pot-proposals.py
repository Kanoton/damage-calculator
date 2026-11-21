"""Synthetic contract; not real-game precision or recall."""
import importlib.util
from pathlib import Path
import unittest
import tempfile
import subprocess
import sys
import json
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


    def test_labeled_audit_reports_false_empty_and_does_not_expose_labels(self):
        proposals=[{'x':160,'y':145},{'x':225,'y':110},{'x':300,'y':80}]
        labels=[{'cx':160,'cy':145,'expected':'occupied'},
                {'cx':225,'cy':110,'expected':'__empty__'}]
        result=m.audit_labeled(proposals,labels)
        self.assertEqual(result['matched_occupied_wrong_proposals'],1)
        self.assertEqual(result['matched_empty'],1)
        self.assertEqual(result['unmatched_proposals_unknown'],1)
        self.assertNotIn('160',str(result))
        self.assertNotIn('225',str(result))
        with self.assertRaises(ValueError):
            m.audit_labeled(proposals,[{'cx':True,'cy':145,'expected':'occupied'}])

    def test_nearest_empty_does_not_hide_occupied_in_radius(self):
        # The greedy diagnostic assigns this proposal to the nearer empty
        # label; the strict safety gate must still notice the occupied pot.
        proposals=[{'x':170.0,'y':145.0}]
        labels=[{'cx':170,'cy':145,'expected':'__empty__'},
                {'cx':181,'cy':145,'expected':'occupied'}]
        report=m.audit_labeled(proposals,labels)
        self.assertEqual(report['matched_empty'],1)
        self.assertEqual(report['matched_occupied_wrong_proposals'],0)
        self.assertEqual(report['occupied_near_proposals'],1)
        self.assertEqual(report['ambiguous_proposals'],1)

    def test_duplicate_nearby_occupied_labels_count_one_proposal(self):
        report=m.audit_labeled([{'x':170.0,'y':145.0}],
                               [{'cx':170,'cy':145,'expected':'occupied'},
                                {'cx':171,'cy':145,'expected':'occupied'}])
        self.assertEqual(report['occupied_near_proposals'],1)
        self.assertEqual(report['ambiguous_proposals'],0)

    def test_strict_cli_returns_2_for_occupied_proposal(self):
        with tempfile.TemporaryDirectory() as root:
            directory=Path(root)
            image=directory/'private-frame.png'
            cv2.imwrite(str(image),frame(pots=[(170,145)]))
            labels=directory/'private-labels.json'
            labels.write_text(json.dumps({'samples':[{'cx':170,'cy':145,'expected':'occupied'}]}),
                              encoding='utf-8')
            output=directory/'audit.json'
            cmd=[sys.executable,str(SCRIPT),'--image',str(image),'--output',str(output),
                 '--audit-labels',str(labels),'--fail-on-occupied-proposal']
            result=subprocess.run(cmd,capture_output=True,text=True,check=False)
            self.assertEqual(result.returncode,2,result.stderr)
            report=json.loads(output.read_text(encoding='utf-8'))
            self.assertEqual(report['audit']['matched_occupied_wrong_proposals'],1)
            self.assertNotIn('private-frame',result.stdout)
            self.assertNotIn('private-labels',result.stdout)
            labels.write_text(json.dumps({'samples':[{'cx':170,'cy':145,'expected':'__empty__'}]}),
                              encoding='utf-8')
            result=subprocess.run(cmd,capture_output=True,text=True,check=False)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(json.loads(output.read_text(encoding='utf-8'))
                             ['audit']['matched_occupied_wrong_proposals'],0)
            # Adding an occupied label near the same proposal must fail,
            # even if the exact empty label wins greedy nearest matching.
            labels.write_text(json.dumps({'samples':[
                {'cx':170,'cy':145,'expected':'__empty__'},
                {'cx':181,'cy':145,'expected':'occupied'}]}),
                encoding='utf-8')
            result=subprocess.run(cmd,capture_output=True,text=True,check=False)
            self.assertEqual(result.returncode,2,result.stderr)
            audit=json.loads(output.read_text(encoding='utf-8'))['audit']
            self.assertEqual(audit['matched_occupied_wrong_proposals'],0)
            self.assertEqual(audit['occupied_near_proposals'],1)
            self.assertEqual(audit['ambiguous_proposals'],1)


if __name__=='__main__':unittest.main()
