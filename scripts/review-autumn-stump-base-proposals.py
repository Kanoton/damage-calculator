#!/usr/bin/env python3
"""Exploratory brown-base proposals, independent of visible cyan pot water.

This intentionally has high false-positive risk on autumn terrain. It must
remain a separate diagnostic channel, not merged into confirmed pot positions.
"""
import argparse
import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np

SIZE = (512, 288)


def propose(frame):
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    brown = cv2.inRange(hsv, (5, 35, 65), (30, 220, 255))
    n, _, stats, centers = cv2.connectedComponentsWithStats(brown)
    candidates = []
    for i in range(1, n):
        x, y, w, h, area = map(int, stats[i])
        cx, cy = map(float, centers[i])
        if not (90 <= cx <= 470 and 50 <= cy <= 230 and
                20 <= w <= 75 and 13 <= h <= 65 and
                150 <= area <= 1500 and .3 <= w/h <= 3.2):
            continue
        candidates.append({
            'x': round(cx, 1), 'y': round(cy, 1),
            'area': area, 'width': w, 'height': h,
            'status': 'brown-base-shape-candidate-unverified'
        })
    return sorted(candidates, key=lambda v: (v['y'], v['x']))



def pale_platform_proposals(frame):
    """Water-independent tan platform-body candidates, separate from brown mask.

    The surrounding-water ratio is evidence about context, not a requirement
    for detection and not a proof of stump identity. The shape can also be
    produced by map icons and terrain.
    """
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    tan = cv2.inRange(hsv, (3, 30, 130), (29, 155, 255))
    count, _, stats, centers = cv2.connectedComponentsWithStats(tan)
    candidates = []
    for i in range(1, count):
        x, y, w, h, area = map(int, stats[i])
        cx, cy = map(float, centers[i])
        if not (140 < area < 2800 and 25 < w < 105 and 14 < h < 85
                and 80 < cx < 470 and 60 < cy < 240):
            continue
        pad = 15
        x0, x1 = max(0, x-pad), min(512, x+w+pad)
        y0, y1 = max(0, y-pad), min(288, y+h+pad)
        region = hsv[y0:y1, x0:x1]
        neighborhood = np.ones(region.shape[:2], dtype=bool)
        neighborhood[y-y0:y+h-y0, x-x0:x+w-x0] = False
        water = ((region[:,:,0] >= 70) & (region[:,:,0] <= 110)
                 & (region[:,:,1] >= 30) & (region[:,:,2] >= 50))
        ratio = float(water[neighborhood].mean()) if neighborhood.any() else 0.0
        candidates.append({'x': round(cx, 1), 'y': round(cy, 1),
                           'area': area, 'width': w, 'height': h,
                           'surrounding_water_ratio': round(ratio, 3),
                           'status': 'pale-platform-looking-unverified'})
    return sorted(candidates, key=lambda c: (c['y'], c['x']))


def cyan_structure_base_proposals(frame):
    """Experimental base-location hints from cyan *structure*, not empty water.

    Plants, map icons, and terrain can also contain cyan. The 16px downward
    offset is a local screenshot probe, NOT validated geometry across cameras.
    This is an independent research channel; never fuse as a confirmed stump.
    """
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    cyan = cv2.inRange(hsv, (75, 75, 85), (105, 255, 255))
    closed = cv2.morphologyEx(
        cyan, cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    count, _, stats, centers = cv2.connectedComponentsWithStats(closed)
    results = []
    for i in range(1, count):
        x, y, w, h, area = map(int, stats[i])
        cx, cy = map(float, centers[i])
        if not (350 < area < 1700 and 32 < w < 85 and 24 < h < 62
                and 100 < cx < 460 and 50 < cy < 205):
            continue
        results.append({
            'x': round(cx, 1), 'y': round(cy+16, 1),
            'cyan_structure_x': round(cx, 1),
            'cyan_structure_y': round(cy, 1),
            'area': area, 'width': w, 'height': h,
            'status': 'cyan-structure-base-hint-unverified'
        })
    return sorted(results, key=lambda v: (v['y'], v['x']))


def annotate_cyan_tile_conflicts(hints, tile_centers, radius=23):
    """Flag cyan source structures overlapping mutable colored map tiles.

    Compare the source center, NOT the speculative base point shifted +16px.
    A flag is not a rejection: real cyan pot rims can also be broad blue tile
    proposals. Keep all hints visible to human reviewers.
    """
    if not np.isfinite(radius) or radius <= 0:
        raise ValueError('radius must be finite and positive')
    result = []
    for hint in hints:
        source_x = hint['cyan_structure_x']
        source_y = hint['cyan_structure_y']
        conflicting = [
            i for i, tile in enumerate(tile_centers)
            if (source_x-tile['x'])**2 + (source_y-tile['y'])**2 < radius**2
        ]
        result.append({**hint,
                       'colored_tile_overlap': bool(conflicting),
                       'overlapping_tile_indices': conflicting,
                       'human_label': 'unreviewed'})
    return result



def horizontal_edge_profiles(frame, points):
    """Local upper/lower edge-band diagnostics around candidate base centers.

    Unlike color masks, Sobel uses luminance contrast. A high response does
    NOT prove stump geometry: map tiles, rocks, and UI can also have edges.
    Never use the score alone to set occupancy or canonical IDs.
    """
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    smooth = cv2.GaussianBlur(gray, (3, 3), 0)
    dy = np.abs(cv2.Sobel(smooth, cv2.CV_32F, 0, 1, ksize=3))
    result = []
    for point in points:
        x, y = int(round(point['x'])), int(round(point['y']))
        x0, x1, y0, y1 = x-27, x+28, y-32, y+14
        if x0 < 0 or x1 > 512 or y0 < 0 or y1 > 288:
            result.append({'x': x, 'y': y, 'status': 'edge-window-out-of-bounds'})
            continue
        patch = dy[y0:y1, x0:x1]
        threshold = max(45.0, float(np.percentile(patch, 75)))
        row_support = (patch > threshold).mean(axis=1)
        row_support = np.convolve(row_support, np.ones(3)/3, mode='same')
        # Restrict peaks to the upper side of the approximate base center.
        # There is no calibration proof for the 7..26 pixel separation.
        pairs = [
            (min(row_support[a], row_support[c]), a, c)
            for a in range(2, 34)
            for c in range(a+7, min(a+27, len(row_support)))
        ]
        score, upper, lower = max(pairs, default=(0.0, 0, 0))
        result.append({
            'x': x, 'y': y,
            'horizontal_double_edge_score': round(float(score), 4),
            'upper_edge_y': y0+upper,
            'lower_edge_y': y0+lower,
            'edge_band_separation_px': lower-upper,
            'status': 'unverified-edge-geometry-profile'
        })
    return result


def exclude_tile_overlaps(base_candidates, tile_centers, radius=24):
    """Separate nearby colored tile bodies; retain raw proposals for review.

    Exclusion is diagnostic triage, not proof of false detection:
    genuine stump pixels can be near a colored tile in perspective.
    """
    if radius <= 0:
        raise ValueError('radius must be positive')
    filtered, overlaps = [], []
    for candidate in base_candidates:
        if any((candidate['x']-tile['x'])**2
               + (candidate['y']-tile['y'])**2 < radius**2
               for tile in tile_centers):
            overlaps.append(candidate)
        else:
            filtered.append(candidate)
    return filtered, overlaps


def compare(frame, water_proposals, tile_centers=None):
    """Show independent base detections alongside water-derived anchors.

    No spatial overlap is asserted as a match: water center is above the base.
    """
    bases = propose(frame)
    pale = pale_platform_proposals(frame)
    cyan_structure = annotate_cyan_tile_conflicts(
        cyan_structure_base_proposals(frame), tile_centers or [])
    kept, overlaps = exclude_tile_overlaps(bases, tile_centers or [])
    return {'brown_base_candidates': bases,
            'pale_edge_profiles': horizontal_edge_profiles(frame, pale),
            'cyan_hint_edge_profiles': horizontal_edge_profiles(frame, cyan_structure),
            'pale_platform_candidates': pale,
            'pale_platform_candidate_count': len(pale),
            'cyan_structure_base_hints': cyan_structure,
            'cyan_structure_base_hint_count': len(cyan_structure),
            'cyan_structure_tile_overlap_count': sum(
                hint['colored_tile_overlap'] for hint in cyan_structure),
            'non_tile_overlap_candidates': kept,
            'tile_overlap_candidates': overlaps,
            'water_anchor_count': len(water_proposals),
            'base_candidate_count': len(bases),
            'non_tile_overlap_count': len(kept),
            'tile_overlap_count': len(overlaps),
            'planted_stumps_verified': False,
            'slot_ids_verified': False,
            'production_application': 'forbidden',
            'warning': ('Brown terrain, rocks, and tree trunks can match this '
                        'mask. Candidate count is not stump recall or precision.')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    frame = cv2.imread(str(args.image))
    if frame is None:
        raise ValueError('Cannot decode image')
    if frame.shape[:2] != (288, 512):
        frame = cv2.resize(frame, SIZE, interpolation=cv2.INTER_AREA)
    spec = importlib.util.spec_from_file_location(
        'stump_base_tile_context',
        Path(__file__).resolve().parent / 'review-autumn-stump-frame-audit.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = compare(frame, [], module.tile_centers(frame))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)
                           + chr(10), encoding='utf-8')
    print(json.dumps({'base_candidate_count': result['base_candidate_count']}))


if __name__ == '__main__':
    main()
