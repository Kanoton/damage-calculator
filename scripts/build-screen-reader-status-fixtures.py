"""Build reviewed status references from sanitized fixtures; raw uploads stay outside git."""
import argparse, base64, io, json, runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CASES=[('184601','18','42'),('184606','3','26'),('184610','106','121')]
BOXES=[(431,84,43,42),(517,334,36,36),(542,239,26,37),(619,239,26,37),(705,239,27,37)]
def main():
 p=argparse.ArgumentParser();p.add_argument('--screens');p.add_argument('--check',action='store_true');a=p.parse_args()
 helper=runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'));refs={'characters':[],'chips':[]}
 for stamp,owner,chip in CASES:
  path=ROOT/f'tests/fixtures/screen-reader/status-{stamp}.json'
  if a.screens:
   original=Image.open(Path(a.screens)/f'20261008{stamp}_1(1).jpg').convert('RGB');w,h=original.size;s=h/709;offset=(1536-w/s)/2
   safe=Image.new('RGB',(w,h),(20,20,20))
   # Keep only recognition crops, including all empty chip slots; no names/chat/map.
   boxes=BOXES+[(465,324,286,184)]
   for x,y,bw,bh in boxes:
    box=(round((x-offset)*s),round(y*s),round((x+bw-offset)*s),round((y+bh)*s));safe.paste(original.crop(box),box[:2])
   b=io.BytesIO();safe.save(b,format='PNG');path.write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))
  im=Image.open(io.BytesIO(base64.b64decode(json.loads(path.read_text())['image'].split(',')[1]))).convert('RGB');width=round(im.width*709/im.height)
  frame=Image.new('RGB',(1536,709));frame.paste(im.resize((width,709),Image.Resampling.BILINEAR),((1536-width)//2,0))
  refs['characters'].append({'id':owner,'kind':'header','data':helper['feature'](helper['crop'](frame,BOXES[0]))})
  refs['chips'].append({'id':chip,'data':helper['feature'](helper['crop'](frame,BOXES[1]))})
 out=ROOT/'08_screen_reader/js/screen-reader-status-references.js';content='// Generated from sanitized status fixtures.\nwindow.ScreenReaderStatusReferences='+json.dumps(refs,separators=(',',':'))+';\n'
 if a.check:
  if out.read_text()!=content:raise ValueError('Rebuild status references')
 else:out.write_text(content)
 print('Validated three reviewed status owners and chips')
if __name__=='__main__':main()
