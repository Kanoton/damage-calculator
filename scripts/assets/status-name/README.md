# Offline character-name dictionary fonts

These build-only subset contains the characters in `csv/character_stats.csv`.
The browser uses generated masks, does not load fonts or contact an OCR service.

- Noto Sans JP: Google Fonts `ofl/notosansjp/NotoSansJP[wght].ttf`, instantiated at weight 900, then subset with fontTools.
- Sources retrieved 2026-10-17 from https://github.com/google/fonts . OFL licenses are included alongside the subsets.

When adding a character whose glyphs are absent, regenerate the subsets from these sources before rebuilding the dictionary. Pillow is sufficient for normal `--check` runs; fontTools is only needed to recreate font subset.
