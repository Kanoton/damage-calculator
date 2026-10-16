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
ICON_SIZE=round(72*1.2)
CORNER_OVERLAP=18
LINE_CLEARANCE=8  # Half of the 12px line plus a 2px gap.
icon_cache={}
def load_icon(mid):
    if mid not in icon_cache:
        icon=Image.open(R/f'images/Monster/{mid}_Icon.png').convert('RGBA')
        # Ignore detached background specks when measuring the actual illustration.
        w,h=icon.size;alpha=bytearray(icon.getchannel('A').tobytes());largest=[]
        for index in range(w*h):
            if not alpha[index]:continue
            component=[];pending=[index];alpha[index]=0
            while pending:
                point=pending.pop();component.append(point);x,y=point%w,point//w
                for yy in range(max(0,y-1),min(h,y+2)):
                    for xx in range(max(0,x-1),min(w,x+2)):
                        neighbor=yy*w+xx
                        if alpha[neighbor]:alpha[neighbor]=0;pending.append(neighbor)
            if len(component)>len(largest):largest=component
        mask=bytearray(w*h)
        for point in largest:mask[point]=255
        icon.putalpha(Image.frombytes('L',(w,h),bytes(mask)))
        icon=icon.crop(icon.getchannel('A').getbbox())
        icon.thumbnail((ICON_SIZE,ICON_SIZE),Image.Resampling.LANCZOS)
        icon_cache[mid]=icon
    return icon_cache[mid]
polygon=[(lookup[key]['x'],lookup[key]['y']) for key in outer]
def inside_outer(x,y):
    inside=False
    for (ax,ay),(bx,by) in zip(polygon,polygon[1:]+polygon[:1]):
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:
            inside=not inside
    return inside
def boxes_overlap(a,b):
    return a[0]<b[2] and b[0]<a[2] and a[1]<b[3] and b[1]<a[3]
def line_crosses_box(a,b,box,padding=LINE_CLEARANCE):
    # Slab intersection, including diagonal connections and the line's stroke.
    low,high=0.,1.
    for start,end,lo,hi in [(a['x'],b['x'],box[0]-padding,box[2]+padding),(a['y'],b['y'],box[1]-padding,box[3]+padding)]:
        delta=end-start
        if delta==0:
            if start<lo or start>hi:return False
        else:
            t,u=(lo-start)/delta,(hi-start)/delta
            low=max(low,min(t,u));high=min(high,max(t,u))
            if low>high:return False
    return True
def icon_candidates(node,icon):
    n=lookup[node];w,h=icon.size;result=[]
    for sx,sy in [(-1,-1),(1,-1),(-1,1),(1,1)]:
        cx=n['x']+sx*(36+w/2-CORNER_OVERLAP)
        cy=n['y']+sy*(36+h/2-CORNER_OVERLAP)
        x,y=round(cx-w/2),round(cy-h/2);box=(x,y,x+w,y+h)
        if not (0<=x and 0<=y and x+w<=W and y+h<=H):continue
        if node in outer and not all(inside_outer(px,py) for px,py in [(x,y),(x+w,y),(x,y+h),(x+w,y+h)]):continue
        if any(line_crosses_box(lookup[e['a']],lookup[e['b']],box) for e in data['edges']):continue
        if any(other['id']!=node and boxes_overlap(box,(other['x']-36,other['y']-36,other['x']+36,other['y']+36)) for other in nodes):continue
        result.append({'xy':(x,y),'box':box,'corner':('top' if sy<0 else 'bottom')+'-'+('left' if sx<0 else 'right'),'score':(cx-W/2)**2+(cy-H/2)**2})
    return sorted(result,key=lambda item:item['score'])
def place_icons(entries):
    icons=[]
    for node,mid in entries:
        icon=load_icon(mid)
        icons.append((node,mid,icon,icon_candidates(node,icon)))
    def search(index,placed):
        if index==len(icons):return placed
        for candidate in icons[index][3]:
            if any(boxes_overlap(candidate['box'],previous['box']) for previous in placed):continue
            result=search(index+1,placed+[candidate])
            if result is not None:return result
        return None
    placements=search(0,[])
    if placements is None:raise ValueError('No non-overlapping inward corner layout for '+str(entries))
    return [(node,mid,icon,position) for (node,mid,icon,_),position in zip(icons,placements)]
layout={}
for step,entries in spawns.items():
    im=base.copy()
    for node in set(n for n,m in entries):
        n=lookup[node];im.alpha_composite(frame,(n['x']-frame.width//2,n['y']-frame.height//2))
    placements=place_icons(entries)
    layout[str(step)]=[]
    for node,mid,icon,position in placements:
        im.alpha_composite(icon,position['xy'])
        layout[str(step)].append({'node':node,'monster_id':mid,'corner':position['corner'],'box':position['box'],'size':icon.size})
    save_png(im,R/f'images/MapEvent/Autumn_Normal_{step:02}.png')
(D/'event-icon-layout.json').write_text(json.dumps({'tile_size':72,'icon_max_size':ICON_SIZE,'corner_overlap':CORNER_OVERLAP,'line_clearance':LINE_CLEARANCE,'events':layout},ensure_ascii=False,indent=2)+'\n')
print('Placed',sum(map(len,layout.values())),'icons at inward corners; maximum size',ICON_SIZE,'px; no line or icon overlaps')
