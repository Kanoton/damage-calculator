#!/usr/bin/env python3
"""Research-only replay landmark registration. Does not infer a building or write app state.

Inputs: replay MP4, user-reviewed image, non-personal coordinates in JSON.
Install opencv-python and numpy separately. No raw frame is sent to the network.
Example: python scripts/review-autumn-building-replay.py --video replay.mp4 \
 --reference screenshot.jpg --anchors anchors.json --times 25.8 26.0
"""
import argparse
import itertools
import json
from pathlib import Path

import cv2
import numpy as np

SIZE = (960, 540)
SCALES = (0.85, 1.0, 1.10, 1.20)
PATCH_RADIUS = 23
MIN_SCORE = .68
MAX_RESIDUAL = 10.0
MIN_TRIANGLE_AREA = 600.0
AMBIGUITY_MARGIN = .025


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



def triangle_area(a, b, c):
    u = np.subtract(b, a)
    v = np.subtract(c, a)
    return abs(u[0] * v[1] - u[1] * v[0]) / 2


def estimate_transform(a, b):
    source = np.asarray([a[0], b[0]], dtype="float64")
    target = np.asarray([a[1], b[1]], dtype="float64")
    u, v = source[1] - source[0], target[1] - target[0]
    if np.linalg.norm(u) < 30 or np.linalg.norm(v) < 25:
        return None
    scale = np.linalg.norm(v) / np.linalg.norm(u)
    if not .7 <= scale <= 1.6:
        return None
    angle = np.arctan2(v[1], v[0]) - np.arctan2(u[1], u[0])
    ca, sa = np.cos(angle), np.sin(angle)
    matrix = scale * np.array([[ca, -sa], [sa, ca]])
    shift = target[0] - matrix @ source[0]
    return matrix, shift


def solve_geometry(landmarks, found, slots):
    """Only unambiguous fits with >=3 noncollinear, distinct-class landmarks pass."""
    keys = list(landmarks)
    if len(keys) < 3 or len(set(keys)) != len(keys):
        return None
    good = []
    for first, second, third in itertools.combinations(keys, 3):
        pa, pb, pc = (np.asarray(landmarks[k], dtype="float64")
                      for k in (first, second, third))
        if triangle_area(pa, pb, pc) < MIN_TRIANGLE_AREA:
            continue
        for ma in found.get(first, [])[:8]:
            for mb in found.get(second, [])[:8]:
                transform = estimate_transform((pa, ma[1]), (pb, mb[1]))
                if transform is None:
                    continue
                matrix, shift = transform
                predicted = matrix @ pc + shift
                for mc in found.get(third, [])[:8]:
                    residual = np.linalg.norm(np.asarray(mc[1]) - predicted)
                    if residual > MAX_RESIDUAL or min(ma[0], mb[0], mc[0]) < MIN_SCORE:
                        continue
                    quality = (ma[0] + mb[0] + mc[0]) / 3 - residual * .004
                    points = {name: [round(float(v)) for v in matrix @ np.asarray(pos, dtype=float) + shift]
                              for name, pos in slots.items()}
                    if not all(0 <= x < SIZE[0] and 0 <= y < SIZE[1] for x, y in points.values()):
                        continue
                    good.append(dict(score=round(quality, 4),
                                     anchors=[first, second, third],
                                     residual_px=round(float(residual), 2),
                                     slots=points))
    if not good:
        return None
    good.sort(key=lambda item: item["score"], reverse=True)
    best = good[0]
    for alt in good[1:]:
        if best["score"] - alt["score"] > AMBIGUITY_MARGIN:
            break
        if any(np.linalg.norm(np.asarray(best["slots"][key]) - np.asarray(alt["slots"][key])) > 12
               for key in slots):
            return {"registration_verified": False, "reason": "ambiguous-viewpoint",
                    "alternatives": len(good), "score": best["score"], "auto_apply": False}
    # Geometry never proves that the plant seen in the reference remains in the video.
    return {**best, "registration_verified": True, "plant_type": None, "auto_apply": False}


def locate(reference, frame, anchors):
    landmarks = anchors["landmarks"]
    if len(landmarks) < 3:
        return None
    found = {}
    for key, (cx, cy) in landmarks.items():
        x, y = int(cx), int(cy)
        if x < PATCH_RADIUS or y < PATCH_RADIUS or x + PATCH_RADIUS >= reference.shape[1] or y + PATCH_RADIUS >= reference.shape[0]:
            raise ValueError("Reference landmark outside image: " + key)
        template = reference[y - PATCH_RADIUS:y + PATCH_RADIUS, x - PATCH_RADIUS:x + PATCH_RADIUS]
        matches = []
        for scale in SCALES:
            tile = cv2.resize(template, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            response = cv2.matchTemplate(frame, tile, cv2.TM_CCOEFF_NORMED)
            for score, (xx, yy) in peaks(response, minimum=.60, limit=10, radius=25):
                matches.append((score, (xx + tile.shape[1] / 2, yy + tile.shape[0] / 2)))
        found[key] = sorted((m for m in matches if m[0] >= MIN_SCORE), reverse=True)[:16]
    return solve_geometry(landmarks, found, anchors["slots"])


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
