# 追加Buff素材の受領（2026-11-14）

提供された `UT_Buff.zip` のPNG12枚を `images/UT_Buff/` へ追加。展開後の合計は728,211バイト。元名・元のバイト列を維持し、入力ZIPは変更しない。

- `UT_Buff_1075.png`
- `UT_Buff_130_1.png`
- `UT_Buff_130_Awake.png`
- `UT_Buff_Build_30000_01.png`
- `UT_Buff_Build_30000_02.png`
- `UT_Buff_Build_30005.png`
- `UT_Buff_Dodge.png`
- `UT_Buff_Equal.png`
- `UT_Buff_FightShield.png`
- `UT_Buff_FixedDMG.png`
- `UT_Buff_InvincibleShield.png`
- `UT_Buff_NoFight.png`

基準main `91602e3` に同名ファイルはなく、既存の `images/UT_Buff` 内にも寸法・RGBA画素が完全に同じ別名画像はなかった。全12枚を追加し、既存画像は保持する。PNGのデコード・一意なファイル名・保存前後のSHA-256一致を確認した。パス・寸法・モード・ハッシュは [buff-import.csv](buff-import.csv) に記録している。

今回の依頼範囲は素材のアップロード。効果処理、状態アイコンの自動認識辞書、CSVの参照先、UIへの接続は今回変更しない。画像名だけでゲーム内の正式名称や効果を確定せず、後続の対応で説明や既存の確認記録と照合する。

共有画像追加のため、リポジトリの変更範囲別ルールに従って関連CIを確認してからマージする。アプリの実装を変更する新しいテストは追加しない。最終のCI・公開結果は同PRを参照する。
