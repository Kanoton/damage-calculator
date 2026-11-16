#!/usr/bin/env python3
"""Read-only topology matcher for manually observed consecutive tile icons.

Image-to-icon recognition is NOT supplied. A unique topology match is a
hypothesis, not independently verified game slot ground truth; it never
updates 08 or generates 16-slot occupancy observations.
"""
import argparse
import json
from pathlib import Path


def match_type_path(topology, observed):
    if not isinstance(topology,dict) or not isinstance(topology.get('nodes'),list) or not isinstance(topology.get('edges'),list):
        raise ValueError('Invalid topology')
    if not isinstance(observed,list) or not 2 <= len(observed) <= 12 or any(not isinstance(x,str) or not x.strip() for x in observed):
        raise ValueError('Expected 2..12 nonempty icon types')
    nodes={x['id']:x for x in topology['nodes'] if isinstance(x,dict) and x.get('id')}
    edge_data={frozenset((x['a'],x['b'])):x.get('status','unknown') for x in topology['edges']}
    outer=['O'+str(x).zfill(2) for x in range(1,39)]
    options=[]
    for start in range(len(outer)):
        for direction in (-1,1):
            path=[outer[(start+direction*i)%len(outer)] for i in range(len(observed))]
            if any(node not in nodes for node in path):
                continue
            if any(nodes[node]['type']!=kind for node,kind in zip(path,observed)):
                continue
            statuses=[]
            for a,b in zip(path,path[1:]):
                status=edge_data.get(frozenset((a,b)))
                if status is None:
                    break
                statuses.append(status)
            else:
                options.append({'node_ids':path,'edge_statuses':statuses})
    status='unique-topology-candidate-only' if len(options)==1 else ('ambiguous-topology' if options else 'no-matching-path')
    return {'status':status,'matches':options,'observed_types':observed,
            'note':'Tile symbols must be visually reviewed; topology connections may be provisional. No direct pot ID or occupancy confirmation.'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--topology',type=Path,required=True)
    p.add_argument('--types-json',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    topology=json.loads(args.topology.read_text(encoding='utf-8'))
    observed=json.loads(args.types_json.read_text(encoding='utf-8'))['types']
    output=match_type_path(topology,observed)
    args.output.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':output['status'],'matches':len(output['matches'])},ensure_ascii=False))


if __name__=='__main__':main()
