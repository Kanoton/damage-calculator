"""Build sanitized regression frame and descriptors for the reviewed left-aligned HUD.

Use --screen /path/to/image.png once; subsequent runs rebuild from the sanitized
fixture. No player names, map, chat or hand are retained.
"""
import argparse, base64, io, json, runpy
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/screen-reader/left-hud.json'
OUTPUT = ROOT / '08_screen_reader/js/screen-reader-layout-references.js'
Y = [0, 93, 187, 279]
AVATARS = [(55, 66+y, 73, 42) for y in Y]
SELF = (116, 445, 139, 116)
def main():
    p = argparse.ArgumentParser(); p.add_argument('--screen'); p.add_argument('--check', action='store_true'); args = p.parse_args()
    helpers = runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'))
    if args.screen:
        im = Image.open(args.screen).convert('RGB')
        if im.size != (1536, 709): raise ValueError('Expected the reviewed 1536x709 frame')
        safe = Image.new('RGB', im.size, (20,20,20))
        boxes = AVATARS+[SELF]+[(23,103+y,60,42) for y in Y]+[(96,119+y,27,24) for y in Y]+[(167,98+y,27,24) for y in Y]+[(210,98+y,64,26) for y in Y]
        for box in boxes: safe.paste(helpers['crop'](im,box),box[:2])
        b=io.BytesIO();safe.save(b,format='PNG')
        FIXTURE.write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))
    im=Image.open(io.BytesIO(base64.b64decode(json.loads(FIXTURE.read_text())['image'].split(',')[1]))).convert('RGB')
    chars=[{'id':ident,'kind':'avatar','data':helpers['feature'](helpers['crop'](im,box))} for ident,box in zip(['105','106','3','18'],AVATARS)]
    chars.append({'id':'105','kind':'self','data':helpers['feature'](helpers['crop'](im,SELF))})
    glyphs=helpers['glyphs'](helpers['crop'](im,(167,377,27,24)),'white')
    if len(glyphs)!=1: raise ValueError('Expected one reviewed coin digit')
    data={'characters':chars,'digits':[{'digit':'6',**glyphs[0]}]}
    content='// Generated from sanitized left-hud fixture; no player names or full screenshot.\nwindow.ScreenReaderLayoutReferences='+json.dumps(data,separators=(',',':'))+';\n'
    if args.check:
        if OUTPUT.read_text()!=content: raise ValueError('Rebuild screen-reader-layout-references.js')
    else: OUTPUT.write_text(content)
    print('Validated left HUD: 4 PT portraits, self portrait and coin glyph 6')
if __name__=='__main__': main()
