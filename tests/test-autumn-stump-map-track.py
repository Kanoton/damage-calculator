#!/usr/bin/env python3
"""Research-only tests: no automatic map IDs or production writes."""
import importlib.util
import unittest
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-map-track.py'
spec = importlib.util.spec_from_file_location('stump_map_track', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def pair(x, y):
    return {'stump': {'x': x, 'y': y},
            'tile': {'x': x+46, 'y': y+4},
            'tile_side_of_stump': 'right'}


def frame(x, built=None, verified=True):
    row = {'pairs': [pair(x, 100)], 'building_evidence': []}
    if built is not None:
        row['building_evidence'] = [
            {'pair_index': 0, 'state': built, 'human_reviewed': verified}]
    return row


class TrackTests(unittest.TestCase):
    def test_camera_translation_retains_human_slot_and_two_reviewed_built_frames(self):
        a, b = frame(120, 'built'), frame(130, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O7',
                      'human_verified': True}])
        self.assertEqual(
            report['frames'][1]['tracked'][0]['slot_id_if_human_anchored'],
            'O7')
        self.assertEqual(len(report['pending_build_review']), 1)
        self.assertEqual(report['pending_build_review'][0]['slot_id'], 'O7')
        self.assertFalse(report['building_state_applied'])
        self.assertEqual(report['production_application'], 'forbidden')

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
            [a, b], [{'pair_index': 0, 'slot_id': 'O7',
                      'human_verified': True}])
        self.assertTrue(report['camera_tracking_disconnected'])
        self.assertEqual(report['frames'][1]['tracked'], [])
        self.assertEqual(report['pending_build_review'], [])

    def test_missing_and_empty_do_not_revert_built(self):
        a, b = frame(120, 'built'), frame(130, 'empty')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O7',
                      'human_verified': True}])
        self.assertFalse(report['building_state_applied'])
        self.assertEqual(report['pending_build_review'], [])

    def test_unreviewed_evidence_never_counts(self):
        a, b = frame(120, 'built', False), frame(130, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O7',
                      'human_verified': True}])
        self.assertEqual(report['pending_build_review'], [])

    def test_contradictory_reviewed_build_and_empty_blocks_proposal(self):
        a, b, c = frame(120, 'built'), frame(130, 'empty'), frame(140, 'built')
        b.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        c.update({'camera_verified': True,
                  'affine_from_previous': [[1, 0, 10], [0, 1, 0]]})
        report = m.track(
            [a, b, c], [{'pair_index': 0, 'slot_id': 'O7',
                         'human_verified': True}])
        self.assertEqual(report['pending_build_review'], [])
        self.assertEqual(report['conflicting_reviewed_build_states'], ['O7'])

    def test_slot_collision_or_unverified_anchor_rejected(self):
        a = {'pairs': [pair(120, 100), pair(220, 100)]}
        for anchors in (
                [{'pair_index': 0, 'slot_id': 'O1',
                  'human_verified': False}],
                [{'pair_index': 0, 'slot_id': 'O17',
                  'human_verified': True}],
                [{'pair_index': 0, 'slot_id': 'O1',
                  'human_verified': True},
                 {'pair_index': 1, 'slot_id': 'O1',
                  'human_verified': True}]):
            with self.assertRaises(ValueError):
                m.track([a], anchors)

    def test_partial_visibility_abstains_instead_of_reassigning(self):
        a = {'pairs': [pair(120, 100), pair(220, 100)]}
        b = {'pairs': [pair(130, 100)], 'camera_verified': True,
             'affine_from_previous': [[1, 0, 10], [0, 1, 0]]}
        report = m.track(
            [a, b], [{'pair_index': 0, 'slot_id': 'O7',
                      'human_verified': True}])
        self.assertEqual(report['frames'][1]['tracked'], [])


if __name__ == '__main__':
    unittest.main()
