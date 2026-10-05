#!/usr/bin/env python3
"""Render reviewed video observations; does not recognize video or edit source CSV."""
import argparse
import csv
import json
from pathlib import Path
import shutil
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIFFICULTIES = {'普通', '困難', '悪夢', '狂気'}
ASSETS = ROOT / 'images/MapEvent/assets'


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def repository_file(value):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f'参照ファイルがありません: {value}')
    return path


def simple_name(value):
    if not value or Path(value).name != value or '/' in value or '\\' in value:
        raise ValueError(f'出力ファイル名が不正です: {value}')
    return value


def prepare(data):
    """Validate the entire manifest before creating any output."""
    difficulty = data.get('difficulty')
    if difficulty not in DIFFICULTIES:
        raise ValueError('難易度が不明です。利用者へ確認してください。')
    _, maps = read_csv(ROOT / 'csv/maps_renumbered_v1p1.csv')
    matched = [m for m in maps if m['map_id'] == data.get('map_id')]
    if not matched:
        raise ValueError('マップが不明です。利用者へ確認してください。')
    image_path = repository_file(data['base_image'])
    # Route-specific layouts can differ from the default image; identify them explicitly.
    with Image.open(image_path) as base:
        width, height = base.size
    header, _ = read_csv(ROOT / 'csv/map_event.csv')
    _, monsters = read_csv(ROOT / 'csv/monster_stats.csv')
    known = {m['monster_id'] for m in monsters if m['難易度'] == difficulty}
    prepared, filenames = [], set()
    for event in data.get('events', []):
        if event.get('status') not in {'confirmed', 'pending'}:
            raise ValueError('各イベントにconfirmedまたはpendingを指定してください。')
        if str(event.get('progress', '')) == '':
            raise ValueError('進捗または発生条件が必要です。')
        groups = event.get('monsters', [])
        for group in groups:
            count = group.get('count')
            if group.get('id') not in known or type(count) is not int or count < 1:
                raise ValueError(f'モンスターIDまたは出現数が不正です: {group}')
        for key in ('attack_bonus', 'defense_bonus'):
            if type(event.get(key, 0)) is not int:
                raise ValueError(f'{key}は整数で指定してください。')
        mode = event.get('spawn_mode', 'none')
        if mode not in {'fixed', 'random', 'mixed', 'none'}:
            raise ValueError(f'出現方式が不正です: {mode}')
        filename = event.get('image', '')
        if mode != 'none':
            simple_name(filename)
            if not filename.endswith('.png') or filename in filenames:
                raise ValueError('PNGのファイル名はイベントごとに一意にしてください。')
            filenames.add(filename)
        elif filename:
            raise ValueError('図なしのイベントにはimageを指定しないでください。')
        positions = event.get('positions', [])
        if mode == 'fixed' and not positions:
            raise ValueError('固定出現には出現位置が必要です。位置不明はpendingで図なしにしてください。')
        if mode in {'random', 'none'} and positions:
            raise ValueError('ランダムのみ／図なしのイベントに固定位置を指定できません。')
        if positions and not event.get('position_source'):
            raise ValueError('座標の根拠position_sourceが必要です。')
        with Image.open(ASSETS / 'green_frame.png') as frame:
            fw, fh = frame.size
            left, top, right, bottom = frame.getchannel('A').getbbox()
        for x, y in positions:
            if type(x) is not int or type(y) is not int or not (
                0 <= x-fw//2+left and x-fw//2+right <= width and
                0 <= y-fh//2+top and y-fh//2+bottom <= height
            ):
                raise ValueError('緑枠がマップの外へはみ出します。')
        if mode in {'random', 'mixed'}:
            xy = event.get('random_label_xy')
            with Image.open(ASSETS / 'Random.png') as label:
                lw, lh = label.size
            if not xy or len(xy) != 2 or any(type(v) is not int for v in xy):
                raise ValueError('ランダム表示の左上座標が必要です。')
            x, y = xy
            if not (0 <= x <= width-lw and 0 <= y <= height-lh):
                raise ValueError('ランダム表示がマップの外へはみ出します。')
        prepared.append(event)
    for value in data.get('reference_images', []):
        repository_file(value)
    return image_path, header, prepared


def build(manifest, destination):
    data = json.loads(manifest.read_text(encoding='utf-8-sig'))
    image_path, header, events = prepare(data)
    if destination.exists():
        raise ValueError('出力先は新しいフォルダを指定してください。既存の成果物を上書きしません。')
    zip_path = destination.with_suffix('.zip')
    if zip_path.exists():
        raise ValueError('ZIPが既に存在します。別の出力先を指定してください。')
    destination.mkdir(parents=True)
    (destination / 'MapEvent').mkdir()
    base = Image.open(image_path).convert('RGBA')
    frame = Image.open(ASSETS / 'green_frame.png').convert('RGBA')
    label = Image.open(ASSETS / 'Random.png').convert('RGBA')
    rows = {'confirmed': [], 'pending': []}
    for event in events:
        filename = event.get('image', '')
        if filename:
            im = base.copy()
            for x, y in event.get('positions', []):
                im.alpha_composite(frame, (x-frame.width//2, y-frame.height//2))
            if event.get('spawn_mode') in {'random', 'mixed'}:
                im.alpha_composite(label, tuple(event['random_label_xy']))
            folder = destination / ('MapEvent' if event['status'] == 'confirmed' else 'pending/MapEvent')
            folder.mkdir(parents=True, exist_ok=True)
            im.save(folder / filename)
        row = dict.fromkeys(header, '')
        row.update({'map_id': data['map_id'], 'route_id': event.get('route_id', data.get('route_id', '')),
                    '難易度': data['difficulty'], '進捗': event['progress'],
                    'monster_id': '|'.join(g['id'] for g in event.get('monsters', [])),
                    '出現数': '|'.join(str(g['count']) for g in event.get('monsters', [])),
                    '内容': event.get('content', ''), '攻撃加算': event.get('attack_bonus', 0),
                    '防御加算': event.get('defense_bonus', 0), '出現位置画像': filename})
        rows[event['status']].append(row)
    for status, name in [('confirmed', 'map_event_candidates.csv'), ('pending', 'map_event_pending.csv')]:
        if status == 'pending' and not rows[status]:
            continue
        with (destination / name).open('w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=header, lineterminator='\n')
            writer.writeheader()
            writer.writerows(rows[status])
    for index, value in enumerate(data.get('reference_images', []), 1):
        source = repository_file(value)
        (destination / 'reference').mkdir(exist_ok=True)
        shutil.copyfile(source, destination / 'reference' / f'{index:02d}_{source.name}')
    shutil.copyfile(manifest, destination / 'observations.json')
    notes = data.get('notes', [])
    (destination / '確認事項.txt').write_text(
        '候補CSVは既存行と照合してください。同じイベントを重複追記しないでください。\n'
        'pendingの行と図は未確定です。確定CSVへ混ぜないでください。\n'
        'マップ図はモンスターを追加せず、緑枠／ランダム出現表示だけを重ねています。\n'
        + '\n'.join(notes) + '\n', encoding='utf-8-sig')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(destination.rglob('*')):
            if path.is_file():
                z.write(path, path.relative_to(destination))
    return zip_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path, help='AIが動画を確認して作成する観測JSON')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        print(build(args.manifest, args.output))
    except (ValueError, KeyError, OSError) as error:
        parser.exit(2, f'{error}\n')


if __name__ == '__main__':
    main()
