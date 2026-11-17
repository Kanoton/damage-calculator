#!/usr/bin/env python3
"""Research-only human-review contact sheet for stump/tile geometry.

Produces annotated image and machine-readable candidate coordinates. The
colored marks are *proposals*, never verified map slots or plant states.
Images are written only to explicitly supplied local paths.
"""
import argparse
import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    'review_sheet_frame', HERE / 'review-autumn-stump-frame-audit.py')
frame_audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(frame_audit)
base_spec = importlib.util.spec_from_file_location(
    'review_sheet_base', HERE / 'review-autumn-stump-base-proposals.py')
base_audit = importlib.util.module_from_spec(base_spec)
base_spec.loader.exec_module(base_audit)


def annotate(frame, report, base_candidates=None, pale_candidates=None,
             cyan_structure_hints=None):
    if not isinstance(frame, np.ndarray) or frame.shape != (288, 512, 3):
        raise ValueError('Expected 512x288 BGR frame')
    out = frame.copy()
    # Orange B# markers are independently detected brown blobs, not verified stumps.
    for i, candidate in enumerate(base_candidates or []):
        x, y = round(candidate['x']), round(candidate['y'])
        cv2.circle(out, (x, y), 6, (0, 165, 255), 2)
        cv2.putText(out, 'B'+str(i+1), (x+5, y+10),
                    cv2.FONT_HERSHEY_SIMPLEX, .36, (0, 0, 0), 2)
        cv2.putText(out, 'B'+str(i+1), (x+5, y+10),
                    cv2.FONT_HERSHEY_SIMPLEX, .36, (0, 165, 255), 1)
    # Cyan T# markers are pale platform shapes, independent of water bowls.
    for i, candidate in enumerate(pale_candidates or []):
        x, y = round(candidate['x']), round(candidate['y'])
        cv2.circle(out, (x, y), 9, (255, 255, 0), 2)
        cv2.putText(out, 'T'+str(i+1), (x+8, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, .38, (0, 0, 0), 2)
        cv2.putText(out, 'T'+str(i+1), (x+8, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, .38, (255, 255, 0), 1)
    # Green S# hints are cyan structural colors, not verified stump bases.
    for i, candidate in enumerate(cyan_structure_hints or []):
        x, y = round(candidate['x']), round(candidate['y'])
        cv2.drawMarker(out, (x, y), (0, 255, 0),
                       cv2.MARKER_DIAMOND, 16, 2)
        cv2.putText(out, 'S'+str(i+1), (x+6, y+13),
                    cv2.FONT_HERSHEY_SIMPLEX, .38, (0, 0, 0), 2)
        cv2.putText(out, 'S'+str(i+1), (x+6, y+13),
                    cv2.FONT_HERSHEY_SIMPLEX, .38, (0, 255, 0), 1)
    # Anonymous pairs have original centers. Never assign canonical slot IDs.
    for i, pair in enumerate(report['anonymous_pairs']):
        stump = (round(pair['stump']['x']), round(pair['stump']['y']))
        tile = (round(pair['tile']['x']), round(pair['tile']['y']))
        cv2.line(out, stump, tile, (255, 255, 255), 2)
        cv2.circle(out, stump, 8, (0, 255, 255), 2)
        cv2.circle(out, tile, 8, (255, 0, 255), 2)
        cv2.putText(out, 'P'+str(i+1), (stump[0]+7, stump[1]-8),
                    cv2.FONT_HERSHEY_SIMPLEX, .42, (0, 0, 0), 2)
        cv2.putText(out, 'P'+str(i+1), (stump[0]+7, stump[1]-8),
                    cv2.FONT_HERSHEY_SIMPLEX, .42, (255, 255, 255), 1)
    return out


def review(images):
    if not images:
        raise ValueError('At least one image required')
    frames, rows = [], []
    for path in images:
        frame = cv2.imread(str(path))
        if frame is None:
            raise ValueError('Cannot decode '+str(path))
        frame = cv2.resize(frame, (512, 288), interpolation=cv2.INTER_AREA)
        report = frame_audit.analyze(frame)
        bases = base_audit.compare(frame, [], frame_audit.tile_centers(frame))
        marked = annotate(frame, report, bases['brown_base_candidates'],
                          bases['pale_platform_candidates'],
                          bases['cyan_structure_base_hints'])
        cv2.rectangle(marked, (0, 0), (512, 21), (0, 0, 0), -1)
        cv2.putText(marked, 'Image '+str(len(rows)+1)+' / candidate pairs: '+
                    str(len(report['anonymous_pairs'])), (6, 15),
                    cv2.FONT_HERSHEY_SIMPLEX, .42, (255, 255, 255), 1)
        frames.append(marked)
        rows.append({'image_number': len(rows)+1,
                     'filename': Path(path).name,
                     'water_stump_candidates': report['water_stump_candidates'],
                     'color_tile_candidates': report['color_tile_candidates'],
                     'anonymous_pairs': report['anonymous_pairs'],
                     'cyan_structure_hints': [
                         {'candidate_id': 'S'+str(i+1), 'x': p['x'],
                          'y': p['y'],
                          'colored_tile_overlap': p['colored_tile_overlap'],
                          'horizontal_double_edge_score':
                          bases['cyan_hint_edge_profiles'][i].get('horizontal_double_edge_score'),
                          'human_label': 'unreviewed'}
                         for i, p in enumerate(bases['cyan_structure_base_hints'])],
                     'pale_platform_candidates': [
                         {'candidate_id': 'T'+str(i+1), 'x': p['x'],
                          'y': p['y'], 'surrounding_water_ratio':
                          p['surrounding_water_ratio'],
                          'horizontal_double_edge_score':
                          bases['pale_edge_profiles'][i].get('horizontal_double_edge_score'),
                          'human_label': 'unreviewed'}
                         for i, p in enumerate(bases['pale_platform_candidates'])],
                     'brown_candidates': [
                         {'candidate_id': 'B'+str(i+1), 'x': p['x'], 'y': p['y'],
                          'tile_overlap': any(
                              p['x'] == q['x'] and p['y'] == q['y']
                              for q in bases['tile_overlap_candidates']),
                          'human_label': 'unreviewed'}
                         for i, p in enumerate(bases['brown_base_candidates'])],
                     'manual_verified': False})
    cols = 2
    grid = np.zeros((((len(frames)+cols-1)//cols)*288, cols*512, 3),
                    dtype=np.uint8)
    for i, frame in enumerate(frames):
        y, x = divmod(i, cols)
        grid[y*288:(y+1)*288, x*512:(x+1)*512] = frame
    return grid, {
        'images': rows, 'manual_verified': False,
        'slot_ids_verified': False, 'plant_type': 'unknown',
        'production_application': 'forbidden',
        'legend': 'Yellow circle = water-stump candidate; purple = tile candidate; white line = local side pairing; orange B# = brown shape; cyan T# = tan platform shape; green S# = cyan structural hint (colored_tile_overlap is a warning only; all unreviewed). P# and B# are local-only, not map IDs.'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--images', nargs='+', type=Path, required=True)
    parser.add_argument('--sheet', type=Path, required=True)
    parser.add_argument('--json', type=Path, required=True)
    args = parser.parse_args()
    sheet, report = review(args.images)
    if not cv2.imwrite(str(args.sheet), sheet):
        raise ValueError('Cannot write contact sheet')
    args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2)
                         + chr(10), encoding='utf-8')
    print(json.dumps({'images': len(report['images']),
                      'candidate_pairs': sum(len(x['anonymous_pairs'])
                                             for x in report['images'])}))


if __name__ == '__main__':
    main()
