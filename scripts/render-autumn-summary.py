"""Render current autumn map reference sheets from canonical CSVs and approved maps.
No app code/data is changed. Output: four difficulties, two portrait + two WQHD each.
"""
import argparse,csv,json,re,subprocess,zipfile
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
REG='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
GREEN='#245947';INK='#263e36';ORANGE='#ca6a28';BG='#f8f6ef';BORDER='#d9ded2'

def rows(name,delimiter=','):
 with (ROOT/'csv'/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f,delimiter=delimiter))
STATS=rows('monster_stats.csv');SKILLS=rows('monster_skills.csv');FEATURES=[r for r in rows('map_features.csv') if r['map_id']=='MAP0105']
CHIPS=[r for r in rows('chip_list.csv','\t') if 'MAP0105' in r['category'].split('|')]
MISSIONS=[r for r in rows('map_mission.csv') if r['map_id']=='MAP0105']
EVENTS=[r for r in rows('map_event.csv') if r['map_id']=='MAP0105']
CARDS=[r for r in FEATURES if r['kind']=='card'];KEYWORDS=[r for r in FEATURES if r['kind']=='keyword'];CALIBURN=[r for r in FEATURES if r['kind']=='caliburn']
TOKENS={r['name']:(ROOT/'images'/r['image'],'#7546a6' if r['name']=='みなぎる元気' else '#246b9b') for r in KEYWORDS}
CACHE={}
EVENT_REFS=ROOT/'docs/map-event-output/autumn-forest/production/event-reference-2x'
def font(size,bold=False):
 key=(size,bold)
 if key not in CACHE:CACHE[key]=ImageFont.truetype(BOLD if bold else REG,size)
 return CACHE[key]
class Sheet:
 def __init__(self,w,h,title,sub):
  self.im=Image.new('RGB',(w,h),BG);self.d=ImageDraw.Draw(self.im);self.w=w;self.h=h;self.bottom=0
  self.d.rectangle((0,0,w,10),fill=ORANGE);self.text(title,80,50,w-160,70,True,GREEN)
  self.text(sub,80,142,w-160,28,False,'#65776e');self.d.line((80,194,w-80,194),fill=BORDER,width=2)
 def text(self,text,x,y,width,size=30,bold=False,color=INK):
  """Wrap Japanese at character boundaries; keywords are atomic inline icon tokens."""
  lineh=round(size*1.48);cx=x;cy=y
  pattern='('+'|'.join(map(re.escape,TOKENS))+')'
  parts=re.split(pattern,str(text))
  for part in parts:
   if part in TOKENS:
    path,c=TOKENS[part];tw=self.d.textlength(part,font=font(size,True))+size+5
    if cx>x and cx+tw>x+width:cx=x;cy+=lineh
    self.image(path,cx,cy+3,size,size);cx+=size+5
    self.d.text((cx,cy),part,font=font(size,True),fill=c);cx+=tw-size-5
   else:
    for ch in re.findall(r'\n|[+-]?\d+(?:%|ターン|マス|スタック)?|.',part):
     if ch=='\n':cx=x;cy+=lineh;continue
     tw=self.d.textlength(ch,font=font(size,bold))
     if cx>x and cx+tw>x+width and ch not in '。、）］：':cx=x;cy+=lineh
     self.d.text((cx,cy),ch,font=font(size,bold),fill=color);cx+=tw
  end=cy+lineh;self.bottom=max(self.bottom,end);return end
 def image(self,path,x,y,w,h):
  im=Image.open(path).convert('RGBA');im.thumbnail((round(w),round(h)),Image.Resampling.LANCZOS)
  self.im.paste(im,(round(x+(w-im.width)/2),round(y+(h-im.height)/2)),im)
 def box(self,x,y,w,h):self.d.rounded_rectangle((x,y,x+w,y+h),radius=16,fill='white',outline=BORDER,width=2)
 def heading(self,text,x,y,w,size=40):
  self.d.rounded_rectangle((x,y+7,x+7,y+size+9),radius=3,fill=ORANGE)
  return self.text(text,x+22,y,w-22,size,True,GREEN)+18
 def save(self,path):
  if self.bottom>self.h-40:raise ValueError(f'Page overflow {path}: {self.bottom}/{self.h}')
  path.parent.mkdir(parents=True,exist_ok=True);self.im.save(path,optimize=True)

def mission(s,x,y,w,size):
 y=s.heading('マップミッション',x,y,w,round(size*1.3))
 for r in MISSIONS:
  condition=r['内容'];target=r['目標数'] if '目標数' in r else r.get('目標','')
  # Canonical schema keeps monster target and required count separately.
  n=next((r[k] for k in ['カウンタ'] if k in r),'')
  if r['monster_id'] and n:condition=condition.replace('を撃破',n+'体撃破')
  y=s.text(condition,x+14,y,w-28,size,True)+3
  y=s.text(r['報酬'],x+28,y,w-42,size-2)+12
  s.d.line((x,y-4,x+w,y-4),fill=BORDER,width=1)
 return y+8

def events(s,x,y,w,size,difficulty):
 y=s.heading('進捗イベント',x,y,w,round(size*1.3))
 for step in [1,3,7,10]:
  rr=[r for r in EVENTS if r['進捗']==str(step)]
  text='\n'.join(r['内容'].replace('全モンスターにA+1/D+1','全モンスター：攻撃+1／防御+1') for r in rr)
  s.text(str(step),x+10,y,50,size,True,GREEN)
  y=s.text(text,x+65,y,w-75,size)+12
 stop=next(r['進捗'] for r in EVENTS if r['内容']=='ゲームオーバー' and difficulty in r['難易度'].split('|'))
 s.text(stop,x+10,y,50,size,True,GREEN);y=s.text('ゲームオーバー',x+65,y,w-75,size)+20
 return y

def caliburn(s,x,y,w,size):
 y=s.heading('カリバーン',x,y,w,round(size*1.3))
 for r in CALIBURN:
  s.image(ROOT/'images'/r['image'],x,y,round(size*1.3),round(size*1.3))
  y=s.text('植物建築'+r['threshold']+'個  '+r['name'],x+size*1.6,y,w-size*1.6,size,True,GREEN)
  y=s.text(r['description'].replace('：','\n'),x+10,y+5,w-20,size-2)+14
 return y

def monster(s,mid,diff,x,y,w,size):
 r=next(r for r in STATS if r['monster_id']==mid and r['難易度']==diff)
 start=y;pad=22;tx=x+pad;tw=w-2*pad
 y=s.text(r['モンスター名'],tx,y+15,tw-90,size+6,True,GREEN)
 s.image(ROOT/'images/Monster'/r['image'],x+w-100,start+10,80,90)
 if r['ボス']=='1':s.image(ROOT/'images/icon/Boss.png',tx+size*7.8,start+18,size+7,size+7)
 staty=y+4;cx=tx
 for icon,key in [('Attack','攻撃'),('Defense','防御'),('Hp','HP'),('Coin','コイン')]:
  if not r[key]:continue
  s.image(ROOT/'images/icon'/f'{icon}.png',cx,staty+2,size,size)
  value=r[key];s.text(value,cx+size+5,staty,100,size,True);cx+=size*2.7+(len(value)-1)*size*.45
 y=staty+round(size*1.6)+8
 ability=next((a['能力'] for a in SKILLS if a['monster_id']==mid and a['難易度']==diff),r['能力'])
 if ability.startswith('ギミック紹介'):
  ability=ability.replace('ギミック紹介\n','');ability=re.sub(r'(?m)^\d+\.','',ability)
 for line in ability.splitlines():
  if not line.strip():continue
  ishead=line.startswith(('スキル -','パッシブスキル -'))
  if ishead:y+=8
  y=s.text(line.replace('パッシブスキル -','パッシブ：').replace('スキル -','スキル：'),tx,y,tw,size,ishead,ORANGE if ishead else INK)+3
 if mid=='M0120':
  # Skills CSV already includes both keyword definitions.
  pass
 y+=16;s.d.line((x,start,x+w,start),fill=GREEN,width=5);s.d.line((x,y,x+w,y),fill=BORDER,width=2)
 return y+(10 if size<20 else 22)

def card(s,r,x,y,w,h,size):
 s.box(x,y,w,h)
 if size<=20:
  s.image(ROOT/'images'/r['image'],x+12,y+12,38,38)
  end=s.text(r['name'],x+60,y+12,w-72,size+1,True,GREEN)
  desc=r['description'].replace('建物を設置できるマスを1つ指定し、','').replace('このターン、カード使用数+1。','')
  end=s.text(desc,x+12,max(end,y+54),w-24,size-2)
 else:
  s.image(ROOT/'images'/r['image'],x+12,y+12,90,90)
  end=s.text(r['name'],x+112,y+15,w-130,size+2,True,GREEN)
  end=s.text(r['description'],x+112,end+6,w-130,size-2)
  end=max(end,y+105)
 end=s.text('設置後  '+r['building_effect'],x+16,end+5,w-32,size-1)
 if end>y+h-5:raise ValueError('Card overflow '+r['name']+str(end-y))

def chips(s,x,y,w,size):
 y=s.heading('マップ固有チップ',x,y,w,round(size*1.3))
 cw=(w-30)/3
 for i,r in enumerate(CHIPS):
  xx=x+i*(cw+15);s.image(ROOT/'images/chip_icon'/r['images'],xx,y,46,46)
  end=s.text(r['name'],xx+54,y,cw-54,size,True,GREEN)
  s.text(r['effect'],xx,end+12,cw,size-2)
 return max(s.bottom,y)+20

def portrait(diff,slug,out):
 s=Sheet(2240,3329,'秋幻の森  ｜  '+diff,'マップ・ミッション・カリバーン・出現位置   /   2026.11.15 更新   /   1・2')
 x=80;w=1050;y=mission(s,x,225,w,31);y=events(s,x,y+15,w,31,diff);caliburn(s,x,y+12,w,30)
 s.heading('マップ',1190,225,970,40);s.box(1190,295,970,1080)
 s.image(ROOT/'images/Map/Layout_Autumn_Forest.png',1220,320,910,990)
 s.text('青枠：建物設置マス（16か所）',1220,1310,900,28,True,GREEN)
 y=1630;s.heading('イベントごとの出現位置',80,y,2080,42)
 for i,step in enumerate([1,3,7,10]):
  xx=80+(i%2)*1060;yy=1715+(i//2)*760
  s.box(xx,yy,1020,730);s.text('進捗 '+str(step),xx+25,yy+15,950,34,True,GREEN)
  s.image(EVENT_REFS/f'Autumn_Event_{step:02}_Reference_2x.png',xx+80,yy+75,860,630)
 s.save(out/'Vertical'/f'Autumn_Forest_{slug}_Summary_01_20261115.png')
 s=Sheet(2240,3329,'秋幻の森  ｜  '+diff,'植物建築カード・固有チップ・モンスター   /   2026.11.15 更新   /   2・2')
 s.heading('マップ固有カード',80,220,2080,40)
 for i,r in enumerate(CARDS):card(s,r,80+(i%3)*700,290+(i//3)*300,680,280,25)
 chips(s,80,920,2080,29)
 s.heading('モンスター情報',80,1200,2080,40)
 for col,ids in enumerate([['M0120','M0123','M0005'],['M0122','M0121','M0124']]):
  y=1270
  for mid in ids:y=monster(s,mid,diff,80+col*1060,y,1020,27)
 s.save(out/'Vertical'/f'Autumn_Forest_{slug}_Summary_02_20261115.png')

def landscape(diff,slug,out):
 s=Sheet(2560,1440,'秋幻の森  ｜  '+diff,'2026.11.15 更新   /   マップ情報まとめ')
 # Use two pages at WQHD to keep all newly added effects legible.
 x=65;w=745;y=mission(s,x,225,w,23);y=events(s,x,y,w,23,diff);caliburn(s,x,y,w,22)
 s.heading('マップ・建物設置マス',850,225,700,30);s.image(ROOT/'images/Map/Layout_Autumn_Forest.png',850,285,700,880)
 s.text('青枠：建物設置マス（16か所）',850,1170,700,24,True,GREEN)
 s.heading('イベント出現位置',1600,225,880,30)
 for i,step in enumerate([1,3,7,10]):
  xx=1600+(i%2)*440;yy=290+(i//2)*510
  s.text('進捗 '+str(step),xx+15,yy,400,26,True,GREEN);s.image(EVENT_REFS/f'Autumn_Event_{step:02}_Reference_2x.png',xx,yy+48,420,440)
 s.save(out/'Landscape'/f'Autumn_Forest_{slug}_WQHD_01_20261115.png')
 s=Sheet(2560,1440,'秋幻の森  ｜  '+diff,'2026.11.15 更新   /   カード・チップ・モンスター')
 s.heading('植物建築カード',65,225,720,30)
 s.text('共通：建築可能マスを1つ指定。このターン、カード使用数+1。',65,275,720,18)
 for i,r in enumerate(CARDS):card(s,r,65+(i%2)*370,335+(i//2)*225,350,210,18)
 y=1050;s.heading('マップ固有チップ',65,y,720,29)
 for i,r in enumerate(CHIPS):
  yy=y+60+i*88;s.image(ROOT/'images/chip_icon'/r['images'],65,yy,40,40)
  end=s.text(r['name'],115,yy,650,21,True,GREEN);s.text(r['effect'],115,end+2,650,19)
 for col,ids in enumerate([['M0120','M0123','M0005'],['M0122','M0121','M0124']]):
  y=225
  for mid in ids:y=monster(s,mid,diff,840+col*835,y,795,18)
 s.save(out/'Landscape'/f'Autumn_Forest_{slug}_WQHD_02_20261115.png')

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,required=True);ap.add_argument('--difficulty',choices=['普通','困難','悪夢','狂気']);a=ap.parse_args()
 for diff,slug in [('普通','Normal'),('困難','Hard'),('悪夢','Nightmare'),('狂気','Insanity')]:
  if a.difficulty and diff!=a.difficulty:continue
  portrait(diff,slug,a.out);landscape(diff,slug,a.out)
if __name__=='__main__':main()
