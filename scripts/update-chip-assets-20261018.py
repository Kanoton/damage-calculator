"""Extract exact card/token regions from the four supplied update screenshots."""
import argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CASES = [(13, '071348'), (23, '071352'), (54, '071358'), (53, '071405')]

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--screens', required=True)
    args = parser.parse_args()
    for ident, stamp in CASES:
        im = Image.open(Path(args.screens) / f'20261018{stamp}_1.jpg').convert('RGB')
        if im.size != (2048, 1152):
            raise ValueError(f'Unexpected screenshot dimensions for chip {ident}')
        card = next((ROOT / 'images/chip').glob(f'{ident:03d}_*.png'))
        icon = ROOT / 'images/chip_icon' / card.name
        im.crop((101, 185, 455, 718)).save(card)
        im.crop((143, 262, 402, 521)).resize((319, 319), Image.Resampling.LANCZOS).save(icon)
        print(f'Updated chip {ident}: card 354x533, icon 319x319')
