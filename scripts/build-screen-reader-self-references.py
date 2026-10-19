"""Build self-portrait descriptors from the reviewed Card2 inventory, not PT icons."""
import argparse
import base64
import csv
import hashlib
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '08_screen_reader/js/screen-reader-self-references.js'
MAPPING = ROOT / 'csv/self_portrait_mapping.csv'
# Source crops cover the HUD's visible head area. Geometry is calibrated with
# existing Hanna, Sherry and Kaisei screenshots; other assets are not real-screen QA.
CROPS = [(80,80,220),(160,0,220),(120,40,260),(80,40,260),
         (120,0,220),(80,0,260),(40,40,260),(120,80,220),(90,90,230)]


def build():
    profiles = {r['image_file']: r for r in csv.DictReader(
        (ROOT/'csv/mini_character_mapping.csv').open(encoding='utf-8-sig'))}
    rows = list(csv.DictReader(MAPPING.open(encoding='utf-8-sig')))
    refs, seen, ids = [], set(), set()
    digest = hashlib.sha256(MAPPING.read_bytes())
    for row in rows:
        name = row['image_file']
        profile = profiles.get(row['source_profile'])
        match = re.fullmatch(r'UT_Hero_Card2_(\d+)(?:_[A-Za-z0-9]+)*\.png', name)
        if (not match or name in seen or not profile or profile['entity_type'] != 'キャラクター'
                or (row['character_id'], row['name']) != (profile['character_id'], profile['name'])
                or row['source_profile'] != f'UT_Hero_ProfilePhoto_{match[1]}.png'):
            raise ValueError(f'Invalid self portrait identity: {name}')
        seen.add(name)
        path = ROOT/'images/UT_Hero_Card2'/name
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != row['sha256']:
            raise ValueError(f'Changed self portrait asset: {name}')
        digest.update(raw)
        with Image.open(path) as source:
            source = source.convert('RGBA')
            if source.size not in [(420,684),(400,680)]:
                raise ValueError(f'Uncalibrated Card2 geometry: {name}')
            source = source.resize((420,684),Image.Resampling.BILINEAR)
            for x,y,width in CROPS:
                im = source.crop((x,y,x+width,y+width*116/139)).resize((16,16),Image.Resampling.BILINEAR)
                pixels = list(im.get_flattened_data())
                mask = [p[3] > 240 for p in pixels]
                if sum(mask) < 192:
                    continue
                data = bytes(v for p in pixels for v in p[:3])
                packed = bytes(sum(int(mask[i+b]) << b for b in range(8)) for i in range(0,256,8))
                refs.append({'id':row['character_id'],'image':name,
                             'data':base64.b64encode(data).decode(),'mask':base64.b64encode(packed).decode()})
                ids.add(row['character_id'])
    expected = {r['character_id'] for r in profiles.values() if r['entity_type']=='キャラクター'}
    if ids != expected:
        raise ValueError(f'Self portrait coverage mismatch: {expected-ids}')
    result = {'version':1,'side':16,'sourceHash':digest.hexdigest(),'characters':refs}
    text = '// Generated from csv/self_portrait_mapping.csv and Card2 assets; do not edit.\nwindow.ScreenReaderSelfReferences='+json.dumps(result,separators=(',',':'))+';\n'
    return text, result, len(rows)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    text, result, count = build()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != text:
            raise ValueError('Rebuild screen-reader-self-references.js')
    else:
        OUTPUT.write_text(text)
    print(f'{len({r["id"] for r in result["characters"]})} self identities / {count} Card2 assets / {len(result["characters"])} descriptors')
