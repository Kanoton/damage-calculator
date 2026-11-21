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
MAX_MAGENTA_ICON_RATIO = .04  # Exploratory guard for pink map-tile glyphs.


def _stump_ratio(hsv, cx, cy):
    x1, x2 = max(0, cx-24), min(SIZE[0], cx+24)
    y1, y2 = max(0, cy+10), min(SIZE[1], cy+38)
    if x2-x1 < 40 or y2-y1 < 25:
        return 0.0
    region = hsv[y1:y2, x1:x2]
    return float(((region[:,:,0] > 5) & (region[:,:,0] < 30) &
                  (region[:,:,1] > 55) & (region[:,:,2] > 60)).mean())


def _magenta_icon_ratio(hsv, cx, cy):
    x1,x2=max(0,cx-20),min(SIZE[0],cx+20)
    y1,y2=max(0,cy-12),min(SIZE[1],cy+12)
    region=hsv[y1:y2,x1:x2]
    if region.shape[:2] != (24,40):
        return 1.0  # Cannot prove icon-free center.
    return float(((region[:,:,0]>=130)&(region[:,:,0]<=175)&
                  (region[:,:,1]>=65)&(region[:,:,2]>=85)).mean())


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
        # A glowing cyan map tile can also have brown ground beneath.
        # Its central magenta icon must not be treated as empty-pot water.
        magenta=_magenta_icon_ratio(hsv,round(cx),round(cy))
        if magenta > MAX_MAGENTA_ICON_RATIO:
            continue
        results.append({'x':round(cx,1),'y':round(cy,1),
                        'cyan_area':area,'stump_ratio':round(stump,4),
                        'magenta_icon_ratio':round(magenta,4),
                        'status':'water-pot-looking-candidate-only'})
    return sorted(results,key=lambda r:(r['y'],r['x']))


def audit_labeled(proposals, labels, radius=18):
    """Research-only matching against locally reviewed labels.

    Only close, one-to-one matched proposals are scored. Unmatched detections
    are unknown, NOT automatically false positives; unlabeled pots may exist.
    Source paths, labels' coordinates and screenshot identities are not output.
    """
    if not isinstance(labels, list) or not isinstance(radius, int) or radius < 1:
        raise ValueError('Expected label list and positive matching radius')
    for item in labels:
        if (not isinstance(item, dict) or
            item.get('expected') not in ('__empty__', 'occupied') or
            any(not isinstance(item.get(k), int) or isinstance(item.get(k), bool)
                for k in ('cx', 'cy'))):
            raise ValueError('Expected manual cx/cy and __empty__/occupied label')
    edges = sorted(
        (float(np.hypot(float(p['x'])-label['cx'], float(p['y'])-label['cy'])), i, j)
        for i, p in enumerate(proposals) for j, label in enumerate(labels)
        if np.hypot(float(p['x'])-label['cx'], float(p['y'])-label['cy']) <= radius
    )
    # Greedy one-to-one matching is useful for a diagnostic count, but is
    # insufficient as a safety gate: a proposal can be closer to an empty
    # label while also lying within the radius of a labeled occupied pot.
    # Inspect *all* nearby labels before consuming any match.
    nearby = {i: set() for i in range(len(proposals))}
    for _, i, j in edges:
        nearby[i].add(labels[j]['expected'])
    occupied_near_proposals = sum('occupied' in classes for classes in nearby.values())
    ambiguous_proposals = sum(len(classes) > 1 for classes in nearby.values())
    used_proposals, used_labels = set(), set()
    matched_empty = matched_occupied = 0
    for _, i, j in edges:
        if i in used_proposals or j in used_labels:
            continue
        used_proposals.add(i)
        used_labels.add(j)
        if labels[j]['expected'] == '__empty__':
            matched_empty += 1
        else:
            matched_occupied += 1
    return {'labeled_empty': sum(x['expected']=='__empty__' for x in labels),
            'labeled_occupied': sum(x['expected']=='occupied' for x in labels),
            'matched_empty': matched_empty, 'matched_occupied_wrong_proposals': matched_occupied,
            'occupied_near_proposals': occupied_near_proposals,
            'ambiguous_proposals': ambiguous_proposals,
            'unmatched_proposals_unknown': len(proposals)-len(used_proposals),
            'match_radius_px': radius,
            'note': ('Manually selected partial labels only; unmatched proposals are '
                     'unknown and results are NOT independent-game accuracy.')}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--audit-labels',type=Path,
                   help='Optional private JSON: {"samples":[{"cx":123,"cy":100,"expected":"occupied"}]}')
    p.add_argument('--fail-on-occupied-proposal',action='store_true',
                   help='Fail if any labeled occupied pot gets an empty-pot proposal')
    args=p.parse_args()
    if args.fail_on_occupied_proposal and args.audit_labels is None:
        p.error('--fail-on-occupied-proposal requires --audit-labels')
    frame=cv2.imread(str(args.image))
    if frame is None or (frame.shape[1],frame.shape[0])!=SIZE:
        raise ValueError('Image must be already resized to 512x288')
    proposals=propose(frame)
    result={'count':len(proposals),'proposals':proposals,
            'note':'Uncalibrated water+stump proposals. No slot or occupancy confirmation.'}
    if args.audit_labels is not None:
        labels=json.loads(args.audit_labels.read_text(encoding='utf-8'))['samples']
        result['audit']=audit_labeled(proposals,labels)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'count':result['count'],
                      'audit':result.get('audit')},ensure_ascii=False))
    # Do not let a closer empty label hide an occupied label in the radius.
    if args.fail_on_occupied_proposal and result['audit']['occupied_near_proposals']:
        raise SystemExit(2)


if __name__=='__main__':
    main()
