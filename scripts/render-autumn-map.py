from pathlib import Path
import json,math,io
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[1]
D=R/'docs/map-event-output/autumn-forest';A=D/'assets'
data=json.loads((D/'topology.json').read_text());nodes=data['nodes'];lookup={n['id']:n for n in nodes}
W=max(n['x']for n in nodes)+110;H=max(n['y']for n in nodes)+110
def save_png(im,path):
    data=io.BytesIO();im.save(data,format='PNG');path.write_bytes(data.getvalue())
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',23);small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
colors={'1st':'#ff474d','2nd':'#c7ff44','3rd':'#217ffc','4th':'#ffb800'}
outer=[f'O{i:02}'for i in range(1,39)]
def render(review=False):
    im=Image.new('RGBA',(W,H),'white' if review else (0,0,0,0));d=ImageDraw.Draw(im)
    for e in data['edges']:
        a,b=lookup[e['a']],lookup[e['b']];d.line([(a['x'],a['y']),(b['x'],b['y'])],fill='#d67913' if review and e['status']=='junction_candidate' else 'black',width=12)
    for n in nodes:
        x,y,t=n['x'],n['y'],n['type']
        if t in colors:
            d.ellipse((x-35.155,y-35.155,x+35.155,y+35.155),fill=colors[t]);d.text((x,y),t,font=F,anchor='mm',fill='white',stroke_width=1,stroke_fill='#303340')
            idx=outer.index(n['id']);step=-1 if t in ['1st','4th'] else 1;other=lookup[outer[(idx+step)%len(outer)]];dx,dy=other['x']-x,other['y']-y;l=math.hypot(dx,dy);u,v=dx/l,dy/l;pts=[(x+u*32.574-v*13.225,y+v*32.574+u*13.225),(x+u*32.574+v*13.225,y+v*32.574-u*13.225),(x+u*45.799,y+v*45.799)];d.polygon(pts,fill='white');d.line(pts+[pts[0]],fill='#303340',width=2,joint='curve')
        else:im.alpha_composite(Image.open(A/f'UT_Platform_{t}.png').convert('RGBA').resize((72,72),Image.Resampling.LANCZOS),(x-36,y-36))
        if review:d.text((x,y+48),n['id'],font=small,anchor='mt',fill='#303340',stroke_width=2,stroke_fill='white')
    return im
base=render();save_png(base,R/'images/Map/Layout_Autumn_Forest.png');save_png(render(True),D/'Layout_Autumn_Forest_review.png')
spawns={1:[('O12','M0123'),('O22','M0123'),('O36','M0123'),('O26','M0122')],3:[('O24','M0120'),('I08','M0121'),('I15','M0123')],7:[('O32','M0121'),('O16','M0121'),('O16','M0122')],10:[('O38','M0122'),('O10','M0121'),('O20','M0122'),('O26','M0121')]}
frame=Image.open(R/'images/MapEvent/assets/green_frame.png').convert('RGBA')
for step,entries in spawns.items():
    im=base.copy()
    for node in set(n for n,m in entries):
        n=lookup[node];im.alpha_composite(frame,(n['x']-frame.width//2,n['y']-frame.height//2))
        group=[mid for nid,mid in entries if nid==node]
        for i,mid in enumerate(group):
            icon=Image.open(R/f'images/Monster/{mid}_Icon.png').convert('RGBA');icon.thumbnail((70 if len(group)>1 else 82,78),Image.Resampling.LANCZOS)
            x=n['x']-icon.width//2+(i*60-30 if len(group)>1 else 0);y=n['y']-icon.height//2;im.alpha_composite(icon,(x,y))
    save_png(im,R/f'images/MapEvent/Autumn_Normal_{step:02}.png')
