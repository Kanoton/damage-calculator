#!/usr/bin/env python3
"""Synthetic regression tests for research-only short-occlusion O-slot hints."""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-occlusion-track.py'
spec = importlib.util.spec_from_file_location('occlusion', path)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def pair(x, y=105):
    return {'stump': {'x': x, 'y': y},
            'tile': {'x': x+45, 'y': y+4},
            'tile_side_of_stump': 'right'}


def frame(points, dx=0, verified=True):
    return {'pairs': [pair(x) for x in points], 'camera_verified': verified,
            'affine_from_previous': [[1, 0, dx], [0, 1, 0]]}


ANCHOR = [{'pair_index': 0, 'slot_id': 'O7', 'human_verified': True}]


class OcclusionTests(unittest.TestCase):
    def test_one_missing_then_reappearance_is_only_review_hypothesis(self):
        f = [frame([120]), frame([], 10), frame([140], 10)]
        r = m.evaluate(f, ANCHOR)
        self.assertEqual(r['frames'][1]['missing_track_ids'], ['local-1'])
        item = r['frames'][2]['visible'][0]
        self.assertTrue(item['reacquired_candidate'])
        self.assertEqual(item['slot_id_review_candidate'], 'O7')
        self.assertIsNone(item['confirmed_anchor'])
        self.assertFalse(r['building_state_applied'])

    def test_continuous_visible_can_carry_existing_human_anchor(self):
        r = m.evaluate([frame([120]), frame([130], 10)], ANCHOR)
        self.assertEqual(r['frames'][1]['visible'][0]['confirmed_anchor'], 'O7')
        self.assertFalse(r['slot_ids_verified_automatically'])

    def test_cannot_reidentify_without_verified_camera_link(self):
        r = m.evaluate([frame([120]), frame([], 10, False),
                        frame([140], 10)], ANCHOR)
        self.assertTrue(r['camera_tracking_disconnected'])
        self.assertEqual(r['frames'][2]['visible'], [])

    def test_reappeared_identity_remains_candidate_on_subsequent_frames(self):
        f = [frame([120]), frame([], 10), frame([140], 10), frame([150], 10)]
        r = m.evaluate(f, ANCHOR)
        last = r['frames'][3]['visible'][0]
        self.assertFalse(last['reacquired_candidate'])
        self.assertIsNone(last['confirmed_anchor'])
        self.assertEqual(last['slot_id_review_candidate'], 'O7')

    def test_reacquisition_window_expires(self):
        f = [frame([120]), frame([], 10), frame([], 10),
             frame([], 10), frame([160], 10)]
        r = m.evaluate(f, ANCHOR, max_missing=2)
        self.assertEqual(r['frames'][4]['visible'], [])

    def test_multiple_tracks_unique_and_partial_visibility(self):
        f = [frame([120, 250]), frame([130], 10), frame([140, 270], 10)]
        anchors = ANCHOR + [{'pair_index': 1, 'slot_id': 'O12',
                             'human_verified': True}]
        r = m.evaluate(f, anchors)
        self.assertEqual(len(r['frames'][1]['visible']), 1)
        self.assertEqual(r['frames'][1]['visible'][0]['confirmed_anchor'], 'O7')
        final = r['frames'][2]['visible']
        self.assertEqual(len(final), 2)
        self.assertTrue(any(x['slot_id_review_candidate'] == 'O12'
                            for x in final))

    def test_ambiguous_competitors_are_abstained(self):
        r = m.evaluate([frame([120, 122]), frame([131], 10)])
        self.assertEqual(r['frames'][1]['visible'], [])
        self.assertEqual(r['frames'][1]['unassociated_detection_count'], 1)

    def test_no_fabricated_anchor_and_invalid_inputs(self):
        r = m.evaluate([frame([120]), frame([130], 10)])
        self.assertIsNone(r['frames'][1]['visible'][0]['confirmed_anchor'])
        with self.assertRaises(ValueError):
            m.evaluate([frame([120])],
                       [{'pair_index': 0, 'slot_id': 'O7',
                         'human_verified': False}])
        with self.assertRaises(ValueError):
            m.evaluate([frame([120]), frame([130], 10)], max_missing=8)

    def test_invalid_camera_transform_abstains(self):
        second = {'pairs': [pair(130)], 'camera_verified': True,
                  'affine_from_previous': [[3, 0, 10], [0, 3, 0]]}
        r = m.evaluate([frame([120]), second], ANCHOR)
        self.assertTrue(r['camera_tracking_disconnected'])
        self.assertEqual(r['frames'][1]['visible'], [])


if __name__ == '__main__':
    unittest.main()
