#!/usr/bin/env python3
"""Offline research-only colored tile symbol proposals from 512x288 BGR.

Distinguishes *some* red disk purple-face and lightning glyphs by the
central glyph color and the cyan rim. Neither successful classification
nor coordinate is a map ID, pot, building or proof of occupancy.
Thresholds explored on supplied gameplay: NOT an independent accuracy test.
Raw gameplay and identifiable images must never be committed.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np

SIZE=(512,288)


def propose(frame):
    if not isinstance(frame,np.ndarray) or frame.shape!=(SIZE[1],SIZE[0],3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
    red=(cv2.inRange(hsv,(0,120,100),(10,255,255)) |
         cv2.inRange(hsv,(170,120,100),(179,255,255)))
    count,_,stats,centroids=cv2.connectedComponentsWithStats(red)
    results=[]
    for i in range(1,count):
        x,y,w,h,area=map(int,stats[i])
        cx,cy=centroids[i]
        if not (300<=area<=900 and 28<=w<=50 and 18<=h<=38 and
                90<=cx<=450 and 40<=cy<=220):
            continue
        px,py=int(round(cx)),int(round(cy))
        if px<18 or px>SIZE[0]-18 or py<18 or py>SIZE[1]-18:
            continue
        core=hsv[py-10:py+11,px-10:px+11]
        yy,xx=np.indices((21,21))
        inner=(xx-10)**2+(yy-10)**2<=81
        hh,ss,vv=core[:,:,0],core[:,:,1],core[:,:,2]
        pink=float((((hh>=135)&(hh<=175)&(ss>70)&(vv>100)&inner).sum())/inner.sum())
        yellow=float((((hh>=15)&(hh<=40)&(ss>70)&(vv>100)&inner).sum())/inner.sum())
        x1,x2=max(0,int(cx)-55),min(SIZE[0],int(cx)+56)
        y1,y2=max(0,int(cy)-40),min(SIZE[1],int(cy)+41)
        local=hsv[y1:y2,x1:x2]
        gy,gx=np.ogrid[y1:y2,x1:x2]
        radius=np.sqrt(((gx-cx)/max(20,w/2))**2+
                       ((gy-cy)/max(14,h/2))**2)
        band=(radius>=.96)&(radius<=1.38)
        blue=((local[:,:,0]>=80)&(local[:,:,0]<=115)&
              (local[:,:,1]>50)&(local[:,:,2]>60))
        rim=float(blue[band].mean()) if band.any() else 0.
        if rim<.14:
            continue
        # A pale icon on a red disk can have pink fringes. Central dominance
        # is required; color outside the glyph is not sufficient.
        kind=('Monster' if pink>.38 and yellow<.20 else
              'Damage' if yellow>.24 and pink<.08 else
              'unknown-red-tile')
        results.append({'x':round(float(cx),1),'y':round(float(cy),1),
                        'tile_kind_candidate':kind,
                        'central_pink_fraction':round(pink,4),
                        'central_yellow_fraction':round(yellow,4),
                        'cyan_rim_fraction':round(rim,4),
                        'status':'screen-symbol-proposal-only'})
    return sorted(results,key=lambda item:(item['y'],item['x']))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None:raise ValueError('Unable to read image')
    report={'width':SIZE[0],'height':SIZE[1],'candidates':propose(frame),
            'caution':'No map IDs, building detection, or verified accuracy'}
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'candidates':len(report['candidates'])},ensure_ascii=False))


if __name__=='__main__':
    main()
