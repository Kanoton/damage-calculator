"""Build visible gray silhouette patches from the reviewed occluded source frames.
These are experimental species cues, never individual/serial identification.
"""
import json,hashlib,argparse
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/'tests/fixtures/screen-reader/defeat/autumn-reviewed-20261019'
OUT=ROOT/'08_screen_reader/js/screen-reader-defeat-references.js'

def build():
 m=json.loads((FOLDER/'manifest.json').read_text());patches=[]
 for sample in m['samples']:
  if sample['expected_event']!='defeat':continue
  snap=next(s for s in sample['snapshots'] if s['phase']=='gray');raw=(FOLDER/snap['image']).read_bytes()
  image=Image.open(FOLDER/snap['image']).convert('RGB');full=Image.new('RGB',(2560,1440),(20,20,20));full.paste(image,(640,360))
  scaled=full.resize((1260,709),Image.Resampling.BILINEAR);frame=Image.new('RGB',(1536,709));frame.paste(scaled,(0,0));frame=frame.resize((768,355),Image.Resampling.BILINEAR);px=frame.load();seen=set();groups=[]
  def dark(x,y):
   a=px[x,y];return max(a)<100 and min(a)>12 and max(a)-min(a)<22
  for y in range(60,280):
   for x in range(150,650):
    if (x,y) in seen or not dark(x,y):continue
    q=[(x,y)];seen.add((x,y));group=[]
    while q:
     v=q.pop();group.append(v)
     for xx,yy in [(v[0]-1,v[1]),(v[0]+1,v[1]),(v[0],v[1]-1),(v[0],v[1]+1)]:
      if 150<=xx<650 and 60<=yy<280 and (xx,yy) not in seen and dark(xx,yy):seen.add((xx,yy));q.append((xx,yy))
    groups.append(group)
  groups=[g for g in groups if len(g)>=100 and min(x for x,y in g)>150 and max(x for x,y in g)<649 and min(y for x,y in g)>60 and max(y for x,y in g)<279 and 12<=max(x for x,y in g)-min(x for x,y in g)+1<=120 and 12<=max(y for x,y in g)-min(y for x,y in g)+1<=100]
  group=max(groups,key=len);x0=min(x for x,y in group);x1=max(x for x,y in group);y0=min(y for x,y in group);y1=max(y for x,y in group);w=x1-x0+1;h=y1-y0+1
  shape=[0]*400;counts=[0]*400
  def slot(x,y):return min(19,(y-y0)*20//h)*20+min(19,(x-x0)*20//w)
  for y in range(y0,y1+1):
   for x in range(x0,x1+1):counts[slot(x,y)]+=1
  for x,y in group:shape[slot(x,y)]+=1
  patches.append(dict(sample=sample['id'],monsterId=sample['monster_id'],source_sha256=hashlib.sha256(raw).hexdigest(),ratio=w/h,shape=[round(v/counts[i],4) if counts[i] else 0 for i,v in enumerate(shape)]))
 extra=ROOT/'tests/fixtures/screen-reader/defeat/gray-patches-v1'
 for row in json.loads((extra/'manifest.json').read_text())['patches']:
  video=FOLDER/row['source_video']
  if hashlib.sha256(video.read_bytes()).hexdigest()!=row['video_sha256']:raise ValueError('Changed source video')
  path=extra/row['image'];image=Image.open(path).convert('RGB');w,h=image.size;px=image.load();seen=set();groups=[]
  def dark(x,y):
   a=px[x,y];return max(a)<100 and min(a)>12 and max(a)-min(a)<22
  for y in range(h):
   for x in range(w):
    if (x,y) in seen or not dark(x,y):continue
    q=[(x,y)];seen.add((x,y));group=[]
    while q:
     v=q.pop();group.append(v)
     for xx,yy in [(v[0]-1,v[1]),(v[0]+1,v[1]),(v[0],v[1]-1),(v[0],v[1]+1)]:
      if 0<=xx<w and 0<=yy<h and (xx,yy) not in seen and dark(xx,yy):seen.add((xx,yy));q.append((xx,yy))
    groups.append(group)
  group=max(groups,key=len);shape=[0]*400;counts=[0]*400
  for y in range(h):
   for x in range(w):counts[min(19,y*20//h)*20+min(19,x*20//w)]+=1
  for x,y in group:shape[min(19,y*20//h)*20+min(19,x*20//w)]+=1
  patches.append(dict(sample=row['sample'],monsterId=row['monsterId'],source_patch=row['image'],source_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),ratio=w/h,shape=[round(v/counts[i],4) if counts[i] else 0 for i,v in enumerate(shape)]))
 for row in json.loads((ROOT/'tests/fixtures/screen-reader/defeat/gray-renderer-patches.json').read_text())['patches']:
  if hashlib.sha256((FOLDER/row['image']).read_bytes()).hexdigest()!=row['source_sha256']:raise ValueError('Changed renderer source image')
  if len(row['shape'])!=400 or not all(0<=v<=1 for v in row['shape']):raise ValueError('Invalid renderer patch')
  patches.append({key:row[key] for key in ['sample','monsterId','renderer','renderer_version','image','source_sha256','ratio','shape']})
 for row in json.loads((ROOT/'tests/fixtures/screen-reader/defeat/autumn-turn-20261020/patches.json').read_text())['patches']:
  if hashlib.sha256((ROOT/row['image']).read_bytes()).hexdigest()!=row['source_sha256']:raise ValueError('Changed full-turn patch')
  if len(row['shape'])!=400 or not all(0<=v<=1 for v in row['shape']):raise ValueError('Invalid full-turn patch')
  patches.append(row)
 replay=ROOT/'tests/fixtures/screen-reader/defeat/autumn-replay-20261029'
 for row in json.loads((replay/'patches.json').read_text())['patches']:
  path=replay/row['image']
  if hashlib.sha256(path.read_bytes()).hexdigest()!=row['source_sha256']:raise ValueError('Changed replay patch')
  if Image.open(path).size!=tuple(row['box'][2:]):raise ValueError('Replay patch size mismatch')
  if len(row['shape'])!=400 or not all(0<=v<=1 for v in row['shape']):raise ValueError('Invalid replay patch')
  patches.append(row)
 scenes=json.loads((replay/'scenes.json').read_text())
 for scene in scenes['scenes']:
  for snap in scene['snapshots']:
   path=replay/snap['image']
   if hashlib.sha256(path.read_bytes()).hexdigest()!=snap['image_sha256']:raise ValueError('Changed replay scene')
   if Image.open(path).size!=tuple(scene['normalized_box'][2:]):raise ValueError('Replay scene size mismatch')
 reviewed=ROOT/'tests/fixtures/screen-reader/defeat/autumn-owls-45-20261029'
 manifest=json.loads((reviewed/'manifest.json').read_text())
 video=reviewed/manifest['review_video']['image']
 if hashlib.sha256(video.read_bytes()).hexdigest()!=manifest['review_video']['sha256']:raise ValueError('Changed owl review video')
 path=reviewed/manifest['battle']['image']
 if hashlib.sha256(path.read_bytes()).hexdigest()!=manifest['battle']['image_sha256']:raise ValueError('Changed battle fixture')
 if Image.open(path).size!=(480,220):raise ValueError('Battle fixture size mismatch')
 for row in manifest['patches']:
  path=reviewed/row['image']
  if hashlib.sha256(path.read_bytes()).hexdigest()!=row['source_sha256']:raise ValueError('Changed owl patch')
  if Image.open(path).size!=tuple(row['box'][2:]):raise ValueError('Owl patch size mismatch')
  if len(row['shape'])!=400 or not all(0<=v<=1 for v in row['shape']):raise ValueError('Invalid owl patch')
  patches.append(row)
 for scene in manifest['scenes']:
  path=reviewed/scene['image'];box=scene['normalized_box'];columns=scene['columns']
  if hashlib.sha256(path.read_bytes()).hexdigest()!=scene['image_sha256']:raise ValueError('Changed owl sequence')
  rows=(len(scene['snapshots'])+columns-1)//columns
  if Image.open(path).size!=(box[2]*columns,box[3]*rows):raise ValueError('Owl sequence size mismatch')
 return '// Generated visible patches; no full-body requirement or serial inference.\nwindow.ScreenReaderDefeatReferences='+json.dumps(dict(version=1,fullBodyRequired=False,patches=patches),separators=(',',':'))+';\n'
if __name__=='__main__':
 args=argparse.ArgumentParser();args.add_argument('--check',action='store_true');a=args.parse_args();text=build()
 if a.check:
  if OUT.read_text()!=text:raise ValueError('Stale defeat references; rebuild')
 else:OUT.write_text(text)
 print('Validated original and compressed partial gray patches / 4 species; individual number remains unknown')

