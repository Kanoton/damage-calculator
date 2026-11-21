#!/usr/bin/env python3
"""Offline-only cross-frame check for provisional O04/O05/O06 pot associations.

Input: JSON list of records with 'time_s' and 'result' from independent
frame-level pot/icon detection. Checks whether a *single screen translation*
can explain all three candidate pot positions across frames. It cannot
establish true slot identity, camera geometry, or species. Never apply to UI.
"""
import argparse
import json
import math
from pathlib import Path

SLOTS=('O04','O05','O06')
MAX_TRANSLATION_RESIDUAL_PX=9.0
MAX_PAIR_DISTANCE_CHANGE_PX=9.0
MIN_FRAME_SEPARATION_S=0.2


def _points(record):
    if not isinstance(record,dict):
        return None
    result=record.get('result')
    if not isinstance(result,dict) or result.get('status')!='provisional-three-pot-slot-association-only':
        return None
    if result.get('production_application')!='forbidden':
        return None
    entries=result.get('candidate_pot_slots')
    if not isinstance(entries,list) or len(entries)!=3:
        return None
    if [e.get('slot_candidate') for e in entries if isinstance(e,dict)]!=list(SLOTS):
        return None
    try:
        pts=[(float(e['pot_x']),float(e['pot_y'])) for e in entries]
    except (KeyError,TypeError,ValueError):
        return None
    if not all(math.isfinite(v) for point in pts for v in point):
        return None
    return pts


def assess(records):
    if not isinstance(records,list) or len(records)<2:
        return {'status':'abstain','reason':'not-enough-independent-frames'}
    points=[]
    times=[]
    for record in records:
        p=_points(record)
        try:
            t=float(record['time_s'])
        except (KeyError,TypeError,ValueError):
            return {'status':'abstain','reason':'invalid-frame-observation'}
        if p is None or not math.isfinite(t):
            return {'status':'abstain','reason':'invalid-frame-observation'}
        points.append(p)
        times.append(t)
    if any(b-a<MIN_FRAME_SEPARATION_S for a,b in zip(times,times[1:])):
        return {'status':'abstain','reason':'frames-not-temporally-independent'}
    reference=points[0]
    worst_residual=0.0
    worst_spacing=0.0
    for current in points[1:]:
        shifts=[(x-rx,y-ry) for (x,y),(rx,ry) in zip(current,reference)]
        mean=(sum(v[0] for v in shifts)/3,sum(v[1] for v in shifts)/3)
        worst_residual=max(worst_residual,*(math.hypot(x-mean[0],y-mean[1]) for x,y in shifts))
        for i in range(3):
            for j in range(i+1,3):
                d1=math.dist(reference[i],reference[j])
                d2=math.dist(current[i],current[j])
                worst_spacing=max(worst_spacing,abs(d2-d1))
    audit={'max_translation_residual_px':round(worst_residual,3),
           'max_pair_spacing_change_px':round(worst_spacing,3),
           'frames_checked':len(records),
           'slot_ids_verified':False,
           'plant_type':'unknown',
           'production_application':'forbidden'}
    if worst_residual>MAX_TRANSLATION_RESIDUAL_PX or worst_spacing>MAX_PAIR_DISTANCE_CHANGE_PX:
        return {'status':'abstain','reason':'geometry-changed-or-mismatched-pots',**audit}
    return {'status':'cross-frame-geometry-consistent-proposal-only',**audit}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--observations',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    result=assess(json.loads(args.observations.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':result['status']},ensure_ascii=False))


if __name__=='__main__':
    main()
