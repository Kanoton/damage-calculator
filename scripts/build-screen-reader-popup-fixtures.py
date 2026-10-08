"""Rebuild reviewed lower-popup descriptors from privacy-cropped fixtures."""
import argparse,base64,io,json,runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CASES={'11':[], '36':[(0,'121')], '41':[(0,'26'),(1,'39'),(2,'36'),(3,'2')], '43':[(0,'42'),(1,'36'),(2,'24')]}
CENTERS=[(142,527),(216,527),(289,527),(103,591),(177,591),(251,591),(325,591),(142,655),(216,655),(289,655)]
def main():
 p=argparse.ArgumentParser();p.add_argument('--screens');p.add_argument('--check',action='store_true');a=p.parse_args();h=runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'));refs=[]
 for stamp,chips in CASES.items():
  path=ROOT/f'tests/fixtures/screen-reader/popup-{stamp}.json'
  if a.screens:
   im=Image.open(Path(a.screens)/f'202610082114{stamp}_1.jpg').convert('RGB');safe=Image.new('RGB',im.size,(20,20,20));boxes=[(45,698,452,70),(115,803,470,310)]
   for y in [0,93,187,279]:
    for x,yy,w,hh in [(55,66+y,73,42),(23,103+y,60,42),(96,119+y,27,24),(167,98+y,27,24),(210,98+y,64,26)]:boxes.append((round(x*im.width/1536),round(yy*im.height/709),round(w*im.width/1536),round(hh*im.height/709)))
   for x,y,w,hh in boxes:safe.paste(im.crop((x,y,x+w,y+hh)),(x,y))
   b=io.BytesIO();safe.save(b,format='PNG');path.write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))
  im=Image.open(io.BytesIO(base64.b64decode(json.loads(path.read_text())['image'].split(',')[1]))).convert('RGB');im=im.resize((round(im.width*709/im.height),709),Image.Resampling.BILINEAR)
  for index,ident in chips+([(0,'')] if stamp=='11' else []):
   x,y=CENTERS[index];refs.append({'id':ident,'data':h['feature'](h['crop'](im,(x-18,y-18,36,36)))})
 out=ROOT/'08_screen_reader/js/screen-reader-popup-references.js';content='// Generated from sanitized popup fixtures.\nwindow.ScreenReaderPopupReferences='+json.dumps({'chips':refs},separators=(',',':'))+';\n'
 if a.check:
  if out.read_text()!=content:raise ValueError('Rebuild popup references')
 else:out.write_text(content)
 print('Validated lower-popup chips and empty slot')
if __name__=='__main__':main()
