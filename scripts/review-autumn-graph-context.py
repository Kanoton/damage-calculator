#!/usr/bin/env python3
"""Static research-only graph context. Actual tile symbols can change in play.

No screen reading, slot identification confirmation, occupancy, plant types,
or production state updates. Canonical connections may be provisional.
"""
import argparse
import json
from collections import Counter
from pathlib import Path


def shortest_context(topology, slot_id, max_length=7):
    if type(max_length) is not int or not 2<=max_length<=8:
        raise ValueError('max_length must be 2..8')
    nodes={n['id']:n for n in topology['nodes']}
    if slot_id not in nodes:
        return {'status':'unknown-slot'}
    edges={}
    for e in topology['edges']:
        edges[frozenset((e['a'],e['b']))]=e.get('status','unknown')
    adj={x:[] for x in nodes}
    for key in edges:
        if len(key)!=2:
            continue
        a,b=tuple(key)
        if a in nodes and b in nodes:
            adj[a].append(b)
            adj[b].append(a)
    all_paths=[]
    def walk(path):
        if len(path)>=2:
            all_paths.append((tuple(path),
                              tuple(nodes[x]['type'] for x in path)))
        if len(path)==max_length:
            return
        for target in adj[path[-1]]:
            if target not in path:
                walk(path+[target])
    for node in nodes:
        walk([node])
    counts=Counter(pattern for _,pattern in all_paths)
    options=[(path,pattern) for path,pattern in all_paths
             if slot_id in path and counts[pattern]==1]
    if not options:
        return {'status':'no-unique-context'}
    options.sort(key=lambda pair:(len(pair[0]),pair[0].index(slot_id),pair[0]))
    path,pattern=options[0]
    return {'status':'unique-graph-context-candidate-only','slot_id':slot_id,
            'path':list(path),'tile_types':list(pattern),
            'slot_offset':path.index(slot_id),
            'edge_statuses':[edges[frozenset((a,b))] for a,b in zip(path,path[1:])],
            'warning':('Initial topology only; tile transformations and '
                       'manual evidence can invalidate this path')}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--topology',type=Path,required=True)
    p.add_argument('--slot',required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    topology=json.loads(args.topology.read_text(encoding='utf-8'))
    r=shortest_context(topology,args.slot)
    args.output.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':r['status'],'slot':args.slot},ensure_ascii=False))


if __name__=='__main__':
    main()
