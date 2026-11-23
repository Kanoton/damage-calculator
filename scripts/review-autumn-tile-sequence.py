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



def shortest_outer_context(topology, slot_id, max_window=8):
    """Shortest unique contiguous icon-type sequence containing an outer slot.

    This identifies which surrounding icons to CHECK, not a slot or image
    detector. Inner/branching slots require separate topology handling.
    """
    outer=['O'+str(i).zfill(2) for i in range(1,39)]
    if slot_id not in outer:
        return {'status':'unsupported-inner-or-unknown-slot'}
    if type(max_window) is not int or not 2<=max_window<=12:
        raise ValueError('max_window must be 2..12')
    nodes={x['id']:x for x in topology['nodes']}
    edges={frozenset((x['a'],x['b'])) for x in topology['edges']}
    if slot_id not in nodes:
        return {'status':'missing-slot-node'}
    options=[]
    for size in range(2,max_window+1):
        for start in range(38):
            for direction in (-1,1):
                path=[outer[(start+direction*i)%38] for i in range(size)]
                if slot_id not in path or any(node not in nodes for node in path):
                    continue
                if any(frozenset((a,b)) not in edges for a,b in zip(path,path[1:])):
                    continue
                kinds=[nodes[node]['type'] for node in path]
                result=match_type_path(topology,kinds)
                if (result['status']=='unique-topology-candidate-only'
                        and result['matches'][0]['node_ids']==path):
                    options.append({'size':size,'path':path,'types':kinds})
        if options:
            break
    if not options:
        return {'status':'no-unique-window-within-limit'}
    options.sort(key=lambda item:(item['path'].index(slot_id),item['path']))
    best=options[0]
    return {'status':'unique-context-candidate-only','slot_id':slot_id,
            'length':best['size'],'node_ids':best['path'],'types':best['types'],
            'note':'Topology-only context; screen icon detection and edge evidence are separate'}


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
