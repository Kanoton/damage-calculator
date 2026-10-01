# 06b_chara

06a_chara の動作を維持したまま、保守性を改善するために JavaScript を責務別に分割した版です。

## JavaScript 構成

- js/calculator.js: ダメージ計算、カード確率計算、攻撃/防御UI
- js/map-utils.js: CSV解析、マップ用共通関数
- js/map-data.js: file:// 起動時に使用するマップ系フォールバックデータ
- js/map.js: マップ、モンスター、イベント、ミッション、ラウンド管理
- js/character.js: キャラクター、チップ、状態・能力管理とフォールバックデータ
- streamdeck.js: Stream Deck 連携

CSV と画像の正本は従来どおりリポジトリ直下の ../csv/ と ../images/ を参照します。

06a_chara は比較・ロールバック用として変更しません。
