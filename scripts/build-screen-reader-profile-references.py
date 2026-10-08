"""Build masked PT-avatar descriptors from the reviewed identity CSV.

These calibrated crops apply to the existing 1536x709 HUD, not self/header art.
Pillow is required. Unknown/unused images are omitted; monsters are veto examples.
"""
import argparse
import base64
import hashlib
import json
import runpy
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '08_screen_reader/js/screen-reader-profile-references.js'
SIDE = 16
# Crops calibrated against real HUD fixtures, including Bonnie's hat variant.
CROPS = [(40, 65, 115), (30, 65, 115), (40, 70, 110), (45, 65, 115)]


def build():
    rows = runpy.run_path(str(ROOT / 'scripts/build-mini-character-mapping.py'))['validate']()
    refs = []
    inputs = hashlib.sha256((ROOT / 'csv/mini_character_mapping.csv').read_bytes())
    for row in rows:
        if row['status'] == '判別不能':
            continue
        path = ROOT / 'images/UT_Hero_ProfilePhoto' / row['image_file']
        inputs.update(path.name.encode())
        inputs.update(path.read_bytes())
        with Image.open(path) as source:
            source = source.convert('RGBA')
            for x, y, width in CROPS:
                image = source.crop((x, y, x + width, y + width * 42 / 73)).resize((SIDE, SIDE), Image.Resampling.BILINEAR)
                pixels = list(image.getdata())
                mask = [p[3] > 240 for p in pixels]
                # Small transparent or nearly flat patches are not identity evidence.
                if sum(mask) < SIDE * SIDE * .6:
                    continue
                rgb = bytes(c for p in pixels for c in p[:3])
                ink = bytes(sum(int(mask[i + bit]) << bit for bit in range(8)) for i in range(0, len(mask), 8))
                refs.append({'id': row['character_id'], 'image': row['image_file'],
                             'data': base64.b64encode(rgb).decode(), 'mask': base64.b64encode(ink).decode()})
    result = {'version': 1, 'side': SIDE, 'sourceHash': inputs.hexdigest(), 'characters': refs}
    return '// Generated from the reviewed CSV and profile images; do not edit.\nwindow.ScreenReaderProfileReferences=' + json.dumps(result, separators=(',', ':')) + ';\n', result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    text, result = build()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != text:
            raise ValueError('Stale profile descriptors; rebuild with this script')
    else:
        OUTPUT.write_text(text, encoding='utf-8')
    ids = {r['id'] for r in result['characters'] if r['id']}
    images = {r['image'] for r in result['characters'] if r['id']}
    excluded = {r['image'] for r in result['characters'] if not r['id']}
    print(f'{len(ids)} characters / {len(images)} variants / {len(excluded)} monster veto images; {len(result["characters"])} descriptors')


if __name__ == '__main__':
    main()
