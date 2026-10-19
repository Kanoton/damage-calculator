# pic.zip の画像確認・整理（2026-10-20）

利用者の指定により、同名ファイルはスキップし、別名の同一画像は今回の名前を正本にする。今回は画像と参照先の整理のみ。自キャラ／PTの照合辞書、戦闘対象の追跡、撃破判定、タブ自動切替は変更しない。

| 素材 | 受領 | 同名スキップ | 新規追加 | 整理後のフォルダ内PNG |
|---|---:|---:|---:|---:|
| UT_Hero_ProfilePhoto | 201 | 194 | 7 | 201 |
| UT_Hero_Card2 | 205 | 176 | 29 | 211 |
| 合計 | 406 | 370 | 36 | 412 |

同名370枚はすべてファイルSHA256も一致。ZIPの内容で上書きしていない。新規36枚はZIP内の元バイトをそのまま保存した。ZIPのSHA256、新規画像の寸法・RGBA画素ハッシュ・ファイルハッシュ・追加一覧は [機械可読の確認記録](hero-image-import-20261020.json) に保存している。全406枚をデコードして確認した。

## 重複を移行した4件

2フォルダだけでなく、images配下の別フォルダも照合した。下記はファイルのバイト列まで一致していたため、今回のProfilePhotoを正本とし、旧ファイルを削除した。

| 削除した旧ファイル | 正本（images/からのパス） |
|---|---|
| Monster/M0120_Icon.png | UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_1071.png |
| Monster/M0121_Icon.png | UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_1073.png |
| Monster/M0122_Icon.png | UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_1072.png |
| Monster/M0123_Icon.png | UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_1074.png |

`csv/monster_stats.csv` と秋幻の制作データ内の同CSV、07/08の同梱map-dataを移行した。既存の画像解決がMonsterフォルダを基準にするため、image列は `../UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_1071.png` のように指定し、HTTP/file://とも同じ正本へ解決する。数値・能力本文・並び・その他のCSV列は変更していない。秋素材の生成スクリプトも同じ保存先へ更新し、旧コピーを再作成しない。旧名を動的に組み立てていた秋の描画スクリプトも、正本CSVの画像パスを参照するように移行した。承認済みの地図・イベント画像は再生成しない。

その他の別名画像では、サイズと表示RGBA画素まで一致する重複はなかった。透明画素のRGBは表示に影響しないため0へ正規化して比較した。似た構図のSFW差分も縮小比較し、部分的な描画差のあるものは別画像として保持した。今回のZIPにない既存6枚（109_Max_2と、前回追加の全身Card_113_04／117_04／119_03の5枚）は別画像なので保持する。ZIPにないことだけで削除しない。

## 辞書登録の保留

新規ProfilePhoto7枚は `images/UT_Hero_ProfilePhoto/pending-images.json` にハッシュ付きの未登録素材として記録する。既存の対応表194枚と、この保留7枚でフォルダ内201枚を網羅する。保留画像は対応表と重複できず、ファイル不足・ハッシュ変更・一覧外の画像は検証エラーにする。

`csv/mini_character_mapping.csv`、同梱mini-character-mapping-data、全screen-reader参照辞書は変更していない。画像を置いただけで認識対象が増えることはない。将来の辞書登録時は、利用者の依頼で実画面を確認し、保留一覧から外して対応表・照合見本を整備する。

## 確認

- ZIPの406枚と既存376枚のデコード・同名比較、別フォルダの同一画像照合、類似画像の確認。
- 旧4画像から新しい参照先までのバイト一致、削除後の旧参照検索、全モンスター画像のファイル存在確認。
- CSV全295行のimage以外の列・能力本文・並びが変更前と一致。
- `python3 scripts/build-mini-character-mapping.py --check` と `python3 scripts/build-screen-reader-profile-references.py --check` で保留在庫と従来の照合データの一致を確認。
- `npm run check:07`／`npm run check:08` で同梱データと実読み込み順の構文を確認。HTTP/file://の秋4難易度の画像読み込みは既存の両ブラウザ回帰で確認する。08 CIへ07の秋データテストのWebKit実行も追加し、実際の07/08の両方で共有画像を確認する。最終CI結果は同PRを参照。
