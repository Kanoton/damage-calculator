#!/usr/bin/env python3
"""Research-only five-symbol path proposal from actual 512x288 game pixels.

TeleportPoint -> MoveAgain -> Event -> Monster -> Damage is a UNIQUE
initial topology path (O02..O06), subject to visually recognized icons and
provisional map edges. Do NOT treat candidate as user-confirmed building IDs,
6-species plant recognition, or a production screen-reader observation.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np

HERE=Path(__file__).resolve().parent
KINDS=('TeleportPoint','MoveAgain','Event','Monster','Damage')


def load(script,alias):
    spec=importlib.util.spec_from_file_location(alias,HERE/script)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


blue=load('review-autumn-blue-tile-symbols.py','blue_tile_5')
event=load('review-autumn-event-tile-symbols.py','event_tile_5')
red=load('review-autumn-red-tile-symbols.py','red_tile_5')
topology_match=load('review-autumn-tile-sequence.py','topo_tile_5')


def assess(symbols,topology):
    if not isinstance(symbols,list):
        return {'status':'abstain','reason':'invalid-symbol-observations'}
    if any(p.get('tile_kind_candidate','').startswith('unknown-') for p in symbols):
        return {'status':'abstain','reason':'unidentified-adjacent-tile'}
    grouped={kind:[p for p in symbols if p.get('tile_kind_candidate')==kind]
             for kind in KINDS}
    if any(len(grouped[k])!=1 for k in KINDS):
        return {'status':'abstain','reason':'missing-or-duplicate-symbols',
                'type_counts':{k:len(v) for k,v in grouped.items()}}
    try:
        pts=np.asarray([[grouped[k][0]['x'],grouped[k][0]['y']] for k in KINDS],
                       dtype=float)
    except (ValueError,TypeError,KeyError):
        return {'status':'abstain','reason':'invalid-symbol-coordinates'}
    if pts.shape!=(5,2) or not np.isfinite(pts).all():
        return {'status':'abstain','reason':'invalid-symbol-coordinates'}
    step=np.diff(pts,axis=0)
    lengths=np.linalg.norm(step,axis=1)
    if (np.any(lengths<25) or np.any(lengths>90) or
            not np.all(step[:,0]>12) or not np.all(step[:,1]>8)):
        return {'status':'abstain','reason':'implausible-symbol-order'}
    line=pts[-1]-pts[0]
    unit=line/np.linalg.norm(line)
    perpendicular=np.abs((pts[:,0]-pts[0,0])*unit[1]-
                         (pts[:,1]-pts[0,1])*unit[0])
    max_deviation=float(perpendicular.max())
    if max_deviation>5:
        return {'status':'abstain','reason':'not-same-board-row',
                'max_deviation_px':round(max_deviation,3)}
    match=topology_match.match_type_path(topology,list(KINDS))
    if match['status']!='unique-topology-candidate-only':
        return {'status':'abstain','reason':'topology-ambiguous-or-unmatched',
                'topology_match_count':len(match['matches'])}
    return {'status':'unique-visual-context-proposal-only',
            'path_candidate':match['matches'][0]['node_ids'],
            'edge_evidence':match['matches'][0]['edge_statuses'],
            'max_deviation_px':round(max_deviation,3),
            'successive_step_px':[round(float(x),2) for x in lengths],
            'confidence':'not-user-verified; image thresholds not independently evaluated',
            'plant_type':'unknown','building_slots':'not-assigned'}


def analyze(frame,topology):
    if not isinstance(frame,np.ndarray) or frame.shape!=(288,512,3):
        raise ValueError('Expected 512x288 BGR')
    symbols=blue.propose(frame)+event.propose(frame)+red.propose(frame)
    return assess(symbols,topology)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image',type=Path,required=True)
    p.add_argument('--topology',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Could not read input frame')
    result=analyze(frame,json.loads(args.topology.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':result['status']},ensure_ascii=False))


if __name__=='__main__':
    main()
