#!/usr/bin/env python3
"""Research-only fixed-camera O31/O32/O33 row verification.

The event/monster/lightning pot IDs were confirmed from a user description
and the existing map. Input screen coordinates still require human checking.
The three collinear anchors define ONE map axis, not the other 13 slots.
No occupancy, plant classification, or production Bridge calls.
"""
import argparse
import json
import math
from itertools import permutations
from pathlib import Path
import numpy as np

ANCHOR_IDS = ('O31', 'O32', 'O33')
MAP_X = (722, 902, 1082)  # csv/map_building_slots.csv
MAX_ROW_RESIDUAL = 6.0
MAX_POINT_RESIDUAL = 8.0
MIN_PITCH, MAX_PITCH = 20.0, 100.0
MAX_SCALE_ERROR = .025
MAX_ROTATION_DEGREES = 2.0


def _point(value):
    if not isinstance(value, dict):
        raise ValueError('Expected 2D point')
    p = np.asarray([value.get('x'), value.get('y')], dtype=float)
    if p.shape != (2,) or not np.isfinite(p).all():
        raise ValueError('Point must be finite 2D')
    return p


def fit_verified_row(known):
    """Known slot IDs MUST originate in manually verified map roles."""
    if not isinstance(known, dict) or set(known) != set(ANCHOR_IDS):
        return {'status':'abstain','reason':'missing-user-verified-slot-anchors'}
    try:
        pts = np.stack([_point(known[slot]) for slot in ANCHOR_IDS])
    except (ValueError, TypeError):
        return {'status':'abstain','reason':'invalid-anchor-coordinates'}
    center = pts.mean(axis=0)
    pitch = (pts[2]-pts[0])/2
    length = float(np.linalg.norm(pitch))
    residuals = np.linalg.norm(pts-(center+np.arange(-1,2)[:,None]*pitch),axis=1)
    if not MIN_PITCH <= length <= MAX_PITCH:
        return {'status':'abstain','reason':'incompatible-row-pitch','pitch_px':round(length,3)}
    if pitch[0] <= 0 or pitch[1] >= -3:
        return {'status':'abstain','reason':'unexpected-row-orientation'}
    if float(residuals.max()) > MAX_ROW_RESIDUAL:
        return {'status':'abstain','reason':'nonuniform-row-spacing',
                'max_residual_px':round(float(residuals.max()),3)}
    return {'status':'calibrated-row-only',
            'center':[round(float(x),3) for x in center],
            'pitch_per_180':[round(float(x),3) for x in pitch],
            'pitch_px':round(length,3),
            'max_residual_px':round(float(residuals.max()),3),
            'verified_slots':list(ANCHOR_IDS),
            'map_spacing_units':180,'remaining_slots':'not-inferred'}


def match_known_row(known, proposals, board_affine):
    """Match ONLY the verified 3 row slots after independent board continuity."""
    cal = fit_verified_row(known)
    if cal['status'] != 'calibrated-row-only':
        return {'status':'abstain','reason':'reference-row-not-calibrated'}
    if not isinstance(proposals,list) or len(proposals)!=3:
        return {'status':'abstain','reason':'not-exactly-three-visible-row-pots'}
    try:
        target=np.stack([_point(p) for p in proposals])
        a=np.asarray(board_affine,dtype=float)
    except (ValueError,TypeError):
        return {'status':'abstain','reason':'invalid-proposal-or-camera-transform'}
    if a.shape!=(2,3) or not np.isfinite(a).all():
        return {'status':'abstain','reason':'unverified-camera-transform'}
    sx=float(np.linalg.norm(a[:,0]))
    sy=float(np.linalg.norm(a[:,1]))
    rotation=math.degrees(math.atan2(float(a[1,0]),float(a[0,0])))
    if (abs(sx-1)>MAX_SCALE_ERROR or abs(sy-1)>MAX_SCALE_ERROR
            or abs(rotation)>MAX_ROTATION_DEGREES):
        return {'status':'abstain','reason':'fixed-camera-model-conflict',
                'scale':round(sx,4),'rotation_degrees':round(rotation,3)}
    refs=np.stack([_point(known[slot]) for slot in ANCHOR_IDS])
    projected=refs@a[:,:2].T+a[:,2]
    choices=[]
    for order in permutations(range(3)):
        errors=np.linalg.norm(projected-target[list(order)],axis=1)
        choices.append((float(errors.max()),float(errors.sum()),order,errors))
    choices.sort(key=lambda t:(t[0],t[1]))
    best=choices[0]
    if best[0]>MAX_POINT_RESIDUAL:
        return {'status':'abstain','reason':'row-not-visible-at-projected-position',
                'max_residual_px':round(best[0],3)}
    if choices[1][0]-best[0]<5:
        return {'status':'abstain','reason':'ambiguous-row-assignment'}
    return {'status':'three-known-slots-candidate-only',
            'observations':[{'slot_id':slot,'proposal_index':int(j),
                             'residual_px':round(float(e),3),
                             'evidence':'user-verified-anchor+board-continuity'}
                            for slot,j,e in zip(ANCHOR_IDS,best[2],best[3])],
            'max_residual_px':round(best[0],3),
            'other_13_slots':'not-localized','plant_type':'unknown'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    info=json.loads(args.manifest.read_text(encoding='utf-8'))
    row=fit_verified_row(info['verified_anchors'])
    if 'proposals' in info:
        result={'calibration':row,'matching':match_known_row(
            info['verified_anchors'],info['proposals'],info.get('board_affine'))}
    else:
        result={'calibration':row}
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'calibration':row['status'],
                      'matching':result.get('matching',{}).get('status')},ensure_ascii=False))


if __name__=='__main__':
    main()
