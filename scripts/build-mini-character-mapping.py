"""Validate the reviewed CSV and build the screen-reader's file:// fallback.

Run with --check in CI to detect missing images, invalid identities and stale data.
Image filename numbers are asset IDs, not character/monster IDs.
"""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / 'csv/mini_character_mapping.csv'
OUTPUT = ROOT / '08_screen_reader/js/mini-character-mapping-data.js'


def read(path):
    with path.open(encoding='utf-8-sig', newline='') as source:
        return list(csv.DictReader(source))


def validate():
    rows = read(CSV)
    characters = {r['id']: r['name'] for r in read(ROOT / 'csv/character_stats.csv')}
    monsters = {r['monster_id']: r['モンスター名'] for r in read(ROOT / 'csv/monster_stats.csv')}
    files = {p.name for p in (ROOT / 'images/UT_Hero_ProfilePhoto').glob('*.png')}
    listed = [r['image_file'] for r in rows]
    if len(listed) != len(set(listed)):
        raise ValueError('Duplicate image_file')
    if set(listed) != files:
        raise ValueError(f'Image coverage mismatch: missing={files-set(listed)}, extra={set(listed)-files}')
    for row in rows:
        kind = row['entity_type']
        if kind == 'キャラクター':
            if (row['character_id'] not in characters or characters[row['character_id']] != row['name']
                    or row['monster_ids'] or row['reader_target'] != '対象' or row['status'] != '確認済み'):
                raise ValueError(f'Invalid character: {row}')
        elif kind == 'モンスター':
            ids = row['monster_ids'].split('|')
            if (len(ids) != len(set(ids)) or any(i not in monsters for i in ids) or row['character_id']
                    or row['reader_target'] != '対象外'
                    or row['status'] != ('候補複数' if len(ids) > 1 else '確認済み')
                    or row['name'] != ' / '.join(dict.fromkeys(monsters[i] for i in ids))):
                raise ValueError(f'Invalid monster: {row}')
        elif kind == '判別不能':
            if any(row[k] for k in ('character_id', 'monster_ids', 'name')) or row['status'] != '判別不能' or row['reader_target'] != '対象外':
                raise ValueError(f'Unknown image must not carry a guessed identity: {row}')
        else:
            raise ValueError(f'Unknown entity_type: {kind}')
        for path in filter(None, row['reference_images'].split('|')):
            if not (ROOT / path).is_file():
                raise ValueError(f'Missing reference: {path}')
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rows = validate()
    output = '// Generated from csv/mini_character_mapping.csv; do not edit.\nwindow.ScreenReaderMiniCharacterMappingData = ' + json.dumps(rows, ensure_ascii=False, indent=2) + ';\n'
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != output:
            raise ValueError('Stale fallback; run python3 scripts/build-mini-character-mapping.py')
    else:
        OUTPUT.write_text(output, encoding='utf-8')
    print(f'Validated {len(rows)} images; {sum(r["entity_type"] == "キャラクター" for r in rows)} character variants; '
          f'{sum(r["entity_type"] == "モンスター" for r in rows)} monster images; '
          f'{sum(r["status"] == "判別不能" for r in rows)} unresolved images.')


if __name__ == '__main__':
    main()
