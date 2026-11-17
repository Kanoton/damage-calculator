#!/usr/bin/env python3
"""Offline replay sampler for research-only three-pot cross-frame audit.

Runs existing independent per-frame five-icon/three-pot detector on a video.
Never stores frames, never infers verified slot IDs, never updates the UI.
A positive result requires at least two separately detected suitable frames;
synthetic transformations of one frame are not independent observations.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path

import cv2

HERE=Path(__file__).resolve().parent


def load(filename,alias):
    spec=importlib.util.spec_from_file_location(alias,HERE/filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


offsets=load('review-autumn-pot-tile-offsets.py','pot_offsets_video')
cross=load('review-autumn-pot-cross-frame.py','pot_cross_video')


def sample(video,topology,step_s=0.5,max_frames=200):
    if not isinstance(step_s,(int,float)) or not math.isfinite(step_s) or step_s<0.2:
        raise ValueError('step_s must be finite and >= 0.2')
    if not isinstance(max_frames,int) or not 1<=max_frames<=500:
        raise ValueError('max_frames must be between 1 and 500')
    cap=cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise ValueError('Could not open replay')
    try:
        fps=float(cap.get(cv2.CAP_PROP_FPS))
        count=float(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if not math.isfinite(fps) or fps<=0 or not math.isfinite(count) or count<=0:
            raise ValueError('Invalid replay frame rate or length')
        duration=count/fps
        frames=[]
        suitable=[]
        observed_frame_indices=set()
        duplicate_frame_indices=0
        failed_frame_indices=[]
        for i in range(min(max_frames,int(math.ceil(duration/step_s)))):
            requested=i*step_s
            if requested>=duration:
                break
            # Frame index avoids codec-specific CAP_PROP_POS_MSEC seeking behavior.
            target_index=int(round(requested*fps))
            if target_index in observed_frame_indices:
                duplicate_frame_indices+=1
                frames.append({'time_s':round(requested,3),'status':'abstain',
                               'reason':'duplicate-video-frame-index'})
                continue
            observed_frame_indices.add(target_index)
            if not cap.set(cv2.CAP_PROP_POS_FRAMES,target_index):
                failed_frame_indices.append(target_index)
                frames.append({'time_s':round(requested,3),'status':'abstain',
                               'reason':'video-frame-seek-failed'})
                continue
            ok,frame=cap.read()
            if not ok or frame is None:
                failed_frame_indices.append(target_index)
                frames.append({'time_s':round(requested,3),'status':'abstain',
                               'reason':'frame-decode-failed'})
                continue
            resized=cv2.resize(frame,(512,288),interpolation=cv2.INTER_AREA)
            result=offsets.analyze(resized,topology)
            entry={'time_s':round(target_index/fps,3),'frame_index':target_index,
                   'status':result['status']}
            if result['status']=='abstain':
                entry['reason']=result.get('reason','unspecified')
            else:
                suitable.append({'time_s':round(target_index/fps,3),'result':result})
            frames.append(entry)
        if failed_frame_indices:
            verdict={'status':'abstain','reason':'sampled-frame-unreadable'}
        elif len(suitable)<2:
            verdict={'status':'abstain','reason':'not-enough-independent-positive-frames'}
        else:
            # Compare all independently positive frames; never cherry-pick the
            # best-looking pair after observing inconsistent frames.
            verdict=cross.assess(suitable)
        return {'status':verdict['status'],'verdict':verdict,
                'frames_sampled':len(frames),'suitable_frames':len(suitable),
                'duplicate_frame_indices':duplicate_frame_indices,
                'unreadable_frame_indices':failed_frame_indices,
                'video_duration_seconds_estimate':round(duration,3),
                'sampled_through_seconds_estimate':(frames[-1]['time_s'] if frames else None),
                'full_video_covered':bool(frames and
                    (frames[-1]['time_s']+step_s>=duration-1/fps)),
                'frame_audit':frames,
                'caution':'Research only; selected replay, no ground-truth IDs or plant labels',
                'production_application':'forbidden'}
    finally:
        cap.release()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--video',type=Path,required=True)
    p.add_argument('--topology',type=Path,required=True)
    p.add_argument('--step-seconds',type=float,default=0.5)
    p.add_argument('--max-frames',type=int,default=200)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    topology=json.loads(args.topology.read_text(encoding='utf-8'))
    report=sample(args.video,topology,args.step_seconds,args.max_frames)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status'],
                      'frames_sampled':report['frames_sampled'],
                      'suitable_frames':report['suitable_frames']}))


if __name__=='__main__':
    main()
