import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('map_event_output', ROOT / 'scripts/map_event_output.py')
OUTPUT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(OUTPUT)
SAMPLE = ROOT / 'docs/map-event-output/samples/library-normal'


class OutputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.data = json.loads((SAMPLE / 'observations.json').read_text())

    def render(self):
        manifest = self.directory / 'input.json'
        manifest.write_text(json.dumps(self.data, ensure_ascii=False), encoding='utf-8')
        return OUTPUT.build(manifest, self.directory / 'output')

    def test_approved_sample_reproduces_csv_and_four_monster_free_images(self):
        source_bytes = (ROOT / 'csv/map_event.csv').read_bytes()
        archive = self.render()
        out = self.directory / 'output'
        self.assertEqual(source_bytes, (ROOT / 'csv/map_event.csv').read_bytes())
        self.assertEqual((SAMPLE / 'map_event_candidates.csv').read_bytes(),
                         (out / 'map_event_candidates.csv').read_bytes())
        self.assertFalse((out / 'map_event_pending.csv').exists())
        with (out / 'map_event_candidates.csv').open(encoding='utf-8-sig') as f:
            rows = list(csv.DictReader(f))
        self.assertEqual(len(rows), 7)
        self.assertEqual(rows[0]['進捗'], '1')
        self.assertEqual(rows[0]['monster_id'], 'M0116|M0117|M0025')
        self.assertEqual(rows[0]['出現数'], '1|1|3')
        for filename in (out / 'MapEvent').glob('*.png'):
            with Image.open(filename) as actual, Image.open(SAMPLE / 'MapEvent' / filename.name) as expected:
                # Check every color channel, not only alpha: sprites must not reappear.
                self.assertTrue(all(c.getbbox() is None for c in ImageChops.difference(actual, expected).split()))
        self.assertEqual(len(list((out / 'MapEvent').glob('*.png'))), 4)
        for index, value in enumerate(self.data['reference_images'], 1):
            self.assertEqual((ROOT / value).read_bytes(),
                             (out / 'reference' / f'{index:02d}_{Path(value).name}').read_bytes())
        with zipfile.ZipFile(archive) as z:
            self.assertIsNone(z.testzip())
            self.assertIn('observations.json', z.namelist())

    def test_pending_rows_and_images_are_separate(self):
        self.data['events'][0]['status'] = 'pending'
        self.render()
        out = self.directory / 'output'
        self.assertTrue((out / 'pending/MapEvent/Library_Normal_Event_01.png').is_file())
        self.assertFalse((out / 'MapEvent/Library_Normal_Event_01.png').exists())
        with (out / 'map_event_pending.csv').open(encoding='utf-8-sig') as f:
            self.assertEqual(len(list(csv.DictReader(f))), 1)
        with (out / 'map_event_candidates.csv').open(encoding='utf-8-sig') as f:
            self.assertEqual(len(list(csv.DictReader(f))), 6)

    def test_game_over_is_numeric_csv_row_without_spawn_or_image(self):
        self.render()
        out = self.directory / 'output'
        with (out / 'map_event_candidates.csv').open(encoding='utf-8-sig') as f:
            rows = list(csv.DictReader(f))
        endpoint = [r for r in rows if r['内容'] == 'ゲームオーバー']
        self.assertEqual(len(endpoint), 1)
        self.assertEqual(endpoint[0], {'map_id': 'MAP0104', 'route_id': '', '難易度': '普通',
                                     '進捗': '18', 'monster_id': '', '出現数': '', '内容': 'ゲームオーバー',
                                     '攻撃加算': '0', '防御加算': '0', '出現位置画像': ''})
        self.assertEqual(len(list((out / 'MapEvent').glob('*.png'))), 4)
        event = next(e for e in self.data['events'] if e.get('kind') == 'game_over')
        self.assertEqual(event['progress'], event['evidence']['previous_progress'] + event['evidence']['marker_offset'])

    def test_random_label_contains_no_monster_and_matches_separate_sample(self):
        self.data.update(map_id='MAP0005', base_image='images/Map/Layout_Dragon_Palace_Amusement_Park.png')
        self.data['events'] = [{'status': 'confirmed', 'progress': '表示テスト', 'monsters': [],
                               'spawn_mode': 'random', 'image': 'random.png', 'random_label_xy': [211, 535]}]
        self.render()
        with Image.open(self.directory / 'output/MapEvent/random.png') as actual, Image.open(
            ROOT / 'docs/map-event-output/samples/random/Dragon_Event_SOURI_HP_no_monster.png'
        ) as expected:
            self.assertTrue(all(c.getbbox() is None for c in ImageChops.difference(actual, expected).split()))

    def test_unknown_difficulty_requires_confirmation_without_outputs(self):
        self.data['difficulty'] = ''
        with self.assertRaisesRegex(ValueError, '確認'):
            self.render()
        self.assertFalse((self.directory / 'output').exists())

    def test_unknown_monster_is_rejected_without_outputs(self):
        self.data['events'][0]['monsters'][0]['id'] = 'UNKNOWN'
        with self.assertRaisesRegex(ValueError, 'モンスター'):
            self.render()
        self.assertFalse((self.directory / 'output').exists())

    def test_random_cannot_claim_fixed_locations(self):
        self.data['events'][0]['spawn_mode'] = 'random'
        with self.assertRaisesRegex(ValueError, '固定位置'):
            self.render()

    def test_existing_archive_is_preserved(self):
        archive = self.directory / 'output.zip'
        archive.write_bytes(b'keep')
        with self.assertRaisesRegex(ValueError, 'ZIP'):
            self.render()
        self.assertEqual(archive.read_bytes(), b'keep')
        self.assertFalse((self.directory / 'output').exists())

    def test_frame_outside_map_is_rejected(self):
        self.data['events'][0]['positions'][0] = [0, 0]
        with self.assertRaisesRegex(ValueError, 'はみ出し'):
            self.render()


if __name__ == '__main__':
    unittest.main()
