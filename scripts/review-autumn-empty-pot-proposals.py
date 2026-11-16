#!/usr/bin/env python3
"""Exploratory, read-only empty-water-pot proposals from a 512x288 frame.

A cyan blob alone is NOT an empty pot (e.g. blue map tiles / water).
Candidate requires a brown stump below, a conservative screen ROI and enough
water-colored connected pixels. Output is anonymous locations only, NEVER
MAP0105 slot IDs or proof of actual empty/plant occupancy.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np

SIZE = (512, 288)
MIN_AREA, MAX_AREA = 480, 1650
MIN_STUMP_RATIO = .34


def _stump_ratio(hsv, cx, cy):
    x1, x2 = max(0, cx-24), min(SIZE[0], cx+24)
    y1, y2 = max(0, cy+10), min(SIZE[1], cy+38)
    if x2-x1 < 40 or y2-y1 < 25:
        return 0.0
    region = hsv[y1:y2, x1:x2]
    return float(((region[:,:,0] > 5) & (region[:,:,0] < 30) &
                  (region[:,:,1] > 55) & (region[:,:,2] > 60)).mean())


def propose(frame):
    if not isinstance(frame,np.ndarray) or frame.shape != (SIZE[1],SIZE[0],3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
    cyan=cv2.inRange(hsv,(80,80,75),(110,255,255))
    count, _, stats, centroids=cv2.connectedComponentsWithStats(cyan)
    results=[]
    for index in range(1,count):
        x,y,w,h,area=[int(n) for n in stats[index]]
        cx,cy=map(float,centroids[index])
        if not (MIN_AREA<=area<=MAX_AREA and 28<=w<=65 and 19<=h<=42):
            continue
        # Suppress HUD/footer, sea/water borders, and partial edge components.
        if not (90<=cx<=465 and 40<=cy<=195 and 16<=x and x+w<=SIZE[0]-16):
            continue
        stump=_stump_ratio(hsv,round(cx),round(cy))
        if stump < MIN_STUMP_RATIO:
            continue
        results.append({'x':round(cx,1),'y':round(cy,1),
                        'cyan_area':area,'stump_ratio':round(stump,4),
                        'status':'water-pot-looking-candidate-only'})
    return sorted(results,key=lambda r:(r['y'],r['x']))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None or (frame.shape[1],frame.shape[0])!=SIZE:
        raise ValueError('Image must be already resized to 512x288')
    proposals=propose(frame)
    result={'count':len(proposals),'proposals':proposals,
            'note':'Uncalibrated water+stump proposals. No slot or occupancy confirmation.'}
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'count':result['count']}))


if __name__=='__main__':
    main()
