"""Recover the four approved cards from the archived, full-resolution summary."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if __name__ == '__main__':
    source = ROOT / 'docs/map-event-output/autumn-forest/production/summaries/Vertical/Autumn_Forest_Normal_Summary_02_20261015.png'
    image = Image.open(source)
    if image.size != (2240, 3329):
        raise ValueError('Unexpected source summary dimensions')
    target = ROOT / 'images/MapCard'
    target.mkdir(exist_ok=True)
    for left, name in [(114, 'Haste_Mushroom'), (634, 'Starfruit'), (1153, 'Peach'), (1672, 'Fortune_Tree')]:
        image.crop((left, 375, left + 458, 1046)).save(target / f'Autumn_{name}.png')
