#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np

p = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-stump-video-audit.py'
spec = importlib.util.spec_from_file_location('stump_video', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class FakeVideo:
    def __init__(self, unreadable=(), fail_seek=()):
        self.index = 0
        self.unreadable = set(unreadable)
        self.fail_seek = set(fail_seek)
        self.closed = False

    def isOpened(self):
        return True

    def get(self, key):
        return {cv2.CAP_PROP_FPS: 2.0,
                cv2.CAP_PROP_FRAME_COUNT: 6.0}[key]

    def set(self, key, index):
        self.index = int(index)
        return self.index not in self.fail_seek

    def read(self):
        if self.index in self.unreadable:
            return False, None
        return True, np.zeros((288, 512, 3), dtype=np.uint8)

    def release(self):
        self.closed = True


class VideoAuditTests(unittest.TestCase):
    def test_all_sampled_and_no_five_icon_gate(self):
        fake = FakeVideo()
        with patch.object(m.frame_audit, 'analyze', return_value={
                'status': 'local-side-proposals-only',
                'water_stump_candidates': 2,
                'color_tile_candidates': 3,
                'local_side_matches': [{'tile_side_of_stump': 'left'}]}):
            report = m.audit('fake.mp4', capture_factory=lambda _: fake)
        self.assertTrue(fake.closed)
        self.assertTrue(report['full_video_covered'])
        self.assertEqual(report['sampled_frames'], 3)
        self.assertEqual(report['local_pair_proposals'], 3)
        self.assertEqual(report['status'], 'diagnostic-sampled-only')
        self.assertFalse(report['slot_ids_verified'])

    def test_partial_video_must_be_flagged(self):
        fake = FakeVideo()
        report = m.audit('fake.mp4', max_frames=2, capture_factory=lambda _: fake)
        self.assertFalse(report['full_video_covered'])
        self.assertEqual(report['status'], 'incomplete-or-unreadable')

    def test_seek_failure_is_not_silently_skipped(self):
        fake = FakeVideo(fail_seek={2})
        report = m.audit('fake.mp4', capture_factory=lambda _: fake)
        self.assertEqual(report['unreadable_indices'], [2])
        self.assertEqual(report['status'], 'incomplete-or-unreadable')

    def test_contiguous_positive_runs_are_not_unique_object_counts(self):
        rows = [
            {'index': 0, 'status': 'local-side-proposals-only', 'local_pair_count': 2},
            {'index': 30, 'status': 'local-side-proposals-only', 'local_pair_count': 1},
            {'index': 60, 'status': 'abstain', 'local_pair_count': 0},
            {'index': 90, 'status': 'local-side-proposals-only', 'local_pair_count': 1},
            {'index': 120, 'status': 'unreadable'}
        ]
        self.assertEqual(m.contiguous_runs(rows, 'local_pair_count'), [
            {'start_index': 0, 'end_index': 30, 'sample_count': 2},
            {'start_index': 90, 'end_index': 90, 'sample_count': 1}
        ])

    def test_invalid_sampling_rejected(self):
        for seconds in (0, float('nan'), -1):
            with self.assertRaises(ValueError):
                m.audit('fake.mp4', interval_seconds=seconds,
                        capture_factory=lambda _: FakeVideo())


if __name__ == '__main__':
    unittest.main()
