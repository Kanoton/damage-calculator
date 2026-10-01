// ===== キャラクター・チップ一覧 =====
// Direct-file fallback; web hosting reads the CSV files.
const CHARACTER_CSV_SNAPSHOT = {"characters":"﻿id,name,images,list_img,initial_coin,lv1_coin_bonus,lv0_hp,lv0_atk,lv0_def,lv0_move,lv1_hp,lv1_atk,lv1_def,lv1_move,lv2_hp,lv2_atk,lv2_def,lv2_move,lv3_hp,lv3_atk,lv3_def,lv3_move\r\n1,ミミ,Mimi_Main.png,001_ミミ.png,12,10,9,1,1,0,11,1,1,0,11,1,1,0,11,2,2,1\r\n2,パルナン,Parunan_Main.png,002_パルナン.png,12,10,10,1,2,0,12,1,2,0,12,1,2,0,12,2,3,1\r\n3,ファニィ,Fanny_Main.png,003_ファニィ.png,12,10,10,1,2,0,11,1,2,0,11,1,2,0,11,2,3,1\r\n4,アランナ,Alana_Main.png,004_アランナ.png,6,0,9,1,1,0,11,2,1,0,11,4,1,0,11,5,2,2\r\n5,コマチ,Komachi_Main.png,005_コマチ.png,12,0,9,1,1,0,11,2,1,0,11,2,1,0,11,3,2,1\r\n6,パッドマン,Padman_Main.png,006_パッドマン.png,6,0,9,2,2,0,11,3,2,0,11,5,2,0,11,6,2,2\r\n7,パパラ,Papara_Main.png,007_パパラ.png,6,0,10,2,1,0,11,3,1,1,11,5,1,1,11,6,1,3\r\n8,レン,Ren_Main.png,008_レン.png,12,10,8,2,1,0,10,2,1,0,10,2,1,0,10,3,2,1\r\n9,Z3000,Z3000_Main.png,009_Z3000.png,6,0,10,1,2,0,12,2,2,0,12,4,2,0,12,5,2,2\r\n10,パンダマン,Pandaman_Main.png,010_パンダマン.png,6,0,14,1,0,0,16,1,1,0,17,1,1,1,17,2,2,2\r\n11,ルル,Lulu_Main.png,011_ルル.png,12,0,9,2,2,0,11,2,3,0,11,2,3,0,11,3,4,1\r\n12,ヒメ,Fen_Main.png,012_ヒメ.png,6,0,10,1,0,0,12,1,1,0,12,2,1,1,12,3,2,2\r\n13,カイセイ,HaiQing_Main.png,013_カイセイ.png,12,10,10,1,1,0,12,1,1,0,12,2,1,0,12,2,2,1\r\n14,ミサキ,Misaki_Main.png,014_ミサキ.png,6,0,9,0,2,0,11,1,2,0,11,3,2,0,11,4,2,2\r\n15,ナーディス,Nardis_Main.png,015_ナーディス.png,12,0,9,1,1,0,11,2,1,0,11,2,1,0,11,3,2,1\r\n16,ジャスミン,Jasmine_Main.png,016_ジャスミン.png,6,0,9,1,0,0,11,2,0,1,11,4,0,1,11,5,0,2\r\n17,ルカ,Luka_Main.png,017_ルカ.png,6,0,9,1,2,0,11,2,2,0,11,4,2,0,11,5,2,2\r\n18,ナンシーロー,Nancy_Lu_Main.png,018_ナンシーロー.png,6,0,9,1,1,0,11,2,1,0,11,4,1,0,11,6,1,1\r\n19,メガス,Megas_Main.png,019_メガス.png,12,0,9,0,2,0,11,0,3,0,11,0,3,0,11,1,4,1\r\n20,ユメ,Zhao_Main.png,020_ユメ.png,12,0,10,1,1,0,12,1,2,0,12,1,2,0,12,2,3,1\r\n21,アル,A.L._Main.png,021_アル.png,12,0,9,1,1,0,11,2,1,0,11,2,1,0,11,3,2,1\r\n22,リン,Rin_Main.png,022_リン.png,12,10,9,1,1,0,11,1,1,0,11,1,1,0,11,2,2,1\r\n23,テル,Teru_Main.png,023_テル.png,12,0,9,2,1,0,11,3,1,0,11,3,1,0,11,4,2,1\r\n24,モーゼス,Moses_Main.png,024_モーゼス.png,6,0,11,1,1,0,13,2,1,0,13,4,1,0,13,5,1,2\r\n25,真夢梓,Mamushi_Main.png,025_真夢梓.png,12,0,9,2,1,0,11,3,1,0,11,3,1,0,11,4,2,1\r\n26,スミカゲ,InkShadow_Main.png,026_スミカゲ.png,6,0,10,2,1,0,12,3,1,0,12,5,1,0,12,6,1,2\r\n27,ボニー,Bonnie_Main.png,027_ボニー.png,12,0,9,2,1,0,11,3,1,0,11,3,1,0,11,4,2,1\r\n28,リンリン,LingLing_Main.png,028_リンリン.png,6,0,10,2,2,0,12,3,2,0,12,4,2,1,12,5,3,2\r\n29,サイクス,Sykes_Main.png,029_サイクス.png,12,0,9,0,2,0,11,0,3,0,11,0,3,0,11,1,4,1\r\n101,超てんちゃん,KAngel_Main.png,101_超てんちゃん.png,12,10,9,0,1,0,11,0,1,0,11,0,1,0,11,1,2,1\r\n102,あめちゃん,Ame_Main.png,102_あめちゃん.png,6,0,9,1,4,0,11,2,4,0,11,4,4,0,11,5,4,2\r\n103,ジル,Jill_Main.png,103_ジル.png,12,10,10,1,1,0,12,1,1,0,12,1,1,0,12,2,2,1\r\n104,ドロシー,Dorothy_Main.png,104_ドロシー.png,12,0,8,1,0,0,10,1,1,0,10,1,1,0,10,2,2,1\r\n105,遠野ハンナ,Hanna_Main.png,105_遠野ハンナ.png,12,10,9,1,2,0,11,1,2,0,11,1,2,0,11,2,3,1\r\n106,橘シェリー,Sherry_Main.png,106_橘シェリー.png,12,0,10,2,1,0,12,3,1,0,12,3,1,0,12,4,2,1\r\n","chips":"id\tname\timages\tcategory\teffect\r\n1\tボクシンググローブ-初級\t001_ボクシンググローブ-初級.png\t共通\t攻撃力+1。\r\n2\tボクシンググローブ-中級\t002_ボクシンググローブ-中級.png\t共通\t攻撃力+2。\r\n3\tボクシンググローブ-上級\t003_ボクシンググローブ-上級.png\t共通\t攻撃力+5。\r\n4\tスピードローラースケート-初級\t004_スピードローラースケート-初級.png\t共通\t移動力+1。\r\n5\tスピードローラースケート-中級\t005_スピードローラースケート-中級.png\t共通\t移動力+2。\r\n6\tスピードローラースケート-上級\t006_スピードローラースケート-上級.png\t共通\t移動力+4。\r\n7\tサンドクッキー-普通\t007_サンドクッキー-普通.png\t共通\tHP上限+2。\r\n8\tサンドクッキー-なかなか\t008_サンドクッキー-なかなか.png\t共通\tHP上限+3。\r\n9\tサンドクッキー-ウマすぎ\t009_サンドクッキー-ウマすぎ.png\t共通\t最大HP+3。追加の最大HP2につき、攻撃力+1。\r\n10\tヘルメット-一般\t010_ヘルメット-一般.png\t共通\t防御力+1。\r\n11\tヘルメット-普通\t011_ヘルメット-普通.png\t共通\t防御力+2。\r\n12\tヘルメット-高級\t012_ヘルメット-高級.png\t共通\t防御力+3。\r\n13\t砥石\t013_砥石.png\t共通\tHPが50%未満の時、攻撃力+4、受けるダメージ-1。\r\n14\tアドレナリン注射液-高効率\t014_アドレナリン注射液-高効率.png\t共通\tHPが半分以下時、攻撃力+8、反撃無効を得る。\r\n15\tエクストラ-バッテリー\t015_エクストラ-バッテリー.png\t共通\tCT-1。\r\n16\t会員推薦状\t016_会員推薦状.png\t共通\tラウンドボーナスカード+1、ショップのカード価格-1。\r\n17\tビッグバッグ\t017_ビッグバッグ.png\t共通\tカード使用数+1。\r\n18\tマジックトーム\t018_マジックトーム.png\t共通\tカード3枚使うごとに、その3枚目に使ったカードを手札に加える。\r\n19\tスマートウォッチ\t019_スマートウォッチ.png\t共通\tターン終了時、手札数が5より少ない場合、カード1枚を得る。\r\n20\t豚の貯金箱\t020_豚の貯金箱.png\t共通\t効果カードを2枚使うごとに、コイン+3。\r\n21\t優雅の羽\t021_優雅の羽.png\t共通\t回避成功時、攻撃力+1（最大4スタック）。\r\n22\t探天衛星\t022_探天衛星.png\t共通\t全ての効果カードの効果距離+3。ターン終了時、手札が6より少ない場合、軌道レールキャノンを1枚得る。\r\n23\tしおり\t023_しおり.png\t共通\t効果カードダメージ+1。\r\n24\t循環往来\t024_循環往来.png\t共通\t強化チップの再抽選回数を3回獲得する。3ターン後、強化チップを選択し、1個獲得する。\r\n25\t懐中電灯-強光\t025_懐中電灯-強光.png\tコイン\tモンスターへの攻撃時、【コイン】が4スタックにつき、自身の攻撃力+1。モンスターにヒット後、【コイン】を1スタック獲得する。\r\n26\tキャッシュカード-残高少ない\t026_キャッシュカード-残高少ない.png\tコイン\t【コイン】スタック+4。\r\n27\tキャッシュカード-残高多い\t027_キャッシュカード-残高多い.png\tコイン\t【コイン】スタック+7。\r\n28\tキャッシュカード-アンリミテッド\t028_キャッシュカード-アンリミテッド.png\tコイン\t【コイン】スタック+3、全キャラクターのラウンドボーナス+3。\r\n29\t8面ダイス\t029_8面ダイス.png\tコイン\tダイスの出目が8の場合、スターコイン+8。ダイスの累計出目が8につき、【コイン】スタック+1。\r\n30\tATM\t030_ATM.png\tコイン\t振り込み時、自身と対象は同時に1【コイン】とスターコイン1枚を獲得する。\r\n31\tスターコインハンマー\t031_スターコインハンマー.png\tコイン\t5【コイン】を獲得する。攻撃時、現在の所持スターコインが20より多い場合、現在所持しているスターコインの30%分の攻撃力を追加で獲得し、その後6スターコインを消費する。\r\n32\t紫色の飛星\t032_紫色の飛星.png\tコイン\tモンスターを見逃した時、そのモンスターに1ダメージを与え、【コイン】を1スタック獲得する。\r\n33\t金色の飛星\t033_金色の飛星.png\tコイン\tモンスターを見逃した時、そのモンスターに2ダメージを与え、【コイン】を1スタック獲得する。対象がボスの場合、【コイン】のスタック数分の追加ダメージを与える。\r\n34\t手持ち扇風機-小\t034_手持ち扇風機-小.png\tマーク\tスキル使用後、6マス以内のモンスターに【マーク】1つ付与。\r\n35\tスプレー缶\t035_スプレー缶.png\tマーク\t効果カードでモンスターにダメージを与えた後、目標モンスターに【マーク】を1つ付与。\r\n36\tスタンダードサイト\t036_スタンダードサイト.png\tマーク\t攻撃力+2。攻撃時、目標に【マーク】を一つ付与。\r\n37\tイーグルアイ\t037_イーグルアイ.png\tマーク\t攻撃時、目標に【マーク】を1つ付与し、攻撃目標の【マーク】スタック数の二倍の攻撃力上昇。\r\n38\t忍術手裏剣\t038_忍術手裏剣.png\tマーク\tカード使用数+1、ダメージ系効果カードを使用した場合、目標モンスターに【マーク】スタック数と同じ数のダメージを与える。\r\n39\t標的\t039_標的.png\tマーク\t攻撃力+1。ターン開始時、4マス以内で最も近いモンスターに【マーク】スタックを1付与する。\r\n40\t魔法の矢袋\t040_魔法の矢袋.png\tマーク\t【マーク】されたモンスターに対してカードを使用した場合、使用したカードを手札に戻し、目標のモンスターに【マーク】を1つ付与（1ターンに1度）。\r\n41\t手持ち扇風機-大\t041_手持ち扇風機-大.png\tマーク\tスキル使用後、カードを1枚獲得、6マス以内のモンスターに【マーク】1つ付与。\r\n42\tカッターナイフ-ベーシック\t042_カッターナイフ-ベーシック.png\tヒール\tHPが満タン時、攻撃力+2、それに加えて攻撃時に【ヒール】スタック数と同じ数の攻撃力が上昇。\r\n43\tカッターナイフ-シャープ\t043_カッターナイフ-シャープ.png\tヒール\tHPが満タン時、攻撃力+4、それに加えて攻撃時に【ヒール】スタック数と同じ数の攻撃力が上昇。\r\n44\t救急箱-緊急治療\t044_救急箱-緊急治療.png\tヒール\tターン開始時、【ヒール】スタック+1。\r\n45\t救急箱-完備治療\t045_救急箱-完備治療.png\tヒール\tターン開始時、【ヒール】スタック+3。\r\n46\tビタミン剤\t046_ビタミン剤.png\tヒール\tカードを獲得するたび、【ヒール】スタック+1。\r\n47\tおいしいキャンディー\t047_おいしいキャンディー.png\tヒール\tカードを使用した後、【ヒール】を1スタック獲得する。カードを使用した後、HPが満タンの場合、このターンのカード使用数+1（毎ターン最大1回発動）\r\n48\tトンポーロウ\t048_トンポーロウ.png\tヒール\tターン開始時、周囲5マス以内の全員の【ヒール】スタック+1、HP+1。\r\n49\tバッファーシールド\t049_バッファーシールド.png\tヒール\t攻撃を受けるたび、【ヒール】スタック+2、スターコイン+3。\r\n50\t友情バッジ\t050_友情バッジ.png\tヒール\t味方に治療や振り込みを行った際に、味方と同時に【ヒール】スタック+2。\r\n51\tエネルギー回収\t051_エネルギー回収.png\tチャージ\tダイスの出目が5貯まるごとに、【チャージ】を2獲得する。【チャージ】が5より大きい時、移動力+1。\r\n52\tエナジーソード\t052_エナジーソード.png\tチャージ\t攻撃命中ごとに【チャージ】を2獲得する。【チャージ】が7より大きい時、攻撃力+2。\r\n53\tワープエンジン\t053_ワープエンジン.png\tチャージ\t突撃ゲートまたは疾走マスに止まった時、【チャージ】を2獲得し、次の移動時に移動力+2。\r\n54\t電撃グローブ\t054_電撃グローブ.png\tチャージ\t効果カードを使用した時、【チャージ】を2スタック獲得する。ターン終了時、チャージを4消費して、自身から2マス以内の全モンスターに2ダメージを与える。\r\n55\tエアバッグ\t055_エアバッグ.png\tチャージ\t現在HPを超えるダメージを受ける場合、【チャージ】を6消費してそのダメージを0にする。ダメージを受けた後、【チャージ】を1獲得する。\r\n56\tライトニングコア\t056_ライトニングコア.png\tチャージ\tスキル使用後、このターンのカード使用数+1、【チャージ】を5消費し、スキルのCT-1。\r\n57\t永久機関\t057_永久機関.png\tチャージ\t移動力+2。ターン開始時、自身の【チャージ】が6未満の場合、【チャージ】を6にする。\r\n58\tレールガン\t058_レールガン.png\tチャージ\t攻撃力+2。モンスターに挑戦した後、【チャージ】を4消費して、対象がいるマスの全モンスターに現在の攻撃力の50%分のダメージを与える。\r\n101\tギガントアンカー\t101_ギガントアンカー.png\tMAP0001\tダメージを受けるたびに、攻撃力+1。ターン開始時、このチップによる攻撃力ボーナス-1。\r\n102\tトライデント\t102_トライデント.png\tMAP0001\tスキル使用時、味方キャラ1名に攻撃力+1、防御力+1。（この効果は単体対象に重複発動しない）\r\n103\t夢想号プラモデル\t103_夢想号プラモデル.png\tMAP0001\t移動力+2。ダイスの出目累計15ごとに、スキルCT-1。\r\n111\t呪いの剣\t111_呪いの剣.png\tMAP0002\t呪い：モンスターを撃破するたびに、攻撃力+1を得る。\r\n112\t復讐の戟\t112_復讐の戟.png\tMAP0002\t【青き呪い】状態になった間：攻撃力+5、【赤き呪い】状態になった間：防御力+5。\r\n113\t貫通の銃\t113_貫通の銃.png\tMAP0002\t効果カードが目標モンスターの防御力と同じの数のダメージを追加で出る。\r\n121\t大鉦\t121_大鉦.png\tMAP0003\tスキル使用後、4マス以内の全キャラクターの攻撃力+1、受けるダメージ-1、1ターン継続。\r\n122\tお年玉\t122_お年玉.png\tMAP0003\t爆竹使用後、カード使用数+1。振り込み後、爆竹を1枚獲得。爆竹3枚使用するごとに、全キャラクターにランダムで最大3種類の新春祝福を獲得。\r\n131\t紅茶にケーキ\t131_紅茶にケーキ.png\tMAP0004\t攻撃力+1。ティーポットを攻撃する時に、攻撃力+1、防御力+1（1ターン継続）。\r\n132\t古の魔法杖\t132_古の魔法杖.png\tMAP0004\t全ての効果カードの効果距離+3、カード使用数+1。\r\n133\t精良な装備セット\t133_精良な装備セット.png\tMAP0004\t攻撃力+4、【問題生徒】になった時、防御力+4。\r\n141\t荒波の御守り\t141_荒波の御守り.png\tMAP0005\t効果カード使用時、1ダメージを受ける。カードを獲得時、HP1回復する。\r\n142\t幻のシーフードスープ\t142_幻のシーフードスープ.png\tMAP0005\t戦闘中のダイスの出目は1か6になる。\r\n143\t無限の蛇\t143_無限の蛇.png\tMAP0005\tターン開始時、手札を8までドローする、カード使用数+1。\r\n144\t陰陽鯉\t144_陰陽鯉.png\tMAP0005\t反撃無効を得る、攻撃時、ダイスの出目を6に固定する。\r\n145\t蛇のぬいぐるみ\t145_蛇のぬいぐるみ.png\tMAP0005\tダメージを受ける後、このターンで受けるダメージ-2、攻撃力+2。\r\n146\t鯉のぬいぐるみ\t146_鯉のぬいぐるみ.png\tMAP0005\tスキル使用後、反撃1回得る、反撃時、攻撃力+1永続、防御力+1永続を得る。\r\n151\tタイマー\t151_タイマー.png\tMAP0006\t改造を得る時、追加で1スタック獲得する。改造スタック2つにつき、攻撃力+1。\r\n152\t復活人形\t152_復活人形.png\tMAP0006\t撃破された後、進捗バーへの影響を無くす。攻撃力、防御力、最大HP上限+1。\r\n153\tキャンディー会員証\t153_キャンディー会員証.png\tMAP0006\t怪奇飴カードの値段を3コインにする。怪奇飴カードを使用時、CT-1。\r\n161\t彩り羽のブレスレット\t161_彩り羽のブレスレット.png\tMAP0007\tスキル使用後、彩りの羽を1枚獲得する。彩りの羽を3枚使った後、強化チップを1個獲得する。\r\n162\tオシドリペンダント\t162_オシドリペンダント.png\tMAP0007\t【鴛鴦連理】を持つ時、移動力+2。【鴛鴦連理】解除時、攻撃力、防御力+1。（永続）\r\n163\t孔雀の扇子\t163_孔雀の扇子.png\tMAP0007\t攻撃命中後、自身が【ジェントル・フレイム】2スタック獲得する。戦闘に挑まれた時、【ジェントル・フレイム】3スタック消耗し、反撃1スタック獲得、さらにHP3回復する。\r\n201\tスタンガン\t201_スタンガン.png\tMAP0101|MAP0102|MAP0103\tエリートユニットを撃破した後、【マインド】を1スタック獲得する。【マインド】のスタック数が3以上の場合、攻撃力+2、防御力+2。\r\n202\tスポーツリストバンド\t202_スポーツリストバンド.png\tMAP0101|MAP0102|MAP0103\t攻撃力+1。攻撃時、防御側の移動力が変化している場合、追加で攻撃力+4。\r\n203\t懐中時計\t203_懐中時計.png\tMAP0101|MAP0102|MAP0103\tスタンされた後の次のラウンド開始時、即座に復活する。そのラウンドのモンスター行動時、全てのモンスターが時間停止状態になる。その後、懐中時計は「懐中時計（破損）」に変化する。\r\n204\t懐中時計（破損）\t204_懐中時計（破損）.png\tMAP0101|MAP0102|MAP0103\t元の機能を失ってしまったようで、修復は不可能に見える。\r\n205\tアダプティブコア\t205_アダプティブコア.png\tMAP0101|MAP0102|MAP0103\tマインドが3スタック以下の時、受けるダメージ-1。マインドが3スタック以上の時、攻撃力+2。\r\n206\tエンタメターミナル\t206_エンタメターミナル.png\tMAP0101|MAP0102|MAP0103\t攻撃力+4、防御力+4。ターン終了時、マインドスタック-1。\r\n207\t原初の意識\t207_原初の意識.png\tMAP0101|MAP0102|MAP0103\tマインド増加時、最大HP+1（永続）。マインド減少時、攻撃力+1（永続）。\r\n211\t虫眼鏡\t211_虫眼鏡.png\tMAP0104\t【罪証】を1スタック保有するごとに、攻撃力+1、防御力+1（最大4スタック）。\r\n212\tハンナの人形\t212_ハンナの人形.png\tMAP0104\t振り込み後、【罪証】を1スタック獲得する。ターン終了時、自身の【罪証】スタック数×2のスターコインを獲得する。\r\n"};
const CHIP_RULES_SNAPSHOT=[{"rule_id":"R001","chip_id":"1","kind":"modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R002","chip_id":"2","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R003","chip_id":"3","kind":"modifier","target":"atk","formula":"fixed","value":"5","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R004","chip_id":"4","kind":"modifier","target":"move","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R005","chip_id":"5","kind":"modifier","target":"move","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R006","chip_id":"6","kind":"modifier","target":"move","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R007","chip_id":"7","kind":"modifier","target":"max_hp","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R008","chip_id":"8","kind":"modifier","target":"max_hp","formula":"fixed","value":"3","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R009","chip_id":"9","kind":"modifier","target":"max_hp","formula":"fixed","value":"3","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R010","chip_id":"9","kind":"modifier","target":"atk","formula":"floor_per_unit","value":"1","source_key":"追加最大HP","unit":"2","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R011","chip_id":"10","kind":"modifier","target":"def","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R012","chip_id":"11","kind":"modifier","target":"def","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R013","chip_id":"12","kind":"modifier","target":"def","formula":"fixed","value":"3","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R014","chip_id":"13","kind":"modifier","target":"atk","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"hp_ratio<0.5","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R015","chip_id":"14","kind":"modifier","target":"atk","formula":"fixed","value":"8","source_key":"","unit":"","source_cap":"","min_value":"","condition":"hp_ratio<=0.5","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R016","chip_id":"21","kind":"counter_delta","target":"優雅の羽ボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"4","min_value":"","condition":"","trigger":"on_dodge","duration":"permanent","recipient":"self"},{"rule_id":"R017","chip_id":"21","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"優雅の羽ボーナス","unit":"","source_cap":"4","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R018","chip_id":"25","kind":"modifier","target":"atk","formula":"floor_per_unit","value":"1","source_key":"コイン","unit":"4","source_cap":"","min_value":"","condition":"target_is_monster","trigger":"on_attack","duration":"while_owned","recipient":"self"},{"rule_id":"R019","chip_id":"31","kind":"modifier","target":"atk","formula":"percent_of_ceil","value":"0.3","source_key":"スターコイン","unit":"","source_cap":"","min_value":"","condition":"スターコイン>20","trigger":"on_attack","duration":"this_attack","recipient":"self"},{"rule_id":"R020","chip_id":"36","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R021","chip_id":"37","kind":"modifier","target":"atk","formula":"per_stack","value":"2","source_key":"対象のマーク","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_attack_after_mark","duration":"this_attack","recipient":"self"},{"rule_id":"R022","chip_id":"39","kind":"modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R023","chip_id":"42","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"hp_full","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R024","chip_id":"42","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"ヒール","unit":"","source_cap":"","min_value":"","condition":"hp_full","trigger":"on_attack","duration":"this_attack","recipient":"self"},{"rule_id":"R025","chip_id":"43","kind":"modifier","target":"atk","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"hp_full","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R026","chip_id":"43","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"ヒール","unit":"","source_cap":"","min_value":"","condition":"hp_full","trigger":"on_attack","duration":"this_attack","recipient":"self"},{"rule_id":"R028","chip_id":"51","kind":"modifier","target":"move","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"チャージ>5","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R029","chip_id":"52","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"チャージ>7","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R030","chip_id":"53","kind":"modifier","target":"move","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"次の移動強化","trigger":"on_next_move","duration":"this_move","recipient":"self"},{"rule_id":"R031","chip_id":"57","kind":"modifier","target":"move","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R032","chip_id":"58","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R033","chip_id":"101","kind":"counter_delta","target":"ギガントアンカーボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_damage_taken","duration":"permanent","recipient":"self"},{"rule_id":"R034","chip_id":"101","kind":"counter_delta","target":"ギガントアンカーボーナス","formula":"fixed","value":"-1","source_key":"","unit":"","source_cap":"","min_value":"0","condition":"","trigger":"on_turn_start","duration":"permanent","recipient":"self"},{"rule_id":"R035","chip_id":"101","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"ギガントアンカーボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R036","chip_id":"102","kind":"modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"トライデント強化","trigger":"while_checked","duration":"while_checked","recipient":"self"},{"rule_id":"R037","chip_id":"102","kind":"modifier","target":"def","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"トライデント強化","trigger":"while_checked","duration":"while_checked","recipient":"self"},{"rule_id":"R038","chip_id":"103","kind":"modifier","target":"move","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R039","chip_id":"111","kind":"counter_delta","target":"呪いの剣ボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_monster_kill","duration":"permanent","recipient":"self"},{"rule_id":"R040","chip_id":"111","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"呪いの剣ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R041","chip_id":"112","kind":"modifier","target":"atk","formula":"fixed","value":"5","source_key":"","unit":"","source_cap":"","min_value":"","condition":"青き呪い","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R042","chip_id":"112","kind":"modifier","target":"def","formula":"fixed","value":"5","source_key":"","unit":"","source_cap":"","min_value":"","condition":"赤き呪い","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R043","chip_id":"121","kind":"event_modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_skill_use","duration":"one_turn","recipient":"all_characters_within_4"},{"rule_id":"R044","chip_id":"131","kind":"modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R045","chip_id":"131","kind":"event_modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"ティーポット","trigger":"on_attack","duration":"one_turn","recipient":"self"},{"rule_id":"R046","chip_id":"131","kind":"event_modifier","target":"def","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"ティーポット","trigger":"on_attack","duration":"one_turn","recipient":"self"},{"rule_id":"R047","chip_id":"133","kind":"modifier","target":"atk","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R048","chip_id":"133","kind":"modifier","target":"def","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"問題生徒","trigger":"while_checked","duration":"while_checked","recipient":"self"},{"rule_id":"R050","chip_id":"145","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"被ダメージ後","trigger":"while_owned","duration":"this_turn","recipient":"self"},{"rule_id":"R051","chip_id":"146","kind":"counter_delta","target":"反撃による永続ボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_counterattack","duration":"permanent","recipient":"self"},{"rule_id":"R052","chip_id":"146","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"反撃による永続ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R053","chip_id":"146","kind":"modifier","target":"def","formula":"per_stack","value":"1","source_key":"反撃による永続ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R054","chip_id":"151","kind":"modifier","target":"atk","formula":"floor_per_unit","value":"1","source_key":"改造","unit":"2","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R055","chip_id":"152","kind":"modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R056","chip_id":"152","kind":"modifier","target":"def","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R057","chip_id":"152","kind":"modifier","target":"max_hp","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R058","chip_id":"162","kind":"modifier","target":"move","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"鴛鴦連理","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R059","chip_id":"162","kind":"counter_delta","target":"鴛鴦連理解除ボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_bond_removed","duration":"permanent","recipient":"self"},{"rule_id":"R060","chip_id":"162","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"鴛鴦連理解除ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R061","chip_id":"162","kind":"modifier","target":"def","formula":"per_stack","value":"1","source_key":"鴛鴦連理解除ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R063","chip_id":"201","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"マインド>=3","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R064","chip_id":"201","kind":"modifier","target":"def","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"マインド>=3","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R065","chip_id":"202","kind":"modifier","target":"atk","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R066","chip_id":"202","kind":"modifier","target":"atk","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"対象の移動力変化","trigger":"on_attack","duration":"this_attack","recipient":"self"},{"rule_id":"R067","chip_id":"205","kind":"modifier","target":"atk","formula":"fixed","value":"2","source_key":"","unit":"","source_cap":"","min_value":"","condition":"マインド>=3","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R068","chip_id":"206","kind":"modifier","target":"atk","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R069","chip_id":"206","kind":"modifier","target":"def","formula":"fixed","value":"4","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R070","chip_id":"207","kind":"counter_delta","target":"マインド増加ボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_mind_increase","duration":"permanent","recipient":"self"},{"rule_id":"R071","chip_id":"207","kind":"modifier","target":"max_hp","formula":"per_stack","value":"1","source_key":"マインド増加ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R072","chip_id":"207","kind":"counter_delta","target":"マインド減少ボーナス","formula":"fixed","value":"1","source_key":"","unit":"","source_cap":"","min_value":"","condition":"","trigger":"on_mind_decrease","duration":"permanent","recipient":"self"},{"rule_id":"R073","chip_id":"207","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"マインド減少ボーナス","unit":"","source_cap":"","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R074","chip_id":"211","kind":"modifier","target":"atk","formula":"per_stack","value":"1","source_key":"罪証","unit":"","source_cap":"4","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"},{"rule_id":"R075","chip_id":"211","kind":"modifier","target":"def","formula":"per_stack","value":"1","source_key":"罪証","unit":"","source_cap":"4","min_value":"","condition":"","trigger":"while_owned","duration":"while_owned","recipient":"self"}];
(()=>{
 const root=document.getElementById('character-panel');
 const listStatus=document.getElementById('character-list-status'),chipStatus=document.getElementById('character-chip-status');
 const selectedPanel=document.getElementById('selected-character');
 const conditionsBox=document.getElementById('selected-character-conditions');
 const ownedBox=document.querySelector('.selected-character-chips');
 const hpInput=document.getElementById('selected-character-current-hp');
 const STATUS_ICON_SNAPSHOT="group,effect_key,input_kind,icon_file,map_id,atk,def,move,damage_reduce,condition\r\nスタック,コイン,number,スターライト.png\r\nスタック,マーク,number,マーク.png\r\nスタック,ヒール,number,ヒール.png\r\nスタック,チャージ,number,チャージ.png\r\nスタック,改造,number,改造.png\r\nスタック,ジェントル・フレイム,number,ジェントル・フレイム.png\r\nスタック,反撃,number,Reflect.png\r\nスタック,マインド,number,chip_icon/201_スタンガン.png\r\nスタック,罪証,number,罪証.png\r\n所持数,スターコイン,number,Coin.png\r\n蓄積ボーナス,優雅の羽ボーナス,number,chip_icon/021_優雅の羽.png\r\n蓄積ボーナス,ギガントアンカーボーナス,number,chip_icon/101_ギガントアンカー.png\r\n蓄積ボーナス,呪いの剣ボーナス,number,chip_icon/111_呪いの剣.png\r\n蓄積ボーナス,反撃による永続ボーナス,number,Reflect.png\r\n蓄積ボーナス,鴛鴦連理解除ボーナス,number,鴛鴦連理.png\r\n蓄積ボーナス,マインド増加ボーナス,number,chip_icon/207_原初の意識.png\r\n蓄積ボーナス,マインド減少ボーナス,number,chip_icon/207_原初の意識.png\r\nマップ固有,真犯人,checkbox,真犯人.png,MAP0104,2,0,2,2,\r\nマップ固有,逆鱗,number,逆鱗.png,MAP0005,2,0,0,2,\r\nマップ固有,金鱗,number,金鱗.png,MAP0005,1,1,0,0,\r\nマップ固有,孔雀の羽ばたき,number,孔雀の羽ばたき.png,MAP0007,2,2,0,0,excess_over_peacock\r\n追加素材,深層改造,未設定,深層改造.png\r\n追加素材,戦の呪い,未設定,戦の呪い.png\r\nマップ固有,勇往邁進,number,勇往邁進.png,MAP0007,2,0,0,2,\r\n";
 let statusIcons=new Map(),mapKeywords=[];
 let currentOpponent=null;
 const CHARACTER_SKILLS_SNAPSHOT="id,name,ability\r\n1,\"ミミ\",\"スキル - 商品補充［CT 3］\n全ての手札を捨て、元の手札数+1のカードを引く。\n\nパッシブスキル - リサイクル\n1枚のバトルカードを捨てるごとに、1コインを獲得する。\n累計で手札を25枚獲得するたびにチップを1つ得る。\"\r\n2,\"パルナン\",\"スキル - ネットショッピング［CT 2］\n遠隔でショップのカードを購入する。\n\nパッシブスキル - 伝説商人\nショップで購入できるバトルカード数+1、ショップに入るたびスターコイン+1。\nショップに並ぶカードの枚数も+1され、全てのカードが10%の確率で値段1コインに変更される。\nパルナンが「振り込み」を行った後は、ショップのカード1枚の値段が1コインに変更される。\"\r\n3,\"ファニィ\",\"スキル - トラブル・メーカー［CT 3］\n2つのマップイベントから1つを選んで発動する。\n\nパッシブスキル - 盲点発現！\nファニイがイベントを発生させるたびに、スターコインを3獲得する。\"\r\n4,\"アランナ\",\"スキル - アイアン・メイデン［CT 3］\nこのターン、戦闘・罠によるダメージと反撃を無効化する。\n自身から攻撃することはできる。\n\nパッシブスキル - 勇気を出す！\n前回のターンでダメージを受けていない場合、攻撃力+3。\nスタック不可、ダメージを受けるとクリア。\"\r\n5,\"コマチ\",\"スキル - 忍術連撃［CT 3］\n1ターンの間、効果カードを追加で1枚使用できる。\n\nパッシブスキル - コピーニンジャ\n効果カードを3枚使用するごとに、最後に使用した効果カードを手札にコピーする。\n同時にCT-1、効果カードのダメージ+1。\"\r\n6,\"パッドマン\",\"スキル - マジで怒ったぞ［CT 3］\n1ターンの間、パッシブスキルの効果が最大値で発動する。\n\nパッシブスキル - 自己主張なし\n各ターンごとに、既存の基準値以上で属性が増減する：攻撃力-2～2、防御力-2～2、移動ダイス-2～2。\n攻撃時のダイスの出目が6の場合、相手の防御力を無視する。\n出目が2未満の場合は、次の攻撃時のダイスの出目を6にする。\"\r\n7,\"パパラ\",\"スキル - ひとくちだけ［CT 3］\n戦闘で与えたダメージの半分を回復する。\nスキルの持続時間中はHPが半分未満であると見なす。\n\nパッシブスキル - 可愛さは正義\n現在のHPが最大HPの半分以下の場合、攻撃力+3。\"\r\n8,\"レン\",\"スキル - 子供の特権［CT 3］\nキャラクターを指定し、カードを1枚引かせジュジュシールドを付与する。\n※ジュジュシールド効果：次に受けるダメージ-99\n\nパッシブスキル - ジュジュさん、助けて！\n味方にスキルを使った時、目標のHPが50%以下の場合、自身もカードを引き、ジュジュシールドを得る。\nジュジュシールドをキャラクターに与えたとき、反撃効果（1回）も与える。\"\r\n9,\"Z3000\",\"スキル - 引き寄せる［CT 4］\n7マス以内のモンスターを引き寄せ、5ダメージを与える。\n攻撃力が7以上でスキルを使用した場合、対象モンスターに攻撃できる。\n\nパッシブスキル - 回収利用\nモンスター撃破時にCT-2。\nモンスターを2体撃破するたびに攻撃力+1。\"\r\n10,\"パンダマン\",\"スキル - 食べ放題［CT 3］\nチョコレートケーキまたはハンバーガーのどちらか1枚のカードを獲得する。\n5マス以内の全てのモンスターを1ターンの間、挑発状態にする。\n\nパッシブスキル - 善きも悪しきもある\nハンバーガーまたはチョコレートケーキ使用後、周囲5マス以内の他キャラクターのHP+2。\n「食べ物」を消費する時にカウンターを1スタック獲得し、消費したものがハンバーガーなら最大HP+2も得る。\nカウンター攻撃時は、このターンに受けたダメージ分だけ攻撃力が上昇する。\"\r\n11,\"ルル\",\"スキル - 癒しの粘液［CT 3］\nキャラクターを指定し、【ヒール】を3スタック付与する。\n対象から4マス以内にいる全モンスターの次の行動時の移動力を-3する。\n\nパッシブスキル - 細胞分裂\nダメージを受けた後、【ヒール】+1スタック、CT-1。\nターン終了時に【ヒール】を2スタック失うごとに3マス以内のランダムな位置へ【ミニスライム】を1個生成する。最大2個。\nキャラクターが【ミニスライム】を通過するとそれを消費し、HP+1と【ヒール】+1スタックを得る。\"\r\n12,\"ヒメ\",\"スキル - 気功修練［CT 3］\nHP+2、エネルギー保存が発動中の場合、このターンの間攻撃力+4を得る。\n\nパッシブスキル - エネルギー保存\n自分のターンに戦闘を行わなかった場合、ターン終了時にエネルギー保存を得る。\nエネルギー保存は攻撃力+2、防御力+2の効果を持ち、次回の攻撃終了まで有効で、最大5スタックまで蓄積できる。\nモンスターを通過して戦闘を行わなかった場合は、2スタック獲得する。\n攻撃時に5スタックある場合、追加で2スタックを消費し、その攻撃で与えたダメージの88%を追加で2マス以内の敵に与える。\n\nパッシブスキル - 以心伝心\nスキル使用時、ユメが符カード-福1枚手札に加える。\"\r\n13,\"カイセイ\",\"スキル - フェイト・エコー［CT 3］\nモンスター1匹をマークし、その受けるダメージ+1。2ターン継続。\n効果中にそのモンスターが気絶すると、カイセイはコインを3枚得る。\nスキル使用時、手札の全てのリモコンダイスを運命の導きに変える。\nマークされたモンスターを撃破したキャラクターは運命の導きを得る。\n\nパッシブスキル - 幸運な番号\n移動ポイントが6なら、6枚のコインを得る。\"\r\n14,\"ミサキ\",\"スキル - 桜裂空斬［CT 3］\n6マス以内のモンスターを指定して2ダメージを与え、剣気を1つ得る（最大3スタック）。\n剣気が満タンの状態で使用すると2スタックを消費してカード「名刀：ガオー切り」を1枚得て、そのバトルコストを-1する。\n\nパッシブスキル - 剣気\n戦闘中、自身の攻撃命中や回避成功すると剣気1つを得る。最大3スタック\n自身がスタン時に全ての剣気スタックを失う。\"\r\n15,\"ナーディス\",\"スキル - クィーン プリビレッジ［CT 3］\n一時的に3枚の手札を得る、この手札をターン終了時に捨てる。\n\nパッシブスキル - プレッシャー\n戦闘時自分の手札は相手より多い場合、多い手札の1枚につき自分の攻撃力+1。\n最大攻撃力+3。\"\r\n16,\"ジャスミン\",\"スキル - オーバードライブ［CT 4］\n1ターンの間、防御力-3、移動ステップ数+3。\n使用後、次の移動ダイスの出目が10以上ならそのターンの攻撃力+2、10未満なら防御力+2。\n\nパッシブスキル - チャージステップ\n累計移動ステップ数が13スタック増加するごとに、攻撃力と防御力が交互に1ずつ増加する。\n疾走マスを踏んだ時、CT-2。\"\r\n17,\"ルカ\",\"スキル - 真夜の一閃［CT 3］\n次の移動時に6面ダイスを2個振ります、移動時に経過するモンスターに自身攻撃力+2のダメージ。\n（スキル使用時に戦闘不可）\n\nパッシブスキル - 攻めの姿勢\n1ターンに1回、セーフティポイントを経過または滞在時にCT-2。\"\r\n18,\"ナンシーロー\",\"スキル - ハッキング［CT 3］\nモンスターを指定して強制戦闘を仕掛ける。\nこの交戦ではパッシブスキルによるカードを捨てる効果は発動しない。\n対象がナンシー・ローから3マス以上離れている場合、この戦闘では反撃されない。\n使用時に対象との距離が6マスより遠い場合、バトルカードを1枚獲得し、1ターンの間、ファイアウォールを得る。\n\nパッシブスキル - ファイアウォール\nターン開始時2マス以内にモンスターがいない場合、バトルカードを1枚獲得し、ファイアウォールを得る。1ラウンド継続。。\n自身が仕掛けた戦闘終了後、手札が6枚以上ならバトルカードをランダムに1枚捨てる。\n\n\nファイアウォール\n攻撃力+2、防御力+2。\n2マスより遠いモンスターから受けるダメージ-1。\"\r\n19,\"メガス\",\"スキル - 軌道エアバースト［CT 3］\n3マス以内のマスを選んでワープし、全ての手札を捨てて軌道エアバーストを発動する。\nカードを2枚捨てるごとに、6マス以内のランダムなモンスターに3ダメージを与える。\n捨てたカードにバトルカードが含まれる場合は、そのバトルコストに応じてダメージを強化する。\nバトルコスト1でダメージ+1、バトルコストが3増加するごとに追加ダメージ+1。\n使用後にカードを1枚獲得する。\n捨てたカードが6枚以上の場合は、獲得するカードが軌道レールキャノンに変わる。\n軌道レールキャノン使用後、バトルカードを1枚引き、そのコスト分のダメージを対象と周囲2マス以内のモンスターに与え、精確照準を付与する。\n\nパッシブスキル - リサプライ\nターン終了時、手札数が6より少ない場合、カード1枚を得る。\n\n精確照準\n【軌道エアバースト】で与えるダメージ+1。\"\r\n20,\"ユメ\",\"スキル - 白沢よ、福を与えよ［CT 3］\n白沢よ、福を与えよを使用時に、ターゲットに1ターンの間、余分の治療量を攻撃力に変換を与え、符カード-福を1枚手札に加える、手札にある全ての符カード-禍を符カード-福に転換。\n\nパッシブスキル - 禍福倚伏\nダイスの出目が1の場合、符カード-禍1枚手に入る、ダイスの出目が6の場合、符カード-福1枚手に入る。\n\nパッシブスキル - お手伝い完璧\nヒメに符カード-福を使った時、ヒメのエネルギー保存が発動。\"\r\n21,\"アル\",\"スキル - 強者の機欄［CT 3］\nキャラクターを指定し、1～3枚のカードを与え、与えた枚数と同量の「スターコイン」を獲得。\n\nパッシブスキル - ウィンウィン\n他キャラクターにカードを与える時、双方にスターライト+1。\n自身のスターライトが6スタック毎に攻撃力+1、防御力+1。\"\r\n22,\"リン\",\"スキル - ライフ・ブック［CT 3］\nライフ・ブックを1枚得る、このターンの間、全ての効果カードの効果距離+3。\n\nパッシブスキル - 調査結果\nイベント発生時、ライフ・ブック1枚得る。\nライフ・ブックを使用するたびに、ライフ・ブックのダメージが1上昇する。\"\r\n23,\"テル\",\"スキル - 三神憑依［CT 3］\nキャラクターを1人指定し、1ターンの間、そのキャラクターを三神憑依状態にする。\nテルの攻撃力と防御力に、三神憑依状態のキャラクターの攻撃力と防御力の半分を加える。\n三神憑依状態のキャラクターが攻撃する際、テルに狐光が1スタック消費して追加攻撃する。\n\nパッシブスキル - 狐火\nテルまたは三神憑依状態のキャラクターがコスト2以上の攻撃カードを使用すると、テルは狐光を1スタック獲得する。\n\n狐光\n1スタックにつき、追加攻撃の攻撃力+1。\"\r\n24,\"モーゼス\",\"スキル - 弱点反撃［CT 2］\nモンスター1体を選択し、「弱点」を付与する。\n「弱点」を持つモンスターがモーゼスに攻撃を行う場合、モーゼスは反撃する。\n\nパッシブスキル - 精確無比\n回避/反撃成功時、精確無比を+1（最大3スタック）する。\n\n弱点\nモーゼスと交戦時、そのモンスターの戦闘ダイスの出目を0にする。\n\n精確無比\n1スタックごとに攻撃力+2、回避ダイスの最小出目+1。\nターン終了時に1スタック減少。\"\r\n25,\"真夢梓\",\"スキル - 連鎖反応［CT 3］\n真夢梓が噛みつく1枚獲得する、5マス以内の味方キャラクター全員がカード1枚得る。\n対象キャラクターの手札が4より少ない場合、更にもう1枚得る。\n\nパッシブスキル - 水海の主\n他のキャラクターにカードを与えた時、覚醒スタック+1。\n覚醒が8スタックに達した時、真龍を獲得する。\n真龍の時、手札にある噛みつくとスキルで獲得する噛みつくが龍の咆哮に変化する。\n\n真龍\n攻撃力+4。スキルの範囲を無制限にする。\"\r\n26,\"スミカゲ\",\"スキル - 暗影融合［CT 3］\n【影】を1つ選択してテレポートし、その後全ての【影】を吸収する。\n【影】を1つ吸収するごとに、1ターンの間、自身の攻撃力+1。\n\nパッシブスキル - シャドウツイン\nターン開始時と攻撃命中時、スミカゲがいるマスに【影】を配置する、2ターン継続。\n敵キャラクターまたはモンスターが【影】の上に滞在すると、1ダメージを受ける。\"\r\n27,\"ボニー\",\"スキル - ミッション：インシークレット［CT 3］\nモンスター1体を調査対象とし、【マーク】+1を付与する。\n更に対象モンスターのマークスタック数×2のスターコインを獲得する。\n\nパッシブスキル - 真実への鍵\n【潜入調査】をマップイベントに追加する。\n【マーク】を持つモンスターを攻撃するとき、攻撃力+3。\n【マーク】を持つモンスターを倒したとき、バトルカードを1枚得る。\n\n調査対象\n撃破時に【潜入調査】を発動し、次の段階へ侵攻。\n\n潜入調査\nフェーズ・ワン\nボニーの6マス以内のボス以外の敵全員に【マーク】を1スタック付与する。\nボニーと発動プレイヤーは1ターンの間、潜伏を獲得する。\nフェーズ・ツー\nボニーの6マス以内のボス以外の敵全員に【マーク】を1スタック付与する。\nボニーと発動プレイヤーはバトルカードを1枚獲得し、1ターンの間、潜伏を獲得する。\nフェーズ・スリー\nボス以外の敵全員に【マーク】を1スタック付与する。\nボニーと発動プレイヤーはバトルカードを1枚獲得し、1ターンの間、潜伏を獲得する。\n真相解明\nボスに【マーク】を2スタック付与する。\n全キャラクターはバトルカードを1枚獲得し、1ターンの間、潜伏を獲得する。\n\n\n潜伏\nモンスターへ攻撃するとき、【マーク】スタック分攻撃力を増加。\n戦闘終了後この効果を解除する。\"\r\n28,\"リンリン\",\"スキル - インターセプトタックル［CT 3］\n1～7から数字を選び、それをインターセプトタックルの移動距離にする。\n次の移動をタックルに変えて即発動。\nタックル中、通ったモンスターを全員終点まで弾き飛ばす。\n停止後、弾き飛ばした順にバトルできる。\nタックル中にエリア拒止を通ると、タックルされたモンスターの防御力が-2、自分の攻撃力+2（2ターン継続）。\n\nパッシブスキル - インターセプター\n自身のロードブロックがエリア拒止に変化。\nゲーム開始時、エリア拒止を2枚追加獲得。\nロードブロック通過後、エリア拒止を1枚獲得する。\"\r\n29,\"サイクス\",\"スキル - アビサルゾーン［CT 3］\n4マス以内のマスを1つ選択し、「テンタクルアビサル」を1体生成。\nさらに、そのマスから2マス以内の全てのマスを一時的に「アビサルゾーン」に変換する。\nその後、アビサルゾーン内の全てのテンタクルアビサルを作動させる。\nアビサルゾーンに何らかの形で侵入したモンスターは、次の移動力が-2される。\nアビサルゾーンはサイクスのターン開始時に消失する。\n\nパッシブスキル - テンタクルアビス\n自身がダメージを与えた時に、対象に1ターンの間、アビスエロージョンマークを1スタック付与する。\nターン終了時、自身がいるマスに「テンタクルアビサル」を1体生成する。\nその後、3マス以内の全ての「テンタクルアビサル」を作動させる。\n\nテンタクルアビサル\n周囲2マス以内の全てのモンスターに1ダメージを与え、その後、移動力減少効果を受けているモンスターに1ターンの間、アビスエロージョンマークを1スタック付与する。\n永続的に存在し、1つのマスに最大1体まで存在する。\"\r\n101,\"超てんちゃん\",\"スキル - インターネットエンジェル［CT 3］\nコインを1枚得る。\n場にいる「ファン」状態のモンスター1体につき、追加でコインを1枚得る（最大10コイン）。\n場にいる「ファン」状態のモンスターとキャラクターが3体以上の場合、HPを3回復する。\nスキル使用時に「ファン」が9体以上いる場合、フィールド上の全てのファンの攻撃力を-1（永続、重複不可）し、他の味方キャラクターは3スターコインを獲得する。\n\nパッシブスキル - ジェルばんは\n超てんちゃんを攻撃するキャラクターやモンスターは「ファン」状態にされます。\n「ファン」状態の敵が超てんちゃんを攻撃する際、攻撃力-1。\n\nパッシブスキル - 一心同体\n超てんちゃんとあめちゃんのパッシブスキルは共有される。\"\r\n102,\"あめちゃん\",\"スキル - 愛情の過剰摂取［CT 3］\nこのターン、「愛」の数に応じた移動ボーナスを得、同量のHPを回復し、その後、「愛」を4層減少させる。\n使用時に「愛」が4以上ある場合、自身の最大HP+1、愛の上限+1。\n\nパッシブスキル - 愛が愛を重すぎる\nダメージを受けるたびに「愛」を獲得。最大4スタック。\n愛の初期値は2スタック。\n\nパッシブスキル - Two hearts beat as one\n超てんちゃんとあめちゃんのパッシブスキルは共有される。\"\r\n103,\"ジル\",\"スキル - カクテルを作る［CT 3］\nキャラクターを1名選び、手札のカード3枚で作ったカクテルを提供する。\n選んだカードの種類に応じ、対象に次の効果を与える。\n- 効果カードや呪いカード：HPを1回復\n- 攻撃カード：攻撃力+1（このターンのみ）\n- 防御カード：防御力+1（このターンのみ）\n選んだカードを捨て、同じ枚数のカードをドローする。\n\nパッシブスキル - 一生を変えるカクテル\nカクテルを作る時、種類が違うカードを3つ使う場合、ジルがスターコイン+3。\n同じ種類のカードを3つ使う場合、このターン目標の移動ダイスの出目+3。\"\r\n104,\"ドロシー\",\"スキル - 本当の私［CT 2］\n味方キャラクターを選択してその位置にワープする、このターン、味方キャラクターに通り過ぎる時、自身とそのキャラクターの攻撃力を+1（重複しない、自身への効果は1ターンに1回のみ）。\n「温もり」が5の場合、このターンの自身の攻撃力に防御力と同じ数を上乗せする、その後「温もり」を全て消耗する。\n\nパッシブスキル - 社交界の蝶\nHPを回復する時、「温もり」を+1。\n「温もり」1つにつき、防御力が1上昇する（最大5スタック）。\nドロシーが他のキャラクターを通り過ぎる時、自身とそのキャラクターのHPを1ずつ回復する。\"\r\n105,\"遠野ハンナ\",\"スキル - 浮遊魔法［CT 3］\n1ラウンドの間、浮遊を獲得する。\n\nパッシブスキル - 空想令嬢\n移動ダイスの出目が6以上の時、スターコインを1枚獲得する。\n味方キャラクターを通過する時、スターコインを1枚獲得し、人形制作を1スタック獲得する。\n浮遊を保有している状態で味方キャラクターを通過する時、スターコインが3コイン以上あれば、3コインを振り込む。\n人形制作が7スタックに達した時、遠野ハンナは人形完成を獲得する。\n\nパッシブスキル - 親友の祝福\n橘シェリーを通過する時、橘シェリーに次の移動力+2と推理タイムを1スタック付与する。\n\n人形完成\n味方キャラクターを通過すると、その味方キャラクターに次の移動力+2を付与する。\"\r\n106,\"橘シェリー\",\"スキル - 怪力魔法［CT 2］\n3マス以内の全てのモンスターを7マス以内のマスに投げ飛ばす。\nそのマスにいる全てのモンスターに2ダメージを与える。\n\nパッシブスキル - 探偵様出撃\nモンスターへ攻撃後、推理タイムを1スタック獲得する。最大4スタック。\n\nパッシブスキル - 親友を守る\n遠野ハンナが橘シェリーの4マス以内にいる場合、遠野ハンナの受けるダメージ-1。\n\n推理タイム\n1スタックごとに攻撃力+1。ターン終了時に-1。\"\r\n";
 let characterSkills=new Map();
 let characters=[],chips=[],rules=[],category='マーク',selectedCharacter=null;
 const states=new Map();
 const byChip=new Map();
 const specialIcons={'対象のマーク':'マーク','攻撃対象はモンスター':'モンスター','クジャク係の羽ばたき':'孔雀の羽ばたき'};
 const getState=id=>{if(!states.has(id))states.set(id,{level:0,currentHp:null,chips:[],numbers:{},modes:{},phases:{attack:false,move:false},manual:{atk:0,def:0}});return states.get(id);};
 const state=()=>getState(selectedCharacter.id);
 window.hasSelectedCharacter=()=>Boolean(selectedCharacter);
 hasSelectedCharacter=window.hasSelectedCharacter;
 window.captureCharacterEvidence=()=>selectedCharacter?{id:selectedCharacter.id,count:number(state(),'罪証')}:null;
 window.restoreCharacterEvidence=snapshot=>{if(!snapshot)return;getState(snapshot.id).numbers['罪証']=snapshot.count;if(selectedCharacter?.id===snapshot.id){renderConditions();updateStats();}};
 window.getCharacterEvidenceStack=()=>selectedCharacter?number(state(),'罪証'):0;
 window.setCharacterEvidenceStack=value=>{if(!selectedCharacter)return;state().numbers['罪証']=Math.max(0,Math.floor(Number(value)||0));renderConditions();updateStats();window.dispatchEvent(new Event('character-evidence-change'));};
 const number=(s,key)=>Math.min(key==='チャージ'?10:Infinity,Math.max(0,Number(s.numbers[key])||0));
 const modeFor=rule=>Number(state().modes[rule.chip_id])||0;
 const base=(stat)=>Number(selectedCharacter['lv'+state().level+'_'+stat]||0);
 function activeRules(){
  const ids=new Set(state().chips);
  return [...ids].flatMap(id=>byChip.get(id)||[]);
 }
 function conditionMatches(rule,maxHp){
  const key=rule.condition;if(!key)return true;
  if(key==='hp_full')return state().currentHp>=maxHp;
  if(key==='hp_ratio<0.5')return state().currentHp<maxHp/2;
  if(key==='hp_ratio<=0.5')return state().currentHp<=maxHp/2;
  if(key==='target_is_monster')return modeFor(rule)>0;
  const match=key.match(/^(.+?)(>=|<=|>|<)(\d+(?:\.\d+)?)$/);
  if(match){const left=number(state(),match[1]),right=Number(match[3]);
   return match[2]==='>='?left>=right:match[2]==='<='?left<=right:match[2]==='>'?left>right:left<right;
  }
  if(key==='次の移動強化'&&rule.trigger==='on_next_move')return Boolean(state().phases?.move);
  if(rule.chip_id==='112'&&key==='青き呪い')return [2,3].includes(modeFor(rule));
  if(rule.chip_id==='112'&&key==='赤き呪い')return [1,3].includes(modeFor(rule));
  return modeFor(rule)>0;
 }
 function triggerMatches(rule){
  if(['on_attack','on_attack_after_mark'].includes(rule.trigger))return Boolean(state().phases?.attack);
  if(rule.trigger==='on_next_move')return Boolean(state().phases?.move);
  if(['on_skill_use','while_checked'].includes(rule.trigger))return modeFor(rule)>0;
  return rule.trigger==='while_owned';
 }
 function valueOf(rule,extraMaxHp){
  const amount=Number(rule.value)||0;
  if(rule.formula==='fixed')return amount;
  let source=rule.source_key==='追加最大HP'?extraMaxHp:rule.source_key==='対象のマーク'?(currentOpponent?.markStacks||0):number(state(),rule.source_key);
  
  if(rule.source_cap!=='')source=Math.min(source,Number(rule.source_cap));
  if(rule.formula==='per_stack')return source*amount;
  if(rule.formula==='floor_per_unit')return Math.floor(source/Number(rule.unit))*amount;
  if(rule.formula==='percent_of_ceil')return Math.ceil(source*amount);
  return 0;
 }
 function calculate(){
  const active=activeRules().filter(r=>r.kind==='modifier'||r.kind==='event_modifier');
  const startingHp=base('hp');
  const maxBonus=active.filter(r=>r.target==='max_hp'&&triggerMatches(r)&&conditionMatches(r,startingHp)).reduce((sum,r)=>sum+valueOf(r,0),0);
  const maxHp=Math.max(1,startingHp+maxBonus);
  if(state().currentHp===null)state().currentHp=maxHp;
  state().currentHp=Math.max(0,Math.min(maxHp,Number(state().currentHp)||0));
  const result={atk:base('atk'),def:base('def'),move:base('move'),hp:maxHp,damageReduce:0,damageAdd:currentOpponent?.markStacks>0?1:0};
  for(const rule of active){
   if(!['atk','def','move'].includes(rule.target))continue;
   if(!triggerMatches(rule)||!conditionMatches(rule,maxHp))continue;
   result[rule.target]+=valueOf(rule,maxBonus);
  }
  for(const rule of mapKeywords.filter(row=>row.map_id===mapPicker.value)){
   let stacks=rule.input_kind==='checkbox'?(state().modes[rule.effect_key]?1:0):number(state(),rule.effect_key);
   if(rule.condition==='excess_over_peacock')stacks=currentOpponent?.name==='クジャク係'&&currentOpponent.mapId===mapPicker.value?Math.max(0,stacks-number(state(),'クジャク係の羽ばたき')):0;
   for(const stat of ['atk','def','move'])result[stat]+=stacks*(Number(rule[stat])||0);
   result.damageReduce+=stacks*(Number(rule.damage_reduce)||0);
  }
  result.atk+=state().manual?.atk||0;
  result.def+=state().manual?.def||0;
  return result;
 }
 function makeIcon(key){
  const file=statusIcons.get(key)||statusIcons.get(specialIcons[key]);
  if(!file)return Object.assign(document.createElement('span'),{className:'condition-fallback',textContent:key});
  const icon=document.createElement('img');icon.alt='';
  const path=file.startsWith('chip_icon/')?file:'icon/'+file;
  icon.src='../images/'+path.split('/').map(encodeURIComponent).join('/');
  icon.addEventListener('error',()=>{icon.replaceWith(Object.assign(document.createElement('span'),{className:'condition-fallback',textContent:key}));},{once:true});
  return icon;
 }
 function neededInputs(){
  const numeric=new Set();
  if(state().chips.some(id=>chips.find(chip=>chip.id===id)?.category==='チャージ'))numeric.add('チャージ');
  for(const rule of activeRules()){
   if(rule.kind==='counter_delta')numeric.add(rule.target);
   if(rule.source_key&&rule.source_key!=='追加最大HP'&&rule.source_key!=='対象のマーク')numeric.add(rule.source_key);
   if(rule.condition){
    const match=rule.condition.match(/^(.+?)(>=|<=|>|<)\d+(?:\.\d+)?$/);
    if(match&&match[1]!=='hp_ratio')numeric.add(match[1]);
   }
  }
  return numeric;
 }
 function renderConditions(){
  conditionsBox.replaceChildren();
  const ownedRules=activeRules();
  for(const [key,label,triggers] of [['attack','攻撃時',['on_attack','on_attack_after_mark']],['move','移動時',['on_next_move']]]){
   if(!ownedRules.some(rule=>triggers.includes(rule.trigger)))continue;
   const field=document.createElement('label');field.className='condition-phase';
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=Boolean(state().phases?.[key]);checkbox.setAttribute('aria-label',label+'の効果を有効にする');
   checkbox.addEventListener('change',()=>{state().phases??={attack:false,move:false};state().phases[key]=checkbox.checked;updateStats();});
   field.append(checkbox,document.createTextNode(label));conditionsBox.append(field);
  }
  for(const id of state().chips){
   if(!toggleable(id))continue;
   const chip=chips.find(row=>row.id===id);if(!chip)continue;
   const mode=Number(state().modes[id])||0;
   const button=document.createElement('button');button.type='button';
   button.className='selected-chip condition-toggle'+(mode?' is-active':'')+(id==='112'&&mode===1?' is-red':'')+(id==='112'&&mode===2?' is-blue':'')+(id==='112'&&mode===3?' is-both':'');
   button.dataset.chipId=id;button.setAttribute('aria-pressed',String(mode>0));
   const status=id==='112'?(mode===1?'赤き呪い':mode===2?'青き呪い':mode===3?'赤き呪いと青き呪い':'オフ'):(mode?'オン':'オフ');
   button.setAttribute('aria-label',chip.name+'：'+status+'。クリックで切り替え');
   button.title=chip.name+'：'+status+'\nクリックで条件を切り替え';
   const img=document.createElement('img');img.alt='';img.src='../images/chip_icon/'+encodeURIComponent(chip.images);button.append(img);
   button.addEventListener('click',()=>{
    const focused=document.activeElement===button;
    state().modes[id]=(mode+1)%(id==='112'?4:2);renderConditions();
    if(focused)[...conditionsBox.querySelectorAll('.condition-toggle')].find(item=>item.dataset.chipId===id)?.focus();
    updateStats();
   });
   conditionsBox.append(button);
  }
  for(const rule of mapKeywords.filter(row=>row.map_id===mapPicker.value&&row.input_kind==='checkbox')){
   const key=rule.effect_key,active=Boolean(state().modes[key]);
   const button=document.createElement('button');button.type='button';button.className='selected-chip condition-toggle'+(active?' is-active':'');
   button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',key+'：'+(active?'オン':'オフ')+'。クリックで切り替え');
   button.title=key+'：'+(active?'オン':'オフ')+'\nクリックで切り替え';button.append(makeIcon(key));
   button.addEventListener('click',()=>{state().modes[key]=active?0:1;renderConditions();updateStats();});
   conditionsBox.append(button);
  }
  const mapNumbers=mapKeywords.filter(row=>row.map_id===mapPicker.value&&row.input_kind==='number').map(row=>row.effect_key);
  if(mapPicker.value==='MAP0104')mapNumbers.push('罪証');
  if(mapPicker.value==='MAP0007'&&currentOpponent?.name==='クジャク係'&&currentOpponent.mapId===mapPicker.value)mapNumbers.push('クジャク係の羽ばたき');
  for(const key of new Set([...neededInputs(),...mapNumbers])){
   const item=document.createElement('label');item.className='condition-item';item.title=key+'：アイコンを左クリックで+1、右クリックで-1';
   const button=document.createElement('button');button.type='button';button.className='condition-icon';button.setAttribute('aria-label',key+'を増やす');button.append(makeIcon(key));
   const input=document.createElement('input');input.type='number';input.min='0';if(key==='チャージ')input.max='10';input.inputMode='numeric';input.className='condition-number';input.setAttribute('aria-label',key+'の数');input.value=number(state(),key);
   const setValue=value=>{state().numbers[key]=Math.min(key==='チャージ'?10:Infinity,Math.max(0,Number(value)||0));input.value=state().numbers[key];updateStats();if(key==='罪証')window.dispatchEvent(new Event('character-evidence-change'));};
   button.addEventListener('click',()=>setValue(number(state(),key)+1));
   button.addEventListener('contextmenu',e=>{e.preventDefault();setValue(number(state(),key)-1);});
   input.addEventListener('change',()=>setValue(input.value));item.append(button,input);conditionsBox.append(item);
  }
 }
 function updateStats(){
  if(!selectedCharacter)return;
  const totals=calculate();
  hpInput.max=totals.hp;hpInput.value=state().currentHp;
  for(const stat of ['atk','def'])document.getElementById('selected-character-'+stat).value=totals[stat];
  for(const stat of ['hp','move'])document.getElementById('selected-character-'+stat).textContent=totals[stat];
  applyCharacterToCalculator(totals);
  calculateDamage(document.querySelector('[data-role="attack"].mode-content'),false);
  calculateDamage(document.querySelector('[data-role="defense"].mode-content'),true);
 }
 applyCharacterToCalculator=(totals=selectedCharacter&&calculate())=>{
  if(!totals)return;
  document.getElementById('attackPower1').value=totals.atk;
  document.getElementById('defensePower2').value=totals.def;
  document.getElementById('hp2').value=state().currentHp;
  const reduction=document.getElementById('damageReduce2');
  const previousBonus=Number(reduction.dataset.mapKeywordBonus)||0;
  const manual=Number(reduction.value)-previousBonus;
  const bonus=totals.damageReduce||0;
  const attackDamageAdd=document.getElementById('damageAdd1');
  const previousMarkBonus=Number(attackDamageAdd.dataset.monsterMarkBonus)||0;
  const manualDamageAdd=Number(attackDamageAdd.value)-previousMarkBonus;
  const markBonus=totals.damageAdd||0;
  attackDamageAdd.value=Math.max(0,Number.isFinite(manualDamageAdd)?manualDamageAdd:0)+markBonus;
  attackDamageAdd.dataset.monsterMarkBonus=String(markBonus);
  reduction.value=Math.max(0,Number.isFinite(manual)?manual:0)+bonus;
  reduction.dataset.mapKeywordBonus=String(bonus);
 };
 for(const stat of ['atk','def'])document.getElementById('selected-character-'+stat).addEventListener('change',event=>{
  if(!selectedCharacter)return;
  const desired=Number(event.target.value);
  if(!Number.isFinite(desired)||desired<0){updateStats();return;}
  const current=calculate()[stat],previous=state().manual?.[stat]||0;
  state().manual??={atk:0,def:0};
  state().manual[stat]=desired-(current-previous);
  updateStats();
 });
 function toggleable(id){return (byChip.get(id)||[]).some(rule=>{
  if(!['modifier','event_modifier'].includes(rule.kind))return false;
  if(['on_skill_use','while_checked'].includes(rule.trigger))return true;
  const condition=rule.condition;
  return Boolean(condition&&!(rule.trigger==='on_next_move'&&condition==='次の移動強化')&&!['hp_full','hp_ratio<0.5','hp_ratio<=0.5'].includes(condition)&&!/^.+?(?:>=|<=|>|<)\d+(?:\.\d+)?$/.test(condition));
 });}
 function updateChipListSelection(){
  document.querySelectorAll('#chip-image-list .chip-select').forEach(button=>{
   const owned=Boolean(selectedCharacter&&state().chips.includes(button.dataset.id));
   button.setAttribute('aria-pressed',String(owned));
   button.setAttribute('aria-label',(owned?'取得を解除：':'取得する：')+button.dataset.name);
  });
 }
 function renderOwned(){
  const previousScroll=ownedBox.scrollLeft;
  ownedBox.replaceChildren();
  for(const id of state().chips){
   const chip=chips.find(c=>c.id===id);if(!chip)continue;
   const item=document.createElement('span');item.className='selected-chip';
   item.title=chip.name+'\n'+chip.effect;
   const img=document.createElement('img');img.alt=chip.name;img.src='../images/chip_icon/'+encodeURIComponent(chip.images);item.append(img);
   if(chip.category==='チャージ'&&id!=='57'){
    item.classList.add('is-actionable');item.setAttribute('role','button');item.tabIndex=0;
    const chargeDelta={'51':2,'52':2,'53':2,'54':2,'55':-6,'56':-5,'58':-4}[id]||0;
    item.title=chip.name+'\n'+chip.effect+(chargeDelta?'\nクリック：チャージ'+(chargeDelta>0?'+':'')+chargeDelta:'');
    const applyCharge=()=>{if(!chargeDelta)return;state().numbers['チャージ']=Math.max(0,Math.min(10,number(state(),'チャージ')+chargeDelta));renderConditions();updateStats();};
    item.addEventListener('click',applyCharge);item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();applyCharge();}});
   }
   ownedBox.append(item);
  }
  ownedBox.scrollLeft=previousScroll;
 }
 ownedBox.addEventListener('wheel',event=>{
  if(ownedBox.scrollWidth<=ownedBox.clientWidth||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  const before=ownedBox.scrollLeft;
  ownedBox.scrollLeft+=event.deltaY;
  if(ownedBox.scrollLeft!==before)event.preventDefault();
 },{passive:false});
 let chipDrag=null,suppressChipClick=false;
 ownedBox.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.pointerType==='touch')return;
  chipDrag={id:event.pointerId,x:event.clientX,scroll:ownedBox.scrollLeft,active:false};
 });
 ownedBox.addEventListener('pointermove',event=>{
  if(!chipDrag||event.pointerId!==chipDrag.id)return;
  const delta=event.clientX-chipDrag.x;
  if(Math.abs(delta)<=5&&!chipDrag.active)return;
  if(!chipDrag.active){chipDrag.active=true;suppressChipClick=true;ownedBox.setPointerCapture(event.pointerId);}
  ownedBox.scrollLeft=chipDrag.scroll-delta;event.preventDefault();
 });
 function finishChipDrag(event){
  if(!chipDrag||event.pointerId!==chipDrag.id)return;
  if(chipDrag.active&&ownedBox.hasPointerCapture(event.pointerId))ownedBox.releasePointerCapture(event.pointerId);
  chipDrag=null;
  setTimeout(()=>{suppressChipClick=false;},0);
 }
 ownedBox.addEventListener('pointerup',finishChipDrag);
 ownedBox.addEventListener('pointercancel',finishChipDrag);
 ownedBox.addEventListener('click',event=>{
  if(!suppressChipClick)return;
  event.preventDefault();event.stopImmediatePropagation();suppressChipClick=false;
 },true);
 function renderSelectedCharacter(){
  if(!selectedCharacter)return;
  selectedPanel.hidden=false;
  document.getElementById('selected-character-name').textContent=selectedCharacter.name;
  document.getElementById('selected-character-level').textContent='Lv.'+state().level;
  const portrait=document.getElementById('selected-character-image');portrait.src='../images/character/'+encodeURIComponent(selectedCharacter.images);portrait.alt=selectedCharacter.name;
  document.getElementById('selected-character-portrait').setAttribute('aria-label',selectedCharacter.name+' Lv.'+state().level+'：クリックでレベルアップ、右クリックでレベルダウン');
  renderOwned();renderConditions();updateStats();
  root.querySelectorAll('.character-select').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===selectedCharacter.id)));
  updateChipListSelection();
  window.dispatchEvent(new Event('character-evidence-change'));
 }
 function selectCharacter(row){selectedCharacter=row;renderSelectedCharacter();window.dispatchEvent(new Event('character-selection-change'));}
 function changeCharacterLevel(delta){
  if(!selectedCharacter)return;
  const oldLevel=state().level,oldMax=calculate().hp,oldCurrent=state().currentHp;
  state().level=Math.max(0,Math.min(3,oldLevel+delta));
  if(state().level>oldLevel){
   const newMax=calculate().hp;
   state().currentHp=Math.min(newMax,oldCurrent+Math.max(0,newMax-oldMax));
  }
  renderSelectedCharacter();
 }
 const portraitButton=document.getElementById('selected-character-portrait');
 portraitButton.addEventListener('click',()=>changeCharacterLevel(1));
 portraitButton.addEventListener('contextmenu',event=>{event.preventDefault();changeCharacterLevel(-1);});
 portraitButton.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();changeCharacterLevel(-1);}});
 const numberPad=document.createElement('div');numberPad.id='character-number-pad';numberPad.className='character-number-pad';numberPad.setAttribute('role','group');numberPad.setAttribute('aria-label','数値入力用テンキー');numberPad.hidden=true;
 for(const label of ['1','2','3','4','5','6','7','8','9','消去','0','確定']){
  const key=document.createElement('button');key.type='button';key.textContent=label;key.dataset.key=label;numberPad.append(key);
 }
 document.body.append(numberPad);
 let numberPadInput=null,numberPadOriginal='',replaceNumberOnDigit=true;
 function positionNumberPad(){
  if(!numberPadInput||numberPad.hidden)return;
  const field=numberPadInput.getBoundingClientRect();
  const anchor=selectedPanel.contains(numberPadInput)?selectedPanel.getBoundingClientRect():field;
  const width=numberPad.offsetWidth,height=numberPad.offsetHeight;
  numberPad.style.left=Math.max(8,Math.min(field.left,window.innerWidth-width-8))+'px';
  const below=anchor.bottom+6;
  numberPad.style.top=(below+height<=window.innerHeight-8?below:Math.max(8,anchor.top-height-6))+'px';
 }
 function closeNumberPad(){
  if(numberPadInput)numberPadInput.removeAttribute('aria-controls');
  numberPadInput=null;numberPad.hidden=true;
 }
 function commitNumberPad(){
  if(!numberPadInput)return;
  const input=numberPadInput;
  if(input.value==='')input.value=numberPadOriginal;
  const changed=input.value!==numberPadOriginal;
  closeNumberPad();
  if(changed){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 document.addEventListener('focusin',event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=='number'||input.disabled||input.readOnly||input.closest('.battle-card-counter'))return;
  if(numberPadInput&&numberPadInput!==input)commitNumberPad();
  numberPadInput=input;numberPadOriginal=input.value;replaceNumberOnDigit=true;
  const role=input.classList.contains('roster-hp')?'map':input.closest('.mode-content')?.dataset.role||(selectedPanel.contains(input)?'character':'character');
  numberPad.className='character-number-pad pad-theme-'+role;
  input.select();input.setAttribute('aria-controls',numberPad.id);
  numberPad.hidden=false;positionNumberPad();
 });
 document.addEventListener('keydown',event=>{
  if(event.target!==numberPadInput)return;
  if(event.key==='Enter'){event.preventDefault();commitNumberPad();event.target.blur();}
  else if(event.key==='Escape'){event.preventDefault();numberPadInput.value=numberPadOriginal;closeNumberPad();event.target.blur();}
 });
 numberPad.addEventListener('pointerdown',event=>event.preventDefault());
 numberPad.addEventListener('click',event=>{
  const key=event.target.closest('button[data-key]');if(!key||!numberPadInput)return;
  const input=numberPadInput,label=key.dataset.key;
  if(label==='確定'){commitNumberPad();input.blur();return;}
  if(label==='消去'){input.value=replaceNumberOnDigit?'':input.value.slice(0,-1);}
  else input.value=(replaceNumberOnDigit?'':input.value)+label;
  replaceNumberOnDigit=false;input.focus();
 });
 document.addEventListener('pointerdown',event=>{
  if(!numberPadInput||event.target===numberPadInput||numberPad.contains(event.target))return;
  commitNumberPad();
 },true);
 window.addEventListener('resize',positionNumberPad);
 window.addEventListener('scroll',positionNumberPad,true);
 hpInput.addEventListener('change',()=>{state().currentHp=Math.max(0,Number(hpInput.value)||0);updateStats();});
 const hpButton=document.getElementById('selected-character-hp-fill');
 const changeHp=delta=>{if(!selectedCharacter)return;state().currentHp=Math.max(0,Math.min(calculate().hp,state().currentHp+delta));updateStats();};
 hpButton.addEventListener('click',()=>changeHp(1));
 hpButton.addEventListener('contextmenu',event=>{event.preventDefault();changeHp(-1);});
 for(const stat of ['atk','def']){
  const button=document.getElementById('selected-character-'+stat+'-button');
  const change=delta=>{if(!selectedCharacter)return;const current=calculate()[stat],next=Math.max(0,current+delta);state().manual[stat]+=next-current;updateStats();};
  button.addEventListener('click',()=>change(1));
  button.addEventListener('contextmenu',event=>{event.preventDefault();change(-1);});
 }
 const skillTooltip=document.createElement('aside');skillTooltip.id='character-skill-tooltip';skillTooltip.className='character-skill-tooltip';skillTooltip.setAttribute('role','tooltip');skillTooltip.hidden=true;document.body.append(skillTooltip);
 let skillTooltipTimer;
 function hideSkillTooltip(){clearTimeout(skillTooltipTimer);skillTooltip.hidden=true;}
 function scheduleHideSkillTooltip(){clearTimeout(skillTooltipTimer);skillTooltipTimer=setTimeout(hideSkillTooltip,180);}
 function showSkillTooltip(button,row){
  const ability=characterSkills.get(String(row.id));
  if(!ability)return;
  clearTimeout(skillTooltipTimer);
  skillTooltip.replaceChildren();
  const stats=document.createElement('div');stats.className='character-skill-stats';
  for(const [key,label,file] of [['atk','攻撃力','Attack.png'],['def','防御力','Defense.png'],['hp','HP','Hp.png'],['move','移動力',null]]){
   const entry=document.createElement('span');entry.className='character-skill-stat';entry.title=label;
   const icon=file?document.createElement('img'):document.createElement('span');
   if(file){icon.src='../images/icon/'+file;icon.alt='';}else{icon.className='character-skill-move-icon';icon.textContent='👟';icon.setAttribute('aria-hidden','true');}
   const values=[0,1,2,3].map(level=>row['lv'+level+'_'+key]??'—').join(' / ');
   const text=document.createElement('span');text.textContent=values;
   entry.setAttribute('aria-label',label+' Lv0からLv3 '+values);entry.append(icon,text);stats.append(entry);
  }
  const description=document.createElement('div');description.className='character-skill-text';
  const lines=ability.split(/\r?\n/);
  lines.forEach((line,index)=>{
   const heading=/^(?:スキル|パッシブスキル)\s*[-－]\s*.+$/.test(line.trim())||/^[^\s。、！？：:（）()\[\]［］]{1,24}$/.test(line.trim());
   if(heading){const strong=document.createElement('strong');strong.textContent=line;description.append(strong);}
   else description.append(document.createTextNode(line));
   if(index<lines.length-1)description.append(document.createTextNode('\n'));
  });
  skillTooltip.append(stats,description);skillTooltip.hidden=false;skillTooltip.scrollTop=0;
  const box=button.getBoundingClientRect(),width=skillTooltip.offsetWidth,height=skillTooltip.offsetHeight,gap=10;
  let left=box.right+gap;if(left+width>window.innerWidth-8)left=box.left-width-gap;
  skillTooltip.style.left=Math.max(8,Math.min(left,window.innerWidth-width-8))+'px';
  skillTooltip.style.top=Math.max(8,Math.min(box.top,window.innerHeight-height-8))+'px';
 }
 document.addEventListener('keydown',event=>{if(event.key==='Escape')hideSkillTooltip();});
 document.getElementById('character-image-list').addEventListener('scroll',hideSkillTooltip);
 const sorted=rows=>rows.slice().sort((a,b)=>Number(a.id)-Number(b.id));
 function renderImages(target,rows,folder,key){
  target.replaceChildren();
  for(const row of sorted(rows)){
   const item=document.createElement('figure');item.className='character-asset';item.dataset.id=row.id;
   const img=document.createElement('img');img.alt=row.name||'';img.loading='lazy';img.decoding='async';
   const file=String(row[key]||row.images||'').trim();
   const missing=()=>{const text=document.createElement('figcaption');text.textContent=img.alt+'：画像を読み込めませんでした。';item.replaceChildren(text);};
   img.addEventListener('error',missing,{once:true});item.append(img);
   if(file)img.src='../images/'+folder+'/'+encodeURIComponent(file);else missing();
   const button=document.createElement('button');button.type='button';button.dataset.id=row.id;
   if(folder==='character_list'){
    button.className='character-select';button.setAttribute('aria-label',row.name+'を選択');button.setAttribute('aria-pressed','false');
    if(characterSkills.has(String(row.id))){button.setAttribute('aria-describedby','character-skill-tooltip');button.addEventListener('mouseenter',()=>showSkillTooltip(button,row));button.addEventListener('mouseleave',scheduleHideSkillTooltip);button.addEventListener('focus',()=>showSkillTooltip(button,row));button.addEventListener('blur',scheduleHideSkillTooltip);button.addEventListener('wheel',event=>{if(skillTooltip.hidden)return;const previous=skillTooltip.scrollTop;skillTooltip.scrollTop+=event.deltaY;if(skillTooltip.scrollTop!==previous)event.preventDefault();},{passive:false});}
    button.addEventListener('click',()=>selectCharacter(row));
   }else{
    button.className='chip-select';button.dataset.name=row.name;button.title=row.name+'\n'+row.effect;button.setAttribute('aria-label',row.name+'：'+row.effect+'。取得する');button.setAttribute('aria-pressed',String(Boolean(selectedCharacter&&state().chips.includes(row.id))));
    button.addEventListener('click',()=>{
     if(!selectedCharacter){chipStatus.textContent='先にキャラクターを選択してください。';return;}
     chipStatus.textContent='';
     if(state().chips.includes(row.id)){
      state().chips=state().chips.filter(id=>id!==row.id);delete state().modes[row.id];
      for(const [key,triggers] of [['attack',['on_attack','on_attack_after_mark']],['move',['on_next_move']]]){
       if(!state().chips.some(id=>(byChip.get(id)||[]).some(rule=>triggers.includes(rule.trigger))))state().phases[key]=false;
      }
     }
     else{state().chips.push(row.id);state().phases??={attack:false,move:false};state().phases.attack=false;}
     renderSelectedCharacter();
    });
   }
   button.append(item);target.append(button);
  }
 }
 const mapPicker=document.getElementById('mp-map-select');
 function renderChips(){
  const mapSpecific=category==='マップ固有';
  const mapId=mapPicker.value;
  const matching=chips.filter(row=>mapSpecific
   ? Boolean(mapId)&&String(row.category).split('|').some(id=>id.trim()===mapId)
   : String(row.category).trim()===category);
  renderImages(document.getElementById('chip-image-list'),matching,'chip','images');
  updateChipListSelection();
  document.getElementById('chip-category-view').scrollTop=0;
 }
 mapPicker.addEventListener('change',()=>{currentOpponent=null;if(category==='マップ固有')renderChips();if(selectedCharacter){renderConditions();updateStats();}});
 clearCharacterAttackPhase=()=>{if(!selectedCharacter)return;state().phases??={attack:false,move:false};if(!state().phases.attack)return;state().phases.attack=false;renderConditions();updateStats();};
 applyCharacterTurnStartEffects=()=>{if(!selectedCharacter||!state().chips.includes('57'))return;const charge=number(state(),'チャージ');if(charge>=6)return;state().numbers['チャージ']=6;renderConditions();updateStats();};
 document.querySelectorAll('.role-tab').forEach(tab=>tab.addEventListener('click',()=>{if(tab.dataset.role==='map'||tab.dataset.role==='character')clearCharacterAttackPhase();}));
 window.addEventListener('character-opponent-change',event=>{currentOpponent=event.detail;if(selectedCharacter){renderConditions();updateStats();}});
 applyAttackTargetEffects=enemy=>{if(!selectedCharacter||!enemy||enemy.defeated)return;state().phases??={attack:false,move:false};state().phases.attack=true;const ids=new Set(state().chips);const markGain=(ids.has('36')?1:0)+(ids.has('37')?1:0);if(markGain)enemy.markStacks=(enemy.markStacks||0)+markGain;currentOpponent={name:enemy.name,mapId:enemy.mapId,markStacks:enemy.markStacks||0};};
 function wireTabs(tablist,onSelect){
  const tabs=[...tablist.querySelectorAll('[role="tab"]')];
  const select=tab=>{tabs.forEach(b=>{b.setAttribute('aria-selected',String(b===tab));b.tabIndex=b===tab?0:-1;});onSelect(tab);};
  tabs.forEach((tab,index)=>{
   tab.addEventListener('click',()=>select(tab));
   tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus();select(tabs[next]);});
  });
 }
 wireTabs(root.querySelector('.character-subtabs'),tab=>{document.getElementById('character-list-view').hidden=tab.id!=='character-list-tab';document.getElementById('character-chip-view').hidden=tab.id!=='character-chip-tab';});
 wireTabs(root.querySelector('.chip-category-tabs'),tab=>{category=tab.dataset.category;document.getElementById('chip-category-view').setAttribute('aria-labelledby',tab.id);renderChips();});
 async function load(kind,file,status){
  if(location.protocol==='file:')return parseMapCSV(CHARACTER_CSV_SNAPSHOT[kind]);
  try{const response=await fetch('../csv/'+file,{cache:'no-cache'});if(!response.ok)throw Error(file);const rows=parseMapCSV(await response.text());if(rows.length&&!Object.hasOwn(rows[0],'id'))throw Error('Missing id');return rows;}
  catch(error){status.textContent='CSVを取得できないため、同梱データを表示しています。';return parseMapCSV(CHARACTER_CSV_SNAPSHOT[kind]);}
 }
 function parseRules(text){
  if(!text.split(/\r?\n/,1)[0].includes('\t'))return parseMapCSV(text);
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(line=>line.split('\t'));
  const headers=lines.shift();return lines.map(values=>Object.fromEntries(headers.map((header,i)=>[header,values[i]||''])));
 }
 async function loadRules(){
  if(location.protocol==='file:')return CHIP_RULES_SNAPSHOT;
  try{const response=await fetch('../csv/chip_stat_rules.csv',{cache:'no-cache'});if(!response.ok)throw Error('chip_stat_rules.csv');return parseRules(await response.text());}
  catch(error){chipStatus.textContent='ルールCSVを取得できないため、同梱データを表示しています。';return CHIP_RULES_SNAPSHOT;}
 }
 async function loadStatusIcons(){
  let csv=STATUS_ICON_SNAPSHOT;
  if(location.protocol!=='file:'){
   try{const response=await fetch('../csv/status_icon_map_all.csv',{cache:'no-cache'});if(!response.ok)throw Error('status_icon_map_all.csv');csv=await response.text();}
   catch(error){console.warn('アイコン対応CSVを取得できないため、同梱データを使用します。',error);}
  }
  const rows=parseMapCSV(csv);
  mapKeywords=rows.filter(row=>row.group==='マップ固有'&&row.map_id&&['number','checkbox'].includes(row.input_kind));
  return new Map(rows.filter(row=>['number','checkbox'].includes(row.input_kind)&&/^(?:chip_icon\/)?[^/\\]+\.png$/i.test(row.icon_file)).map(row=>[row.effect_key,row.icon_file]));
 }
 async function loadCharacterSkills(){
  let csv=CHARACTER_SKILLS_SNAPSHOT;
  if(location.protocol!=='file:'){
   try{const response=await fetch('../csv/character_skills.csv',{cache:'no-cache'});if(!response.ok)throw Error('character_skills.csv');csv=await response.text();}
   catch(error){console.warn('キャラクター能力CSVを取得できないため、同梱データを使用します。',error);}
  }
  return new Map(parseMapCSV(csv).filter(row=>row.id&&row.ability).map(row=>[row.id,row.ability]));
 }
 Promise.all([load('characters','character_stats.csv',listStatus),load('chips','chip_list.csv',chipStatus),loadRules(),loadStatusIcons(),loadCharacterSkills()]).then(([a,b,c,d,e])=>{
  characters=a;chips=b;rules=c;statusIcons=d;characterSkills=e;
  for(const rule of rules){if(!byChip.has(rule.chip_id))byChip.set(rule.chip_id,[]);byChip.get(rule.chip_id).push(rule);}
  renderImages(document.getElementById('character-image-list'),characters,'character_list','list_img');renderChips();
 });
})();
