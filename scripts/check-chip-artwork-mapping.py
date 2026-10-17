"""Validate reviewed artwork links; assign rarity from existing token rings.

The source-art number is not a chip ID. Artwork links are visually reviewed;
only rarity is classified automatically. No rarity is inferred from effects.
"""
import argparse
import csv
import io
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RARITIES = [('blue', '水色'), ('purple', '紫色'), ('gold', '金色')]


def ring_rarity(path):
    im = Image.open(path).convert('RGB').resize((96, 96), Image.Resampling.BILINEAR)
    votes = [0, 0, 0]
    for y in range(96):
        for x in range(96):
            # Keep the ring, excluding the illustration and the gray outer rim.
            if not 34**2 < (x - 47.5)**2 + (y - 47.5)**2 < 44**2:
                continue
            r, g, b = im.getpixel((x, y))
            votes[0] += int(b > 150 and g > 90 and r < 110)
            votes[1] += int(r > 135 and b > 150 and g < 105)
            votes[2] += int(r > 165 and g > 120 and b < 120)
    ranked = sorted(votes, reverse=True)
    if ranked[0] < 100 or ranked[0] < ranked[1] * 2:
        raise ValueError(f'Ambiguous rarity ring: {path.name}: {votes}')
    return RARITIES[votes.index(ranked[0])]


def validate(assign=False):
    with (ROOT / 'csv/chip_list.csv').open(encoding='utf-8-sig') as f:
        chips = {r['id']: r for r in csv.DictReader(f, delimiter='\t')}
    path = ROOT / 'csv/chip_artwork_mapping.csv'
    with path.open(encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter='\t')
        fields, rows = reader.fieldnames, list(reader)
    ids, identities = set(), set()
    for row in rows:
        ident = row['chip_id']
        if ident not in chips or ident in ids:
            raise ValueError(f'Unknown or repeated chip ID: {ident}')
        ids.add(ident)
        chip = chips[ident]
        if row['chip_name'] != chip['name']:
            raise ValueError(f'Chip name differs from canonical list: {ident}')
        filename = row['artwork_file']
        if Path(filename).name != filename or not filename.startswith('UT_Relic_') or not filename.endswith('.png'):
            raise ValueError(f'Invalid artwork filename: {filename}')
        with Image.open(ROOT / 'images/UT_Relic' / filename) as im:
            im.verify()
        rarity, color = ring_rarity(ROOT / 'images/chip_icon' / chip['images'])
        if assign:
            row.update(rarity=rarity, rarity_color=color)
        elif (row['rarity'], row['rarity_color']) != (rarity, color):
            raise ValueError(f'Rarity differs from canonical token ring: {ident}')
        key = (filename, rarity)
        if key in identities:
            raise ValueError(f'Ambiguous artwork + rarity pair: {key}')
        identities.add(key)
    if ids != set(chips):
        raise ValueError(f'Missing chip IDs: {set(chips) - ids}')
    if assign:
        out = io.StringIO(newline='')
        writer = csv.DictWriter(out, fieldnames=fields, delimiter='\t', lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)
        path.write_text(out.getvalue(), encoding='utf-8')
    used = {r['artwork_file'] for r in rows}
    unused = {p.name for p in (ROOT / 'images/UT_Relic').glob('*.png')} - used
    print(f'Validated {len(rows)} chips / {len(used)} artworks; rarity: {dict(Counter(r["rarity"] for r in rows))}')
    print(f'Unmapped artwork files ({len(unused)}): {", ".join(sorted(unused)) or "none"}')
    return rows


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assign-rarity', action='store_true', help='update rarity/color from token rings')
    args = parser.parse_args()
    validate(args.assign_rarity)
