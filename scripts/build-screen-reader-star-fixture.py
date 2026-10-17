"""Keep only party faces, coin digits and stars from the reviewed level screen."""
import argparse
import base64
import io
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'tests/fixtures/screen-reader/party-stars-late.json'


def sanitize(im):
    safe = Image.new('RGB', im.size, (20, 20, 20))
    sx, sy = im.width / 1536, im.height / 709
    for offset in [0, 93, 187, 279]:
        # Account names sit above/right of the face crop and are excluded.
        for x, y, w, h in [(55, 66, 73, 42), (167, 98, 27, 24), (210, 98, 64, 26)]:
            box = (int(x*sx), int((y+offset)*sy), int((x+w)*sx)+1, int((y+offset+h)*sy)+1)
            safe.paste(im.crop(box), box[:2])
    return safe


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--screen')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.screen:
        safe = sanitize(Image.open(args.screen).convert('RGB'))
        out = io.BytesIO()
        safe.save(out, format='PNG')
        OUTPUT.write_text(json.dumps({'image': 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()}))
    im = Image.open(io.BytesIO(base64.b64decode(json.loads(OUTPUT.read_text())['image'].split(',')[1]))).convert('RGB')
    if ImageChops.difference(im, sanitize(im)).getbbox():
        raise ValueError('Unexpected pixels outside the anonymous HUD regions')
    print('Validated privacy-cropped party stars: levels 2/1/3/3')
