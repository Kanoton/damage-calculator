"""Synthetic regression for observed banner clutter; NOT the missing user image."""
import argparse,base64,io,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,__version__ as PILLOW_VERSION
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/fixtures/screen-reader/result-banner-synthetic.json'
def build():
 im=Image.new('RGB',(1536,709),(20,20,20));d=ImageDraw.Draw(im)
 for x in range(357,1150):
  green=round(43+192*max(0,min(1,(x-740)/297)));d.line((x,644,x,697),fill=(255,green,round((green+255)/2)))
 d.rectangle((352,644,1038,646),fill='white');d.rectangle((352,695,1038,697),fill='white');d.rectangle((330,650,355,690),fill='white')
 font=ImageFont.truetype(str(ROOT/'scripts/assets/map-text/NotoSansJP.ttf'),40)
 mask=Image.new('L',(500,100));ImageDraw.Draw(mask).text((0,0),'秋幻の森',font=font,fill=255);mask=mask.crop(mask.getbbox());width=round(mask.width/mask.height*38*1.22);mask=mask.resize((width,38),Image.Resampling.BILINEAR);im.paste('white',(361,651,361+width,689),mask)
 old=json.loads((ROOT/'tests/fixtures/screen-reader/start-dream-result.json').read_text());source=Image.open(io.BytesIO(base64.b64decode(old['image'].split(',')[1]))).convert('RGB').resize((1536,709),Image.Resampling.BILINEAR)
 suffix=source.crop((508,650,878,688));suffix_x=361+width+5;im.paste(suffix,(suffix_x,650))
 d=ImageDraw.Draw(im);d.rectangle((1040,647,1140,696),fill=(255,245,251));d.polygon([(1126,644),(1142,644),(1133,698),(1126,698)],fill=(255,35,145))
 token=Image.new('L',(200,80));ImageDraw.Draw(token).text((0,0),'困難',font=font,fill=255);token=token.crop(token.getbbox()).resize((52,21),Image.Resampling.BILINEAR);im.paste((255,35,145),(1060,666,1112,687),token)
 d.text((1188,660),'11 Round',font=ImageFont.load_default(size=25),fill=(255,35,145))
 b=io.BytesIO();im.save(b,format='PNG')
 return {'synthetic':True,'expected':{'map':'MAP0105','difficulty':'困難'},'regions':{'map':[357,647,width+8,45],'qualifier':[suffix_x,650,370,38],'difficulty':[1050,656,74,38]},'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
 if PILLOW_VERSION!='12.3.0':p.error('Use Pillow==12.3.0 for reproducible fixture pixels (same version as CI)')
 value=build()
 if a.check:
  old=json.loads(OUT.read_text());left=Image.open(io.BytesIO(base64.b64decode(old.pop('image').split(',')[1])));right=Image.open(io.BytesIO(base64.b64decode(value.pop('image').split(',')[1])))
  if old!=value or left.size!=right.size or left.tobytes()!=right.tobytes():raise ValueError('Rebuild synthetic result banner')
 else:OUT.write_text(json.dumps(value,ensure_ascii=False))
 print('Validated synthetic result banner (not an original screenshot)')
if __name__=='__main__':main()
