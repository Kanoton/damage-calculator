"""Build privacy-cropped world fixtures and compact text masks (no full screenshots)."""
import argparse,base64,io,json,runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
# Coordinates at height 709, with the left screen edge as x=0.
LABELS={'11':[(374,228,130,28),(409,264,41,24),(375,294,132,28),(409,330,76,24)],'36':[(374,261,132,28),(246,362,132,28),(281,400,82,25)],'41':[],'43':[(374,261,132,28),(408,296,44,25)]}
def main():
 p=argparse.ArgumentParser();p.add_argument('--screens');p.add_argument('--check',action='store_true');a=p.parse_args();helpers=runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'));refs={'digits':[],'names':[]}
 frames={}
 for stamp,boxes in LABELS.items():
  path=ROOT/f'tests/fixtures/screen-reader/world-{stamp}.json'
  if a.screens:
   im=Image.open(Path(a.screens)/f'202610082114{stamp}_1.jpg').convert('RGB');w,h=im.size;s=h/709;safe=Image.new('RGB',(w,h),(20,20,20))
   # Include label/serial/HP only, no portrait, player name, chat or map.
   areas=[(54,5,102,35),(430,0,437,29)]+[(x,y,bw+28,bh) for x,y,bw,bh in boxes]
   for x,y,bw,bh in areas:
    box=(round(x*s),round(y*s),round((x+bw)*s),round((y+bh)*s));safe.paste(im.crop(box),box[:2])
   b=io.BytesIO();safe.save(b,format='PNG');path.write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))
  im=Image.open(io.BytesIO(base64.b64decode(json.loads(path.read_text())['image'].split(',')[1]))).convert('RGB');im=im.resize((round(im.width*709/im.height),709),Image.Resampling.BILINEAR);frames[stamp]=im
 def glyphs(stamp,box,kind,text):
  gs=helpers['glyphs'](helpers['crop'](frames[stamp],box),kind)
  if len(gs)!=len(text):raise ValueError((stamp,box,text,len(gs)))
  refs['digits'].extend({'digit':d,**g}for d,g in zip(text,gs))
 glyphs('11',(54,7,43,30),'white','04');glyphs('41',(54,7,43,30),'white','05')
 # Centered progress cells translated into the left-anchored frame.
 for stamp,values in [('11',[(552,4),(648,6),(696,7),(744,8),(792,9)]),('41',[(600,6),(648,7),(696,8),(744,9),(840,11)])]:
  for x,v in values:glyphs(stamp,(x-15,1,30,25),'white',str(v))
 glyphs('11',(409,264,41,24),'red','7/7');glyphs('11',(409,330,76,24),'red','91/120')
 glyphs('11',(510,230,16,26),'white','5');glyphs('43',(510,263,16,26),'white','7')
 for stamp,ident,box in [('11','M0017',(374,228,130,28)),('43','M0017',(374,261,130,28)),('11','M0014',(375,294,132,28))]:
  im=helpers['crop'](frames[stamp],box);mask=helpers['mask'](im,'white');pts=[(x,y)for y,row in enumerate(mask)for x,v in enumerate(row)if v];x0=min(x for x,y in pts);y0=min(y for x,y in pts);x1=max(x for x,y in pts)+1;y1=max(y for x,y in pts)+1
  data=bytes(mask[y][x]for y in range(y0,y1)for x in range(x0,x1));refs['names'].append({'id':ident,'width':x1-x0,'height':y1-y0,'data':base64.b64encode(data).decode()})
 out=ROOT/'08_screen_reader/js/screen-reader-world-references.js';content='// Generated from privacy-cropped world labels.\nwindow.ScreenReaderWorldReferences='+json.dumps(refs,separators=(',',':'))+';\n'
 if a.check:
  if out.read_text()!=content:raise ValueError('Rebuild world references')
 else:out.write_text(content)
 print('Validated world digits, slash and two monster names')
if __name__=='__main__':main()
