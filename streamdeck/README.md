# Stream Deck Mini（3×2）連携

このフォルダの `com.kanoton.damagecalculator.sdPlugin` は、`06a_chara` を開いたブラウザへキー操作を送るローカルプラグインです。Stream Deck 7.1 以降（Windows 10 以降 / macOS 13 以降）で動作する構成です。

## キー配置

|  | 左 | 中央 | 右 |
|---|---|---|---|
| 上段 | 音声入力 ON/OFF | 攻撃時 | 防御時 |
| 下段 | ミッション・イベント | 出現モンスター | チップ |

プラグインは6種類のアクションを提供します。Stream Deckアプリの「Damage Calculator」カテゴリから、それぞれのキーへ上表の順にドラッグしてください。

## インストール

1. ElgatoのCLIをインストールします: `npm install -g @elgato/cli`
2. このフォルダで `streamdeck validate com.kanoton.damagecalculator.sdPlugin` を実行します。
3. `streamdeck pack com.kanoton.damagecalculator.sdPlugin` を実行し、作成された `.streamDeckPlugin` を開いてインストールします。
4. `06a_chara/index.html` をブラウザで開き、Stream Deckのキーを押します。ブラウザのタブを前面にしなくても、起動中のページへ操作を送れます。

プラグインはローカルの `127.0.0.1:17371` で操作イベントを配信します。音声入力はブラウザの音声認識機能を使うため、初回はマイク使用を許可してください。ブラウザに音声認識機能がない場合は画面にその旨を表示します。認識中に「攻撃」「防御」「ミッション」「イベント」「出現モンスター」「チップ」と話してもタブを切り替えられます。

## 動作確認

Stream Deckなしでも、`node com.kanoton.damagecalculator.sdPlugin/plugin.mjs --simulate attack` を実行すると、開いているページに攻撃時への切り替え操作を一度送れます。終了は Ctrl+C です。キー操作が届かない場合、プラグインが起動しているか、ローカルポート17371が利用可能か確認してください。

開発資料: https://docs.elgato.com/streamdeck/sdk/references/manifest/ , https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/

## アイコン更新時の再インストール（Windows）

新しいZIPを展開し、その中の `streamdeck` フォルダをエクスプローラーで開きます。アドレス欄に `cmd` と入力して Enter を押し、以下を順に実行します。

```bat
streamdeck validate com.kanoton.damagecalculator.sdPlugin
streamdeck pack com.kanoton.damagecalculator.sdPlugin
```

生成された `.streamDeckPlugin` ファイルを開いて更新版をインストールします。キー画像が以前のままなら、Stream Deckアプリを再起動し、該当キーを配置し直してください。プラグインのバージョンは `1.0.1.0` です。
