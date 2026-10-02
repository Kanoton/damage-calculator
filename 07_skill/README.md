# 07_skill

> 今後の追加・変更作業では、最初に [WORKING_GUIDE.md](../WORKING_GUIDE.md) を参照してください。構成、変更ルール、データの正本、テスト手順をまとめています。

直前の作業フォルダを基に、キャラクター固有スキルの状態管理とステータス補正を追加する版です。

## JavaScript 構成

- js/calculator.js: ダメージ計算、カード確率計算、攻撃/防御UI
- js/map-utils.js: CSV解析、画像パス検証、ギミック計算などのマップ用共通関数
- js/map-data.js: file:// 起動時のマップ系フォールバックデータと固定設定
- js/roster-utils.js: Roster状態生成・モンスター追加・表示名・能力更新の共通処理
- js/roster-view.js: Rosterカード・能力値入力・召喚スキルなどのDOM部品生成（状態変更はコールバックで分離）
- js/map-missions.js: ミッションカウンターの表示・操作
- js/map-events.js: イベントキー、実行済み表示、イベント出現内容の検証・組み立て
- js/map-gimmick-view.js: マップ固有ギミック・特殊操作ボタンのDOM生成
- js/map.js: マップ、モンスター、イベント、ラウンド管理（Roster状態は rosterState に集約）
- js/character-data.js: file:// 起動時に使用するキャラクター・チップ系フォールバックデータ
- js/character-ability-rules.js: キャラクター固有能力の操作形式・補正・ターン終了効果
- js/character-view.js: キャラクター・チップ・条件UIのDOM生成
- js/character-data-loader.js: キャラクター系CSV取得・パース・フォールバック選択
- js/number-pad.js: 数値入力テンキー制御
- js/character-tabs.js: キャラクター画面のタブ操作
- js/character-skill-tooltip.js: スキルツールチップ制御
- js/character.js: キャラクター、チップ、状態・能力管理
- streamdeck.js: Stream Deck 連携

CSV と画像の正本は従来どおりリポジトリ直下の ../csv/ と ../images/ を参照します。
