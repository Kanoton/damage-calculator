#!/usr/bin/env python3
"""Research-only replay landmark registration. Does not infer a building or write app state.

Inputs: replay MP4, user-reviewed image, non-personal coordinates in JSON.
Install opencv-python and numpy separately. No raw frame is sent to the network.
Example: python scripts/review-autumn-building-replay.py --video replay.mp4 \
 --reference screenshot.jpg --anchors anchors.json --times 25.8 26.0
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

SIZE = (960, 540)
SCALES = (0.85, 1.0, 1.10)


def peaks(score, minimum=0.45, limit=8, radius=30):
    work = score.copy()
    out = []
    for _ in range(limit):
        _, strength, _, (x, y) = cv2.minMaxLoc(work)
        if strength < minimum:
            break
        out.append((float(strength), (x, y)))
        work[max(0, y-radius):y+radius+1, max(0, x-radius):x+radius+1] = -1
    return out


def locate(reference, frame, anchors):
    # Different tile classes are required to avoid a one-plant-shift from
    # visually repeated neighbouring pots.
    matches = {}
    for key, (cx, cy) in anchors["landmarks"].items():
        template = reference[cy-23:cy+23, cx-23:cx+23]
        found = []
        for scale in SCALES:
            tile = cv2.resize(template, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            score = cv2.matchTemplate(frame, tile, cv2.TM_CCOEFF_NORMED)
            for similarity, (x, y) in peaks(score):
                found.append((similarity, (x+tile.shape[1]/2, y+tile.shape[0]/2)))
        matches[key] = sorted(found, reverse=True)[:25]
    a, b, c = anchors["required_pair"]
    ax, ay = anchors["landmarks"][a]
    bx, by = anchors["landmarks"][b]
    if bx == ax:
        return None
    candidates = []
    for first in matches[a]:
        for second in matches[b]:
            dx = second[1][0]-first[1][0]
            dy = second[1][1]-first[1][1]
            scale = dx/(bx-ax)
            if not 0.75 < scale < 1.55:
                continue
            if abs(dy-scale*(by-ay)) > 30:
                continue
            if min(first[0], second[0]) < 0.7:
                continue
            tx, ty = first[1][0]-scale*ax, first[1][1]-scale*ay
            cx, cy = anchors["landmarks"][c]
            pred = np.array([scale*cx+tx, scale*cy+ty])
            third = [p for p in matches[c] if np.linalg.norm(np.array(p[1])-pred) < 30]
            supported = bool(third and max(x[0] for x in third) >= 0.55)
            # Two anchors produce a REVIEW CANDIDATE, not an auto-apply verdict.
            quality = (first[0]+second[0])/2
            projected = {slot: [round(scale*x+tx), round(scale*y+ty)] for slot, (x, y) in anchors["slots"].items()}
            if not all(0 <= x < SIZE[0] and 0 <= y < SIZE[1] for x, y in projected.values()):
                continue
            candidates.append((quality, {"score": round(quality, 4),
                                         "independent_anchor_count": 3 if supported else 2,
                                         "registration_verified": supported,
                                         "slots": projected,
                                         "plant_type": None,
                                         "auto_apply": False}))
    return max(candidates, key=lambda x: x[0])[1] if candidates else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--anchors", type=Path, required=True)
    parser.add_argument("--times", type=float, nargs="+", required=True)
    parser.add_argument("--out", type=Path, default=Path("building-replay-review.json"))
    args = parser.parse_args()
    if any(t < 0 for t in args.times):
        parser.error("times must be nonnegative")
    anchors = json.loads(args.anchors.read_text(encoding="utf-8"))
    image = cv2.imread(str(args.reference))
    if image is None:
        raise ValueError("Cannot load reference")
    reference = cv2.resize(image, SIZE)
    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise ValueError("Cannot open video")
    results = []
    for t in args.times:
        capture.set(cv2.CAP_PROP_POS_MSEC, t*1000)
        ok, image = capture.read()
        result = locate(reference, cv2.resize(image, SIZE), anchors) if ok else None
        results.append({"at_seconds": t, "candidate": result})
    capture.release()
    args.out.write_text(json.dumps({"video": args.video.name, "reference": args.reference.name,
                                    "observations": results}, ensure_ascii=False, indent=2)+"\n",
                        encoding="utf-8")
    print("Review candidates:", sum(bool(r["candidate"]) for r in results), "/", len(results))
    print("No application state was modified.")


if __name__ == "__main__":
    main()
