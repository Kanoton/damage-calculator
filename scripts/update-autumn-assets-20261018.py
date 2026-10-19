"""Crop supplied monster skill panels, preserving difficulty-specific thresholds.

Usage: python scripts/update-autumn-assets-20261018.py --screens /path/to/aki
Only the name and skill text are retained; difficulty-dependent stat headers,
player names and story text are excluded from the shared panels.
"""
import argparse
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'M0120_info_1.png': ('20261018081010_1.jpg', 1220),
    'M0120_info_2.png': ('20261018081037_1.jpg', 1220),
    'M0120_info_3.png': ('20261018081047_1.jpg', 1220),
    'M0120_info_4.png': ('20261018081056_1.jpg', 1220),
    'M0121_info_1.png': ('20261018081017_1.jpg', 876),
    'M0122_info_1.png': ('20261018081012_1.jpg', 876),
    'M0123_info_1.png': ('20261018081018_1.jpg', 764),
    'M0123_info_3.png': ('20261018081050_1.jpg', 764),
    'M0005_info.png': ('20261018081020_1.jpg', 1062),
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--screens', required=True)
    args = parser.parse_args()
    source = Path(args.screens)
    for name, (file, bottom) in SOURCES.items():
        image = Image.open(source / file).convert('RGB')
        if image.size != (2560, 1440):
            raise ValueError((file, image.size))
        header = image.crop((1470, 170, 2440, 335))
        skills = image.crop((1470, 440, 2440, bottom))
        result = Image.new('RGB', (970, header.height + skills.height + 12), (35, 35, 35))
        result.paste(header, (0, 0))
        result.paste(skills, (0, header.height + 12))
        result.save(ROOT / 'images/MonsterInfo' / name)
    for number, monster in [(1071, 'M0120'), (1073, 'M0121'), (1072, 'M0122'), (1074, 'M0123')]:
        shutil.copyfile(source / f'UT_Hero_ProfilePhoto_{number}.png', ROOT / f'images/UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_{number}.png')

if __name__ == '__main__':
    main()
