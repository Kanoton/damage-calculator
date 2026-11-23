#!/usr/bin/env python3
"""Research-only joint screen tile context + three empty-pot offset check.

Requires FIVE independently detected tile icons with one provisional O02-O06
topology path and THREE independently detected water+stump candidates.
Only returns possible O04-O06 pot associations for manual review.
Cannot identify plants or confirm a map slot for production use.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np

HERE=Path(__file__).resolve().parent


def load(script,alias):
    spec=importlib.util.spec_from_file_location(alias,HERE/script)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


five=load('review-autumn-five-tile-path.py','five_for_pots')
pots=load('review-autumn-empty-pot-proposals.py','pots_for_icons')
MAX_OFFSET_RESIDUAL=11.0


def associate(five_result,visible_symbols,water_pots):
    if (not isinstance(five_result,dict) or
            five_result.get('status')!='unique-visual-context-proposal-only' or
            five_result.get('path_candidate')!=['O02','O03','O04','O05','O06']):
        return {'status':'abstain','reason':'five-symbol-context-not-unique'}
    if not isinstance(water_pots,list) or len(water_pots)!=3:
        return {'status':'abstain','reason':'not-three-visible-water-pots'}
    if not isinstance(visible_symbols,list):
        return {'status':'abstain','reason':'bad-symbol-input'}
    # Do not silently take the first occurrence when the screen contains
    # duplicate/unknown symbols. This association is valid only for a
    # unique required Event/Monster/Damage observations.
    required=('Event','Monster','Damage')
    if (any(not isinstance(p,dict) for p in visible_symbols) or
            any(sum(p.get('tile_kind_candidate')==kind
                    for p in visible_symbols)!=1 for kind in required) or
            any(str(p.get('tile_kind_candidate','')).startswith('unknown-')
                for p in visible_symbols)):
        return {'status':'abstain','reason':'ambiguous-or-incomplete-symbols'}
    try:
        icon=np.asarray([[next(p for p in visible_symbols
                               if p['tile_kind_candidate']==kind)[axis]
                          for axis in ('x','y')]
                         for kind in ('Event','Monster','Damage')],dtype=float)
        pot=np.asarray([[p['x'],p['y']] for p in water_pots],dtype=float)
    except (KeyError,TypeError,ValueError,StopIteration):
        return {'status':'abstain','reason':'invalid-tile-or-pot-coordinates'}
    if icon.shape!=(3,2) or pot.shape!=(3,2) or not(
            np.isfinite(icon).all() and np.isfinite(pot).all()):
        return {'status':'abstain','reason':'invalid-tile-or-pot-coordinates'}
    pot=pot[np.argsort(pot[:,0])]
    if np.any(np.diff(pot[:,0])<=0):
        return {'status':'abstain','reason':'unordered-or-duplicate-pots'}
    offsets=pot-icon
    average=offsets.mean(axis=0)
    residual=float(np.linalg.norm(offsets-average,axis=1).max())
    # This quadrant relation was seen in a supplied right-edge frame;
    # it is NOT a universal building/pot orientation.
    if not (25<=average[0]<=95 and -110<=average[1]<=-25 and
            residual<=MAX_OFFSET_RESIDUAL):
        return {'status':'abstain','reason':'no-consistent-pot-to-tile-offset',
                'max_offset_residual_px':round(residual,3)}
    return {'status':'provisional-three-pot-slot-association-only',
            'candidate_pot_slots':[{'slot_candidate':slot,
                  'pot_x':round(float(p[0]),2),'pot_y':round(float(p[1]),2)}
                 for slot,p in zip(('O04','O05','O06'),pot)],
            'max_offset_residual_px':round(residual,3),
            'average_offset_px':[round(float(v),2) for v in average],
            'evidence':'single-view right edge; topology edges inferred',
            'plant_type':'unknown','production_application':'forbidden'}


def analyze(frame,topology):
    if not isinstance(frame,np.ndarray) or frame.shape!=(288,512,3):
        raise ValueError('Expected 512x288 BGR')
    symbols=five.blue.propose(frame)+five.event.propose(frame)+five.red.propose(frame)
    return associate(five.assess(symbols,topology),symbols,pots.propose(frame))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',type=Path,required=True)
    parser.add_argument('--topology',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    frame=cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Could not read frame')
    result=analyze(frame,json.loads(args.topology.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',
                           encoding='utf-8')
    print(json.dumps({'status':result['status']},ensure_ascii=False))


if __name__=='__main__':
    main()
