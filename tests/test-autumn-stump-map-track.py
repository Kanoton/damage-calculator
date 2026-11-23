#!/usr/bin/env python3
"""Research-only tests: no automatic map IDs or production writes."""
import importlib.util
import json
import unittest
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-map-track.py'
spec = importlib.util.spec_from_file_location('stump_map_track', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


audit_script = p.parents[1] / 'scripts/review-autumn-confirmed-slot-sets.py'
audit_spec = importlib.util.spec_from_file_location('stump_confirmed_sets', audit_script)
scene_audit = importlib.util.module_from_spec(audit_spec)
audit_spec.loader.exec_module(scene_audit)
REFERENCE = json.loads(
    (p.parents[1] / 'docs/research/autumn-map0105-13-screen-slot-confirmations.json')
    .read_text(encoding='utf-8'))


def pair(x, y):
    return {'stump': {'x': x, 'y': y},
            'tile': {'x': x+46, 'y': y+4},
            'tile_side_of_stump': 'right'}


def frame(x, built=None, verified=True, observation_id=None, time_ms=None):
    row = {'pairs': [pair(x, 100)], 'building_evidence': []}
    if observation_id is not None:
        row['observation_id'] = observation_id
    if time_ms is not None:
        row['observed_at_ms'] = time_ms
    if built is not None:
        row['building_evidence'] = [
            {'pair_index': 0, 'state': built, 'human_reviewed': verified}]
    return row


class TrackTests(unittest.TestCase):
    def test_camera_translation_retains_human_slot_and_two_reviewed_built_frames(self):
        a, b = (frame(120, 'built', observation_id='frame-a', time_ms=1000),
                frame(130, 'built', observation_id='frame-b', time_ms=1450))
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O04',
                      'human_verified': True}])
        self.assertEqual(
            report['frames'][1]['tracked'][0]['slot_id_if_human_anchored'],
            'O04')
        self.assertEqual(len(report['pending_build_review']), 1)
        self.assertEqual(report['pending_build_review'][0]['slot_id'], 'O04')
        self.assertFalse(report['building_state_applied'])
        self.assertEqual(report['production_application'], 'forbidden')

    def test_duplicate_or_unstamped_frames_never_support_review(self):
        a, b = frame(120, 'built'), frame(130, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        anchor=[{'pair_index': 0, 'slot_id': 'I12', 'human_verified': True}]
        self.assertEqual(m.track([a,b],anchor)['pending_build_review'],[])
        a['observation_id'],a['observed_at_ms']='capture-a',1000
        b['observation_id'],b['observed_at_ms']='capture-b',1100
        self.assertEqual(m.track([a,b],anchor)['pending_build_review'],[])
        b['observed_at_ms']=1300
        self.assertEqual(len(m.track([a,b],anchor)['pending_build_review']),1)
        b['observation_id']='capture-a'
        with self.assertRaisesRegex(ValueError,'Duplicate observation ID'):
            m.track([a,b],anchor)
        b['observation_id']='capture-b'
        b['observed_at_ms']=1000
        with self.assertRaisesRegex(ValueError,'times must increase'):
            m.track([a,b],anchor)

    def test_invalid_observation_metadata_rejected(self):
        for key,value in [('observation_id',''),('observation_id',123),
                          ('observed_at_ms',True),('observed_at_ms',float('nan')),
                          ('observed_at_ms',-5)]:
            scene=frame(120,'built')
            scene[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(ValueError):
                m.track([scene])

    def test_no_manual_anchor_no_slot_proposal_even_when_built_twice(self):
        a, b = frame(120, 'built'), frame(130, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track([a, b])
        self.assertEqual(report['pending_build_review'], [])
        self.assertIsNone(
            report['frames'][1]['tracked'][0]['slot_id_if_human_anchored'])

    def test_bad_camera_does_not_propagate_or_invent_identity(self):
        a, b = frame(120, 'built'), frame(130, 'built')
        b.update({'camera_verified': False,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O04',
                      'human_verified': True}])
        self.assertTrue(report['camera_tracking_disconnected'])
        self.assertEqual(report['frames'][1]['tracked'], [])
        self.assertEqual(report['pending_build_review'], [])

    def test_missing_and_empty_do_not_revert_built(self):
        a, b = frame(120, 'built'), frame(130, 'empty')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O04',
                      'human_verified': True}])
        self.assertFalse(report['building_state_applied'])
        self.assertEqual(report['pending_build_review'], [])

    def test_unreviewed_evidence_never_counts(self):
        a, b = frame(120, 'built', False), frame(130, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O04',
                      'human_verified': True}])
        self.assertEqual(report['pending_build_review'], [])

    def test_contradictory_reviewed_build_and_empty_blocks_proposal(self):
        a, b, c = frame(120, 'built'), frame(130, 'empty'), frame(140, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        c.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b, c], [{'pair_index': 0, 'slot_id': 'O04',
                         'human_verified': True}])
        self.assertEqual(report['pending_build_review'], [])
        self.assertEqual(report['conflicting_reviewed_build_states'], ['O04'])

    def test_slot_collision_or_unverified_anchor_rejected(self):
        a = {'pairs': [pair(120, 100), pair(220, 100)]}
        for anchors in (
                [{'pair_index': 0, 'slot_id': 'O04',
                  'human_verified': False}],
                [{'pair_index': 0, 'slot_id': 'O07',
                  'human_verified': True}],
                [{'pair_index': 0, 'slot_id': 'O04',
                  'human_verified': True},
                 {'pair_index': 1, 'slot_id': 'O04',
                  'human_verified': True}]):
            with self.assertRaises(ValueError):
                m.track([a], anchors)

    def test_user_confirmed_13_screenshot_slot_groups_match_canonical_csv(self):
        # IDs only: do not store user screenshots or infer on-screen order.
        data_path = p.parents[1] / 'docs/research/autumn-map0105-13-screen-slot-confirmations.json'
        data = json.loads(data_path.read_text(encoding='utf-8'))
        self.assertEqual(data['map_id'], 'MAP0105')
        scenes = data['screenshots']
        self.assertEqual([row['image_number'] for row in scenes],
                         [f'{i:02d}' for i in range(1, 14)])
        expected = [
            ['I04','I05'], ['O31','O32','O33'], ['O04','O05','O06'],
            ['O17','O16','O15'], ['O23','O24','O25'],
            ['O23','O24','O25'], ['I11','I12'], ['O23','O24','O25'],
            ['O15','O16','O17'], ['O23','O24','O25'],
            ['O15','O16','O17'], ['O23','O24','O25'],
            ['O15','O16','O17']
        ]
        self.assertEqual([row['listed_slot_ids'] for row in scenes], expected)
        self.assertEqual(sum(map(len, expected)), 37)
        canonical = m.canonical_slots()
        self.assertEqual({slot for group in expected for slot in group}, canonical)
        self.assertTrue(all(len(group)==len(set(group)) for group in expected))
        self.assertEqual(scenes[3]['marker_to_slot'],
                         {'A':'O17','B':'O16','C':'O15'})
        self.assertEqual(scenes[4]['partial_visibility'], ['O23'])
        self.assertTrue(all('marker_to_slot' not in row for i,row in enumerate(scenes)
                            if i!=3))
        self.assertTrue(all('cx' not in str(row) and 'cy' not in str(row)
                            for row in scenes))

    def test_confirmed_scene_sets_audit_is_not_per_stump_verification(self):
        predictions = [
            {'image_number':'04','candidate_slot_ids':['O17','O16','O15']},
            {'image_number':'09','candidate_slot_ids':['O17','O16','O15']},
        ]
        result = scene_audit.audit(predictions, REFERENCE, m.canonical_slots())
        self.assertEqual(result['scene_sets_exact'],2)
        self.assertEqual(result['scenes_not_scored'],11)
        self.assertFalse(result['pixel_positions_verified'])
        self.assertFalse(result['slot_ids_verified_automatically'])
        self.assertEqual(result['production_application'],'forbidden')
        self.assertTrue(all(not row['per_stump_correspondence_verified']
                            for row in result['results']))

    def test_confirmed_set_audit_exposes_wrong_or_missing_slots(self):
        predictions = [
            {'image_number':'04','candidate_slot_ids':['O17','O16','I12']},
            {'image_number':'05','candidate_slot_ids':['O24','O25']},
        ]
        result = scene_audit.audit(predictions, REFERENCE, m.canonical_slots())
        self.assertEqual(result['extra_slot_mentions'],1)
        self.assertEqual(result['missing_slot_mentions'],2)
        self.assertEqual(result['results'][0]['extra_slot_ids'],['I12'])
        self.assertEqual(result['results'][0]['missing_slot_ids'],['O15'])
        self.assertEqual(result['results'][1]['missing_slot_ids'],['O23'])
        self.assertEqual(result['scene_sets_exact'],0)

    def test_confirmed_set_audit_rejects_phantom_duplicate_and_unlisted_images(self):
        rows = [
            [{'image_number':'04','candidate_slot_ids':['O07']}],
            [{'image_number':'04','candidate_slot_ids':['O17','O17']}],
            [{'image_number':'99','candidate_slot_ids':[]}],
            [{'image_number':'04','candidate_slot_ids':[]},
             {'image_number':'04','candidate_slot_ids':[]}],
        ]
        for predictions in rows:
            with self.subTest(rows=predictions), self.assertRaises(ValueError):
                scene_audit.audit(predictions, REFERENCE, m.canonical_slots())

    def test_actual_canonical_o_and_i_slots_are_accepted(self):
        expected={'O04','O05','O06','O15','O16','O17',
                  'O23','O24','O25','O31','O32','O33',
                  'I04','I05','I11','I12'}
        self.assertEqual(m.canonical_slots(),expected)
        for slot in ('O17','O33','I04','I12'):
            result=m.track([frame(120,'built')],
                           [{'pair_index':0,'slot_id':slot,
                             'human_verified':True}])
            self.assertEqual(result['human_verified_anchor_count'],1)
            self.assertEqual(result['frames'][0]['tracked'][0]
                             ['slot_id_if_human_anchored'],slot)
        for slot in ('O7','O1','O07','O34','I01','I13','O4'):
            with self.assertRaises(ValueError):
                m.track([frame(120,'built')],
                        [{'pair_index':0,'slot_id':slot,'human_verified':True}])

    def test_partial_visibility_abstains_instead_of_reassigning(self):
        a = {'pairs': [pair(120, 100), pair(220, 100)]}
        b = {'pairs': [pair(130, 100)], 'camera_verified': True,
             'affine_from_previous': [[1, 0, 10], [0, 1, 0]]}
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O04',
                      'human_verified': True}])
        self.assertEqual(report['frames'][1]['tracked'], [])


if __name__ == '__main__':
    unittest.main()
