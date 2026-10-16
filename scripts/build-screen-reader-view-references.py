"""Build chip-panel rim anchors and self portraits from privacy-cropped fixtures."""
import argparse
import base64
import io
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CENTERS = {
    'small': [(239,527),(312,527),(386,527),(199,591),(273,591),(347,591),(421,591),(239,655),(312,655),(386,655)],
    'lower': [(142,527),(216,527),(289,527),(103,591),(177,591),(251,591),(325,591),(142,655),(216,655),(289,655)],
    'large': [(535,352),(609,352),(682,352),(495,416),(570,416),(644,416),(719,416),(535,481),(609,481),(682,481)]}

def image(name):
    record = json.loads((ROOT / f'tests/fixtures/screen-reader/{name}.json').read_text())
    return Image.open(io.BytesIO(base64.b64decode(record['image'].split(',')[1]))).convert('RGB')

def feature(im, box):
    x,y,w,h = box
    return base64.b64encode(im.crop((x,y,x+w,y+h)).resize((16,16),Image.Resampling.BILINEAR).tobytes()).decode()

def build():
    out = {'panels': {}, 'characters': []}
    cases = {'small':['6248','6250'], 'lower':['popup-11','popup-36','popup-41','popup-43'], 'large':['6251','6252','status-184601','status-184606','status-184610']}
    for kind, names in cases.items():
        panels = []
        for name in names:
            im = image(name)
            if kind == 'small' or name in ['6251','6252']:
                im = im.resize((1536,709),Image.Resampling.BILINEAR)
            else:
                width = round(im.width*709/im.height)
                scaled = im.resize((width,709),Image.Resampling.BILINEAR)
                im = Image.new('RGB',(1536,709))
                im.paste(scaled,((1536-width)//2 if kind == 'large' else 0,0))
            panels.append([[feature(im,(x-9,y-30,18,8)),feature(im,(x-9,y+22,18,8))] for x,y in CENTERS[kind]])
        out['panels'][kind] = panels
    for t in [15,24,46]:
        out['characters'].append({'id':'106','kind':'self','data':feature(image(f'self-sherry-{t}'),(116,445,139,116))})
    for name, ident in [('live-map','13'),('replay-map','2')]:
        out['characters'].append({'id':ident,'kind':'self','data':feature(image('self-start-'+name),(116,445,139,116))})
    return '// Generated from privacy-cropped panel and self fixtures.\nwindow.ScreenReaderViewReferences=' + json.dumps(out,separators=(',',':')) + ';\n'

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = ROOT / '08_screen_reader/js/screen-reader-view-references.js'
    content = build()
    if args.check:
        if path.read_text() != content:
            raise ValueError('Rebuild screen reader view references')
    else:
        path.write_text(content)
    print('Validated chip-panel rim anchors and reviewed self portraits')
