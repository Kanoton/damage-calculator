#!/usr/bin/env python3
"""Offline-only end-to-end sequence of independently found water+stump pots.

No human centers needed, but this only sees visible blue-water pot lookalikes.
Never interpret a missing proposal as occupied, removed, or a known map slot.
Accepts private manifest: {"game":"local-id","video":"/local/replay.mp4",
                           "seconds":[7.9,9.5,10.4,...]}
No game names, video paths or raw images are written to the report.
"""
import argparse
import importlib.util
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent


def load(path, alias):
    spec=importlib.util.spec_from_file_location(alias,HERE/path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


links=load('review-autumn-empty-pot-links.py','empty_links')
sequence=load('review-autumn-pot-sequence.py','private_video_reader')
sessions=load('review-autumn-pot-track-session.py','safe_sessions')


def evaluate_frames(frames, game):
    if not isinstance(game,str) or not game.strip():
        raise ValueError('Game label required')
    if not isinstance(frames,list) or not frames:
        raise ValueError('At least one frame required')
    records=[]
    audit=[]
    previous=None
    for timestamp,bgr in frames:
        if not sessions._valid_timestamp(timestamp):
            raise ValueError('Invalid decoded timestamp')
        # Always detect, even on anchor frames. But the result is not occupied/empty proof.
        proposals=links.pots.propose(bgr)
        event={'game':game,'timestamp_ms':timestamp}
        if previous is not None:
            old_time,old_frame=previous
            pair=links.assess_frames(old_frame,bgr,timestamp-old_time)
            event['continuity']={'status':pair.get('board_status','abstain')}
            event['tracking']={'matched':pair['matched'],'abstained':pair['abstained']}
            audit.append({'from_ms':round(old_time,3),'to_ms':round(timestamp,3),
                          'proposals':len(proposals),'matched_pairs':len(pair['matched']),
                          'abstained':pair['abstained'],'reason':pair['reason']})
        else:
            audit.append({'to_ms':round(timestamp,3), 'proposals':len(proposals),
                          'reason':'anchor-only'})
        records.append(event)
        previous=(timestamp,bgr)
    session=sessions.run(records)
    return {'frames':session['frames'],'segments':session['segments'],
            'candidate_observations':session['candidates'],
            'frame_audit':audit,'events':session['events'],
            'note':('Research-only visible-water-pot track; camera jumps and missing crops '
                    'abstain. No slot identification, plant classification, occupancy '
                    'inference or UI updates.')}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    data=json.loads(args.manifest.read_text(encoding='utf-8'))
    report=evaluate_frames(sequence.read_video(data['video'],data['seconds']),data['game'])
    args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({x:report[x] for x in ('frames','segments','candidate_observations')}))


if __name__=='__main__':main()
