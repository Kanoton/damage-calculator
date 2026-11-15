"""Render document-only autumn event maps with 2x monster icons.

Preserves the approved underlying map and every source coordinate.
Does NOT modify gameplay images/Map or images/MapEvent.
"""
import argparse
import csv
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw
from autumn_building_frames import building_overlay

ROOT = Path(__file__).resolve().parents[1]
PROD = ROOT / "docs/map-event-output/autumn-forest/production"
MAP = ROOT / "images/Map/Layout_Autumn_Forest.png"
STEPS = (1, 3, 7, 10)
SIZE = 172
MARGIN = 7


def rows(path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def overlap(a, b, gap=0):
    return a[0] < b[2]+gap and b[0] < a[2]+gap and a[1] < b[3]+gap and b[1] < a[3]+gap


def line_hits(a, b, box, pad=8):
    low, high = 0.0, 1.0
    for start, end, lo, hi in ((a[0],b[0],box[0]-pad,box[2]+pad),
                               (a[1],b[1],box[1]-pad,box[3]+pad)):
        delta = end-start
        if delta == 0:
            if not lo <= start <= hi:
                return False
        else:
            s,t = (lo-start)/delta,(hi-start)/delta
            low=max(low,min(s,t)); high=min(high,max(s,t))
            if low>high:
                return False
    return True


def icon(path):
    im=Image.open(path).convert("RGBA")
    alpha=im.getchannel("A")
    # Keep the main connected opaque component, matching the existing renderer.
    w,h=im.size
    data=bytearray(alpha.tobytes())
    biggest=[]
    for idx in range(w*h):
        if data[idx]==0:
            continue
        queue=[idx]; data[idx]=0; component=[]
        while queue:
            p=queue.pop();component.append(p)
            x,y=p%w,p//w
            for yy in range(max(0,y-1),min(h,y+2)):
                for xx in range(max(0,x-1),min(w,x+2)):
                    k=yy*w+xx
                    if data[k]:
                        data[k]=0;queue.append(k)
        if len(component)>len(biggest):
            biggest=component
    if not biggest:
        raise ValueError("Empty monster icon: "+str(path))
    mask=bytearray(w*h)
    for p in biggest:
        mask[p]=255
    im.putalpha(Image.frombytes("L",(w,h),bytes(mask)))
    im=im.crop(im.getchannel("A").getbbox())
    im.thumbnail((SIZE,SIZE),Image.Resampling.LANCZOS)
    return im


def clean_base():
    base=Image.open(MAP).convert("RGBA")
    original=Image.open(PROD/"Autumn_Map_Base.png").convert("RGBA")
    overlay=building_overlay()
    if not(base.size==original.size==overlay.size):
        raise ValueError("Map size mismatch")
    result=base.copy()
    result.paste(original,(0,0),overlay.getchannel("A"))
    return result


def layout(entries, nodes, edges, images, width, height):
    tiles=[(n["x"]-43,n["y"]-43,n["x"]+43,n["y"]+43) for n in nodes.values()]
    chosen=[]
    directions=[(-1,-1),(1,-1),(-1,1),(1,1),(-1,0),(1,0),(0,-1),(0,1),
                (-2,-1),(2,-1),(-2,1),(2,1),(-1,-2),(1,-2),(-1,2),(1,2)]
    for record in entries:
        node=nodes[record["node_id"]]
        art=images[record["monster_id"]]
        w,h=art.size
        candidates=[]
        for radius in (130,170,210,255,310,370,440,520,610,720,820):
            for dx,dy in directions:
                norm=math.hypot(dx,dy)
                x=round(node["x"]+radius*dx/norm-w/2)
                y=round(node["y"]+radius*dy/norm-h/2)
                box=(x,y,x+w,y+h)
                if min(x,y)<MARGIN or x+w+MARGIN>width or y+h+MARGIN>height:
                    continue
                if any(overlap(box,t) for t in tiles):
                    continue
                if any(line_hits((nodes[e["a"]]["x"],nodes[e["a"]]["y"]),
                                 (nodes[e["b"]]["x"],nodes[e["b"]]["y"]),box) for e in edges):
                    continue
                candidates.append((radius,box))
        if not candidates:
            raise ValueError("No legal space for "+record["node_id"])
        chosen.append((record,art,sorted(set(candidates))))
    # Backtracking prevents a greedy choice from blocking a later monster.
    chosen.sort(key=lambda item:len(item[2]))
    def search(i,placed):
        if i==len(chosen):
            return placed
        record,art,candidates=chosen[i]
        for radius,box in candidates:
            if any(overlap(box,b,MARGIN) for b in placed.values()):
                continue
            result=search(i+1,{**placed,record["node_id"]:box})
            if result is not None:
                return result
        return None
    boxes=search(0,{})
    if boxes is None:
        raise ValueError("No nonoverlapping arrangement for current event")
    return [(record,art,boxes[record["node_id"]]) for record,art,_ in chosen]


def render(out):
    source=json.loads((PROD/"data/topology.json").read_text(encoding="utf-8"))
    nodes={n["id"]:n for n in source["nodes"]}
    paths={r["monster_id"]:ROOT/"images/Monster"/r["image"] for r in rows(ROOT/"csv/monster_stats.csv")}
    spawn=rows(PROD/"event_spawn_locations.csv")
    unique={r["monster_id"] for r in spawn}
    arts={mid:icon(paths[mid]) for mid in unique}
    base=clean_base()
    out.mkdir(parents=True,exist_ok=True)
    metadata={"icon_max_size":SIZE,"previous_icon_max_size":86,
              "map_source":str(MAP.relative_to(ROOT)),
              "map_cells_unchanged":True,"blue_building_frames":"removed for document only",
              "green_frame_width":7,"events":{}}
    for step in STEPS:
        entries=[r for r in spawn if int(r["進捗"])==step]
        image=base.copy()
        d=ImageDraw.Draw(image)
        for entry in entries:
            node=nodes[entry["node_id"]]
            x,y=node["x"],node["y"]
            d.rounded_rectangle((x-41,y-41,x+41,y+41),radius=7,
                                outline=(29,183,96,255),width=7)
        places=layout(entries,nodes,source["edges"],arts,*image.size)
        metadata["events"][str(step)]=[]
        for entry,art,box in places:
            image.alpha_composite(art,box[:2])
            metadata["events"][str(step)].append({
                "node":entry["node_id"],"monster_id":entry["monster_id"],
                "box":list(box),"size":list(art.size)})
        image.save(out/f"Autumn_Event_{step:02}_Reference_2x.png",optimize=True)
    (out/"layout.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Generated document-only events:",len(STEPS)," / monsters:",len(spawn))


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--out",required=True,type=Path)
    render(p.parse_args().out)
