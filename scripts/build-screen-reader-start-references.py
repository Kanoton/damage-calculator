"""Build explicit start-context text masks from a privacy-cropped result fixture."""
import argparse,base64,io,json,runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
 fixture=json.loads((ROOT/'tests/fixtures/screen-reader/start-dream-result.json').read_text())
 im=Image.open(io.BytesIO(base64.b64decode(fixture['image'].split(',')[1]))).convert('RGB').resize((1536,709),Image.Resampling.BILINEAR)
 refs={'map':'MAP0001','difficulty':'狂気','fields':[]}
 for kind,box in [('white',(360,650,531,39)),('pink',(1052,662,65,25))]:
  x,y,w,h=box;pixels=list(im.crop((x,y,x+w,y+h)).getdata())
  mask=bytes(int(min(r,g,b)>220 and max(r,g,b)-min(r,g,b)<30) if kind=='white' else int(r>180 and g<140 and b>80) for r,g,b in pixels)
  if sum(mask)<100:raise ValueError('Missing start text')
  refs['fields'].append({'kind':kind,'box':box,'data':base64.b64encode(mask).decode()})
 hud=json.loads((ROOT/'tests/fixtures/screen-reader/start-dream-hud.json').read_text())
 source=Image.open(io.BytesIO(base64.b64decode(hud['image'].split(',')[1]))).convert('RGB')
 source=source.resize((round(source.width*709/source.height),709),Image.Resampling.BILINEAR)
 helpers=runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'));refs['digits']=[]
 for box,text in [((54,5,43,38),'01'),((470,1,30,25),'2'),((566,1,30,25),'4'),((662,1,30,25),'6'),((710,1,30,25),'7'),((758,1,30,25),'8')]:
  glyphs=helpers['glyphs'](helpers['crop'](source,box),'white')
  if len(glyphs)!=len(text):raise ValueError('Incomplete HUD clock')
  refs['digits'].extend({'digit':d,**g} for d,g in zip(text,glyphs))
 x,y,w,h=(54,7,43,35);refs['roundOne']={'box':[x,y,w,h],'data':base64.b64encode(bytes(int(max(rgb)<110) for rgb in source.crop((x,y,x+w,y+h)).getdata())).decode()}
 content='// Generated from explicit map and difficulty text only.\nwindow.ScreenReaderStartReferences='+json.dumps(refs,separators=(',',':'))+';\n'
 path=ROOT/'08_screen_reader/js/screen-reader-start-references.js'
 if a.check:
  if path.read_text()!=content:raise ValueError('Rebuild start references')
 else:path.write_text(content)
 print('Validated explicit dream/madness start text references')
if __name__=='__main__':main()
