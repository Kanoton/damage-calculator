"""Restore the 16 approved blue building outlines without redrawing map contents."""
from pathlib import Path
import argparse
from functools import lru_cache
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION = ROOT / 'docs/map-event-output/autumn-forest/production'
BLUE = (36, 136, 212, 255)
MAP = ROOT / 'images/Map/Layout_Autumn_Forest.png'
EXPECTED_BLUE_PIXELS = {'Layout_Autumn_Forest.png': 42176, 'Autumn_Normal_01.png': 42176,
                        'Autumn_Normal_03.png': 40136, 'Autumn_Normal_07.png': 36034,
                        'Autumn_Normal_10.png': 42176}
EVENTS = [ROOT / f'images/MapEvent/Autumn_Normal_{step:02}.png' for step in (1, 3, 7, 10)]

@lru_cache(maxsize=1)
def building_overlay():
    base = Image.open(PRODUCTION / 'Autumn_Map_Base.png').convert('RGBA')
    approved = Image.open(PRODUCTION / 'Autumn_Map_Buildings.png').convert('RGBA')
    if base.size != approved.size:
        raise ValueError('Approved maps have different dimensions')
    overlay = Image.new('RGBA', base.size)
    pixels = [(BLUE if before != after else (0, 0, 0, 0))
              for before, after in zip(base.getdata(), approved.getdata())]
    if any(after != BLUE for before, after in zip(base.getdata(), approved.getdata()) if before != after):
        raise ValueError('Approved difference contains more than the blue outlines')
    if sum(pixel[3] > 0 for pixel in pixels) != 42176:
        raise ValueError('Approved building outline mask changed')
    overlay.putdata(pixels)
    return overlay

def add_building_frames(image, unannotated=None):
    image = image.convert('RGBA')
    overlay = building_overlay()
    if image.size != overlay.size:
        raise ValueError('Map dimensions differ from the approved building map')
    mask = overlay.getchannel('A')
    if unannotated is not None:
        difference = ImageChops.difference(image, unannotated.convert('RGBA'))
        changed = difference.getchannel('R')
        for channel in difference.split()[1:]:
            changed = ImageChops.lighter(changed, channel)
        unchanged = changed.point(lambda value: 0 if value else 255)
        mask = ImageChops.multiply(mask, unchanged)
    result = image.copy()
    result.paste(overlay, (0, 0), mask)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    base = Image.open(MAP).convert('RGBA')
    # Existing event annotations win over the blue building outline.
    reference = Image.open(PRODUCTION / 'Autumn_Map_Base.png').convert('RGBA')
    results = [(MAP, base, add_building_frames(base))]
    for path in EVENTS:
        image = Image.open(path).convert('RGBA')
        results.append((path, image, add_building_frames(image, reference)))
    for path, before, after in results:
        if args.check:
            coverage = sum(alpha > 0 and pixel == BLUE for alpha, pixel in
                           zip(building_overlay().getchannel('A').getdata(), before.getdata()))
            if coverage != EXPECTED_BLUE_PIXELS[path.name]:
                raise ValueError(f'Building outline coverage changed: {path}: {coverage}')
            if any(channel.getbbox() for channel in ImageChops.difference(before, after).split()):
                raise ValueError(f'Missing building outlines: {path}')
        else:
            after.save(path)
    print('Validated 16 approved building outlines on the base map and four event maps')

if __name__ == '__main__':
    main()
