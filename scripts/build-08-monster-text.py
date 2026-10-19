#!/usr/bin/env python3
"""Synchronize the 08 monster snapshot with canonical CSV (including multiline 能力)."""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
with (ROOT / 'csv/monster_stats.csv').open(encoding='utf-8-sig', newline='') as source:
    reader = csv.DictReader(source)
    assert '能力' in reader.fieldnames, 'monster_stats.csv needs 能力'
    rows = list(reader)
texts = {}
for row in rows:
    image, text = row['info'], row['能力']
    if image:
        assert (ROOT / 'images/MonsterInfo' / image).is_file(), image
        assert text.strip(), f'Missing transcription: {image}'
        assert texts.setdefault(image, text) == text, f'Conflicting transcription: {image}'
path = ROOT / '08_screen_reader/js/map-data.js'
source = path.read_text(encoding='utf-8')
prefix = 'const INITIAL_MAP_DATA='
assert source.startswith(prefix)
data, end = json.JSONDecoder().raw_decode(source[len(prefix):])
data['stats'] = rows
expected = prefix + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + source[len(prefix) + end:]
if args.check:
    assert source == expected, 'Run python3 scripts/build-08-monster-text.py'
else:
    path.write_text(expected, encoding='utf-8')
print(f'ok 08 monster text: {len(texts)} source images, {sum(bool(r["能力"]) for r in rows)} descriptions / {len(rows)} CSV rows')
