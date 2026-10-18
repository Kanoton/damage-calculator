"""Build independent map/difficulty word masks from canonical names and anonymous text."""
import argparse,base64,csv,io,json,runpy
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
def template(name,font,shear):
 im=Image.new('L',(1200,150));ImageDraw.Draw(im).text((60,0),name,font=font,fill=255)
 im=im.transform(im.size,Image.Transform.AFFINE,(1,shear,0,0,1,0)).point(lambda v:255 if v>215 else 0)
 im=im.crop(im.getbbox());bits=[int(v>110) for v in im.resize((128,32),Image.Resampling.BILINEAR).tobytes()]
 return {'ratio':round(im.width/im.height,5),'data':base64.b64encode(bytes(sum(bits[i+j]<<j for j in range(8)) for i in range(0,len(bits),8))).decode()}
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
 # Independent dictionaries: never encode a map/difficulty pair.
 fonts=[ImageFont.truetype(str(ROOT/'scripts/assets/map-text/NotoSansJP.ttf'),size) for size in [28,40,90]]
 maps={r['map_id']:r['マップ名'] for r in csv.DictReader((ROOT/'csv/maps_renumbered.csv').open(encoding='utf-8-sig')) if r['表示']=='1'}
 # Fail the build instead of silently adding .notdef boxes for new CSV names.
 coverage=''.join(maps.values())+'普通困難悪夢狂気マップ難易度（協力チャレンジ）(協力チャレンジ)'
 def signature(ch):
  mask=fonts[-1].getmask(ch);return mask.size,bytes(mask)
 missing=signature('\U0010ffff')
 if any(signature(ch)==missing for ch in set(coverage)):raise ValueError('Extend the map-text font subset for the registered names')
 refs['text']={}
 for key,rows in [('maps',list(maps.items())),('difficulties',[(x,x) for x in ['普通','困難','悪夢','狂気']]),('labels',[(x,x) for x in ['マップ','難易度']])]:
  refs['text'][key]=[{'id':id,'name':name,'nameOnly':not suffix,**template(name+suffix,font,shear)} for id,name in rows for font in fonts for suffix in (['','（協力チャレンジ）','(協力チャレンジ)'] if key=='maps' else ['']) for shear in [0,-.1,-.2]]
 # Real qualifier typography is independent of the registered map name.
 glyph=im.crop((506,648,880,691));m=Image.new('L',glyph.size);m.putdata([255*int(min(v)>215 and max(v)-min(v)<35) for v in glyph.getdata()]);m=m.crop(m.getbbox());bits=[int(v>110) for v in m.resize((128,32),Image.Resampling.BILINEAR).tobytes()];packed=bytes(sum(bits[i+j]<<j for j in range(8)) for i in range(0,len(bits),8));refs['text']['suffixes']=[{'id':'coop','ratio':m.width/m.height,'data':base64.b64encode(packed).decode()}]
 # The game's result font differs from the room font; keep its observed word
 # as a map-only sample, never coupled to the observed difficulty.
 glyph=im.crop((352,644,902,695));m=Image.new('L',glyph.size);m.putdata([255*int(min(v)>215 and max(v)-min(v)<35) for v in glyph.getdata()]);m=m.crop(m.getbbox());bits=[int(v>110) for v in m.resize((128,32),Image.Resampling.BILINEAR).tobytes()];packed=bytes(sum(bits[i+j]<<j for j in range(8)) for i in range(0,len(bits),8));refs['text']['maps'].append({'id':refs['map'],'name':maps[refs['map']],'ratio':m.width/m.height,'data':base64.b64encode(packed).decode()})
 room=json.loads((ROOT/'tests/fixtures/screen-reader/start-autumn-room.json').read_text())
 roomim=Image.open(io.BytesIO(base64.b64decode(room['image'].split(',')[1]))).convert('RGB').resize((1536,709),Image.Resampling.BILINEAR)
 for name,box in [('マップ',(205,242,96,41)),('難易度',(205,330,96,40))]:
  x,y,w,h=box;glyph=roomim.crop((x,y,x+w,y+h)).convert('RGB');m=Image.new('L',glyph.size);m.putdata([255*int(min(v)>215 and max(v)-min(v)<35) for v in glyph.getdata()]);m=m.crop(m.getbbox());bits=[int(v>110) for v in m.resize((128,32),Image.Resampling.BILINEAR).tobytes()];packed=bytes(sum(bits[i+j]<<j for j in range(8)) for i in range(0,len(bits),8));refs['text']['labels'].append({'id':name,'name':name,'ratio':m.width/m.height,'data':base64.b64encode(packed).decode()})
 # Synthetic field images exercise all independent combinations in browser tests.
 cases={'maps':[],'difficulties':[]};testfont=fonts[0]
 for key,rows in [('maps',list(maps.items())),('difficulties',[(x,x) for x in ['普通','困難','悪夢','狂気']])]:
  for id,name in rows:
   glyph=Image.new('RGB',(240,42));draw=ImageDraw.Draw(glyph);b=draw.textbbox((0,0),name,font=testfont)
   draw.text(((240-(b[2]-b[0]))/2-b[0],(42-(b[3]-b[1]))/2-b[1]),name,font=testfont,fill='white')
   out=io.BytesIO();glyph.save(out,format='PNG');cases[key].append({'id':id,'name':name,'image':'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()})
 casepath=ROOT/'tests/fixtures/screen-reader/map-text-generated.json';casecontent=json.dumps(cases,ensure_ascii=False)
 if a.check:
  if casepath.read_text()!=casecontent:raise ValueError('Rebuild synthetic map text fixtures')
 else:casepath.write_text(casecontent)
 content='// Generated from explicit map and difficulty text only.\nwindow.ScreenReaderStartReferences='+json.dumps(refs,separators=(',',':'))+';\n'
 path=ROOT/'08_screen_reader/js/screen-reader-start-references.js'
 if a.check:
  if path.read_text()!=content:raise ValueError('Rebuild start references')
 else:path.write_text(content)
 print(f'Validated {len(maps)} map names and 4 independent difficulty names')
if __name__=='__main__':main()
