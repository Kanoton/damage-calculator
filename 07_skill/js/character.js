// ===== キャラクター・チップ =====
(()=>{
 const root=document.getElementById('character-panel');
 const listStatus=document.getElementById('character-list-status'),chipStatus=document.getElementById('character-chip-status');
 const selectedPanel=document.getElementById('selected-character');
 const conditionsBox=document.getElementById('selected-character-conditions');
 const ownedBox=document.querySelector('.selected-character-chips');
 const hpInput=document.getElementById('selected-character-current-hp');
 const STATUS_ICON_SNAPSHOT="group,effect_key,input_kind,icon_file,map_id,atk,def,move,damage_reduce,condition\r\nスタック,コイン,number,スターライト.png\r\nスタック,マーク,number,マーク.png\r\nスタック,ヒール,number,ヒール.png\r\nスタック,チャージ,number,チャージ.png\r\nスタック,改造,number,改造.png\r\nスタック,ジェントル・フレイム,number,ジェントル・フレイム.png\r\nスタック,反撃,number,Reflect.png\r\nスタック,マインド,number,chip_icon/201_スタンガン.png\r\nスタック,罪証,number,罪証.png\r\n所持数,スターコイン,number,Coin.png\r\n蓄積ボーナス,優雅の羽ボーナス,number,chip_icon/021_優雅の羽.png\r\n蓄積ボーナス,ギガントアンカーボーナス,number,chip_icon/101_ギガントアンカー.png\r\n蓄積ボーナス,呪いの剣ボーナス,number,chip_icon/111_呪いの剣.png\r\n蓄積ボーナス,反撃による永続ボーナス,number,Reflect.png\r\n蓄積ボーナス,鴛鴦連理解除ボーナス,number,鴛鴦連理.png\r\n蓄積ボーナス,マインド増加ボーナス,number,chip_icon/207_原初の意識.png\r\n蓄積ボーナス,マインド減少ボーナス,number,chip_icon/207_原初の意識.png\r\nマップ固有,真犯人,checkbox,真犯人.png,MAP0104,2,0,2,2,\r\nマップ固有,逆鱗,number,逆鱗.png,MAP0005,2,0,0,2,\r\nマップ固有,金鱗,number,金鱗.png,MAP0005,1,1,0,0,\r\nマップ固有,孔雀の羽ばたき,number,孔雀の羽ばたき.png,MAP0007,2,2,0,0,excess_over_peacock\r\n追加素材,深層改造,未設定,深層改造.png\r\n追加素材,戦の呪い,未設定,戦の呪い.png\r\nマップ固有,勇往邁進,number,勇往邁進.png,MAP0007,2,0,0,2,\r\nキャラクター固有,自己主張なし攻撃補正,number,UT_Buff/UT_Buff_105_Break.png\r\nキャラクター固有,自己主張なし防御補正,number,UT_Buff/UT_Buff_105_Break.png\r\nキャラクター固有,自己主張なし移動補正,number,UT_Buff/UT_Buff_105_Break.png\r\n";
 let statusIcons=new Map(),mapKeywords=[];
 let currentOpponent=null;
 const CHARACTER_SKILLS_SNAPSHOT="id,name,ability\r\n1,\"ミミ\",\"スキル - 商品補充［CT 3］\n全ての手札を捨て、元の手札数+1のカードを引く。\n\nパッシブスキル - リサイクル\n1枚のバトルカードを捨てるごとに、1コインを獲得する。\n累計で手札を25枚獲得するたびにチップを1つ得る。\"\r\n2,\"パルナン\",\"スキル - ネットショッピング［CT 2］\n遠隔でショップのカードを購入する。\n\nパッシブスキル - 伝説商人\nショップで購入できるバトルカード数+1、ショップに入るたびスターコイン+1。\nショップに並ぶカードの枚数も+1され、全てのカードが10%の確率で値段1コインに変更される。\nパルナンが「振り込み」を行った後は、ショップのカード1枚の値段が1コインに変更される。\"\r\n3,\"ファニィ\",\"スキル - トラブル・メーカー［CT 3］\n2つのマップイベントから1つを選んで発動する。\n\nパッシブスキル - 盲点発現！\nファニイがイベントを発生させるたびに、スターコインを3獲得する。\"\r\n4,\"アランナ\",\"スキル - アイアン・メイデン［CT 3］\nこのターン、戦闘・罠によるダメージと反撃を無効化する。\n自身から攻撃することはできる。\n\nパッシブスキル - 勇気を出す！\n前回のターンでダメージを受けていない場合、攻撃力+3。\nスタック不可、ダメージを受けるとクリア。\"\r\n5,\"コマチ\",\"スキル - 忍術連撃［CT 3］\n1ターンの間、効果カードを追加で1枚使用できる。\n\nパッシブスキル - コピーニンジャ\n効果カードを3枚使用するごとに、最後に使用した効果カードを手札にコピーする。\n同時にCT-1、効果カードのダメージ+1。\"\r\n6,\"パッドマン\",\"スキル - マジで怒ったぞ［CT 3］\n1ターンの間、パッシブスキルの効果が最大値で発動する。\n\nパッシブスキル - 自己主張なし\n各ターンごとに、既存の基準値以上で属性が増減する：攻撃力-2～2、防御力-2～2、移動ダイス-2～2。\n攻撃時のダイスの出目が6の場合、相手の防御力を無視する。\n出目が2未満の場合は、次の攻撃時のダイスの出目を6にする。\"\r\n7,\"パパラ\",\"スキル - ひとくちだけ［CT 3］\n戦闘で与えたダメージの半分を回復する。\nスキルの持続時間中はHPが半分未満であると見なす。\n\nパッシブスキル - 可愛さは正義\n現在のHPが最大HPの半分以下の場合、攻撃力+3。\"\r\n8,\"レン\",\"スキル - 子供の特権［CT 3］\nキャラクターを指定し、カードを1枚引かせジュジュシールドを付与する。\n※ジュジュシールド効果：次に受けるダメージ-99\n\nパッシブスキル - ジュジュさん、助けて！\n味方にスキルを使った時、目標のHPが50%以下の場合、自身もカードを引き、ジュジュシールドを得る。\nジュジュシールドをキャラクターに与えたとき、反撃効果（1回）も与える。\"\r\n9,\"Z3000\",\"スキル - 引き寄せる［CT 4］\n7マス以内のモンスターを引き寄せ、5ダメージを与える。\n攻撃力が7以上でスキルを使用した場合、対象モンスターに攻撃できる。\n\nパッシブスキル - 回収利用\nモンスター撃破時にCT-2。\nモンスターを2体撃破するたびに攻撃力+1。\"\r\n10,\"パンダマン\",\"スキル - 食べ放題［CT 3］\nチョコレートケーキまたはハンバーガーのどちらか1枚のカードを獲得する。\n5マス以内の全てのモンスターを1ターンの間、挑発状態にする。\n\nパッシブスキル - 善きも悪しきもある\nハンバーガーまたはチョコレートケーキ使用後、周囲5マス以内の他キャラクターのHP+2。\n「食べ物」を消費する時にカウンターを1スタック獲得し、消費したものがハンバーガーなら最大HP+2も得る。\nカウンター攻撃時は、このターンに受けたダメージ分だけ攻撃力が上昇する。\"\r\n11,\"ルル\",\"スキル - 癒しの粘液［CT 3］\nキャラクターを指定し、【ヒール】を3スタック付与する。\n対象から4マス以内にいる全モンスターの次の行動時の移動力を-3する。\n\nパッシブスキル - 細胞分裂\nダメージを受けた後、【ヒール】+1スタック、CT-1。\nターン終了時に【ヒール】を2スタック失うごとに3マス以内のランダムな位置へ【ミニスライム】を1個生成する。最大2個。\nキャラクターが【ミニスライム】を通過するとそれを消費し、HP+1と【ヒール】+1スタックを得る。\"\r\n12,\"ヒメ\",\"スキル - 気功修練［CT 3］\nHP+2、エネルギー保存が発動中の場合、このターンの間攻撃力+4を得る。\n\nパッシブスキル - エネルギー保存\n自分のターンに戦闘を行わなかった場合、ターン終了時にエネルギー保存を得る。\nエネルギー保存は攻撃力+2、防御力+2の効果を持ち、次回の攻撃終了まで有効で、最大5スタックまで蓄積できる。\nモンスターを通過して戦闘を行わなかった場合は、2スタック獲得する。\n攻撃時に5スタックある場合、追加で2スタックを消費し、その攻撃で与えたダメージの88%を追加で2マス以内の敵に与える。\n\nパッシブスキル - 以心伝心\nスキル使用時、ユメが符カード-福1枚手札に加える。\"\r\n13,\"カイセイ\",\"スキル - フェイト・エコー［CT 3］\nモンスター1匹をマークし、その受けるダメージ+1。2ターン継続。\n効果中にそのモンスターが気絶すると、カイセイはコインを3枚得る。\nスキル使用時、手札の全てのリモコンダイスを運命の導きに変える。\nマークされたモンスターを撃破したキャラクターは運命の導きを得る。\n\nパッシブスキル - 幸運な番号\n移動ポイントが6なら、6枚のコインを得る。\"\r\n14,\"ミサキ\",\"スキル - 桜裂空斬［CT 3］\n6マス以内のモンスターを指定して2ダメージを与え、剣気を1つ得る（最大3スタック）。\n剣気が満タンの状態で使用すると2スタックを消費してカード「名刀：ガオー切り」を1枚得て、そのバトルコストを-1する。\n\nパッシブスキル - 剣気\n戦闘中、自身の攻撃命中や回避成功すると剣気1つを得る。最大3スタック\n自身がスタン時に全ての剣気スタックを失う。\"\r\n15,\"ナーディス\",\"スキル - クィーン プリビレッジ［CT 3］\n一時的に3枚の手札を得る、この手札をターン終了時に捨てる。\n\nパッシブスキル - プレッシャー\n戦闘時自分の手札は相手より多い場合、多い手札の1枚につき自分の攻撃力+1。\n最大攻撃力+3。\"\r\n16,\"ジャスミン\",\"スキル - オーバードライブ［CT 4］\n1ターンの間、防御力-3、移動ステップ数+3。\n使用後、次の移動ダイスの出目が10以上ならそのターンの攻撃力+2、10未満なら防御力+2。\n\nパッシブスキル - チャージステップ\n累計移動ステップ数が13スタック増加するごとに、攻撃力と防御力が交互に1ずつ増加する。\n疾走マスを踏んだ時、CT-2。\"\r\n17,\"ルカ\",\"スキル - 真夜の一閃［CT 3］\n次の移動時に6面ダイスを2個振ります、移動時に経過するモンスターに自身攻撃力+2のダメージ。\n（スキル使用時に戦闘不可）\n\nパッシブスキル - 攻めの姿勢\n1ターンに1回、セーフティポイントを経過または滞在時にCT-2。\"\r\n18,\"ナンシーロー\",\"スキル - ハッキング［CT 3］\nモンスターを指定して強制戦闘を仕掛ける。\nこの交戦ではパッシブスキルによるカードを捨てる効果は発動しない。\n対象がナンシー・ローから3マス以上離れている場合、この戦闘では反撃されない。\n使用時に対象との距離が6マスより遠い場合、バトルカードを1枚獲得し、1ターンの間、ファイアウォールを得る。\n\nパッシブスキル - ファイアウォール\nターン開始時2マス以内にモンスターがいない場合、バトルカードを1枚獲得し、ファイアウォールを得る。1ラウンド継続。。\n自身が仕掛けた戦闘終了後、手札が6枚以上ならバトルカードをランダムに1枚捨てる。\n\n\nファイアウォール\n攻撃力+2、防御力+2。\n2マスより遠いモンスターから受けるダメージ-1。\"\r\n19,\"メガス\",\"スキル - 軌道エアバースト［CT 3］\n3マス以内のマスを選んでワープし、全ての手札を捨てて軌道エアバーストを発動する。\nカードを2枚捨てるごとに、6マス以内のランダムなモンスターに3ダメージを与える。\n捨てたカードにバトルカードが含まれる場合は、そのバトルコストに応じてダメージを強化する。\nバトルコスト1でダメージ+1、バトルコストが3増加するごとに追加ダメージ+1。\n使用後にカードを1枚獲得する。\n捨てたカードが6枚以上の場合は、獲得するカードが軌道レールキャノンに変わる。\n軌道レールキャノン使用後、バトルカードを1枚引き、そのコスト分のダメージを対象と周囲2マス以内のモンスターに与え、精確照準を付与する。\n\nパッシブスキル - リサプライ\nターン終了時、手札数が6より少ない場合、カード1枚を得る。\n\n精確照準\n【軌道エアバースト】で与えるダメージ+1。\"\r\n20,\"ユメ\",\"スキル - 白沢よ、福を与えよ［CT 3］\n白沢よ、福を与えよを使用時に、ターゲットに1ターンの間、余分の治療量を攻撃力に変換を与え、符カード-福を1枚手札に加える、手札にある全ての符カード-禍を符カード-福に転換。\n\nパッシブスキル - 禍福倚伏\nダイスの出目が1の場合、符カード-禍1枚手に入る、ダイスの出目が6の場合、符カード-福1枚手に入る。\n\nパッシブスキル - お手伝い完璧\nヒメに符カード-福を使った時、ヒメのエネルギー保存が発動。\"\r\n21,\"アル\",\"スキル - 強者の機欄［CT 3］\nキャラクターを指定し、1～3枚のカードを与え、与えた枚数と同量の「スターコイン」を獲得。\n\nパッシブスキル - ウィンウィン\n他キャラクターにカードを与える時、双方にスターライト+1。\n自身のスターライトが6スタック毎に攻撃力+1、防御力+1。\"\r\n22,\"リン\",\"スキル - ライフ・ブック［CT 3］\nライフ・ブックを1枚得る、このターンの間、全ての効果カードの効果距離+3。\n\nパッシブスキル - 調査結果\nイベント発生時、ライフ・ブック1枚得る。\nライフ・ブックを使用するたびに、ライフ・ブックのダメージが1上昇する。\"\r\n23,\"テル\",\"スキル - 三神憑依［CT 3］\nキャラクターを1人指定し、1ターンの間、そのキャラクターを三神憑依状態にする。\nテルの攻撃力と防御力に、三神憑依状態のキャラクターの攻撃力と防御力の半分を加える。\n三神憑依状態のキャラクターが攻撃する際、テルに狐光が1スタック消費して追加攻撃する。\n\nパッシブスキル - 狐火\nテルまたは三神憑依状態のキャラクターがコスト2以上の攻撃カードを使用すると、テルは狐光を1スタック獲得する。\n\n狐光\n1スタックにつき、追加攻撃の攻撃力+1。\"\r\n24,\"モーゼス\",\"スキル - 弱点反撃［CT 2］\nモンスター1体を選択し、「弱点」を付与する。\n「弱点」を持つモンスターがモーゼスに攻撃を行う場合、モーゼスは反撃する。\n\nパッシブスキル - 精確無比\n回避/反撃成功時、精確無比を+1（最大3スタック）する。\n\n弱点\nモーゼスと交戦時、そのモンスターの戦闘ダイスの出目を0にする。\n\n精確無比\n1スタックごとに攻撃力+2、回避ダイスの最小出目+1。\nターン終了時に1スタック減少。\"\r\n25,\"真夢梓\",\"スキル - 連鎖反応［CT 3］\n真夢梓が噛みつく1枚獲得する、5マス以内の味方キャラクター全員がカード1枚得る。\n対象キャラクターの手札が4より少ない場合、更にもう1枚得る。\n\nパッシブスキル - 水海の主\n他のキャラクターにカードを与えた時、覚醒スタック+1。\n覚醒が8スタックに達した時、真龍を獲得する。\n真龍の時、手札にある噛みつくとスキルで獲得する噛みつくが龍の咆哮に変化する。\n\n真龍\n攻撃力+4。スキルの範囲を無制限にする。\"\r\n26,\"スミカゲ\",\"スキル - 暗影融合［CT 3］\n【影】を1つ選択してテレポートし、その後全ての【影】を吸収する。\n【影】を1つ吸収するごとに、1ターンの間、自身の攻撃力+1。\n\nパッシブスキル - シャドウツイン\nターン開始時と攻撃命中時、スミカゲがいるマスに【影】を配置する、2ターン継続。\n敵キャラクターまたはモンスターが【影】の上に滞在すると、1ダメージを受ける。\"\r\n27,\"ボニー\",\"スキル - ミッション：インシークレット［CT 3］\nモンスター1体を調査対象とし、【マーク】+1を付与する。\n更に対象モンスターのマークスタック数×2のスターコインを獲得する。\n\nパッシブスキル - 真実への鍵\n【潜入調査】をマップイベントに追加する。\n【マーク】を持つモンスターを攻撃するとき、攻撃力+3。\n【マーク】を持つモンスターを倒したとき、バトルカードを1枚得る。\n\n調査対象\n撃破時に【潜入調査】を発動し、次の段階へ侵攻。\n\n潜入調査\nフェーズ・ワン\nボニーの6マス以内のボス以外の敵全員に【マーク】を1スタック付与する。\nボニーと発動プレイヤーは1ターンの間、潜伏を獲得する。\nフェーズ・ツー\nボニーの6マス以内のボス以外の敵全員に【マーク】を1スタック付与する。\nボニーと発動プレイヤーはバトルカードを1枚獲得し、1ターンの間、潜伏を獲得する。\nフェーズ・スリー\nボス以外の敵全員に【マーク】を1スタック付与する。\nボニーと発動プレイヤーはバトルカードを1枚獲得し、1ターンの間、潜伏を獲得する。\n真相解明\nボスに【マーク】を2スタック付与する。\n全キャラクターはバトルカードを1枚獲得し、1ターンの間、潜伏を獲得する。\n\n\n潜伏\nモンスターへ攻撃するとき、【マーク】スタック分攻撃力を増加。\n戦闘終了後この効果を解除する。\"\r\n28,\"リンリン\",\"スキル - インターセプトタックル［CT 3］\n1～7から数字を選び、それをインターセプトタックルの移動距離にする。\n次の移動をタックルに変えて即発動。\nタックル中、通ったモンスターを全員終点まで弾き飛ばす。\n停止後、弾き飛ばした順にバトルできる。\nタックル中にエリア拒止を通ると、タックルされたモンスターの防御力が-2、自分の攻撃力+2（2ターン継続）。\n\nパッシブスキル - インターセプター\n自身のロードブロックがエリア拒止に変化。\nゲーム開始時、エリア拒止を2枚追加獲得。\nロードブロック通過後、エリア拒止を1枚獲得する。\"\r\n29,\"サイクス\",\"スキル - アビサルゾーン［CT 3］\n4マス以内のマスを1つ選択し、「テンタクルアビサル」を1体生成。\nさらに、そのマスから2マス以内の全てのマスを一時的に「アビサルゾーン」に変換する。\nその後、アビサルゾーン内の全てのテンタクルアビサルを作動させる。\nアビサルゾーンに何らかの形で侵入したモンスターは、次の移動力が-2される。\nアビサルゾーンはサイクスのターン開始時に消失する。\n\nパッシブスキル - テンタクルアビス\n自身がダメージを与えた時に、対象に1ターンの間、アビスエロージョンマークを1スタック付与する。\nターン終了時、自身がいるマスに「テンタクルアビサル」を1体生成する。\nその後、3マス以内の全ての「テンタクルアビサル」を作動させる。\n\nテンタクルアビサル\n周囲2マス以内の全てのモンスターに1ダメージを与え、その後、移動力減少効果を受けているモンスターに1ターンの間、アビスエロージョンマークを1スタック付与する。\n永続的に存在し、1つのマスに最大1体まで存在する。\"\r\n101,\"超てんちゃん\",\"スキル - インターネットエンジェル［CT 3］\nコインを1枚得る。\n場にいる「ファン」状態のモンスター1体につき、追加でコインを1枚得る（最大10コイン）。\n場にいる「ファン」状態のモンスターとキャラクターが3体以上の場合、HPを3回復する。\nスキル使用時に「ファン」が9体以上いる場合、フィールド上の全てのファンの攻撃力を-1（永続、重複不可）し、他の味方キャラクターは3スターコインを獲得する。\n\nパッシブスキル - ジェルばんは\n超てんちゃんを攻撃するキャラクターやモンスターは「ファン」状態にされます。\n「ファン」状態の敵が超てんちゃんを攻撃する際、攻撃力-1。\n\nパッシブスキル - 一心同体\n超てんちゃんとあめちゃんのパッシブスキルは共有される。\"\r\n102,\"あめちゃん\",\"スキル - 愛情の過剰摂取［CT 3］\nこのターン、「愛」の数に応じた移動ボーナスを得、同量のHPを回復し、その後、「愛」を4層減少させる。\n使用時に「愛」が4以上ある場合、自身の最大HP+1、愛の上限+1。\n\nパッシブスキル - 愛が愛を重すぎる\nダメージを受けるたびに「愛」を獲得。最大4スタック。\n愛の初期値は2スタック。\n\nパッシブスキル - Two hearts beat as one\n超てんちゃんとあめちゃんのパッシブスキルは共有される。\"\r\n103,\"ジル\",\"スキル - カクテルを作る［CT 3］\nキャラクターを1名選び、手札のカード3枚で作ったカクテルを提供する。\n選んだカードの種類に応じ、対象に次の効果を与える。\n- 効果カードや呪いカード：HPを1回復\n- 攻撃カード：攻撃力+1（このターンのみ）\n- 防御カード：防御力+1（このターンのみ）\n選んだカードを捨て、同じ枚数のカードをドローする。\n\nパッシブスキル - 一生を変えるカクテル\nカクテルを作る時、種類が違うカードを3つ使う場合、ジルがスターコイン+3。\n同じ種類のカードを3つ使う場合、このターン目標の移動ダイスの出目+3。\"\r\n104,\"ドロシー\",\"スキル - 本当の私［CT 2］\n味方キャラクターを選択してその位置にワープする、このターン、味方キャラクターに通り過ぎる時、自身とそのキャラクターの攻撃力を+1（重複しない、自身への効果は1ターンに1回のみ）。\n「温もり」が5の場合、このターンの自身の攻撃力に防御力と同じ数を上乗せする、その後「温もり」を全て消耗する。\n\nパッシブスキル - 社交界の蝶\nHPを回復する時、「温もり」を+1。\n「温もり」1つにつき、防御力が1上昇する（最大5スタック）。\nドロシーが他のキャラクターを通り過ぎる時、自身とそのキャラクターのHPを1ずつ回復する。\"\r\n105,\"遠野ハンナ\",\"スキル - 浮遊魔法［CT 3］\n1ラウンドの間、浮遊を獲得する。\n\nパッシブスキル - 空想令嬢\n移動ダイスの出目が6以上の時、スターコインを1枚獲得する。\n味方キャラクターを通過する時、スターコインを1枚獲得し、人形制作を1スタック獲得する。\n浮遊を保有している状態で味方キャラクターを通過する時、スターコインが3コイン以上あれば、3コインを振り込む。\n人形制作が7スタックに達した時、遠野ハンナは人形完成を獲得する。\n\nパッシブスキル - 親友の祝福\n橘シェリーを通過する時、橘シェリーに次の移動力+2と推理タイムを1スタック付与する。\n\n人形完成\n味方キャラクターを通過すると、その味方キャラクターに次の移動力+2を付与する。\"\r\n106,\"橘シェリー\",\"スキル - 怪力魔法［CT 2］\n3マス以内の全てのモンスターを7マス以内のマスに投げ飛ばす。\nそのマスにいる全てのモンスターに2ダメージを与える。\n\nパッシブスキル - 探偵様出撃\nモンスターへ攻撃後、推理タイムを1スタック獲得する。最大4スタック。\n\nパッシブスキル - 親友を守る\n遠野ハンナが橘シェリーの4マス以内にいる場合、遠野ハンナの受けるダメージ-1。\n\n推理タイム\n1スタックごとに攻撃力+1。ターン終了時に-1。\"\r\n";
 let characterSkills=new Map();
 let characters=[],chips=[],rules=[],category='マーク',selectedCharacter=null;
 const states=new Map();
 const byChip=new Map();
 const specialIcons={'対象のマーク':'マーク','攻撃対象はモンスター':'モンスター','クジャク係の羽ばたき':'孔雀の羽ばたき'};
 const getState=id=>{if(!states.has(id))states.set(id,{level:0,currentHp:null,chips:[],numbers:{},modes:{},phases:{attack:false,move:false},manual:{atk:0,def:0},skillCooldowns:{},activeEffects:[],maxHpBonus:0,controlMaxBonuses:{}});const value=states.get(id);value.skillCooldowns??={};value.activeEffects??=[];value.maxHpBonus??=0;value.controlMaxBonuses??={};return value;};
 const state=()=>getState(selectedCharacter.id);
 window.hasSelectedCharacter=()=>Boolean(selectedCharacter);
 hasSelectedCharacter=window.hasSelectedCharacter;
 window.captureCharacterEvidence=()=>selectedCharacter?{id:selectedCharacter.id,count:number(state(),'罪証')}:null;
 window.restoreCharacterEvidence=snapshot=>{if(!snapshot)return;getState(snapshot.id).numbers['罪証']=snapshot.count;if(selectedCharacter?.id===snapshot.id){renderConditions();updateStats();}};
 window.getCharacterEvidenceStack=()=>selectedCharacter?number(state(),'罪証'):0;
 window.setCharacterEvidenceStack=value=>{if(!selectedCharacter)return;state().numbers['罪証']=Math.max(0,Math.floor(Number(value)||0));renderConditions();updateStats();window.dispatchEvent(new Event('character-evidence-change'));};
 const number=(s,key)=>Math.min(key==='チャージ'?10:Infinity,Math.max(0,Number(s.numbers[key])||0));
 const abilityRules=()=>CHARACTER_ABILITY_RULES[String(selectedCharacter?.id)]||null;
 const abilityControlValue=key=>{const stored=state().numbers[key];if(stored!==undefined)return Number(stored)||0;const control=abilityRules()?.controls?.find(item=>item.key===key);return Number(control?.default)||0;};
 const activeSkill=()=>abilityRules()?.activeSkills?.[0]||null;
 const activeSkillMaxCooldown=skill=>Math.max(0,(Number(skill?.cooldown)||0)-(state().chips.includes('15')?1:0));
 const activeSkillCooldown=skill=>Math.min(activeSkillMaxCooldown(skill),Math.max(0,Number(state().skillCooldowns?.[skill?.key])||0));
 const activeEffectConditionMatches=condition=>!condition||(condition.key&&(condition.equals!==undefined?abilityControlValue(condition.key)===Number(condition.equals):abilityControlValue(condition.key)>=(Number(condition.min)||0)));
 const activeEffectAllowed=effect=>activeEffectConditionMatches(effect.when)&&(!effect.unless||!activeEffectConditionMatches(effect.unless));
 const activeSkillStatBonus=stat=>(state().activeEffects||[]).filter(effect=>effect.type==='modify_stat'&&effect.target==='self'&&effect.stat===stat&&activeEffectConditionMatches(effect.when)).reduce((sum,effect)=>sum+(effect.resolvedValue!==undefined?Number(effect.resolvedValue):(effect.sourceKey?abilityControlValue(effect.sourceKey)*(effect.multiplier===undefined?1:Number(effect.multiplier)):(Number(effect.value)||0))),0);
 const activeConditionForced=key=>(state().activeEffects||[]).some(effect=>effect.type==='force_condition'&&effect.key===key);
 const abilityConditionMatches=condition=>{
  if(!condition)return true;
  if(condition.key==='current_hp_ratio<=')return activeConditionForced('current_hp_ratio<=')||(state().currentHp!==null&&state().currentHp<=base('hp')*Number(condition.value));
  if(condition.key==='target_mark')return (Number(currentOpponent?.markStacks)||0)>=(Number(condition.min)||0);
  return abilityControlValue(condition.key)===Number(condition.equals);
 };
 const abilityModifierValue=rule=>{
  if(!abilityConditionMatches(rule.when))return 0;
  if(rule.formula==='fixed')return Number(rule.value)||0;
  const source=rule.source==='target_mark'?(Number(currentOpponent?.markStacks)||0):abilityControlValue(rule.source);
  if(rule.formula==='per_stack')return source*(Number(rule.value)||0);
  if(rule.formula==='floor_per_unit')return Math.floor(source/(Number(rule.unit)||1))*(Number(rule.value)||0);
  if(rule.formula==='alternating_steps'){
   const steps=Math.floor(source/(Number(rule.unit)||1)),order=Number(rule.order)||0;
   return Math.max(0,Math.ceil((steps-order)/2));
  }
  return 0;
 };
 window.getCharacterActiveSkillEffects=skillKey=>{const skill=activeSkill();return skill?.key===skillKey?(skill.effects||[]).map(effect=>({...effect})):[];};
 window.captureCharacterAbilityState=()=>selectedCharacter?{id:selectedCharacter.id,numbers:{...state().numbers},skillCooldowns:{...state().skillCooldowns},activeEffects:(state().activeEffects||[]).map(effect=>({...effect})),maxHpBonus:Number(state().maxHpBonus)||0,controlMaxBonuses:{...state().controlMaxBonuses}}:null;
 window.restoreCharacterAbilityState=snapshot=>{if(!snapshot)return;const target=getState(snapshot.id);target.numbers={...target.numbers,...snapshot.numbers};target.skillCooldowns={...target.skillCooldowns,...snapshot.skillCooldowns};target.activeEffects=(snapshot.activeEffects||[]).map(effect=>({...effect}));target.maxHpBonus=Number(snapshot.maxHpBonus)||0;target.controlMaxBonuses={...target.controlMaxBonuses,...snapshot.controlMaxBonuses};if(selectedCharacter?.id===snapshot.id){renderConditions();updateStats();}};
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
  const startingHp=base('hp')+(Number(state().maxHpBonus)||0);
  const maxBonus=active.filter(r=>r.target==='max_hp'&&triggerMatches(r)&&conditionMatches(r,startingHp)).reduce((sum,r)=>sum+valueOf(r,0),0);
  const maxHp=Math.max(1,startingHp+maxBonus);
  if(state().currentHp===null)state().currentHp=maxHp;
  state().currentHp=Math.max(0,Math.min(maxHp,Number(state().currentHp)||0));
  const result={atk:base('atk'),def:base('def'),move:base('move'),hp:maxHp,damageReduce:0,damageAdd:(currentOpponent?.markStacks>0?1:0)+(currentOpponent?.fateEchoStacks>0?1:0)};
  for(const rule of active){
   if(!['atk','def','move'].includes(rule.target))continue;
   if(!triggerMatches(rule)||!conditionMatches(rule,maxHp))continue;
   result[rule.target]+=valueOf(rule,maxBonus);
  }
  for(const rule of abilityRules()?.modifiers||[]){
   if(['atk','def','move'].includes(rule.target))result[rule.target]+=abilityModifierValue(rule);
  }
  for(const stat of ['atk','def','move'])result[stat]+=activeSkillStatBonus(stat);
  for(const rule of mapKeywords.filter(row=>row.map_id===mapPicker.value)){
   let stacks=rule.input_kind==='checkbox'?(state().modes[rule.effect_key]?1:0):number(state(),rule.effect_key);
   if(rule.condition==='excess_over_peacock')stacks=currentOpponent?.name==='クジャク係'&&currentOpponent.mapId===mapPicker.value?Math.max(0,stacks-number(state(),'クジャク係の羽ばたき')):0;
   for(const stat of ['atk','def','move'])result[stat]+=stacks*(Number(rule[stat])||0);
   result.damageReduce+=stacks*(Number(rule.damage_reduce)||0);
  }
  result.atk+=state().manual?.atk||0;
  result.def+=state().manual?.def||0;
  result.atk=Math.max(0,result.atk);result.def=Math.max(0,result.def);result.move=Math.max(0,result.move);
  return result;
 }
 function makeIcon(key){
  const file=statusIcons.get(key)||statusIcons.get(specialIcons[key]);
  if(!file)return Object.assign(document.createElement('span'),{className:'condition-fallback',textContent:key});
  const icon=document.createElement('img');icon.alt='';
  const path=file.startsWith('chip_icon/')||file.startsWith('UT_Buff/')?file:'icon/'+file;
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
   const field=createConditionPhaseView(label,Boolean(state().phases?.[key]),checked=>{
    state().phases??={attack:false,move:false};state().phases[key]=checked;updateStats();
   });
   conditionsBox.append(field);
  }
  for(const id of state().chips){
   if(!toggleable(id))continue;
   const chip=chips.find(row=>row.id===id);if(!chip)continue;
   const mode=Number(state().modes[id])||0;
   const button=createChipConditionToggleView(chip,id,mode,()=>{
    const focused=document.activeElement===button;
    state().modes[id]=(mode+1)%(id==='112'?4:2);renderConditions();
    if(focused)[...conditionsBox.querySelectorAll('.condition-toggle')].find(item=>item.dataset.chipId===id)?.focus();
    updateStats();
   });
   conditionsBox.append(button);
  }
  for(const control of abilityRules()?.controls||[]){
   if(control.type==='toggle'){
    const active=Boolean(abilityControlValue(control.key));
    conditionsBox.append(createCharacterAbilityToggleView(control.key,active,makeIcon(control.key),()=>{state().numbers[control.key]=active?0:1;renderConditions();updateStats();}));
   }else if(control.type==='choice'){
    const options=control.options||[],current=abilityControlValue(control.key),option=options.find(item=>Number(item.value)===current)||options[0];
    conditionsBox.append(createCharacterAbilityChoiceView(control.key,option,makeIcon(control.key),()=>{const index=Math.max(0,options.indexOf(option));state().numbers[control.key]=Number(options[(index+1)%options.length]?.value)||0;renderConditions();updateStats();}));
   }else if(control.type==='number'){
    const current=abilityControlValue(control.key);
    const effectiveMax=control.max===undefined?undefined:Number(control.max)+(Number(state().controlMaxBonuses?.[control.key])||0);
    const iconKey=control.iconAtMax&&effectiveMax!==undefined&&current>=effectiveMax?control.iconAtMax:control.key;
    const view=createConditionNumberView(control.key,current,makeIcon(iconKey));
    view.input.min=String(Number(control.min)||0);
    if(effectiveMax!==undefined)view.input.max=String(effectiveMax);
    const setValue=value=>{const min=Number(control.min)||0,max=effectiveMax===undefined?Infinity:effectiveMax;state().numbers[control.key]=Math.max(min,Math.min(max,Math.floor(Number(value)||0)));view.input.value=state().numbers[control.key];if(control.iconAtMax){const nextKey=state().numbers[control.key]>=max?control.iconAtMax:control.key;view.button.replaceChildren(makeIcon(nextKey));}updateStats();};
    view.button.addEventListener('click',()=>setValue(abilityControlValue(control.key)+1));
    view.button.addEventListener('contextmenu',event=>{event.preventDefault();setValue(abilityControlValue(control.key)-1);});
    view.input.addEventListener('change',()=>setValue(view.input.value));conditionsBox.append(view.item);
   }
  }
  for(const rule of mapKeywords.filter(row=>row.map_id===mapPicker.value&&row.input_kind==='checkbox')){
   const key=rule.effect_key,active=Boolean(state().modes[key]);
   const button=createMapConditionToggleView(key,active,makeIcon(key),()=>{
    state().modes[key]=active?0:1;renderConditions();updateStats();
   });
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
 function updateActiveSkillUi(){
  const skill=activeSkill(),controls=document.getElementById('selected-character-skill-controls'),button=document.getElementById('selected-character-skill'),ct=document.getElementById('selected-character-ct');
  controls.hidden=!skill;if(!skill)return;
  const cooldown=activeSkillCooldown(skill);state().skillCooldowns[skill.key]=cooldown;ct.textContent='CT '+cooldown+' / '+activeSkillMaxCooldown(skill);ct.title='CT上限 '+activeSkillMaxCooldown(skill)+'：左クリックで1減らす／右クリックで1増やす';ct.setAttribute('aria-label','CT '+cooldown+'、上限 '+activeSkillMaxCooldown(skill)+'：左クリックで1減らす、右クリックで1増やす');button.textContent='スキル';button.title=skill.label+'を発動';button.setAttribute('aria-label',skill.label+'を発動');button.disabled=cooldown>0;
 }
 function updateStats(){
  if(!selectedCharacter)return;
  const totals=calculate();
  hpInput.max=totals.hp;hpInput.value=state().currentHp;
  for(const stat of ['atk','def'])document.getElementById('selected-character-'+stat).value=totals[stat];
  for(const stat of ['hp','move'])document.getElementById('selected-character-'+stat).textContent=totals[stat];
  updateActiveSkillUi();
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
   const chargeDelta=chip.category==='チャージ'&&id!=='57'?({'51':2,'52':2,'53':2,'54':2,'55':-6,'56':-5,'58':-4}[id]||0):null;
   const item=createOwnedChipView(chip,chargeDelta,()=>{
    if(!chargeDelta)return;
    const charge=number(state(),'チャージ');
    if(chargeDelta<0&&charge<-chargeDelta)return;
    state().numbers['チャージ']=Math.max(0,Math.min(10,charge+chargeDelta));
    if(id==='56'){const skill=activeSkill();if(skill)state().skillCooldowns[skill.key]=Math.max(0,activeSkillCooldown(skill)-1);}
    renderConditions();updateStats();
   });
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
 const skillButton=document.getElementById('selected-character-skill'),ctButton=document.getElementById('selected-character-ct');
 const changeActiveSkillCooldown=delta=>{const skill=activeSkill();if(!skill)return;state().skillCooldowns[skill.key]=Math.min(activeSkillMaxCooldown(skill),Math.max(0,activeSkillCooldown(skill)+delta));updateStats();};
 ctButton.addEventListener('click',()=>changeActiveSkillCooldown(-1));
 ctButton.addEventListener('contextmenu',event=>{event.preventDefault();changeActiveSkillCooldown(1);});
 skillButton.addEventListener('click',()=>{
  const skill=activeSkill();if(!skill||activeSkillCooldown(skill)>0)return;
  if(skill.inputStats){
   const values={};
   for(const input of skill.inputStats){const raw=window.prompt(input.label,String(abilityControlValue(input.key)));if(raw===null)return;const value=Number(raw);if(!Number.isFinite(value)||value<0)return;values[input.key]=value;}
   Object.assign(state().numbers,values);
  }
  if(skill.target){window.dispatchEvent(new CustomEvent('character-skill-target-request',{detail:{target:skill.target,skillKey:skill.key,label:skill.label,characterId:selectedCharacter.id,multipleTargets:!!skill.multipleTargets}}));return;}
  applyActiveSkillEffects(skill);
  state().skillCooldowns[skill.key]=activeSkillMaxCooldown(skill);
  renderConditions();updateStats();
 });
 function applyActiveSkillEffects(skill){
  state().activeEffects=(state().activeEffects||[]).filter(effect=>effect.source!==skill.key);
  for(const effect of skill.effects||[]){
   if(!activeEffectAllowed(effect))continue;
   if(effect.type==='heal'&&effect.target==='self'){const maxHp=calculate().hp;state().currentHp=Math.min(maxHp,(Number(state().currentHp)||0)+(Number(effect.value)||0));continue;}
   if(effect.type==='heal_from_control'&&effect.target==='self'){const maxHp=calculate().hp;state().currentHp=Math.min(maxHp,(Number(state().currentHp)||0)+abilityControlValue(effect.sourceKey));continue;}
   if(effect.type==='increase_max_hp'){state().maxHpBonus=(Number(state().maxHpBonus)||0)+(Number(effect.value)||0);continue;}
   if(effect.type==='increase_control_max'){state().controlMaxBonuses[effect.key]=(Number(state().controlMaxBonuses[effect.key])||0)+(Number(effect.value)||0);continue;}
   if(effect.type==='modify_control'){const current=abilityControlValue(effect.key),next=Math.max(Number(effect.min)||0,Math.min(effect.max===undefined?Infinity:Number(effect.max),current+(Number(effect.delta)||0)));state().numbers[effect.key]=next;continue;}
   if(effect.type==='damage_monster')continue;
   state().activeEffects.push({...effect,...(effect.sourceKey?{resolvedValue:abilityControlValue(effect.sourceKey)*(effect.multiplier===undefined?1:Number(effect.multiplier))}:{}),source:skill.key});
  }
 }
 window.addEventListener('character-skill-target-resolved',event=>{
  const skill=activeSkill(),detail=event.detail||{};if(!skill||detail.characterId!==selectedCharacter.id||detail.skillKey!==skill.key||!detail.success||activeSkillCooldown(skill)>0)return;
  applyActiveSkillEffects(skill);state().skillCooldowns[skill.key]=activeSkillMaxCooldown(skill);renderConditions();updateStats();
 });
 setupCharacterNumberPad({selectedPanel});
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
 let skillTooltipController=null;
 const sorted=rows=>rows.slice().sort((a,b)=>Number(a.id)-Number(b.id));
 function renderImages(target,rows,folder,key){
  target.replaceChildren();
  for(const row of sorted(rows)){
    const {item,button}=createCharacterAssetView(row,folder,key);
   if(folder==='character_list'){
    button.className='character-select';button.setAttribute('aria-label',row.name+'を選択');button.setAttribute('aria-pressed','false');
    if(characterSkills.has(String(row.id))){button.setAttribute('aria-describedby','character-skill-tooltip');button.addEventListener('mouseenter',()=>skillTooltipController.show(button,row));button.addEventListener('mouseleave',skillTooltipController.scheduleHide);button.addEventListener('focus',()=>skillTooltipController.show(button,row));button.addEventListener('blur',skillTooltipController.scheduleHide);button.addEventListener('wheel',event=>{if(skillTooltipController.element.hidden)return;const previous=skillTooltipController.element.scrollTop;skillTooltipController.element.scrollTop+=event.deltaY;if(skillTooltipController.element.scrollTop!==previous)event.preventDefault();},{passive:false});}
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
 applyCharacterTurnStartEffects=()=>{
  if(!selectedCharacter)return;
  let changed=false;
  const beforeEffects=state().activeEffects.length;
  state().activeEffects=state().activeEffects.filter(effect=>effect.duration!=='turn').map(effect=>effect.durationTurns?{...effect,durationTurns:effect.durationTurns-1}:effect).filter(effect=>effect.durationTurns===undefined||effect.durationTurns>0);
  if(state().activeEffects.length!==beforeEffects)changed=true;
  if(state().chips.includes('57')){const charge=number(state(),'チャージ');if(charge<6){state().numbers['チャージ']=6;changed=true;}}
  for(const effect of abilityRules()?.turnEnd||[]){const current=abilityControlValue(effect.key),next=Math.max(Number(effect.min)||0,current+(Number(effect.delta)||0));if(next!==current){state().numbers[effect.key]=next;changed=true;}}
  if(changed){renderConditions();updateStats();}
 };
 document.querySelectorAll('.role-tab').forEach(tab=>tab.addEventListener('click',()=>{if(tab.dataset.role==='map'||tab.dataset.role==='character')clearCharacterAttackPhase();}));
 window.addEventListener('character-opponent-change',event=>{currentOpponent=event.detail;if(selectedCharacter){renderConditions();updateStats();}});
 applyAttackTargetEffects=enemy=>{if(!selectedCharacter||!enemy||enemy.defeated)return;state().phases??={attack:false,move:false};state().phases.attack=true;const ids=new Set(state().chips);const markGain=(ids.has('36')?1:0)+(ids.has('37')?1:0);if(markGain)enemy.markStacks=(enemy.markStacks||0)+markGain;currentOpponent={name:enemy.name,mapId:enemy.mapId,markStacks:enemy.markStacks||0};};
 wireCharacterTabs(root.querySelector('.character-subtabs'),tab=>{document.getElementById('character-list-view').hidden=tab.id!=='character-list-tab';document.getElementById('character-chip-view').hidden=tab.id!=='character-chip-tab';});
 wireCharacterTabs(root.querySelector('.chip-category-tabs'),tab=>{category=tab.dataset.category;document.getElementById('chip-category-view').setAttribute('aria-labelledby',tab.id);renderChips();});
 loadCharacterData({listStatus,chipStatus,statusIconSnapshot:STATUS_ICON_SNAPSHOT,characterSkillsSnapshot:CHARACTER_SKILLS_SNAPSHOT}).then(data=>{
  ({characters,chips,rules,statusIcons,mapKeywords,characterSkills}=data);
  skillTooltipController=setupCharacterSkillTooltip({characterSkills});
  for(const rule of rules){if(!byChip.has(rule.chip_id))byChip.set(rule.chip_id,[]);byChip.get(rule.chip_id).push(rule);}
  renderImages(document.getElementById('character-image-list'),characters,'character_list','list_img');renderChips();
  const defaultCharacter=characters.find(row=>row.name==='ミミ');if(defaultCharacter)selectCharacter(defaultCharacter);
 });
})();
