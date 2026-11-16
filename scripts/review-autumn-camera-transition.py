#!/usr/bin/env python3
"""Offline research: conservatively verify board-wide visual continuity.

Input consists of two independent frames, already resized to 512x288 BGR.
Reject viewpoint jumps, HUD-driven coincidences, sparse inliers and collapsed
feature distributions; accepted pairs are NOT slot-identification evidence.
Requires opencv-python-headless and numpy. No images are committed or emitted.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np

SIZE = (512, 288)
MIN_MATCHES = 40
MIN_INLIERS = 35
MIN_INLIER_RATIO = 0.75
MIN_REGIONS = 3


def board_mask():
    mask = np.zeros((SIZE[1], SIZE[0]), dtype=np.uint8)
    mask[30:224, 90:490] = 255
    return mask


def _regions(pts):
    return len({(min(2, int(x * 3 / SIZE[0])), min(2, int(y * 3 / SIZE[1])))
                for x, y in pts})


def continuity(first, second):
    if first.shape != (SIZE[1], SIZE[0], 3) or second.shape != first.shape:
        raise ValueError('Expected two 512x288 BGR frames')
    detector = cv2.ORB_create(nfeatures=1200, fastThreshold=10)
    mask = board_mask()
    k1, d1 = detector.detectAndCompute(cv2.cvtColor(first, cv2.COLOR_BGR2GRAY), mask)
    k2, d2 = detector.detectAndCompute(cv2.cvtColor(second, cv2.COLOR_BGR2GRAY), mask)
    if d1 is None or d2 is None or len(d1) < 2 or len(d2) < 2:
        return {'status': 'abstain', 'reason': 'missing-board-features', 'good_matches': 0}
    pairs = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(d1, d2, k=2)
    good = [a for a, b in pairs if a.distance < 0.72 * b.distance]
    if len(good) < MIN_MATCHES:
        return {'status': 'abstain', 'reason': 'insufficient-matches',
                'good_matches': len(good)}
    src = np.float32([k1[m.queryIdx].pt for m in good])
    dst = np.float32([k2[m.trainIdx].pt for m in good])
    transform, inliers = cv2.estimateAffinePartial2D(
        src, dst, method=cv2.RANSAC, ransacReprojThreshold=4, maxIters=3000)
    if transform is None or inliers is None:
        return {'status': 'abstain', 'reason': 'geometry-unsolved',
                'good_matches': len(good)}
    selected = inliers.ravel().astype(bool)
    accepted = int(selected.sum())
    ratio = accepted / len(good)
    regions_before = _regions(src[selected])
    regions_after = _regions(dst[selected])
    stats = {'good_matches': len(good), 'inliers': accepted,
             'inlier_ratio': round(ratio, 4),
             'regions_before': regions_before, 'regions_after': regions_after}
    if accepted < MIN_INLIERS or ratio < MIN_INLIER_RATIO:
        return {'status': 'abstain', 'reason': 'weak-board-geometry', **stats}
    if min(regions_before, regions_after) < MIN_REGIONS:
        return {'status': 'abstain', 'reason': 'localized-feature-cluster', **stats}
    # Diagnostic-only estimate; geometry from this alone must never assign a slot.
    return {'status': 'same-view-candidate', 'reason': 'board-continuity-only',
            **stats, 'affine_2x3': np.round(transform, 4).tolist()}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--first', type=Path, required=True)
    p.add_argument('--second', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    one, two = cv2.imread(str(args.first)), cv2.imread(str(args.second))
    if one is None or two is None:
        raise ValueError('Failed to decode both supplied image files')
    # Input files must already be resized; forbid silently changing source geometry.
    result = continuity(one, two)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: result[k] for k in ('status', 'reason', 'good_matches')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
