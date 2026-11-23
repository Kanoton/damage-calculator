"""Research-only state machine checks with trusted synthetic metadata."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-autumn-pot-track-session.py'
spec = importlib.util.spec_from_file_location('track_session', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def f(ts, game='play-A', pairs=((0, 0), (1, 1)), same=True, valid=True):
    return {'timestamp_ms': ts, 'game': game,
            'continuity': {'status': 'same-view-candidate' if same else 'abstain'},
            'tracking': {'matched': [{'before': i, 'after': j} for i, j in pairs],
                         'abstained': not valid}}


class SessionTests(unittest.TestCase):
    def test_needs_three_frames_with_two_continuous_transitions(self):
        result = m.run([f(1000), f(1500), f(2100)])
        self.assertEqual([x['status'] for x in result['events']],
                         ['anchor-only', 'collecting', 'temporal-candidate-only'])
        self.assertEqual([x['local_track'] for x in result['events'][-1]['track_candidates']], [0, 1])
        self.assertEqual(result['segments'], 1)

    def test_break_discards_all_tracking_and_reacquires(self):
        result = m.run([f(1000), f(1500), f(2000), f(2600, same=False),
                        f(3100), f(3700)])
        self.assertEqual(result['events'][3]['reason'], 'unverified-board-continuity')
        self.assertEqual(result['events'][4]['track_candidates'], [])
        self.assertEqual(result['events'][5]['status'], 'temporal-candidate-only')
        self.assertNotEqual(result['events'][2]['segment'], result['events'][5]['segment'])

    def test_duplicate_or_ambiguous_mapping_stops_segment(self):
        rows = [f(1000), f(1500), f(2100, pairs=((0, 0), (1, 0))), f(2700)]
        result = m.run(rows)
        self.assertEqual(result['events'][2]['reason'], 'invalid-or-duplicate-correspondences')
        self.assertEqual(result['events'][3]['status'], 'collecting')
        self.assertEqual(result['candidates'], 0)

    def test_game_change_and_time_rewind_cannot_reuse_history(self):
        result = m.run([f(1000), f(1600), f(2200, game='play-B'),
                        f(2600, game='play-B'), f(2400, game='play-B'),
                        f(2900, game='play-B')])
        self.assertEqual(result['events'][2]['reason'], 'new-segment')
        self.assertEqual(result['events'][4]['reason'], 'timestamp-regression-or-duplicate')
        self.assertEqual(result['candidates'], 0)

    def test_unknown_continuity_gap_and_bad_input_fail_closed(self):
        result = m.run([f(1000), f(1100), f(7000), f(7600, valid=False), f(8300)])
        self.assertEqual([r['reason'] for r in result['events'][1:4]],
                         ['insufficient-time-separation', 'gap-too-large',
                          'unverified-rim-correspondences'])
        self.assertEqual(result['candidates'], 0)
        with self.assertRaises(ValueError):
            m.run([{'game': 'x', 'timestamp_ms': True}])
        with self.assertRaises(ValueError):
            m.run([{'game': '', 'timestamp_ms': 100}])

    def test_local_indices_only_never_emit_slot_ids(self):
        report = m.run([f(1000, pairs=((7, 2),)), f(1500, pairs=((7, 2),)),
                        f(2200, pairs=((2, 4),))])
        candidate = report['events'][-1]['track_candidates'][0]
        self.assertEqual(candidate['local_track'], 7)
        self.assertEqual(candidate['current_index'], 4)
        self.assertNotIn('slot_id', str(report).lower())


    def test_malformed_gate_metadata_abstains_without_exception(self):
        bad_board = f(1500)
        bad_board['continuity'] = None
        bad_rim = f(2100)
        bad_rim['tracking'] = None
        result = m.run([f(1000), bad_board, bad_rim, f(2700)])
        self.assertEqual(result['events'][1]['reason'], 'unverified-board-continuity')
        self.assertEqual(result['events'][2]['reason'], 'unverified-rim-correspondences')
        self.assertEqual(result['events'][3]['status'], 'collecting')
        self.assertEqual(result['candidates'], 0)


if __name__ == '__main__':
    unittest.main()
