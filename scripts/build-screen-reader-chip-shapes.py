"""Build foreground-shape/rarity references from canonical chip assets and reviewed grids."""
import argparse,base64,csv,io,json,runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CENTERS=[(535,352),(609,352),(682,352),(495,416),(570,416),(644,416),(719,416),(535,481),(609,481),(682,481)]
CASES=[('luka','スクリーンショット 2026-10-18 044604.png','17',[(0,'1'),(1,'41'),(2,'6'),(3,'42'),(4,'43')]),('parunan','スクリーンショット 2026-10-18 044744.png','2',[(0,'29'),(1,'30'),(2,'44')]),('sherry-late','image(20261017-214935).png','106',[(0,'52'),(1,'58'),(2,'9'),(3,'45'),(4,'43'),(5,'55')]),('yume-late','image(20261017-215034).png','20',[(0,'23'),(1,'102'),(2,'48')])]
def shape(im):
 pixels=list(im.convert('RGB').resize((32,32),Image.Resampling.BILINEAR).getdata());mask=[];votes=[0,0,0]
 for i,(r,g,b) in enumerate(pixels):
  x=i%32;y=i//32;lo=min(r,g,b);hi=max(r,g,b)
  mask.append(int(lo>110 and hi>180 and hi-lo<135 and (x-15.5)**2+(y-15.5)**2<14.5**2))
  votes[0]+=int(b>150 and g>90 and r<110);votes[1]+=int(r>135 and b>150 and g<105);votes[2]+=int(r>165 and g>120 and b<120)
 return {'rarity':votes.index(max(votes)),'data':base64.b64encode(bytes(sum(mask[i+j]<<j for j in range(8)) for i in range(0,1024,8))).decode()}
def main():
 p=argparse.ArgumentParser();p.add_argument('--screens');p.add_argument('--cases',nargs='+',choices=[r[0] for r in CASES]);p.add_argument('--check',action='store_true');a=p.parse_args();h=runpy.run_path(str(ROOT/'scripts/build-screen-reader-references.py'));refs={'shapes':[],'reviewed':[]}
 rows=list(csv.DictReader((ROOT/'csv/chip_list.csv').open(encoding='utf-8-sig'),delimiter='\t'))
 for row in rows:
  im=Image.open(ROOT/'images/chip_icon'/row['images']).convert('RGB');w,hh=im.size
  for f in [.02,.06,.10,.14]:refs['shapes'].append({'id':row['id'],**shape(im.crop((w*f,hh*f,w*(1-f),hh*(1-f))))})
 # Raw artwork has no rarity background. Use the reviewed mapping and the
 # independently checked token-ring rarity, never the raw asset number/color.
 mapping=runpy.run_path(str(ROOT/'scripts/check-chip-artwork-mapping.py'))['validate']()
 rarity_codes={'blue':0,'purple':1,'gold':2}
 for row in mapping:
  raw=Image.open(ROOT/'images/UT_Relic'/row['artwork_file']).convert('RGBA')
  for size in [72,80,88,96]:
   art=raw.resize((size,size),Image.Resampling.BILINEAR);canvas=Image.new('RGB',(100,100));canvas.paste(art,((100-size)//2,(100-size)//2),art)
   descriptor=shape(canvas);descriptor['rarity']=rarity_codes[row['rarity']]
   refs['shapes'].append({'id':row['chip_id'],**descriptor})
 for name,filename,owner,slots in CASES:
  path=ROOT/f'tests/fixtures/screen-reader/chip-grid-{name}.json'
  if a.screens and (not a.cases or name in a.cases):
   im=Image.open(Path(a.screens)/filename).convert('RGB');safe=Image.new('RGB',im.size,(20,20,20));scale=im.height/709;offset=(1536-im.width/scale)/2
   # Preserve the panel controls, printed canonical name, all slots and divider.
   grid=(460,318,300,200) if name.endswith('-late') else (465,324,286,184)
   for x,y,w,hh in [(410,75,245,55),(593,178,235,44),grid,(420,298,818,5)]:
    box=(round((x-offset)*scale),round(y*scale),round((x+w-offset)*scale),round((y+hh)*scale));safe.paste(im.crop(box),box[:2])
   b=io.BytesIO();safe.save(b,format='PNG');path.write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))
  im=Image.open(io.BytesIO(base64.b64decode(json.loads(path.read_text())['image'].split(',')[1]))).convert('RGB');width=round(im.width*709/im.height);frame=Image.new('RGB',(1536,709));frame.paste(im.resize((width,709),Image.Resampling.BILINEAR),((1536-width)//2,0))
  for slot,ident in slots:
   x,y=CENTERS[slot];refs['reviewed'].append({'id':ident,'data':h['feature'](h['crop'](frame,(x-18,y-18,36,36)))})
   if name.endswith('-late'):
    # Observed screen colors may differ from a canonical asset's ring (23 is
    # purple here, blue in the saved icon). Preserve both supported appearances.
    refs['shapes'].append({'id':ident,'fixture':path.name,**shape(h['crop'](frame,(x-26,y-26,52,52)))})
 content='// Generated from canonical chip assets and privacy-cropped reviewed grids.\nwindow.ScreenReaderChipShapeReferences='+json.dumps(refs,separators=(',',':'))+';\n';path=ROOT/'08_screen_reader/js/screen-reader-chip-shape-references.js'
 if a.check:
  if path.read_text()!=content:raise ValueError('Rebuild chip shape references')
 else:path.write_text(content)
 print(f'Validated {len(rows)} chip identities, {len(refs["shapes"])} shapes and {len(refs["reviewed"])} reviewed slots')
if __name__=='__main__':main()
