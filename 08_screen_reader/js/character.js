// ===== キャラクター・チップ =====
(()=>{
 const root=document.getElementById('character-panel');
 const listStatus=document.getElementById('character-list-status'),chipStatus=document.getElementById('character-chip-status');
 const selectedPanel=document.getElementById('selected-character');
 const conditionsBox=document.getElementById('selected-character-conditions');
 const ownedBox=document.querySelector('.selected-character-chips');
 const hpInput=document.getElementById('selected-character-current-hp');
 const partyGrid=document.getElementById('selected-party-grid'),selfTab=document.getElementById('selected-self-tab'),partyTab=document.getElementById('selected-party-tab');
 const partySlots=[null,null,null,null],partyStates=new Map();let partyMode=false,draggedPartyIndex=null,partyEditId=null;
 const getPartyState=id=>{const key=String(id);if(!partyStates.has(key))partyStates.set(key,{level:0,currentHp:null,chips:[],manual:{atk:0,def:0,move:0}});return partyStates.get(key);};
 const STATUS_ICON_SNAPSHOT="group,effect_key,input_kind,icon_file,map_id,atk,def,move,damage_reduce,condition\r\nスタック,コイン,number,UT_Buff/Coin.png\r\nスタック,マーク,number,UT_Buff/UT_Buff_Lock.png\r\nスタック,ヒール,number,UT_Buff/UT_Buff_Heal.png\r\nスタック,チャージ,number,UT_Buff/UT_Buff_Charge.png\r\nスタック,改造,number,UT_Buff/UT_Buff_Gaizao.png\r\nスタック,ジェントル・フレイム,number,UT_Buff/UT_Buff_1049.png\r\nスタック,反撃,number,UT_Buff/UT_Buff_Counter.png\r\nスタック,マインド,number,chip_icon/201_スタンガン.png\r\nスタック,罪証,number,UT_Buff/UT_Buff_Crime.png\r\nスタック,精確無比,number,UT_Buff/UT_Buff_125_Passive.png\r\nスタック,エネルギー保存,number,UT_Buff/UT_Buff_113_Passive.png\r\nスタック,剣気,number,UT_Buff/UT_Buff_115.png\r\nスタック,累計移動ポイント,number,UT_Buff/UT_Buff_117_Passive.png\r\nスタック,スターライト,number,UT_Buff/UT_Buff_StarLight.png\r\nスタック,覚醒,number,UT_Buff/UT_Buff_1026.png\r\n状態,真龍,checkbox,UT_Buff/UT_Buff_1261204.png\r\nスタック,温もり,number,UT_Buff/UT_Buff_304_piano.png\r\n所持数,スターコイン,number,UT_Buff/Coin.png\r\n蓄積ボーナス,優雅の羽ボーナス,number,chip_icon/021_優雅の羽.png\r\n蓄積ボーナス,ギガントアンカーボーナス,number,chip_icon/101_ギガントアンカー.png\r\n蓄積ボーナス,呪いの剣ボーナス,number,chip_icon/111_呪いの剣.png\r\n蓄積ボーナス,反撃による永続ボーナス,number,UT_Buff/UT_Buff_Counter.png\r\n蓄積ボーナス,鴛鴦連理解除ボーナス,number,UT_Buff/UT_Buff_1047.png\r\n蓄積ボーナス,マインド増加ボーナス,number,chip_icon/207_原初の意識.png\r\n蓄積ボーナス,マインド減少ボーナス,number,chip_icon/207_原初の意識.png\r\nマップ固有,真犯人,checkbox,UT_Buff/UT_Buff_1067.png,MAP0104,2,0,2,2,\r\nマップ固有,逆鱗,number,UT_Buff/UT_Buff_1026.png,MAP0005,2,0,0,2,\r\nマップ固有,金鱗,number,UT_Buff/UT_Buff_1027.png,MAP0005,1,1,0,0,\r\nマップ固有,孔雀の羽ばたき,number,UT_Buff/UT_Buff_1046.png,MAP0007,2,2,0,0,excess_over_peacock\r\n追加素材,深層改造,未設定,UT_Buff/UT_Buff_1033.png\r\n追加素材,戦の呪い,未設定,UT_Buff/UT_Buff_1041.png\r\nマップ固有,勇往邁進,number,UT_Buff/UT_Buff_CourageUp.png,MAP0007,2,0,0,2,\r\nキャラクター固有,前ターン被ダメなし,checkbox,UT_Buff/UT_Buff_ConcealedPresence.png\nキャラクター固有,モンスター撃破数,number,UT_Buff/UT_Buff_109_Break.png\nキャラクター固有,ファイアウォール,checkbox,UT_Buff/UT_Buff_120.png\nキャラクター固有,狐光,number,UT_Buff/UT_Buff_124.png\nキャラクター固有,潜伏,checkbox,UT_Buff/UT_Buff_127.png\nキャラクター固有,エリア拒止通過,checkbox,UT_Buff/UT_Buff_128_Skill.png\nキャラクター固有,カクテル攻撃カード,number,UT_Buff/UT_Buff_303_piano.png\nキャラクター固有,カクテル防御カード,number,UT_Buff/UT_Buff_303_piano.png\nキャラクター固有,推理タイム,number,UT_Buff/UT_Buff_306.png\nキャラクター固有,自己主張なし攻撃補正,number,UT_Buff/UT_Buff_105_Break.png\r\nキャラクター固有,自己主張なし防御補正,number,UT_Buff/UT_Buff_105_Break.png\r\nキャラクター固有,自己主張なし移動補正,number,UT_Buff/UT_Buff_105_Break.png\r\nキャラクター固有,ジュジュシールド,checkbox,UT_Buff/UT_Buff_Shield.png\nキャラクター固有,ライフ・ブック,number,UT_Buff/UT_Buff_121_Passive.png\nキャラクター固有,フェーズ・ワン,checkbox,UT_Buff/UT_Event_12702.png\nキャラクター固有,フェーズ・ツー,checkbox,UT_Buff/UT_Event_12703.png\nキャラクター固有,フェーズ・スリー,checkbox,UT_Buff/UT_Event_12704.png\nキャラクター固有,真相解明,checkbox,UT_Buff/UT_Event_12705.png\nキャラクター固有,ファン,number,UT_Buff/UT_Buff_301.png\nキャラクター固有,愛,number,UT_Buff/UT_Buff_302_Passive.png\nキャラクター固有,一生を変えるカクテル,checkbox,UT_Buff/UT_Buff_303.png\nキャラクター固有,本当の私,checkbox,UT_Buff/UT_Buff_304.png\nキャラクター固有,人形制作,number,UT_Buff/UT_Buff_305_1.png\nキャラクター固有,人形完成,checkbox,UT_Buff/UT_Buff_305_Awake.png\nキャラクター固有,親友を守る,checkbox,UT_Buff/UT_Platform_306.png\n";
 let statusIcons=new Map(),mapKeywords=[];
 let currentOpponent=null;
 let characterSkills=new Map();
 let characters=[],chips=[],rules=[],category='マーク',selectedCharacter=null;let gameResetRequested=false;
 const states=new Map();
 const byChip=new Map();
 const specialIcons={'対象のマーク':'マーク','攻撃対象はモンスター':'モンスター','クジャク係の羽ばたき':'孔雀の羽ばたき'};
 const getState=id=>{if(!states.has(id))states.set(id,{level:0,currentHp:null,chips:[],numbers:{},modes:{},phases:{attack:false,move:false},manual:{atk:0,def:0},skillCooldowns:{},activeEffects:[],maxHpBonus:0,controlMaxBonuses:{}});const value=states.get(id);value.skillCooldowns??={};value.activeEffects??=[];value.maxHpBonus??=0;value.controlMaxBonuses??={};return value;};
 const state=()=>getState(selectedCharacter.id);
 const chipOwnerState=()=>partyMode&&partyEditId&&String(partyEditId)!==String(selectedCharacter?.id)?getPartyState(partyEditId):state();
 window.getPartyCharacterIds=()=>partySlots.filter(id=>id!==null).map(String);
 window.hasSelectedCharacter=()=>Boolean(selectedCharacter);
 hasSelectedCharacter=window.hasSelectedCharacter;
 window.captureCharacterEvidence=()=>selectedCharacter?{id:selectedCharacter.id,count:number(state(),'罪証')}:null;
 window.restoreCharacterEvidence=snapshot=>{if(!snapshot)return;getState(snapshot.id).numbers['罪証']=snapshot.count;if(selectedCharacter?.id===snapshot.id){renderConditions();updateStats();}};
 window.getCharacterEvidenceStack=()=>selectedCharacter?number(state(),'罪証'):0;
 window.setCharacterEvidenceStack=value=>{if(!selectedCharacter)return;state().numbers['罪証']=Math.max(0,Math.floor(Number(value)||0));renderConditions();updateStats();window.dispatchEvent(new Event('character-evidence-change'));};
 const number=(s,key)=>Math.min(key==='エナジー'?15:Infinity,Math.max(0,Number(s.numbers[key])||0));
 const abilityRules=()=>CHARACTER_ABILITY_RULES[String(selectedCharacter?.id)]||null;
 const abilityControlValue=key=>{if(String(selectedCharacter?.id)==='6'&&key.startsWith('自己主張なし')&&state().numbers['マジで怒ったぞ'])return 2;if(key==='ファン')return Math.max(0,Number(state().numbers[key])||0)+(window.getRosterFanCount?.()||0);const stored=state().numbers[key];if(stored!==undefined)return Number(stored)||0;const control=abilityRules()?.controls?.find(item=>item.key===key);return Number(control?.default)||0;};
 const activeSkill=()=>abilityRules()?.activeSkills?.[0]||null;
 const activeSkillMaxCooldown=skill=>Math.max(0,(Number(skill?.cooldown)||0)-(state().chips.includes('15')?1:0));
 const activeSkillCooldown=skill=>Math.min(activeSkillMaxCooldown(skill),Math.max(0,Number(state().skillCooldowns?.[skill?.key])||0));
 const activeEffectConditionMatches=condition=>!condition||(condition.key&&(condition.equals!==undefined?abilityControlValue(condition.key)===Number(condition.equals):abilityControlValue(condition.key)>=(Number(condition.min)||0)&&abilityControlValue(condition.key)<=(condition.max===undefined?Infinity:Number(condition.max))));
 const activeEffectAllowed=effect=>activeEffectConditionMatches(effect.when)&&(!effect.unless||!activeEffectConditionMatches(effect.unless));
 const activeSkillStatBonus=stat=>(state().activeEffects||[]).filter(effect=>effect.type==='modify_stat'&&effect.target==='self'&&effect.stat===stat&&activeEffectConditionMatches(effect.when)).reduce((sum,effect)=>sum+(effect.resolvedValue!==undefined?Number(effect.resolvedValue):(effect.sourceKey?abilityControlValue(effect.sourceKey)*(effect.multiplier===undefined?1:Number(effect.multiplier)):(Number(effect.value)||0))),0);
 const activeConditionForced=key=>(state().activeEffects||[]).some(effect=>effect.type==='force_condition'&&effect.key===key);
 const abilityConditionMatches=(condition,maxHp)=>{
  if(!condition)return true;
  if(condition.partyCharacterId&&!partySlots.some(id=>String(id)===condition.partyCharacterId))return false;
  if(condition.key==='current_hp_ratio<=')return activeConditionForced('current_hp_ratio<=')||(state().currentHp!==null&&state().currentHp<=maxHp*Number(condition.value));
  if(condition.key==='target_mark')return (Number(currentOpponent?.markStacks)||0)>=(Number(condition.min)||0);
  return condition.min!==undefined?abilityControlValue(condition.key)>=Number(condition.min):abilityControlValue(condition.key)===Number(condition.equals);
 };
 const abilityModifierValue=(rule,maxHp)=>{
  if(!abilityConditionMatches(rule.when,maxHp))return 0;
  if(rule.formula==='fixed')return Number(rule.value)||0;
  let source=rule.source==='target_mark'?(Number(currentOpponent?.markStacks)||0):abilityControlValue(rule.source);
  if(rule.sourceCap!==undefined)source=Math.min(source,Number(rule.sourceCap));
  if(rule.formula==='percent_of_ceil')return Math.ceil(source*(Number(rule.value)||0));
  if(rule.formula==='per_stack')return source*(Number(rule.value)||0);
  if(rule.formula==='floor_per_unit')return Math.floor(source/(Number(rule.unit)||1))*(Number(rule.value)||0);
  if(rule.formula==='alternating_steps'){
   const steps=Math.floor(source/(Number(rule.unit)||1)),order=Number(rule.order)||0;
   return Math.max(0,Math.ceil((steps-order)/2));
  }
  return 0;
 };
 window.getCharacterActiveSkillEffects=skillKey=>{const skill=activeSkill();return skill?.key===skillKey?(skill.effects||[]).map(effect=>({...effect,...(effect.type==='damage_monster'&&effect.sourceStat?{value:calculate()[effect.sourceStat]+(Number(effect.offset)||0)}:{})})):[];};
 window.captureCharacterAbilityState=()=>selectedCharacter?{id:selectedCharacter.id,numbers:{...state().numbers},modes:{...state().modes},skillCooldowns:{...state().skillCooldowns},activeEffects:(state().activeEffects||[]).map(effect=>({...effect})),currentHp:state().currentHp,maxHpBonus:Number(state().maxHpBonus)||0,controlMaxBonuses:{...state().controlMaxBonuses}}:null;
 window.restoreCharacterAbilityState=snapshot=>{if(!snapshot)return;const target=getState(snapshot.id);if(Object.hasOwn(snapshot,'currentHp'))target.currentHp=snapshot.currentHp;target.numbers={...snapshot.numbers};if(snapshot.modes)target.modes={...snapshot.modes};target.skillCooldowns={...snapshot.skillCooldowns};target.activeEffects=(snapshot.activeEffects||[]).map(effect=>({...effect}));target.maxHpBonus=Number(snapshot.maxHpBonus)||0;target.controlMaxBonuses={...target.controlMaxBonuses,...snapshot.controlMaxBonuses};if(selectedCharacter?.id===snapshot.id){renderConditions();updateStats();}};
 // Attention is a duration, never an accumulating stat multiplier.
 const attentionTurns=id=>String(id)===String(selectedCharacter?.id)?number(getState(id),'ガオーの注目'):(getPartyState(id).attentionTurns||0);
 const setAttention=(id,turns)=>{if(String(id)===String(selectedCharacter?.id))getState(id).numbers['ガオーの注目']=turns;else getPartyState(id).attentionTurns=turns;};
 window.captureAutumnAttention=()=>({self:[...states].map(([id,s])=>[id,number(s,'ガオーの注目')]),party:[...partyStates].map(([id,s])=>[id,s.attentionTurns||0])});
 window.restoreAutumnAttention=snapshot=>{if(!snapshot)return;for(const s of states.values())s.numbers['ガオーの注目']=0;for(const s of partyStates.values())s.attentionTurns=0;for(const [id,n] of snapshot.self)getState(id).numbers['ガオーの注目']=n;for(const [id,n] of snapshot.party)getPartyState(id).attentionTurns=n;if(selectedCharacter){renderConditions();updateStats();}};
 function attentionControl(id,name,isSelf){
  const field=document.createElement('span');field.className='autumn-attention';const turns=attentionTurns(id);
  const apply=document.createElement('button');apply.type='button';apply.className='condition-toggle';apply.setAttribute('aria-label',name+'にガオーの注目を付与');const icon=document.createElement('img');icon.src='../images/UT_Buff/UT_Buff_1071_02.png';icon.alt='ガオーの注目';const count=document.createElement('strong');count.textContent=turns+'T';apply.append(icon,count);apply.setAttribute('aria-pressed',String(turns>0));apply.title=getSkillHoverText('autumn.attention');
  const commit=next=>{window.rememberCharacterSkillActivation?.();setAttention(id,next);renderConditions();updateStats();};
  apply.addEventListener('click',event=>{event.stopPropagation();commit(2);});apply.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();commit(0);});field.append(apply);
  if(!isSelf&&turns){const tick=document.createElement('button');tick.type='button';tick.textContent='残り−1';tick.setAttribute('aria-label',name+'の注目の残りターンを減らす');tick.addEventListener('click',event=>{event.stopPropagation();commit(Math.max(0,turns-1));});field.append(tick);}
  return field;
 }
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
 // Keep unmodeled HP bonuses observed on screen, while allowing later known
 // level/chip/skill changes. Re-anchor only when a new maximum is observed.
 function observedMaxHp(s,computed){return Math.max(1,s.screenMaxHp===undefined?computed:s.screenMaxHp+computed-(s.screenMaxHpBasis??computed));}
 function calculate(naturalMaxHpOnly=false){
  const active=activeRules().filter(r=>r.kind==='modifier'||r.kind==='event_modifier');
  const startingHp=base('hp')+(Number(state().maxHpBonus)||0);
  const maxBonus=active.filter(r=>r.target==='max_hp'&&triggerMatches(r)&&conditionMatches(r,startingHp)).reduce((sum,r)=>sum+valueOf(r,0),0);
  const computedMaxHp=Math.max(1,startingHp+maxBonus);
  if(naturalMaxHpOnly)return computedMaxHp;
  const maxHp=observedMaxHp(state(),computedMaxHp);
  if(state().currentHp===null)state().currentHp=maxHp;
  state().currentHp=Math.max(0,Math.min(maxHp,Number(state().currentHp)||0));
  const result={atk:base('atk'),def:base('def'),move:base('move'),hp:maxHp,damageReduce:0,damageAdd:(currentOpponent?.markStacks>0?1:0)+(currentOpponent?.fateEchoStacks>0?1:0)+(Number(currentOpponent?.erosionStacks)||0)};
  for(const rule of active){
   if(!['atk','def','move','damageReduce'].includes(rule.target))continue;
   if(!triggerMatches(rule)||!conditionMatches(rule,maxHp))continue;
   result[rule.target]+=valueOf(rule,maxBonus);
  }
  for(const rule of abilityRules()?.modifiers||[]){
   if(['atk','def','move','damageReduce'].includes(rule.target))result[rule.target]+=abilityModifierValue(rule,maxHp);
  }
  for(const stat of ['atk','def','move'])result[stat]+=activeSkillStatBonus(stat);
  if(abilityControlValue('PT大鉦')&&!(state().chips.includes('121')&&state().modes['121'])){result.atk+=1;result.damageReduce+=1;}
  for(const c of partySupportControls)if(c.stat){const amount=c.number?abilityControlValue(c.key):(abilityControlValue(c.key)?(c.marked?(Number(currentOpponent?.markStacks)||0):c.value):0);result[c.stat]+=amount;}
  if(String(selectedCharacter?.id)==='106'&&abilityControlValue('PTハンナ親友の祝福')&&!abilityControlValue('PTハンナ次の移動'))result.move+=2;
  for(const rule of mapKeywords.filter(row=>row.map_id===mapPicker.value)){
   let stacks=rule.input_kind==='checkbox'?(state().modes[rule.effect_key]?1:0):number(state(),rule.effect_key);
   if(rule.condition==='excess_over_peacock')stacks=currentOpponent?.name==='クジャク係'&&currentOpponent.mapId===mapPicker.value?Math.max(0,stacks-number(state(),'クジャク係の羽ばたき')):0;
   for(const stat of ['atk','def','move'])result[stat]+=stacks*(Number(rule[stat])||0);
   result.damageReduce+=stacks*(Number(rule.damage_reduce)||0);
  }
  if(mapPicker.value==='MAP0105'&&number(state(),'ガオーの注目')>0){result.def-=1;result.move-=1;}
  for(const stat of ['atk','def','move'])result[stat]+=state().manual?.[stat]||0;
  result.atk=Math.max(0,result.atk);result.def=Math.max(0,result.def);result.move=Math.max(0,result.move);
  return result;
 }
 function makeIcon(key){
  const file=({'親友の祝福':'UT_Buff/UT_Platform_305.png','手札枚数':'UT_Buff/UT_Buff_Hand.png','自己主張なし攻撃補正':'UT_Buff/Attack.png','自己主張なし防御補正':'UT_Buff/Defense.png','自己主張なし移動補正':'UT_Buff/run.png','このターンに受けたダメージ':'UT_Buff/UT_Buff_SangXinBingKuang.png'})[key]||statusIcons.get(key)||(['マジで怒ったぞ','次の攻撃ダイス6'].includes(key)?statusIcons.get('自己主張なし攻撃補正'):null)||statusIcons.get(specialIcons[key]);
  if(!file)return Object.assign(document.createElement('span'),{className:'condition-fallback',textContent:key});
  const icon=document.createElement('img');icon.alt='';
  const path=file.startsWith('chip_icon/')||file.startsWith('UT_Buff/')?file:'icon/'+file;
  icon.src='../images/'+path.split('/').map(encodeURIComponent).join('/');
  icon.addEventListener('error',()=>{icon.replaceWith(Object.assign(document.createElement('span'),{className:'condition-fallback',textContent:key}));},{once:true});
  return icon;
 }
 function neededInputs(){
  const numeric=new Set();
  if(state().chips.some(id=>chips.find(chip=>chip.id===id)?.category==='エナジー'))numeric.add('エナジー');
  if(String(selectedCharacter.id)==='11'||partySlots.some(id=>String(id)==='11')||number(state(),'ヒール')>0)numeric.add('ヒール');
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
 // Received PT effects are stored with self ability state, including roster Undo.
 const partySupportControls=[
  {donor:'8',key:'PTジュジュシールド',icon:'ジュジュシールド',stat:'damageReduce',value:99},
  {donor:'8',key:'反撃',icon:'反撃'},
  {donor:'103',key:'PTカクテル攻撃',icon:'カクテル攻撃カード',number:true,max:3,stat:'atk'},
  {donor:'103',key:'PTカクテル防御',icon:'カクテル防御カード',number:true,max:3,stat:'def'},
  {donor:'104',key:'PTドロシー攻撃',icon:'本当の私',stat:'atk',value:1},
  {donor:'20',key:'PTユメ攻撃補正',icon:'ヒール',number:true,stat:'atk'},
  {donor:'27',key:'PT潜伏',icon:'潜伏',stat:'atk',marked:true},
  {donor:'105',key:'PTハンナ次の移動',icon:'人形完成',stat:'move',value:2}
 ];
 function renderPartySupport(){
  const donors=new Set(partySlots.filter(id=>String(id)!==String(selectedCharacter?.id)).map(String));
  const bellDonor=[...donors].some(id=>getPartyState(id).chips.includes('121'));
  if(bellDonor||abilityControlValue('PT大鉦')){
   const chip=chips.find(row=>row.id==='121'),icon=createOwnedChipView(chip,null,()=>{}).querySelector('img');
   const active=!!abilityControlValue('PT大鉦');
   conditionsBox.append(createCharacterAbilityToggleView('PT大鉦',active,icon,()=>{window.rememberCharacterSkillActivation?.();state().numbers['PT大鉦']=active?0:1;renderConditions();updateStats();}));
  }
  for(const c of partySupportControls){
   if(c.key==='反撃'&&String(selectedCharacter?.id)==='8')continue;
   if(abilityRules()?.controls?.some(control=>control.key===c.key))continue;
   const current=abilityControlValue(c.key);if(!donors.has(c.donor)&&!current)continue;
   const change=value=>{const next=Math.max(0,Math.min(c.max??999,Math.floor(Number(value)||0)));if(next===abilityControlValue(c.key))return;window.rememberCharacterSkillActivation?.();state().numbers[c.key]=next;if(c.key==='PTジュジュシールド'&&next)state().numbers['反撃']=1;renderConditions();updateStats();};
   if(c.number){const view=createConditionNumberView(c.key,current,makeIcon(c.icon));if(c.donor==='103')view.button.classList.add(c.stat==='atk'?'support-atk':'support-def');view.input.max=String(c.max??999);if(c.key==='PTユメ攻撃補正')view.item.title=getSkillHoverText('party.yume');view.button.addEventListener('click',()=>change(current+1));view.button.addEventListener('contextmenu',e=>{e.preventDefault();change(current-1);});view.input.addEventListener('change',()=>change(view.input.value));conditionsBox.append(view.item);}
   else {const button=createCharacterAbilityToggleView(c.key,!!current,makeIcon(c.icon),()=>change(current?0:1));if(c.marked)button.title+=getSkillHoverText('party.marked_end');if(c.donor==='105')button.title+=getSkillHoverText('party.hanna_move');conditionsBox.append(button);}
  }
  if(String(selectedCharacter?.id)==='106'&&(donors.has('105')||abilityControlValue('PTハンナ親友の祝福'))){const button=document.createElement('button');button.type='button';button.className='selected-chip condition-toggle';button.setAttribute('aria-label','PTハンナ推理タイム＋1');button.setAttribute('aria-pressed',String(!!abilityControlValue('PTハンナ親友の祝福')));button.title=getSkillHoverText('party.blessing');button.append(makeIcon('親友の祝福'));button.addEventListener('contextmenu',event=>{event.preventDefault();if(!abilityControlValue('PTハンナ親友の祝福'))return;window.rememberCharacterSkillActivation?.();state().numbers['PTハンナ親友の祝福']=0;renderConditions();updateStats();});button.addEventListener('click',()=>{const current=abilityControlValue('推理タイム');if(current>=4&&abilityControlValue('PTハンナ親友の祝福'))return;window.rememberCharacterSkillActivation?.();state().numbers['PTハンナ親友の祝福']=1;state().numbers['推理タイム']=Math.min(4,current+1);renderConditions();updateStats();});conditionsBox.append(button);}
  for(const c of [{donor:'10',label:'PTパンダマン回復＋2',amount:2}])if(donors.has(c.donor)){
   const button=document.createElement('button');button.type='button';button.className='selected-chip condition-toggle';button.setAttribute('aria-label',c.label);button.append(makeIcon('ヒール'));button.title=getSkillHoverText('party.heal',{name:c.label});button.addEventListener('click',()=>{const max=calculate().hp,next=Math.min(max,state().currentHp+c.amount);if(next===state().currentHp)return;window.rememberCharacterSkillActivation?.();state().currentHp=next;renderConditions();updateStats();});conditionsBox.append(button);
  }
 }
 // Follow-up preview never consumes stacks or runs ordinary attack chip triggers.
 window.getTeruFollowUp=()=>{
  if(!selectedCharacter||String(selectedCharacter.id)==='23'||!partySlots.some(id=>String(id)==='23'))return null;
  const teru=characters.find(row=>String(row.id)==='23');if(!teru)return null;
  return {enabled:!!abilityControlValue('PTテル憑依'),stacks:abilityControlValue('PTテル狐光'),attack:calculatePartyMember(teru).atk,
   damageAdd:(currentOpponent?.markStacks>0?1:0)+(currentOpponent?.fateEchoStacks>0?1:0)+(Number(currentOpponent?.erosionStacks)||0)+(String(selectedCharacter.id)==='29'?2:0)};
 };
 window.consumeTeruFollowUp=()=>{
  const effect=window.getTeruFollowUp();if(!effect?.enabled||effect.stacks<1)return;
  window.rememberCharacterSkillActivation?.();const key='PTテル狐光';
  state().numbers[key]=effect.stacks-1;renderConditions();updateStats();
 };
 // Editable skill sources are separate from applied bonuses; Teru commits both atomically.
 const teruDialog=createCharacterSkillInputDialogView('teru-stat-dialog','憑依先のステータス入力','憑依先のステータス','teru-skill-inputs');
 document.body.append(teruDialog);
 const rinrinDialog=document.createElement('dialog');rinrinDialog.id='rinrin-area-dialog';rinrinDialog.setAttribute('aria-label','エリア拒止の通過確認');
 rinrinDialog.innerHTML='<h3>エリア拒止を通過しますか？</h3><p class="rinrin-yes">Yes：対象DEF−2／自身ATK＋2（2ターン）</p><p>No：補正なしでスキルを使用。</p><div class="skill-dialog-actions"><button type="button" data-yes>Yes</button><button type="button" data-no>No</button><button type="button" data-cancel>キャンセル</button></div>';
 document.body.append(rinrinDialog);
 const sourceDialog=createCharacterSkillInputDialogView('skill-source-dialog','スキルの数値入力','','skill-source-dialog-inputs');
 document.body.append(sourceDialog);
 const skillDialogs=[teruDialog,sourceDialog,rinrinDialog];
 for(const dialog of [teruDialog,sourceDialog]){
  dialog.dataset.inlinePad='true';
  dialog.addEventListener('skill-number-confirm',event=>{
   const fields=[...dialog.querySelectorAll('input')],index=fields.indexOf(event.detail.input);
   if(index<0||!fields[index].reportValidity())return;
   if(dialog===teruDialog&&index===0){fields[1].focus();return;}
   dialog.querySelector('form').requestSubmit();
  });
  dialog.querySelector('form').addEventListener('submit',event=>{
   event.preventDefault();const skill=activeSkill();
   const matches=dialog===teruDialog?String(selectedCharacter?.id)==='23'&&!!skill:!!skill?.inputStats;
   if(!matches||activeSkillCooldown(skill)>0){dialog.close();return;}
   const fields=[...dialog.querySelectorAll('input')];if(fields.some(input=>!input.checkValidity()))return;
   window.rememberCharacterSkillActivation?.();for(const input of fields)state().numbers[input.dataset.sourceKey]=Number(input.value);
   applyActiveSkillEffects(skill);state().skillCooldowns[skill.key]=activeSkillMaxCooldown(skill);dialog.close();renderConditions();updateStats();
  });
 }

 function positionSkillDialog(dialog){
  if(!dialog.open)return;const anchor=document.getElementById('selected-character-skill').getBoundingClientRect(),width=dialog.offsetWidth,height=dialog.offsetHeight;
  dialog.style.left=Math.max(8,Math.min(anchor.right-width,innerWidth-width-8))+'px';
  dialog.style.top=Math.max(8,Math.min(anchor.top-height-8,innerHeight-height-8))+'px';
 }
 function openSkillDialog(dialog){dialog.showModal();positionSkillDialog(dialog);}
 function closeSkillDialogs(){for(const dialog of skillDialogs)if(dialog.open)dialog.close();}
 for(const dialog of skillDialogs){dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());dialog.classList.add('anchored-skill-dialog');dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});}
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&skillDialogs.some(dialog=>dialog.open)){event.preventDefault();event.stopImmediatePropagation();closeSkillDialogs();}},true);
 window.addEventListener('resize',()=>skillDialogs.forEach(positionSkillDialog));window.addEventListener('scroll',()=>skillDialogs.forEach(positionSkillDialog),true);
 window.addEventListener('character-selection-change',closeSkillDialogs);
 for(const passes of [false,true])rinrinDialog.querySelector(passes?'[data-yes]':'[data-no]').addEventListener('click',()=>{
  const skill=activeSkill();rinrinDialog.close();if(String(selectedCharacter?.id)!=='28'||!skill||activeSkillCooldown(skill)>0)return;
  if(passes){requestSkillTargets(skill);return;}
  window.rememberCharacterSkillActivation?.();state().skillCooldowns[skill.key]=activeSkillMaxCooldown(skill);renderConditions();updateStats();
 });

 function sourceInput(spec){
  const item=document.createElement('label');item.className='skill-source-input';item.title=getSkillHoverText('skill.input',{name:spec.label});
  if(spec.stat){const icon=document.createElement('img');icon.src='../images/UT_Buff/'+(spec.stat==='atk'?'Attack.png':'Defense.png');icon.alt='';item.append(icon);}
  else {const label=document.createElement('span');label.textContent=String(selectedCharacter.id)==='16'?'出目':'影';item.append(label);}
  const input=document.createElement('input');input.type='number';input.min=String(spec.min??0);input.step='1';input.inputMode='numeric';input.required=true;input.setAttribute('aria-label',spec.label);input.dataset.sourceKey=spec.key;input.value=abilityControlValue(spec.key);
  item.append(input);return item;
 }
 function renderTeruSupport(){
  const self=String(selectedCharacter.id)==='23';
  if(!self&&(partySlots.some(id=>String(id)==='23')||abilityControlValue('PTテル憑依')||abilityControlValue('PTテル狐光'))){
   const key='PTテル憑依',active=!!abilityControlValue(key);
   const toggle=createCharacterAbilityToggleView(key,active,makeIcon('狐光'),()=>{window.rememberCharacterSkillActivation?.();state().numbers[key]=active?0:1;renderConditions();updateStats();});
   toggle.title=getSkillHoverText('party.teru');conditionsBox.append(toggle);
   for(const key of ['PTテル狐光']){
    const view=createConditionNumberView(key,abilityControlValue(key),makeIcon('狐光'));
    view.item.title=getSkillHoverText('party.foxfire');
    const change=value=>{const next=Math.max(0,Math.floor(Number(value)||0));if(next===abilityControlValue(key))return;window.rememberCharacterSkillActivation?.();state().numbers[key]=next;view.input.value=next;updateStats();};
    view.button.addEventListener('click',()=>change(abilityControlValue(key)+1));view.button.addEventListener('contextmenu',e=>{e.preventDefault();change(abilityControlValue(key)-1);});view.input.addEventListener('change',()=>change(view.input.value));conditionsBox.append(view.item);
   }
  }

 }
 function renderConditions(){
  conditionsBox.replaceChildren();
  renderPartySupport();
  if(mapPicker.value==='MAP0105')conditionsBox.append(attentionControl(selectedCharacter.id,selectedCharacter.name,true));
  renderTeruSupport();
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
  const controls=[...(abilityRules()?.controls||[])];
  if(String(selectedCharacter.id)!=='27'&&(partySlots.some(id=>String(id)==='27')||abilityControlValue('潜入調査')))controls.push(CHARACTER_ABILITY_RULES['27'].controls.find(control=>control.key==='潜入調査'));
  for(const control of controls){
   if(control.placement||control.requiresParty&&!partySlots.some(id=>String(id)===control.requiresParty))continue;
   if(control.type==='toggle'){
    const active=Boolean(abilityControlValue(control.key));
    const toggle=createCharacterAbilityToggleView(control.key,active,makeIcon(control.key),()=>{window.rememberCharacterSkillActivation?.();state().numbers[control.key]=active?0:1;renderConditions();updateStats();});
    conditionsBox.append(toggle);
   }else if(control.type==='choice'){
    const options=control.options||[],current=abilityControlValue(control.key),option=options.find(item=>Number(item.value)===current)||options[0];
    const change=delta=>{const index=Math.max(0,options.indexOf(option)),next=control.cycle===false?Math.max(0,Math.min(options.length-1,index+delta)):(index+delta+options.length)%options.length;const value=Number(options[next]?.value)||0;if(value===current)return;window.rememberCharacterSkillActivation?.();state().numbers[control.key]=value;renderConditions();updateStats();};
    const button=createCharacterAbilityChoiceView(control.key,option,makeIcon(option?.iconKey||control.key),()=>change(1));button.addEventListener('contextmenu',event=>{event.preventDefault();change(-1);});conditionsBox.append(button);
   }else if(control.type==='number'){
    const current=abilityControlValue(control.key);
    const effectiveMax=control.max===undefined?undefined:Number(control.max)+(Number(state().controlMaxBonuses?.[control.key])||0);
    const iconKey=control.iconAtMax&&effectiveMax!==undefined&&current>=effectiveMax?control.iconAtMax:control.key;
    const view=createConditionNumberView(control.key,current,makeIcon(iconKey));
    if(control.key==='手札枚数')view.item.title=getSkillHoverText('nardis.hand');
    if(control.iconAtMax&&iconKey!==control.key)view.item.title=getSkillHoverText('operation.number.full',{name:iconKey});
    const forced=String(selectedCharacter.id)==='6'&&control.key.startsWith('自己主張なし')&&!!abilityControlValue('マジで怒ったぞ');
    view.input.disabled=forced;view.button.disabled=forced;
    view.input.min=String(Number(control.min)||0);
    if(effectiveMax!==undefined)view.input.max=String(effectiveMax);
    const setValue=value=>{if(forced)return;const min=Number(control.min)||0,max=effectiveMax===undefined?Infinity:effectiveMax;const next=Math.max(min,Math.min(max,Math.floor(Number(value)||0)));if(String(selectedCharacter.id)==='23'&&next!==abilityControlValue(control.key))window.rememberCharacterSkillActivation?.();state().numbers[control.key]=control.key==='ファン'?Math.max(0,next-(window.getRosterFanCount?.()||0)):next;view.input.value=abilityControlValue(control.key);if(control.iconAtMax){const nextKey=state().numbers[control.key]>=max?control.iconAtMax:control.key;view.button.replaceChildren(makeIcon(nextKey));view.item.title=getSkillHoverText('operation.number.full',{name:nextKey});}updateStats();};
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
   const item=document.createElement('label');item.className='condition-item';item.title=getSkillHoverText('operation.number',{name:key});
   const button=document.createElement('button');button.type='button';button.className='condition-icon';button.setAttribute('aria-label',key+'を増やす');button.append(makeIcon(key));
   const input=document.createElement('input');input.type='number';input.min='0';if(key==='エナジー')input.max='15';input.inputMode='numeric';input.className='condition-number';input.setAttribute('aria-label',key+'の数');input.value=number(state(),key);
   const setValue=value=>{const next=Math.min(key==='エナジー'?15:Infinity,Math.max(0,key==='ヒール'?Math.floor(Number(value)||0):Number(value)||0));if(key==='ヒール'){if(next===number(state(),key)){input.value=next;return;}window.rememberCharacterSkillActivation?.();}state().numbers[key]=next;input.value=next;updateStats();if(key==='罪証')window.dispatchEvent(new Event('character-evidence-change'));};
   button.addEventListener('click',()=>setValue(number(state(),key)+1));
   button.addEventListener('contextmenu',e=>{e.preventDefault();setValue(number(state(),key)-1);});
   input.addEventListener('change',()=>setValue(input.value));item.append(button,input);conditionsBox.append(item);
  }
 }
 function updateActiveSkillUi(){
  const skill=activeSkill(),controls=document.getElementById('selected-character-skill-controls'),button=document.getElementById('selected-character-skill'),ct=document.getElementById('selected-character-ct');
  controls.hidden=!skill;if(!skill)return;
  const cooldown=activeSkillCooldown(skill);state().skillCooldowns[skill.key]=cooldown;ct.textContent='CT '+cooldown+' / '+activeSkillMaxCooldown(skill);ct.title=getSkillHoverText('skill.cooldown',{max:activeSkillMaxCooldown(skill)});ct.setAttribute('aria-label','CT '+cooldown+'、上限 '+activeSkillMaxCooldown(skill)+'：左クリックで1減らす、右クリックで1増やす');if(button.textContent!=='スキル')button.textContent='スキル';button.title=getSkillHoverText('skill.cast',{name:skill.label});button.setAttribute('aria-label',skill.label+'を発動');button.disabled=cooldown>0;
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
  renderParty();
 }
 applyCharacterToCalculator=(totals=selectedCharacter&&calculate())=>{
  if(!totals)return;
  document.querySelector('[data-role="attack"].mode-content').dataset.ignoreDefenseOnAttackSix=String(Boolean(abilityRules()?.ignoreDefenseOnAttackSix));
  const attackMode=document.querySelector('[data-role="attack"].mode-content'),defenseMode=document.querySelector('[data-role="defense"].mode-content');
  attackMode.dataset.fixedAttackDice=String(state().chips.includes('144')||String(selectedCharacter.id)==='6'&&abilityControlValue('次の攻撃ダイス6')?6:0);
  attackMode.dataset.selfDiceOneSix=defenseMode.dataset.selfDiceOneSix=String(state().chips.includes('142'));
  defenseMode.dataset.moses=String(String(selectedCharacter.id)==='24');
  defenseMode.dataset.evadeMinimum=String(String(selectedCharacter.id)==='24'?1+abilityControlValue('精確無比'):1);
  if(String(selectedCharacter.id)!=='24')defenseMode.dataset.evadeTable='false';
  const weak=String(selectedCharacter?.id)==='24'&&Boolean(currentOpponent?.weakness);
  document.querySelector('[data-role="attack"].mode-content').dataset.zeroDefenseDice=String(weak);
  document.querySelector('[data-role="defense"].mode-content').dataset.zeroAttackDice=String(weak);
  const enemyAttack=document.getElementById('attackPower2'),previousFan=Number(enemyAttack.dataset.fanReduction)||0;
  const fanReduction=['101','102'].includes(String(selectedCharacter?.id))&&currentOpponent?.fan?1:0;
  const baseEnemyAttack=Math.max(0,Number(enemyAttack.value)+previousFan),appliedFanReduction=Math.min(baseEnemyAttack,fanReduction);enemyAttack.value=baseEnemyAttack-appliedFanReduction;enemyAttack.dataset.fanReduction=String(appliedFanReduction);
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
 function toggleable(id){if(id==='121')return false;return (byChip.get(id)||[]).some(rule=>{
  if(!['modifier','event_modifier'].includes(rule.kind))return false;
  if(['on_skill_use','while_checked'].includes(rule.trigger))return true;
  const condition=rule.condition;
  return Boolean(condition&&!(rule.trigger==='on_next_move'&&condition==='次の移動強化')&&!['hp_full','hp_ratio<0.5','hp_ratio<=0.5'].includes(condition)&&!/^.+?(?:>=|<=|>|<)\d+(?:\.\d+)?$/.test(condition));
 });}
 function updateChipListSelection(){
  document.querySelectorAll('#chip-image-list .chip-select').forEach(button=>{
   const owned=Boolean(selectedCharacter&&chipOwnerState().chips.includes(button.dataset.id));
   button.setAttribute('aria-pressed',String(owned));
   button.setAttribute('aria-label',(owned?'取得を解除：':'取得する：')+button.dataset.name);
  });
 }
 function renderOwned(){
  const previousScroll=ownedBox.scrollLeft;
  ownedBox.replaceChildren();
  for(const id of state().chips){
   const chip=chips.find(c=>c.id===id);if(!chip)continue;
   const chargeDelta=chip.category==='エナジー'&&id!=='57'?({'51':2,'52':2,'53':3,'54':1,'55':-6,'56':-5,'58':-4}[id]||0):null;
   const item=createOwnedChipView(chip,chargeDelta,()=>{
    if(!chargeDelta)return;
    const charge=number(state(),'エナジー');
    if(chargeDelta<0&&charge<-chargeDelta)return;
    state().numbers['エナジー']=Math.max(0,Math.min(15,charge+chargeDelta));
    if(id==='54')state().numbers['電撃グローブ命中数']=number(state(),'電撃グローブ命中数')+1;
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

 function calculatePartyMember(row,naturalMaxHpOnly=false){
  const member=getPartyState(row.id),baseValue=stat=>Number(row['lv'+member.level+'_'+stat])||0;
  const active=member.chips.flatMap(id=>byChip.get(id)||[]).filter(rule=>['modifier','event_modifier'].includes(rule.kind)&&rule.trigger==='while_owned');
  const matches=(rule,maxHp)=>!rule.condition||rule.condition==='hp_full'&&(member.currentHp===null||member.currentHp>=maxHp)||rule.condition==='hp_ratio<0.5'&&member.currentHp!==null&&member.currentHp<maxHp/2||rule.condition==='hp_ratio<=0.5'&&member.currentHp!==null&&member.currentHp<=maxHp/2;
  const value=(rule,maxBonus)=>{const amount=Number(rule.value)||0;if(rule.formula==='fixed')return amount;if(rule.source_key!=='追加最大HP')return 0;const source=rule.source_cap===''?maxBonus:Math.min(maxBonus,Number(rule.source_cap));if(rule.formula==='per_stack')return source*amount;if(rule.formula==='floor_per_unit')return Math.floor(source/(Number(rule.unit)||1))*amount;if(rule.formula==='percent_of_ceil')return Math.ceil(source*amount);return 0;};
  const maxBonus=active.filter(rule=>rule.target==='max_hp'&&matches(rule,baseValue('hp'))).reduce((sum,rule)=>sum+value(rule,0),0),computedMaxHp=Math.max(1,baseValue('hp')+maxBonus);
  if(naturalMaxHpOnly)return computedMaxHp;
  const maxHp=observedMaxHp(member,computedMaxHp);
  if(member.currentHp===null)member.currentHp=maxHp;member.currentHp=Math.max(0,Math.min(maxHp,member.currentHp));
  const result={level:member.level,hp:maxHp,currentHp:member.currentHp};
  for(const stat of ['atk','def','move'])result[stat]=Math.max(0,baseValue(stat)+(member.manual[stat]||0)+active.filter(rule=>rule.target===stat&&matches(rule,maxHp)).reduce((sum,rule)=>sum+value(rule,maxBonus),0));
  return result;
 }
 function editPartyMember(id){partyEditId=String(id);renderParty();updateChipListSelection();const row=characters.find(item=>String(item.id)===partyEditId);chipStatus.textContent='チップ編集対象：'+(row?.name||'自キャラ');}
 function changePartyStat(row,isSelf,key,delta){
  if(isSelf){if(key==='hp'){changeHp(delta);return;}const current=calculate()[key];state().manual[key]=(state().manual[key]||0)+Math.max(0,current+delta)-current;updateStats();return;}
  const member=getPartyState(row.id),totals=calculatePartyMember(row);if(key==='hp')member.currentHp=Math.max(0,Math.min(totals.hp,member.currentHp+delta));else member.manual[key]+=Math.max(0,totals[key]+delta)-totals[key];renderParty();
 }
 function renderParty(){
  partyGrid.replaceChildren();
  const slots=partySlots;
  slots.forEach((id,index)=>{
   const row=characters.find(item=>String(item.id)===String(id));
   const isSelf=Boolean(row&&String(id)===String(selectedCharacter?.id));
   const member=row&&!isSelf?getPartyState(id):null;
   const level=isSelf?state().level:(member?.level||0);
   const parameters=row?(isSelf?{...calculate(),level,currentHp:state().currentHp}:calculatePartyMember(row)):null;
   const slot=createPartyMemberView(row,index,parameters,isSelf,delta=>{
    if(isSelf){changeCharacterLevel(delta);return;}
    const oldMax=calculatePartyMember(row).hp,oldHp=member.currentHp;member.level=Math.max(0,Math.min(3,level+delta));const newMax=calculatePartyMember(row).hp;if(member.level>level)member.currentHp=Math.min(newMax,oldHp+Math.max(0,newMax-oldMax));renderParty();
   },row?(isSelf?state():member).chips.map(chipId=>chips.find(chip=>chip.id===chipId)).filter(Boolean):[],(key,delta)=>changePartyStat(row,isSelf,key,delta));
   const editing=Boolean(row&&String(id)===String(partyEditId||selectedCharacter?.id));slot.classList.toggle('is-editing',editing);slot.dataset.editing=String(editing);if(editing)slot.setAttribute('aria-current','true');
   if(row){slot.addEventListener('click',()=>editPartyMember(id));slot.addEventListener('keydown',event=>{if(event.target===slot&&['Enter',' '].includes(event.key)){event.preventDefault();editPartyMember(id);}});}
   slot.addEventListener('contextmenu',event=>{event.preventDefault();if(!isSelf)removePartyMember(id);});
   slot.addEventListener('dragstart',event=>{if(!row)return;draggedPartyIndex=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-07-party-slot',String(index));slot.classList.add('is-dragging');});
   slot.addEventListener('dragover',event=>{if(draggedPartyIndex===null)return;event.preventDefault();event.dataTransfer.dropEffect='move';slot.classList.add('is-drop-target');});
   slot.addEventListener('dragleave',()=>slot.classList.remove('is-drop-target'));
   slot.addEventListener('drop',event=>{if(draggedPartyIndex===null)return;event.preventDefault();const from=draggedPartyIndex;draggedPartyIndex=null;[partySlots[from],partySlots[index]]=[partySlots[index],partySlots[from]];renderParty();listStatus.textContent='PTの順番を変更しました。';});
   slot.addEventListener('dragend',()=>{draggedPartyIndex=null;partyGrid.querySelectorAll('.is-dragging,.is-drop-target').forEach(item=>item.classList.remove('is-dragging','is-drop-target'));});
   partyGrid.append(slot);
  });
  const registered=new Set(slots.filter(Boolean).map(String));
  root.querySelectorAll('.character-select').forEach(button=>{
   const own=String(button.dataset.id)===String(selectedCharacter?.id);
   button.setAttribute('aria-pressed',String(partyMode?registered.has(String(button.dataset.id)):own));
   const row=characters.find(item=>String(item.id)===String(button.dataset.id));
   button.setAttribute('aria-label',(row?.name||'キャラクター')+(partyMode?'をPTに登録':'を選択'));
  });
  if(selectedCharacter){updateChipListSelection();
   // PT ATK/level/chip edits must refresh the directly referenced pursuit.
   calculateDamage(document.querySelector('[data-role="attack"].mode-content'),false);
  }
 }
 document.addEventListener('mobile-party-swap',event=>{
  const {from,to}=event.detail||{};if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=4||to>=4||!partySlots[from])return;
  [partySlots[from],partySlots[to]]=[partySlots[to],partySlots[from]];renderParty();listStatus.textContent='PTの順番を変更しました。';
 });
 document.addEventListener('mobile-character-detail',event=>{
  const row=characters.find(item=>String(item.id)===String(event.detail?.id));const ability=row&&characterSkills.get(String(row.id));
  if(row&&ability){const view=createCharacterSkillTooltipView(row,ability);window.showMobileInformation?.(row.name,[view.stats,view.description]);}
 });
 function setPartyMode(active){
  partyMode=Boolean(active&&(selectedCharacter||partySlots.some(id=>id!==null)));if(!partyMode){partyEditId=null;chipStatus.textContent='';}selectedPanel.classList.toggle('is-party-view',partyMode);partyGrid.hidden=!partyMode;
  selfTab.setAttribute('aria-selected',String(!partyMode));partyTab.setAttribute('aria-selected',String(partyMode));selfTab.tabIndex=partyMode?-1:0;partyTab.tabIndex=partyMode?0:-1;
  listStatus.textContent=partyMode?(!selectedCharacter?'読取済みPTを表示しています。画面読取の「自キャラ」で自分のキャラを指定してください。':document.body.classList.contains('mobile-ui')?'PT登録：一覧をタップで追加、PTの操作ボタンから解除（自分を含めて最大4人）':'PT登録：キャラをクリックで追加、右クリックで解除（自分を含めて最大4人）'):'';
  renderParty();
 }
 function registerPartyMember(row){
  if(!selectedCharacter)return;
  const id=String(row.id);
  if(partySlots.some(member=>String(member)===id)){listStatus.textContent=row.name+'は登録済みです。';return;}
  const empty=partySlots.indexOf(null);
  if(empty<0){listStatus.textContent=document.body.classList.contains('mobile-ui')?'PTは自分を含めて4人までです。PTの操作ボタンからメンバーを解除できます。':'PTは自分を含めて4人までです。右クリックでメンバーを解除できます。';return;}
  partySlots[empty]=row.id;partyStates.set(id,{level:0,currentHp:null,chips:[],manual:{atk:0,def:0,move:0}});renderParty();window.dispatchEvent(new Event('party-members-change'));listStatus.textContent=row.name+'を'+(empty+1)+'番目に登録しました。'+(document.body.classList.contains('mobile-ui')?'PTの操作ボタンから解除できます。':'右クリックで解除できます。');
 }
 function removePartyMember(id){
  if(id===null||id===undefined||String(id)===String(selectedCharacter?.id))return;
  const index=partySlots.findIndex(member=>String(member)===String(id));if(index<0)return;
  const row=characters.find(item=>String(item.id)===String(id));partySlots[index]=null;partyStates.delete(String(id));if(partyEditId===String(id)){partyEditId=null;chipStatus.textContent='';}renderParty();window.dispatchEvent(new Event('party-members-change'));listStatus.textContent=(row?.name||'メンバー')+'のPT登録を解除しました。';
 }
 selfTab.addEventListener('click',()=>setPartyMode(false));partyTab.addEventListener('click',()=>setPartyMode(true));
 for(const tab of [selfTab,partyTab])tab.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?selfTab:event.key==='End'?partyTab:tab===selfTab?partyTab:selfTab;target.click();target.focus();});

 function renderSelectedCharacter(){
  if(!selectedCharacter){
   const hasParty=partySlots.some(id=>id!==null);selectedPanel.hidden=!hasParty;
   selfTab.disabled=hasParty;selfTab.textContent=hasParty?'自分未判定':'自キャラ';selfTab.title=hasParty?'画面読取の「自キャラ」で自分のキャラを指定してください。':'';
   if(hasParty)setPartyMode(true);return;
  }
  selfTab.disabled=false;selfTab.textContent='自キャラ';selfTab.title='';
  selectedPanel.hidden=false;
  document.getElementById('selected-character-name').textContent=selectedCharacter.name;
  document.getElementById('selected-character-level').textContent='Lv.'+state().level;
  const portrait=document.getElementById('selected-character-image');portrait.src='../images/character/'+encodeURIComponent(selectedCharacter.images);portrait.alt=selectedCharacter.name;
  document.getElementById('selected-character-portrait').setAttribute('aria-label',selectedCharacter.name+' Lv.'+state().level+'：クリックでレベルアップ、右クリックでレベルダウン');
  renderOwned();renderConditions();updateStats();
  root.querySelectorAll('.character-select').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===selectedCharacter.id)));
  updateChipListSelection();renderParty();
  window.dispatchEvent(new Event('character-evidence-change'));
 }
 function selectCharacter(row,openParty=false,notify=true){
  const ownIndex=partySlots.findIndex(id=>String(id)===String(selectedCharacter?.id));
  for(let i=0;i<partySlots.length;i++)if(String(partySlots[i])===String(row.id))partySlots[i]=null;
  partyStates.delete(String(row.id));partyEditId=null;partySlots[ownIndex<0?0:ownIndex]=row.id;
  selectedCharacter=row;renderSelectedCharacter();window.dispatchEvent(new Event(notify?'character-selection-change':'character-initialized'));if(openParty)setPartyMode(true);
 }
 function resetCharacterForNewGame(){
  gameResetRequested=true;closeSkillDialogs();if(skillTooltipController)skillTooltipController.element.hidden=true;
  selectedCharacter=null;currentOpponent=null;states.clear();partyStates.clear();partySlots.fill(null);partyEditId=null;draggedPartyIndex=null;
  conditionsBox.replaceChildren();ownedBox.replaceChildren();selectedPanel.hidden=true;
  document.getElementById('selected-character-name').textContent='';
  for(const id of ['selected-character-current-hp','selected-character-atk','selected-character-def'])document.getElementById(id).value='';
  document.getElementById('selected-character-skill-controls').hidden=true;
  selfTab.disabled=false;selfTab.textContent='自キャラ';selfTab.title='';setPartyMode(false);listStatus.textContent='';chipStatus.textContent='';
  document.getElementById('selected-self-tab').click();document.getElementById('character-list-tab').click();
  root.querySelector('.chip-category-tabs button[data-category="マーク"]')?.click();renderChips();
  window.dispatchEvent(new Event('character-selection-change'));window.dispatchEvent(new Event('party-members-change'));
 }
 window.addEventListener('new-game-reset',resetCharacterForNewGame);
 // Dedicated bridge for the isolated screen-reader edition. Values are absolute
 // observations; chip pages are additive, and missing fields never clear state.
 window.ScreenReaderCharacterBridge={
  catalog:()=>({characters:characters.map(row=>({id:String(row.id),name:row.name})),chips:chips.map(row=>({id:String(row.id),name:row.name}))}),
  snapshot:()=>({selfId:String(selectedCharacter?.id||''),members:partySlots.map((id,slot)=>{const row=characters.find(r=>String(r.id)===String(id));if(!row)return {slot};const own=String(id)===String(selectedCharacter?.id),s=own?state():getPartyState(id),totals=own?calculate():calculatePartyMember(row);return {slot,id:String(id),name:row.name,level:s.level,currentHp:s.currentHp,maxHp:totals.hp,atk:totals.atk,def:totals.def,move:totals.move,coin:s.screenCoin,chips:[...s.chips]};})}),
  reset:resetCharacterForNewGame,
  apply:observation=>{
   if(!observation||!Array.isArray(observation.members))return {updated:0,added:0};
   const rowFor=id=>characters.find(row=>String(row.id)===String(id)),valid=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
   const fixed=Array.isArray(observation.partyIds)&&observation.partyIds.length===4&&new Set(observation.partyIds.map(String)).size===4&&observation.partyIds.every(id=>rowFor(id))?observation.partyIds.map(String):null;
   const candidates=observation.members.filter(m=>m&&rowFor(m.id)&&(!fixed||fixed.includes(String(m.id))&&(m.slot===undefined||fixed[m.slot]===String(m.id))));
   const seen=candidates.filter(m=>candidates.filter(other=>String(other.id)===String(m.id)).length===1&&(m.slot===undefined||valid(m.slot,0,3)&&candidates.filter(other=>other.slot===m.slot).length===1));
   const self=fixed&&!fixed.includes(String(observation.selfId))?null:rowFor(observation.selfId);let updated=0,added=0;
   const before=partySlots.map(id=>id===null?null:String(id)).join(',');
   if(fixed){
    const clearSelf=selectedCharacter&&!fixed.some(id=>String(id)===String(selectedCharacter.id));
    if(clearSelf){closeSkillDialogs();selectedCharacter=null;partyEditId=null;}
    for(let i=0;i<4;i++)partySlots[i]=rowFor(fixed[i]).id;
    if(clearSelf)window.dispatchEvent(new Event('character-selection-change'));
   }

   if(!selectedCharacter&&self){
    const fromParty=partyStates.get(String(self.id)),newMax=fromParty?calculatePartyMember(self).hp:null,index=partySlots.findIndex(id=>String(id)===String(self.id));
    if(fromParty)Object.assign(getState(self.id),{...fromParty,manual:{...fromParty.manual},chips:[...fromParty.chips]});
    partyStates.delete(String(self.id));selectedCharacter=self;partyEditId=null;
    if(fromParty?.screenMaxHp!==undefined){state().screenMaxHp=newMax;state().screenMaxHpBasis=calculate(true);}
    partySlots[index>=0?index:Math.max(0,partySlots.indexOf(null))]=self.id;
    window.dispatchEvent(new Event('character-selection-change'));
   }
   if(self&&String(self.id)!==String(selectedCharacter?.id)){
    const oldId=String(selectedCharacter.id),oldIndex=partySlots.findIndex(id=>String(id)===oldId),newIndex=partySlots.findIndex(id=>String(id)===String(self.id)),old=state(),oldMax=calculate().hp;
    const oldMember={level:old.level,currentHp:old.currentHp,chips:[...old.chips],manual:{...old.manual},screenMaxHp:old.screenMaxHp===undefined?undefined:oldMax,screenCoin:old.screenCoin};
    partyStates.set(oldId,oldMember);if(oldMember.screenMaxHp!==undefined)oldMember.screenMaxHpBasis=calculatePartyMember(selectedCharacter,true);
    const fromParty=partyStates.get(String(self.id)),newMax=fromParty?calculatePartyMember(self).hp:null;if(fromParty)Object.assign(getState(self.id),{...fromParty,manual:{...fromParty.manual},chips:[...fromParty.chips]});
    partyStates.delete(String(self.id));selectedCharacter=self;partyEditId=null;
    if(fromParty?.screenMaxHp!==undefined){state().screenMaxHp=newMax;state().screenMaxHpBasis=calculate(true);}
    for(let i=0;i<4;i++)if(String(partySlots[i])===String(self.id))partySlots[i]=null;
    // A known PT member becoming self keeps the observed party order.
    partySlots[newIndex>=0?newIndex:oldIndex<0?0:oldIndex]=self.id;
    window.dispatchEvent(new Event('character-selection-change'));
   }
   const ownId=String(selectedCharacter?.id||''),knownSlots=seen.filter(m=>valid(m.slot,0,3));
   // Apply only unambiguous slot observations and preserve unidentified occupants.
   for(const m of knownSlots){
    if(knownSlots.filter(other=>other.id===m.id||other.slot===m.slot).length!==1)continue;
    if(String(partySlots[m.slot])===ownId&&String(m.id)!==ownId&&!knownSlots.some(other=>String(other.id)===ownId))continue;
    for(let i=0;i<4;i++)if(i!==m.slot&&String(partySlots[i])===String(m.id))partySlots[i]=null;
    partySlots[m.slot]=rowFor(m.id).id;
   }
   const hpBefore=new Map();
   for(const id of partySlots){const row=rowFor(id);if(!row)continue;const own=String(id)===ownId,s=own?state():getPartyState(id);if(s.screenMaxHp!==undefined)hpBefore.set(String(id),own?calculate().hp:calculatePartyMember(row).hp);}
   for(const m of seen){
    const row=rowFor(m.id),own=String(row.id)===ownId;
    if(!partySlots.some(id=>String(id)===String(row.id)))continue;
    const s=own?state():getPartyState(row.id);
    if(valid(m.level,0,3))s.level=m.level;
    if(valid(m.maxHp,1,999))s.screenMaxHp=m.maxHp;
    if(valid(m.currentHp,0,999))s.currentHp=m.currentHp;
    if(valid(m.coin,0,999))s.screenCoin=m.coin;
    updated++;
   }
   const owner=rowFor(observation.chipOwnerId);
   if(owner&&partySlots.some(id=>String(id)===String(owner.id))&&Array.isArray(observation.chipIds)){
    const s=String(owner.id)===ownId?state():getPartyState(owner.id);
    for(const raw of observation.chipIds){const chip=chips.find(c=>String(c.id)===String(raw));if(chip&&!s.chips.includes(chip.id)){s.chips.push(chip.id);added++;}}
   }
   // Reading an existing chip/level is not a manual acquisition. If the
   // maximum is hidden, retain the last total instead of counting it twice.
   const hpOwners=new Set([...seen.map(m=>String(m.id)),...(owner?[String(owner.id)]:[])]);
   for(const id of hpOwners){
    if(!partySlots.some(member=>String(member)===id))continue;
    const row=rowFor(id),own=id===ownId,s=own?state():getPartyState(id),m=seen.find(item=>String(item.id)===id);
    if(valid(m?.maxHp,1,999))s.screenMaxHp=m.maxHp;
    else if(hpBefore.has(id))s.screenMaxHp=hpBefore.get(id);
    if(s.screenMaxHp!==undefined)s.screenMaxHpBasis=own?calculate(true):calculatePartyMember(row,true);
   }
   // Correct total values after level/chip/HP changes; retain all unobserved stats.
   for(const m of seen){const row=rowFor(m.id);if(!partySlots.some(id=>String(id)===String(row.id)))continue;const own=String(row.id)===ownId,s=own?state():getPartyState(row.id),totals=own?calculate():calculatePartyMember(row);s.manual??={atk:0,def:0,move:0};for(const key of ['atk','def','move'])if(valid(m[key],0,999))s.manual[key]=(s.manual[key]||0)+m[key]-totals[key];}
   renderSelectedCharacter();if(before!==partySlots.map(id=>id===null?null:String(id)).join(','))window.dispatchEvent(new Event('party-members-change'));
   return {updated,added};
  }
 };
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
  if(String(selectedCharacter.id)==='28'){openSkillDialog(rinrinDialog);return;}
  if(String(selectedCharacter.id)==='23'){
   const container=teruDialog.querySelector('#teru-skill-inputs');container.replaceChildren();
   container.append(sourceInput({key:'三神憑依攻撃補正',label:'憑依する味方の攻撃力',stat:'atk'}),sourceInput({key:'三神憑依防御補正',label:'憑依する味方の防御力',stat:'def'}));
   openSkillDialog(teruDialog);return;
  }
  if(skill.inputStats){
   const container=sourceDialog.querySelector('#skill-source-dialog-inputs');container.replaceChildren();sourceDialog.querySelector('h3').textContent=skill.label;
   for(const spec of skill.inputStats)container.append(sourceInput(spec));openSkillDialog(sourceDialog);return;
  }
  if(skill.target){requestSkillTargets(skill);return;}
  window.rememberCharacterSkillActivation?.();
  applyActiveSkillEffects(skill);
  state().skillCooldowns[skill.key]=activeSkillMaxCooldown(skill);
  renderConditions();updateStats();
 });
 function requestSkillTargets(skill){
  window.dispatchEvent(new CustomEvent('character-skill-target-request',{detail:{target:skill.target,skillKey:skill.key,label:skill.label,characterId:selectedCharacter.id,multipleTargets:!!skill.multipleTargets,attackAfterSkill:String(selectedCharacter.id)==='9'&&calculate().atk>=7}}));
 }
 function applyActiveSkillEffects(skill){
  if(state().chips.includes('121'))state().modes['121']=1;
  state().activeEffects=(state().activeEffects||[]).filter(effect=>effect.source!==skill.key);
  // Decide conditional branches before any effect changes its source control.
  const effects=(skill.effects||[]).filter(activeEffectAllowed);
  for(const effect of effects){
   if(effect.type==='heal'&&effect.target==='self'){const maxHp=calculate().hp;state().currentHp=Math.min(maxHp,(Number(state().currentHp)||0)+(Number(effect.value)||0));continue;}
   if(effect.type==='heal_from_control'&&effect.target==='self'){const maxHp=calculate().hp;state().currentHp=Math.min(maxHp,(Number(state().currentHp)||0)+abilityControlValue(effect.sourceKey));continue;}
   if(effect.type==='increase_max_hp'){state().maxHpBonus=(Number(state().maxHpBonus)||0)+(Number(effect.value)||0);continue;}
   if(effect.type==='increase_control_max'){state().controlMaxBonuses[effect.key]=(Number(state().controlMaxBonuses[effect.key])||0)+(Number(effect.value)||0);continue;}
   if(effect.type==='modify_control'){const current=abilityControlValue(effect.key),next=Math.max(Number(effect.min)||0,Math.min(effect.max===undefined?Infinity:Number(effect.max),current+(Number(effect.delta)||0)));state().numbers[effect.key]=next;continue;}
   if(effect.type==='reduce_fan_attack'){window.reduceRosterFanAttack?.();continue;}
   if(['damage_monster','modify_monster_def','modify_monster_mark','fate_echo','set_monster_status'].includes(effect.type))continue;
   state().activeEffects.push({...effect,when:undefined,unless:undefined,...(effect.sourceKey?{resolvedValue:effect.rounding==='ceil'?Math.ceil(abilityControlValue(effect.sourceKey)*(effect.multiplier===undefined?1:Number(effect.multiplier))):abilityControlValue(effect.sourceKey)*(effect.multiplier===undefined?1:Number(effect.multiplier))}:effect.sourceStat?{resolvedValue:calculate()[effect.sourceStat]}:{}),source:skill.key});
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
 hpButton.addEventListener('click',()=>changeHp(-1));
 hpButton.addEventListener('contextmenu',event=>{event.preventDefault();changeHp(1);});
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
    button.addEventListener('click',()=>{if(partyMode)registerPartyMember(row);else selectCharacter(row,true);});
    button.addEventListener('contextmenu',event=>{if(!partyMode)return;event.preventDefault();removePartyMember(row.id);});
   }else{
    button.className='chip-select';button.dataset.name=row.name;button.title=getSkillHoverText('chip.'+row.id);button.setAttribute('aria-label',row.name+'：'+row.effect+'。取得する');button.setAttribute('aria-pressed',String(Boolean(selectedCharacter&&chipOwnerState().chips.includes(row.id))));
    button.addEventListener('click',()=>{
     if(!selectedCharacter){chipStatus.textContent='先にキャラクターを選択してください。';return;}
     if(chipOwnerState()!==state()){
      const member=chipOwnerState(),owner=characters.find(item=>String(item.id)===String(partyEditId));
      if(member.chips.includes(row.id))member.chips=member.chips.filter(id=>id!==row.id);
      else {const oldMax=calculatePartyMember(owner).hp,oldHp=member.currentHp;member.chips.push(row.id);const newMax=calculatePartyMember(owner).hp;member.currentHp=Math.min(newMax,oldHp+Math.max(0,newMax-oldMax));}
      renderConditions();updateStats();return;
     }
     chipStatus.textContent='';
     if(state().chips.includes(row.id)){
      state().chips=state().chips.filter(id=>id!==row.id);delete state().modes[row.id];
      for(const [key,triggers] of [['attack',['on_attack','on_attack_after_mark']],['move',['on_next_move']]]){
       if(!state().chips.some(id=>(byChip.get(id)||[]).some(rule=>triggers.includes(rule.trigger))))state().phases[key]=false;
      }
     }
     else{const oldMax=calculate().hp,oldHp=state().currentHp;state().chips.push(row.id);state().phases??={attack:false,move:false};state().phases.attack=false;const newMax=calculate().hp;state().currentHp=Math.min(newMax,oldHp+Math.max(0,newMax-oldMax));}
     renderSelectedCharacter();
    });
   }
   button.append(item);target.append(button);
   if(folder==='character_list'){const detail=document.createElement('button');detail.type='button';detail.className='mobile-only mobile-character-detail';detail.textContent='能力の詳細';detail.setAttribute('aria-label',row.name+'の能力の詳細');detail.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('mobile-character-detail',{detail:{id:String(row.id)}})));target.append(detail);}
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
  if(mapPicker.value==='MAP0105'&&number(state(),'ガオーの注目')>0){state().numbers['ガオーの注目']-=1;changed=true;}
  for(const id of ['121','145'])if(state().modes[id]){state().modes[id]=0;changed=true;}
  if(state().numbers['電撃グローブ命中数']){state().numbers['電撃グローブ命中数']=0;changed=true;}
  if(state().chips.includes('206')&&number(state(),'マインド')>0){state().numbers['マインド']=number(state(),'マインド')-1;changed=true;}
  for(const key of Object.keys(state().skillCooldowns)){const current=Number(state().skillCooldowns[key])||0;if(current>0){state().skillCooldowns[key]=current-1;changed=true;}}
  for(const key of ['PT大鉦','PTカクテル攻撃','PTカクテル防御','PTドロシー攻撃','PTユメ攻撃補正','PT潜伏','PTハンナ親友の祝福'])if(state().numbers[key]){state().numbers[key]=0;changed=true;}
  if(String(selectedCharacter.id)==='106'&&state().numbers['PTハンナ次の移動']){state().numbers['PTハンナ次の移動']=0;changed=true;}
  for(const control of abilityRules()?.controls||[])if(control.duration==='turn'&&state().numbers[control.key]){state().numbers[control.key]=0;changed=true;}
  const beforeEffects=state().activeEffects.length;
  state().activeEffects=state().activeEffects.filter(effect=>effect.duration!=='turn').map(effect=>effect.durationTurns?{...effect,durationTurns:effect.durationTurns-1}:effect).filter(effect=>effect.durationTurns===undefined||effect.durationTurns>0);
  if(state().activeEffects.length!==beforeEffects)changed=true;
  if(state().chips.includes('57')){const charge=number(state(),'エナジー');if(charge<6){state().numbers['エナジー']=6;changed=true;}}
  for(const effect of abilityRules()?.turnEnd||[]){const current=abilityControlValue(effect.key),next=Math.max(Number(effect.min)||0,current+(Number(effect.delta)||0));if(next!==current){state().numbers[effect.key]=next;changed=true;}}
  if(changed){renderConditions();updateStats();}
 };
 document.querySelectorAll('.role-tab').forEach(tab=>tab.addEventListener('click',()=>{if(tab.dataset.role==='map'||tab.dataset.role==='character')clearCharacterAttackPhase();}));
 window.addEventListener('party-members-change',()=>{if(selectedCharacter){renderConditions();updateStats();}});
 window.addEventListener('roster-status-change',()=>{if(selectedCharacter){renderConditions();updateStats();}});
 window.addEventListener('character-monster-defeated',()=>{if(String(selectedCharacter?.id)!=='9')return;state().numbers['モンスター撃破数']=abilityControlValue('モンスター撃破数')+1;const skill=activeSkill();state().skillCooldowns[skill.key]=Math.max(0,activeSkillCooldown(skill)-2);renderConditions();updateStats();});
 window.addEventListener('character-opponent-change',event=>{currentOpponent=event.detail;if(selectedCharacter){renderConditions();updateStats();}});
 applyAttackTargetEffects=enemy=>{if(!selectedCharacter||!enemy||enemy.defeated)return;state().phases??={attack:false,move:false};state().phases.attack=true;const ids=new Set(state().chips);const markGain=(ids.has('36')?1:0)+(ids.has('37')?1:0);if(markGain)enemy.markStacks=(enemy.markStacks||0)+markGain;currentOpponent={name:enemy.name,mapId:enemy.mapId,markStacks:enemy.markStacks||0};};
 wireCharacterTabs(root.querySelector('.character-subtabs'),tab=>{document.getElementById('character-list-view').hidden=tab.id!=='character-list-tab';document.getElementById('character-chip-view').hidden=tab.id!=='character-chip-tab';});
 wireCharacterTabs(root.querySelector('.chip-category-tabs'),tab=>{category=tab.dataset.category;document.getElementById('chip-category-view').setAttribute('aria-labelledby',tab.id);renderChips();});
 loadCharacterData({listStatus,chipStatus,statusIconSnapshot:STATUS_ICON_SNAPSHOT}).then(data=>{
  ({characters,chips,rules,statusIcons,mapKeywords,characterSkills}=data);
  skillTooltipController=setupCharacterSkillTooltip({characterSkills});
  for(const rule of rules){if(!byChip.has(rule.chip_id))byChip.set(rule.chip_id,[]);byChip.get(rule.chip_id).push(rule);}
  renderImages(document.getElementById('character-image-list'),characters,'character_list','list_img');renderChips();
  const defaultCharacter=characters.find(row=>row.name==='ミミ');if(defaultCharacter&&!gameResetRequested)selectCharacter(defaultCharacter,false,false);
 });
})();
