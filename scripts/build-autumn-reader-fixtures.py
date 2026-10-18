"""Extract only monster labels/HP from the supplied 10x video.

Usage: --video VIDEO. Rebuilding the world references uses the saved anonymous
fixtures and does not require the original video. Times below are video seconds.
"""
import argparse,base64,io,json,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CASES=[
 ('gao',50,'M0120',True,[916,339,207,40],None,[966,394,142,42],None,115,120,True),
 ('bear',50,'M0121',False,[823,148,235,39],[1068,151,24,38],[891,201,106,42],1,14,14,True),
 ('owl',50,'M0123',False,[624,247,259,40],[894,251,27,40],[706,300,66,43],5,3,8,True),
 ('dinosaur',71,'M0122',False,[957,286,234,41],[1200,288,25,40],[1026,335,100,44],1,14,19,True),
 ('gao-held',72,'M0120',True,[565,394,205,44],None,[621,449,135,44],None,112,120,False),
 ('dinosaur-held',74,'M0122',False,[1291,387,235,42],[1528,388,26,43],[1360,438,102,46],1,14,19,False),
 ('bear-later',71,'M0121',False,[1045,185,235,40],[1287,187,25,39],[1110,232,108,44],1,13,14,False),
 ('owl-later',71,'M0123',False,[508,412,258,40],[778,417,26,40],[589,461,66,44],2,8,8,False),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--video',required=True);args=p.parse_args()
 directory=ROOT/'tests/fixtures/screen-reader';rows=json.loads((directory/'monster-labels.json').read_text());rows=[r for r in rows if r.get('source')!='autumn']
 for name,seconds,mid,boss,namebox,serialbox,hpbox,serial,hp,maxhp,training in CASES:
  raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(seconds+14/30),'-i',args.video,'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
  image=Image.open(io.BytesIO(raw)).convert('RGB');safe=Image.new('RGB',image.size,(20,20,20))
  for box in [namebox,serialbox,hpbox]:
   if box:
    x,y,w,h=box;safe.paste(image.crop((x,y,x+w,y+h)),(x,y))
  buffer=io.BytesIO();safe.save(buffer,format='PNG');fixture='labels-autumn-'+name
  (directory/(fixture+'.json')).write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(buffer.getvalue()).decode()}))
  rows.append({'fixture':fixture,'id':mid,'boss':boss,'nameBox':namebox,'serialBox':serialbox,'hpBox':hpbox,'expected':{'monsterId':mid,'serial':serial,'currentHp':hp,'maxHp':maxhp},'source':'autumn','seconds':seconds+14/30,'training':training,**({'allowAbstain':True} if name in ['bear-later','owl-later'] else {})})
 (directory/'monster-labels.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
