#!/usr/bin/env python3
"""Research-only Event -> Monster -> Damage triplet from independent pixels.

Three visual types can match FOUR different Autumn outer rows. The geometry
check does not resolve this ambiguity. No automatic building or slot update.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np

HERE=Path(__file__).resolve().parent


def load(path,alias):
    spec=importlib.util.spec_from_file_location(alias,HERE/path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


event=load('review-autumn-event-tile-symbols.py','event_color')
red=load('review-autumn-red-tile-symbols.py','red_color')
paths=load('review-autumn-tile-sequence.py','tile_paths')


def assess_triplet(event_candidates,red_candidates,topology):
    event_points=[p for p in event_candidates if p.get('tile_kind_candidate')=='Event']
    monster=[p for p in red_candidates if p.get('tile_kind_candidate')=='Monster']
    damage=[p for p in red_candidates if p.get('tile_kind_candidate')=='Damage']
    unknown=[p for p in red_candidates if p.get('tile_kind_candidate')=='unknown-red-tile']
    if len(event_points)!=1 or len(monster)!=1 or len(damage)!=1 or unknown:
        return {'status':'abstain','reason':'missing-duplicate-or-unknown-symbol'}
    coords=np.asarray([[p['x'],p['y']] for p in
                        (event_points[0],monster[0],damage[0])],dtype=float)
    if coords.shape!=(3,2) or not np.isfinite(coords).all():
        return {'status':'abstain','reason':'invalid-symbol-coordinates'}
    pitch=(coords[2]-coords[0])/2
    length=float(np.linalg.norm(pitch))
    middle=coords.mean(axis=0)
    residual=float(np.linalg.norm(coords-(
        middle+np.arange(-1,2)[:,None]*pitch),axis=1).max())
    if not(30<=length<=95 and residual<=6):
        return {'status':'abstain','reason':'symbol-triplet-not-collinear-or-spaced',
                'max_residual_px':round(residual,3)}
    topology_match=paths.match_type_path(topology,['Event','Monster','Damage'])
    if not topology_match['matches']:
        return {'status':'abstain','reason':'no-topology-type-path'}
    return {'status':'ambiguous-triplet' if len(topology_match['matches'])>1 else
            'unique-context-proposal-only',
            'candidate_paths':[row['node_ids'] for row in topology_match['matches']],
            'max_residual_px':round(residual,3),'pitch_px':round(length,3),
            'evidence':'independently proposed visual symbol colors, not verified IDs',
            'building_slots':'not-assigned','plant_type':'unknown'}


def analyze(frame,topology):
    if not isinstance(frame,np.ndarray) or frame.shape!=(288,512,3):
        raise ValueError('Expected 512x288 BGR frame')
    return assess_triplet(event.propose(frame),red.propose(frame),topology)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--image',type=Path,required=True)
    p.add_argument('--topology',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None:raise ValueError('Unable to read image')
    result=analyze(frame,json.loads(args.topology.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':result['status']},ensure_ascii=False))


if __name__=='__main__':
    main()
