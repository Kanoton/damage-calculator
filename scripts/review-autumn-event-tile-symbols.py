#!/usr/bin/env python3
"""Offline 512x288 BGR event (?) tile symbol proposals, research-only.

The magenta disk, yellow central question mark, and blue ring must each
be supported. This does not identify building slots, occupancy, or plants.
Thresholds were tuned on supplied footage and are not independent evidence
of recognition accuracy. Never upload source gameplay imagery.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np

SIZE=(512,288)


def propose(frame):
    if not isinstance(frame,np.ndarray) or frame.shape!=(SIZE[1],SIZE[0],3):
        raise ValueError('Expected 512x288 BGR')
    hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
    magenta=cv2.inRange(hsv,(135,100,85),(175,255,255))
    n,_,stats,centroids=cv2.connectedComponentsWithStats(magenta)
    results=[]
    for i in range(1,n):
        x,y,w,h,area=map(int,stats[i])
        cx,cy=centroids[i]
        if not (230<=area<=900 and 23<=w<=50 and 16<=h<=42 and
                70<=cx<=460 and 30<=cy<=210):
            continue
        px,py=int(round(cx)),int(round(cy))
        core=hsv[py-10:py+11,px-10:px+11]
        if core.shape[:2]!=(21,21):
            continue
        H,S,V=core[:,:,0],core[:,:,1],core[:,:,2]
        yy,xx=np.indices((21,21))
        disk=(xx-10)**2+(yy-10)**2<=81
        yellow=float((((H>=15)&(H<=40)&(S>70)&(V>100)&disk).sum())/disk.sum())
        y1,y2=max(0,int(cy)-35),min(SIZE[1],int(cy)+36)
        x1,x2=max(0,int(cx)-48),min(SIZE[0],int(cx)+49)
        crop=hsv[y1:y2,x1:x2]
        gy,gx=np.ogrid[y1:y2,x1:x2]
        radius=np.sqrt(((gx-cx)/max(16,w/2))**2+
                       ((gy-cy)/max(10,h/2))**2)
        band=(radius>=1.1)&(radius<=1.5)
        blue=((crop[:,:,0]>=80)&(crop[:,:,0]<=115)&
              (crop[:,:,1]>50)&(crop[:,:,2]>60))
        blue_fraction=float(blue[band].mean()) if band.any() else 0
        if yellow<.12 or blue_fraction<.10:
            continue
        results.append({'x':round(float(cx),1),'y':round(float(cy),1),
                        'tile_kind_candidate':'Event',
                        'central_yellow_fraction':round(yellow,4),
                        'cyan_rim_fraction':round(blue_fraction,4),
                        'status':'screen-symbol-proposal-only'})
    return sorted(results,key=lambda item:(item['y'],item['x']))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Could not read image')
    report={'width':SIZE[0],'height':SIZE[1],
            'candidates':propose(frame),'caution':'research candidates; no map slot IDs'}
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'candidates':len(report['candidates'])}))


if __name__=='__main__':
    main()
