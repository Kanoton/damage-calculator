"""Sanitize the supplied short replay; retain reviewed HUD/label pixels only."""
import argparse, base64, io, json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'tests/fixtures/screen-reader/autumn-live-sequence.json'
Y = [0, 93, 187, 279]
HUD = [[55,66+y,73,42] for y in Y]
HUD += [b for y in Y for b in [[23,103+y,60,42],[96,119+y,27,24],[167,98+y,27,24],[210,98+y,64,26]]]
# Label/number/HP rectangles in height-preserving, left-anchored coordinates.
LABELS = {3:[[319,260,206,29],[374,295,44,30]],4:[[319,260,206,29],[374,295,44,30]],6:[[320,260,206,29],[374,295,44,30]],7:[[319,260,206,29],[374,295,44,30]],8:[[335,253,206,29],[389,288,44,30]],9:[[317,261,206,29],[370,296,45,30]],10:[[319,260,206,29],[373,295,45,30]],11:[[319,260,206,29],[374,295,44,30]],12:[[339,255,188,30],[385,290,63,30]],13:[[345,260,188,30],[391,295,63,30]],14:[[345,260,188,30],[391,295,63,30]]}
def sanitize(path, boxes, stretched=False):
    im = Image.open(path).convert('RGB')
    if im.size != (2560,1440): raise ValueError('Expected the supplied 2560x1440 video')
    sx,sy = (im.width/1536,im.height/709) if stretched else (im.height/709,im.height/709)
    safe = Image.new('RGB',im.size,(20,20,20)); retained = []
    for x,y,w,h in boxes:
        box = [round(x*sx),round(y*sy),round((x+w)*sx),round((y+h)*sy)]
        safe.paste(im.crop(box),box[:2]);retained.append(box)
    b=io.BytesIO();safe.save(b,format='PNG')
    return {'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode(),'retainedBoxes':retained}
def validate(value):
    if value['sampleIntervalMs']!=250 or value['party']!=['13','105','106','29']:raise ValueError('Unexpected sampling/party')
    for row in value['hud']+value['samples']:
        im=Image.open(io.BytesIO(base64.b64decode(row['image'].split(',')[1]))).convert('RGB')
        if im.size!=(2560,1440):raise ValueError('Unexpected fixture size')
        for box in row['retainedBoxes']:im.paste((20,20,20),box)
        if im.getextrema()!=((20,20),(20,20),(20,20)):raise ValueError('Pixels outside reviewed rectangles')
def main():
    p=argparse.ArgumentParser();p.add_argument('--frames',type=Path);p.add_argument('--detail',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
    # Sources: ffmpeg fps=2 for --frames, -ss 12 -t 4 -vf fps=4 for --detail.
    if a.frames and a.detail:
        hud=[sanitize(a.frames/f'frame-{n:03}.png',HUD,True) for n in [23,33]]
        samples=[]
        for n in range(1,17):
            row=sanitize(a.detail/f'frame-{n:03}.png',[[50,0,110,45],[340,0,600,30]]+LABELS.get(n,[]));row['sampleIndex']=n
            serial=1 if n in [3,4] else 2 if n in [6,7,8] else 3 if n in [9,10,11] else None
            row['expected']=({'monsterId':'M0123','serial':serial,'currentHp':9,'maxHp':9} if serial else {'monsterId':'M0122','serial':1,'currentHp':22,'maxHp':22} if n in [12,13,14] else None)
            samples.append(row)
        value={'source':'Supplied replay 2026-10-19 06-53-49; anonymous real HUD and labels','party':['13','105','106','29'],'sampleIntervalMs':250,'hud':hud,'samples':samples}
        validate(value)
        if not a.check:OUT.write_text(json.dumps(value,ensure_ascii=False))
    elif not a.check:p.error('--frames and --detail are required to regenerate')
    stored=json.loads(OUT.read_text());validate(stored)
    if a.frames and a.detail and stored!=value:raise ValueError('Fixture differs from source pixels')
    print('Validated real autumn HUD and 16 quarter-second label samples; no player names')
if __name__=='__main__':main()
