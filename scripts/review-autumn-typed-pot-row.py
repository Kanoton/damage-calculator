#!/usr/bin/env python3
"""Research-only icon-context match of the provisional O04/O05/O06 pot row.

The five tile icons must be read/checked by a human; no image icon recognition
is provided. A unique inferred-topology path is NOT user-confirmed slot ID.
Never apply buildings or infer other slots, occupancy or plant types.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import numpy as np

BASE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('tile_sequence',BASE/'review-autumn-tile-sequence.py')
types=importlib.util.module_from_spec(spec)
spec.loader.exec_module(types)
EXPECTED=('TeleportPoint','MoveAgain','Event','Monster','Damage')


def assess_typed_row(topology, visual_types, proposals):
    if tuple(visual_types)!=EXPECTED:
        return {'status':'abstain','reason':'icon-context-unverified-or-different'}
    match=types.match_type_path(topology,list(visual_types))
    if match['status']!='unique-topology-candidate-only':
        return {'status':'abstain','reason':'topology-not-unique',
                'candidate_count':len(match['matches'])}
    slots=match['matches'][0]['node_ids'][-3:]
    if slots!=['O04','O05','O06']:
        return {'status':'abstain','reason':'unexpected-topology-slot-group'}
    if not isinstance(proposals,list) or len(proposals)!=3:
        return {'status':'abstain','reason':'not-exactly-three-pot-candidates'}
    try:
        pts=np.asarray([[p['x'],p['y']] for p in proposals],dtype=float)
    except (TypeError,ValueError,KeyError):
        return {'status':'abstain','reason':'invalid-proposal'}
    if pts.shape!=(3,2) or not np.isfinite(pts).all():
        return {'status':'abstain','reason':'invalid-proposal'}
    ordered=pts[np.argsort(pts[:,0])]
    pitch=(ordered[2]-ordered[0])/2
    middle=ordered.mean(axis=0)
    residual=float(np.linalg.norm(ordered-
                     (middle+np.arange(-1,2)[:,None]*pitch),axis=1).max())
    length=float(np.linalg.norm(pitch))
    if not (25<=length<=95 and pitch[0]>0 and pitch[1]>=5 and residual<=6.0):
        return {'status':'abstain','reason':'incompatible-provisional-row',
                'max_residual_px':round(residual,3)}
    return {'status':'provisional-typed-row-only','slot_candidates':slots,
            'max_residual_px':round(residual,3),
            'pitch_px':round(length,3),
            'edge_evidence':match['matches'][0]['edge_statuses'],
            'confidence':'not-user-verified','other_slots':'not-localized',
            'plant_type':'unknown'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--topology',type=Path,required=True)
    parser.add_argument('--manifest',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    topology=json.loads(args.topology.read_text(encoding='utf-8'))
    payload=json.loads(args.manifest.read_text(encoding='utf-8'))
    report=assess_typed_row(topology,payload['visual_types'],payload['proposals'])
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status']},ensure_ascii=False))


if __name__=='__main__':
    main()
