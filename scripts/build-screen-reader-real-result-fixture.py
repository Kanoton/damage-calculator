"""Retain only the printed footer and separator from the supplied result image."""
import argparse,base64,io,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/fixtures/screen-reader/result-banner-autumn-real.json'
SIZE=(2048,1151)
BOX=(470,1044,1580,1135)
def image_data(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
 if not a.check and not a.source:p.error('--source is required when generating')
 if a.source:
  source=Image.open(a.source).convert('RGB')
  if source.size!=SIZE:raise ValueError('Expected the supplied 2048x1151 result image')
  im=Image.new('RGB',SIZE,(20,20,20));im.paste(source.crop(BOX),BOX[:2])
  value={'source':'Real result footer supplied 2026-10-19; all other pixels removed','synthetic':False,'size':list(SIZE),'retainedBox':list(BOX),'expected':{'map':'MAP0105','difficulty':'困難'},'image':image_data(im)}
  if not a.check:OUT.write_text(json.dumps(value,ensure_ascii=False))
 stored=json.loads(OUT.read_text());image=Image.open(io.BytesIO(base64.b64decode(stored['image'].split(',')[1]))).convert('RGB')
 if image.size!=SIZE or stored['retainedBox']!=list(BOX) or stored['synthetic'] is not False:raise ValueError('Unexpected fixture metadata')
 redacted=image.copy();redacted.paste((20,20,20),BOX)
 if redacted.getextrema()!=((20,20),(20,20),(20,20)):raise ValueError('Pixels outside the footer must be removed')
 if a.source and image.tobytes()!=im.tobytes():raise ValueError('Fixture differs from the supplied footer')
 print('Validated real result footer; no player/account area retained')
if __name__=='__main__':main()
