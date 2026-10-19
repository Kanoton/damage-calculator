#!/usr/bin/env python3
"""Build cropped, silent defeat-review videos and lossless snapshots from the supplied ZIP."""
import argparse
import hashlib
import io
import json
import subprocess
import tempfile
import zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/fixtures/screen-reader/defeat/autumn-reviewed-20261019'
CROP = [640, 360, 1600, 760]  # Excludes left player HUD, top notices and bottom hand UI.
BASE = '02e76ebb39d3d50bab395daa09a8dbb1c59c189a'
EXPECTED_ZIP_SHA256 = 'e39ce70e52c1e9e90200c0cf13490ed51892962901314f3919fe3eb52b8e232d'
def sha(data):
    return hashlib.sha256(data).hexdigest()
def run(*args):
    return subprocess.check_output(list(args))
def probe(path, frames=False):
    return json.loads(run('ffprobe', '-v', 'error', '-select_streams', 'v:0',
        *(['-show_frames', '-show_entries', 'frame=best_effort_timestamp_time'] if frames else ['-show_streams', '-show_format']), '-of', 'json', str(path)))
def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
def build(source_zip):
    assert sha(source_zip.read_bytes())==EXPECTED_ZIP_SHA256, 'This reviewed corpus requires the original 秋幻.zip'
    specs = json.loads((OUT/'review-specs.json').read_text())
    manifest = {'schema_version': 1, 'source_zip_name': '秋幻.zip', 'source_zip_sha256': sha(source_zip.read_bytes()),
        'base_commit': BASE, 'map_id': 'MAP0105', 'map_name': '秋幻の森', 'difficulty': None,
        'playback_multiplier': None, 'boss_defeat_samples': 0, 'full_body_required': False,
        'crop_xywh': CROP, 'audio_removed': True, 'coordinate_system': 'original 2560x1440 pixels, no spatial scaling',
        'labels': 'Human-reviewed snapshots; not per-frame detector predictions or exact event-onset bounds.', 'samples': []}
    (OUT/'videos').mkdir(exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temp, zipfile.ZipFile(source_zip) as archive:
        temp = Path(temp)
        for spec in specs:
            data = archive.read(spec['source']); source = temp/'source.mp4';source.write_bytes(data)
            info = probe(source);stream = info['streams'][0]
            if (stream['width'],stream['height']) != (2560,1440):raise ValueError('Unexpected source geometry')
            pts = [float(f['best_effort_timestamp_time']) for f in probe(source, True)['frames']]
            selected = [i for i,t in enumerate(pts) if spec.get('start_s',0) <= t <= spec.get('end_s',float('inf'))]
            first,last = selected[0],selected[-1]; video = OUT/'videos'/(spec['id']+'.mp4')
            x,y,w,h = CROP
            run('ffmpeg','-y','-v','error','-threads','2','-i',str(source),'-an','-sn','-dn','-map_metadata','-1',
                '-vf',f'select=between(n\\,{first}\\,{last}),crop={w}:{h}:{x}:{y},setpts=PTS-STARTPTS',
                '-fps_mode','vfr','-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(video))
            output_pts = [float(f['best_effort_timestamp_time']) for f in probe(video,True)['frames']]
            if len(output_pts)!=len(selected):raise ValueError('Frames dropped during encoding')
            # Source uses roughly 30fps VFR. Container timebase may quantize by up to one frame.
            if max(abs(a-(pts[b]-pts[first])) for a,b in zip(output_pts,selected)) > .04:raise ValueError('Timestamp drift')
            row = {**{k:v for k,v in spec.items() if k not in ['snapshots','start_s','end_s']},
                'expected_event': 'not_defeat' if spec['route']=='spawn_negative' else 'defeat',
                'source_bytes': len(data), 'source_sha256': sha(data), 'source_dimensions': [2560,1440],
                'source_avg_frame_rate': stream['avg_frame_rate'], 'source_duration_s': float(info['format']['duration']),
                'video': str(video.relative_to(OUT)), 'video_sha256': sha(video.read_bytes()), 'video_bytes': video.stat().st_size,
                'frames': [{'source_index':i,'source_pts_s':pts[i],'clip_pts_s':t} for i,t in zip(selected,output_pts)], 'snapshots': []}
            folder = OUT/'frames'/spec['id'];folder.mkdir(exist_ok=True)
            picked = [min(selected,key=lambda i:abs(pts[i]-t)) for _,t in spec['snapshots']]
            assert picked==sorted(set(picked)), 'Snapshots must be unique and chronological'
            raw = temp/'snapshots';raw.mkdir(exist_ok=True)
            expression = '+'.join(f'eq(n\\,{i})' for i in picked)
            run('ffmpeg','-y','-v','error','-threads','2','-filter_threads','1','-i',str(source),
                '-vf',f'select={expression},crop={w}:{h}:{x}:{y}', '-fps_mode','vfr','-frames:v',str(len(picked)),
                '-c:v','png','-threads','1',str(raw/'%02d.png'))
            for order,((phase,_),index) in enumerate(zip(spec['snapshots'],picked),1):
                im = Image.open(raw/f'{order:02d}.png').convert('RGB');path = folder/(phase+'.webp');im.save(path,format='WEBP',lossless=True,method=4)
                if Image.open(path).convert('RGB').tobytes()!=im.tobytes():raise ValueError('Snapshot encoding changed source pixels')
                row['snapshots'].append({'phase':phase,'source_frame_index':index,'source_pts_s':pts[index],
                    'clip_frame_index':selected.index(index),'clip_pts_s':output_pts[selected.index(index)],
                    'image':str(path.relative_to(OUT)), 'file_sha256':sha(path.read_bytes()), 'rgb_sha256':sha(im.tobytes())})
            manifest['samples'].append(row);print(spec['id'],len(selected),'frames',video.stat().st_size,'bytes',flush=True)
    write_json(OUT/'manifest.json',manifest)
def check():
    m = json.loads((OUT/'manifest.json').read_text())
    assert m['source_zip_sha256']==EXPECTED_ZIP_SHA256
    assert m['crop_xywh']==CROP and m['full_body_required'] is False and m['boss_defeat_samples']==0
    assert len(m['samples'])==10 and sum(s['expected_event']=='defeat' for s in m['samples'])==9
    specs={s['id']:s for s in json.loads((OUT/'review-specs.json').read_text())}
    seen=set()
    for sample in m['samples']:
        assert sample['id'] not in seen;seen.add(sample['id'])
        spec=specs[sample['id']]
        for key in ['source','monster_id','serial','route','occlusion']:assert sample[key]==spec[key], key
        video=OUT/sample['video'];assert sha(video.read_bytes())==sample['video_sha256']
        frames=sample['frames'];assert frames and all(a['source_pts_s']<b['source_pts_s'] for a,b in zip(frames,frames[1:]))
        for snap in sample['snapshots']:
            path=OUT/snap['image'];im=Image.open(path).convert('RGB')
            assert im.size==tuple(CROP[2:]) and sha(path.read_bytes())==snap['file_sha256'] and sha(im.tobytes())==snap['rgb_sha256']
            f=frames[snap['clip_frame_index']];assert f['source_index']==snap['source_frame_index'] and f['source_pts_s']==snap['source_pts_s']
        if sample['expected_event']=='defeat':assert [s['phase'] for s in sample['snapshots']]==['before','gray','beam','after']
    print('ok: 10 silent cropped videos, 9 defeat positives, 1 spawn negative, 41 lossless snapshots and timestamp provenance')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.source:build(args.source)
    elif not args.check:parser.error('--source ZIP or --check is required')
    check()
