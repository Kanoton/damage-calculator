"""Small owl face references from the retained real battle-start frame."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / 'tests/fixtures/screen-reader/defeat/autumn-turn-20261020/full-replay.mp4'
FACE = ROOT / 'tests/fixtures/screen-reader/combat/owl-start-face.png'
OUTPUT = ROOT / '08_screen_reader/js/screen-reader-cut-references.js'
BOXES = [[230, 82, 55, 51], [259, 116, 51, 57], [324, 99, 60, 61]]

def build():
    # Lossless retained crop avoids decoder/version variation during --check.
    # Original: ffmpeg -ss 23; RGB resize to 630x355; crop (230,82,384,173).
    im = Image.open(FACE).convert('RGB')
    if im.size != (154, 91): raise ValueError('Unexpected face crop size')
    patches = []
    for x, y, w, h in BOXES:
        values = [v for yy in range(12) for xx in range(12) for v in im.getpixel((x - 230 + int((xx + .5) * w / 12), y - 82 + int((yy + .5) * h / 12)))]
        patches.append({'box': [x, y, w, h], 'rgb': values})
    data = {'monsterId': 'M0123', 'source': str(FACE.relative_to(ROOT)), 'source_sha256': hashlib.sha256(FACE.read_bytes()).hexdigest(), 'video_sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(), 'source_seconds': 23, 'patches': patches}
    return '// Generated from real cut-in face regions; no individual-number inference.\nwindow.ScreenReaderCutReferences=' + json.dumps(data, separators=(',', ':')) + ';\n'

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    result = build()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != result: raise SystemExit('Cut references differ; regenerate')
    else: OUTPUT.write_text(result)
    print('Validated real owl cut-in face patches')
