# 動画圧縮・姿勢変化のグレー部分見本

既存の確認済み短尺動画をFFmpegの`fps=4`で抽出し、`ScreenReaderVision.normalize`と候補検出の768×355縮小を通した画素から、最大の暗い連結部分の矩形だけを保存したPNG。20枚は全て目視し、該当モンスターの可視部分がグレーであることを確認。全身は不要。光だけ・小さすぎる断片・光が大半を隠す3枚は除いた。

manifestは元の保存動画SHA256、fps=4の0始まり出力番号、縮小後の矩形、種類、手動確認を記録する。画像は全画面ではなく、キャラと重なったままの可視パッチ。プレイヤー名等は含まない。元動画内の全フレームの対応は隣のautumn-reviewed-20261019/manifest.jsonを参照。

生成JSは `python3 scripts/build-screen-reader-defeat-references.py`。CIでは同コマンド`--check`でパッチ画素・元動画ハッシュと生成一致を確認する。これは開発用の既知見本であり、未知動画の正答率の評価ではない。

Chromiumの別成分への分割は隣の`gray-renderer-patches.json`に実ブラウザの部分形状を保存。ブラウザ診断は`node scripts/inspect-defeat-browser.cjs`（PlaywrightのChromium/WebKitが必要）。原画SHA・版・位置を持ち、元のグレーの上側の部分だけでも照合する。
