#!/usr/bin/env python3
"""Research-only cross-frame empty-water-pot proposal association.

Independently proposes water+stump centers in both BGR frames. Requires the
board-wide camera continuity affine and unique projected center agreement.
No inference about 16 slot IDs, plant identity, or occupancy; do not write to 08.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import numpy as np
import cv2

HERE=Path(__file__).resolve().parent


def load(name, alias):
    spec=importlib.util.spec_from_file_location(alias,HERE/name)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


board=load('review-autumn-camera-transition.py','board_geometry')
pots=load('review-autumn-empty-pot-proposals.py','empty_pot_proposals')
MAX_RESIDUAL=9.0
MIN_AMBIGUITY_GAP=5.0


def link_proposals(first, second, affine):
    """Pair only geometrically unique matches; inputs are untrusted candidates."""
    try:
        a=np.asarray(affine,dtype=np.float64)
    except (TypeError,ValueError):
        return {'matched':[],'abstained':True,'reason':'invalid-transform'}
    if a.shape != (2,3) or not np.isfinite(a).all():
        return {'matched':[],'abstained':True,'reason':'invalid-transform'}
    scale=(a[0,0]**2+a[1,0]**2)**.5
    if not .85 <= scale <= 1.15:
        return {'matched':[],'abstained':True,'reason':'implausible-scale'}
    if not isinstance(first,list) or not isinstance(second,list) or not first or not second:
        return {'matched':[],'abstained':True,'reason':'missing-water-proposals'}
    src=np.asarray([[p['x'],p['y'],1.] for p in first],dtype=np.float64)
    dst=np.asarray([[p['x'],p['y']] for p in second],dtype=np.float64)
    if not np.isfinite(src).all() or not np.isfinite(dst).all():
        return {'matched':[],'abstained':True,'reason':'invalid-proposal-coordinates'}
    projected=src@a.T
    distances=np.linalg.norm(projected[:,None,:]-dst[None,:,:],axis=2)
    proposals=[]
    for i in range(len(first)):
        order=np.argsort(distances[i])
        j=int(order[0]);distance=float(distances[i,j])
        second_best=float(distances[i,int(order[1])]) if len(order)>1 else float('inf')
        other_src=np.sort(distances[:,j])
        competing=float(other_src[1]) if len(other_src)>1 else float('inf')
        if (distance <= MAX_RESIDUAL
            and min(second_best,competing)-distance >= MIN_AMBIGUITY_GAP):
            proposals.append({'before':i,'after':j,'residual_px':round(distance,3),
                              'status':'geometry-matched-candidate-only'})
    # All pairs must be unique; partial visibility is an abstention, not a deletion.
    unique_dst={r['after'] for r in proposals}
    if len(unique_dst)!=len(proposals):
        return {'matched':[],'abstained':True,'reason':'duplicate-destination'}
    complete=len(proposals)==len(first)==len(second)
    return {'matched':proposals,'abstained':not complete,
            'reason':'geometric-pairs-only' if complete else 'partial-or-ambiguous-visibility'}


def assess_frames(first_bgr,second_bgr,delta_ms):
    if type(delta_ms) not in (float,int) or not np.isfinite(delta_ms) or delta_ms < 300 or delta_ms > 5000:
        return {'matched':[],'abstained':True,'reason':'unverified-frame-interval'}
    camera=board.continuity(first_bgr,second_bgr)
    if camera['status']!='same-view-candidate':
        return {'matched':[],'abstained':True,'reason':'unverified-board-continuity',
                'board_status':camera['status']}
    left=pots.propose(first_bgr)
    right=pots.propose(second_bgr)
    result=link_proposals(left,right,camera['affine_2x3'])
    return {**result,'board_status':camera['status'],
            'left_proposals':len(left),'right_proposals':len(right)}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--first',type=Path,required=True)
    p.add_argument('--second',type=Path,required=True)
    p.add_argument('--delta-ms',type=float,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    a,b=cv2.imread(str(args.first)),cv2.imread(str(args.second))
    if a is None or b is None:
        raise ValueError('Images not decoded')
    report=assess_frames(a,b,args.delta_ms)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'matched':len(report['matched']),'abstained':report['abstained']}))


if __name__=='__main__':main()
