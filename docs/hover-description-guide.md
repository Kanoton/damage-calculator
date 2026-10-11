# 07 ボタン・スタックの説明文調整ガイド

現時点では、自キャラ・PT・モンスターの全ボタン／スタックと実際のマウスオーバー文を網羅した統合一覧はありません。以下は既存資料と実装の参照表です。正本は最新mainの07_skillです。

| 対象 | 参照先 | 内容・注意 |
| --- | --- | --- |
| キャラクター一覧の能力説明 | `csv/character_skills.csv` | キャラクターごとのスキル・パッシブ全文。個別の操作ボタン説明とは別 |
| 状態名・入力形式・アイコン | `csv/status_icon_map_all.csv` | 状態対応表。実際に表示する条件や全文説明の一覧ではない |
| 自キャラの固有操作 | `07_skill/js/character-ability-rules.js` | controlsのkey/type/options/placementと効果。internal等は画面に表示しない |
| ボタン・スタックの共通説明 | `07_skill/js/character-view.js` | オン／オフ・左クリック／右クリック等のtitle生成 |
| 自キャラ・受領PT効果の個別説明 | `07_skill/js/character.js` | 表示条件、PT由来操作、個別title追記・置換 |
| モンスターの状態操作 | `07_skill/js/roster-view.js`、`07_skill/js/map.js` | 状態編集UIと表示条件 |
| キャラクター説明の表示調整 | `07_skill/js/character-view.js`、`07_skill/js/character-skill-tooltip.js` | 07限定の見出し・文面調整を含む。CSV全文と表示が必ずしも同一ではない |

説明文の一覧を整備する場合は「キャラクター／自キャラ・PT・モンスター／表示条件／ボタン・スタック名／現在の説明文／変更後の説明文」を分けて記録してください。動的なオン／オフ・値の部分と固定説明を区別し、画面上の表示条件を実装から照合します。説明変更だけで計算ルールや08を変更しません。
