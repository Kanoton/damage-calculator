#!/usr/bin/env python3
"""Offline blue transfer / move-again map tile symbol proposals (research).

A blue blob or empty water pot alone is NOT a platform icon. Candidate
needs a cyan/blue connected disk with a white/pink central glyph. Visible
turquoise down arrow + pink symbol may indicate TeleportPoint, while a
large pink glyph may indicate MoveAgain. These remain *proposals*, not
known map IDs or established classification accuracy.
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
    mask=cv2.inRange(hsv,(90,80,60),(125,255,255))
    n,_,stats,centroids=cv2.connectedComponentsWithStats(mask)
    results=[]
    for i in range(1,n):
        x,y,w,h,area=map(int,stats[i])
        cx,cy=centroids[i]
        if not (250<=area<=900 and 28<=w<=45 and 18<=h<=33 and
                85<=cx<=460 and 40<=cy<=200):
            continue
        px,py=int(round(cx)),int(round(cy))
        center=hsv[py-11:py+12,px-12:px+13]
        if center.shape[:2]!=(23,25):
            continue
        H,S,V=center[:,:,0],center[:,:,1],center[:,:,2]
        pink=float(((H>=130)&(H<=175)&(S>=70)&(V>85)).mean())
        white=float(((S<80)&(V>180)).mean())
        turquoise=float(((H>=75)&(H<=96)&(S>50)&(V>100)).mean())
        if pink<.04 or white<.12:
            continue
        # In a later gameplay sample a TeleportPoint had a relatively
        # large pink glyph; use its strong turquoise arrow first, not
        # the pink fraction alone. Unknown combinations still abstain.
        kind=('TeleportPoint' if ((turquoise>=.20 and turquoise>pink*1.2) or
                                  (pink<.12 and turquoise>=.14)) else
              'MoveAgain' if pink>=.12 and turquoise<.20 else
              'unknown-blue-tile')
        results.append({'x':round(float(cx),1),'y':round(float(cy),1),
                        'tile_kind_candidate':kind,
                        'pink_glyph_fraction':round(pink,4),
                        'turquoise_glyph_fraction':round(turquoise,4),
                        'status':'screen-symbol-proposal-only'})
    return sorted(results,key=lambda item:(item['y'],item['x']))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Could not read image')
    report={'candidates':propose(frame),
            'caution':'Experimental appearance-only match; no map IDs'}
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'candidates':len(report['candidates'])}))


if __name__=='__main__':
    main()
