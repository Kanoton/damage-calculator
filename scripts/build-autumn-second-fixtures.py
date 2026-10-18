"""Extract the second autumn video's anonymous printed labels, never player data."""
import argparse,base64,io,json,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
# Boxes in the 709px-high, aspect-preserving game coordinate system.
CASES=[('owl',59,'M0123',[322,237,169,23],[496,238,20,25],[374,270,41,26],2,5,9),('bear',59,'M0121',[334,302,151,24],[491,302,22,27],[375,335,72,29],6,16,16),('dinosaur',59,'M0122',[651,402,150,25],[805,402,20,28],[695,435,65,28],3,22,22),('gao',27,'M0120',[600,179,132,24],None,[634,212,94,26],None,125,130)]
def main():
 p=argparse.ArgumentParser();p.add_argument('--video',required=True);args=p.parse_args()
 directory=ROOT/'tests/fixtures/screen-reader';rows=json.loads((directory/'monster-labels.json').read_text());rows=[r for r in rows if r.get('source')!='autumn-second']
 CASES.append(('owl-held',17,'M0123',[307,251,169,26],[482,251,23,29],[358,283,50,29],2,8,9))
 for name,frame,mid,nb,sb,hb,serial,hp,maxhp in CASES:
  t=frame-1+14/30;raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',args.video,'-frames:v','1','-f','image2pipe','-vcodec','png','-']);im=Image.open(io.BytesIO(raw)).convert('RGB');scale=im.height/709
  def box(b):
   if b is None:return None
   x,y,w,h=b;left,top=round(x*scale),round(y*scale);return [left,top,round((x+w)*scale)-left,round((y+h)*scale)-top]
  nb,sb,hb=map(box,[nb,sb,hb]);safe=Image.new('RGB',im.size,(20,20,20))
  for b in [nb,sb,hb]:
   if b:
    x,y,w,h=b;safe.paste(im.crop((x,y,x+w,y+h)),(x,y))
  out=io.BytesIO();safe.save(out,format='PNG');fixture='labels-autumn-second-'+name
  (directory/(fixture+'.json')).write_text(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()}))
  rows.append({'fixture':fixture,'id':mid,'boss':serial is None,'nameBox':nb,'serialBox':sb,'hpBox':hb,'expected':{'monsterId':mid,'serial':serial,'currentHp':hp,'maxHp':maxhp},'source':'autumn-second','seconds':t,'training':name!='owl-held','learnHpDigits':False,'learnSerialDigits':False})
 (directory/'monster-labels.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
