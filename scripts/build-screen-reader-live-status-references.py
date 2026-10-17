"""Reviewed cropped/zoomed status fixtures; no player HUD or battle HP retained."""
import argparse,base64,io,json,runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CASES=[('sherry','106','52',(102,473,1653)),('luka','17','1',(59,488,1653))]
BOXES=[(410,75,245,55),(593,178,235,44),(542,239,26,37),(619,239,26,37),(465,324,286,184),(420,298,818,5)]
def aligned(im,line):
 x,y,width=line;scale=815.5/width;dx=421-x*scale;dy=299-y*scale
 return im.transform((1536,709),Image.Transform.AFFINE,(1/scale,0,-dx/scale,0,1/scale,-dy/scale),Image.Resampling.BILINEAR)
def main():
 p=argparse.ArgumentParser();p.add_argument('--screens');p.add_argument('--check',action='store_true');a=p.parse_args();h=runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'));out={'names':[],'chips':[],'digits':[]}
 for n,owner,chip,line in CASES:
  path=ROOT/f'tests/fixtures/screen-reader/live-status-{n}.json'
  if a.screens:
   original=Image.open(Path(a.screens)/('image(20261017-'+('133805' if n=='sherry' else '133829')+').png')).convert('RGB');safe=Image.new('RGB',original.size,(20,20,20));x,y,width=line;scale=815.5/width;dx=421-x*scale;dy=299-y*scale
   for bx,by,bw,bh in BOXES+([(840,145,390,125)] if n=='sherry' else []):
    box=(int((bx-dx)/scale),int((by-dy)/scale),int((bx+bw-dx)/scale)+1,int((by+bh-dy)/scale)+1);safe.paste(original.crop(box),box[:2])
   b=io.BytesIO();safe.save(b,format='PNG');path.write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))
  im=Image.open(io.BytesIO(base64.b64decode(json.loads(path.read_text())['image'].split(',')[1]))).convert('RGB');frame=aligned(im,line)
  crop=h['crop'](frame,(593,178,235,44));mask=h['mask'](crop,'white');points=[(x,y) for y,row in enumerate(mask) for x,v in enumerate(row) if v];x0=min(x for x,y in points);x1=max(x for x,y in points)+1;y0=min(y for x,y in points);y1=max(y for x,y in points)+1
  glyph=Image.new('L',(x1-x0,y1-y0));glyph.putdata([mask[y][x]*255 for y in range(y0,y1) for x in range(x0,x1)]);data=[int(v>110) for v in glyph.resize((128,32),Image.Resampling.BILINEAR).tobytes()];packed=bytes(sum(data[i+j]<<j for j in range(8)) for i in range(0,len(data),8))
  out['names'].append({'id':owner,'ratio':round(glyph.width/glyph.height,5),'data':base64.b64encode(packed).decode()})
  out['chips'].append({'id':chip,'data':h['feature'](h['crop'](frame,(517,334,36,36)))})
  for box,text in [((542,239,26,37),'3'),((619,239,26,37),'1' if n=='sherry' else '2')]:
   glyphs=h['glyphs'](h['crop'](frame,box),'white')
   if len(glyphs)!=len(text):raise ValueError((n,text,len(glyphs)))
   out['digits'].extend({'digit':v,**g} for v,g in zip(text,glyphs))
 content='// Generated from reviewed privacy-cropped status screens.\nwindow.ScreenReaderLiveStatusReferences='+json.dumps(out,separators=(',',':'))+';\n';path=ROOT/'08_screen_reader/js/screen-reader-live-status-references.js'
 if a.check:
  if path.read_text()!=content:raise ValueError('Rebuild live status references')
 else:path.write_text(content)
 print('Validated Sherry/Luka names, chips 52/1 and status digits')
if __name__=='__main__':main()
