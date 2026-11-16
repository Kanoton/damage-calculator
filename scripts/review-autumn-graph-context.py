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



def match_observed_graph_path(topology, observed_types, changed_nodes=None, verified_replacements=None):
    """Conservatively match human-verified screen symbols to a graph path.

    changed_nodes is a list of IDs with unknown current symbols. Verified
    replacements (e.g. {'I12':'Shop'}) use their known current symbols.
    Unverified changes can alias ANY visible symbol and must fail closed.
    """
    if not isinstance(observed_types,list) or not 2<=len(observed_types)<=8 or any(
            not isinstance(kind,str) or not kind.strip() for kind in observed_types):
        raise ValueError('Expected 2..8 nonempty observed tile symbols')
    nodes={n['id']:n for n in topology['nodes']}
    changed=set(changed_nodes or [])
    replacements=verified_replacements or {}
    if (not isinstance(replacements,dict) or
            any(not isinstance(v,str) or not v.strip() for v in replacements.values())):
        raise ValueError('Verified replacements require nonempty tile types')
    changed.update(replacements)
    if not changed.issubset(nodes):
        raise ValueError('Unknown changed node')
    adj={node:set() for node in nodes}
    edge_status={}
    for e in topology['edges']:
        a,b=e['a'],e['b']
        if a not in nodes or b not in nodes or a==b:
            continue
        adj[a].add(b)
        adj[b].add(a)
        edge_status[frozenset((a,b))]=e.get('status','unknown')
    matches=[]
    def walk(path):
        if len(path)==len(observed_types):
            matches.append({'node_ids':list(path),
                'edge_statuses':[edge_status[frozenset((a,b))]
                                 for a,b in zip(path,path[1:])]})
            return
        for neighbor in sorted(adj[path[-1]]):
            if neighbor in path or neighbor in changed:
                continue
            if nodes[neighbor]['type']==observed_types[len(path)]:
                walk(path+[neighbor])
    for start in sorted(nodes):
        if start not in changed and nodes[start]['type']==observed_types[0]:
            walk([start])
    # A changed tile with no verified current symbol may match ANY icon.
    # A verified replacement (e.g. I12=Shop) may only match its new symbol.
    # Enumerate possible paths conservatively to avoid obsolete matches.
    def potentially_matches_changed():
        def can_be(node, index):
            if node in replacements:
                return replacements[node]==observed_types[index]
            return node in changed or nodes[node]['type']==observed_types[index]
        def possible_walk(path):
            if len(path)==len(observed_types):
                return True
            for neighbor in adj[path[-1]]:
                if neighbor not in path and can_be(neighbor,len(path)):
                    if possible_walk(path+[neighbor]):
                        return True
            return False
        return any(can_be(start,0) and possible_walk([start]) and for start in nodes)
    if changed and potentially_matches_changed():
        return {'status':'abstain','reason':'changed-tile-may-alias-path',
                'confirmed_matches':matches}
    status=('unique-graph-path-candidate-only' if len(matches)==1 else
            'ambiguous-graph-path' if matches else 'no-matching-graph-path')
    return {'status':status,'matches':matches,
            'note':'Visual tile types and graph edges require independent verification'}


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
