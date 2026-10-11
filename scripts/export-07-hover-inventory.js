// Offline documentation export. No browser, gameplay, CT scan or PT matrix is run.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/hover-descriptions');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const character=read('07_skill/js/character.js'),map=read('07_skill/js/map.js');
const files=['07_skill/js/character.js','07_skill/js/character-view.js','07_skill/js/character-ability-rules.js','07_skill/js/roster-view.js','07_skill/js/map.js','07_skill/js/map-utils.js','07_skill/index.html','csv/character_stats.csv','csv/character_skills.csv','csv/status_icon_map_all.csv','csv/chip_list.csv','csv/chip_stat_rules.csv'];
// Minimal text DOM for calling the existing display builders, without running the app.
class TextNode{constructor(text){this.textContent=String(text);}}
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.classList={add(){},toggle(){}};this.style={setProperty(){}};this._text='';}
 append(...children){this.children.push(...children.map(x=>typeof x==='string'?new TextNode(x):x));}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(key,value){this.attributes[key]=String(value);}
 addEventListener(){}
 get textContent(){return this._text+this.children.map(c=>c.textContent||'').join('');}
 set textContent(value){this._text=String(value);this.children=[];}
}
const elements=new Map();
const context=vm.createContext({document:{createElement:tag=>new Element(tag),createTextNode:text=>new TextNode(text),getElementById:id=>{if(!elements.has(id))elements.set(id,new Element('div'));return elements.get(id);}},ResizeObserver:class{observe(){}},window:{},console});
const exec=code=>vm.runInContext(code,context);
const section=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Source anchor missing: '+start);return text.slice(a,b);};
exec(section(read('07_skill/js/map-utils.js'),'function parseMapCSV(','function eventImageFiles('));
const csv=file=>{context.csvText=read(file);return exec('parseMapCSV(csvText)');};
exec(read('07_skill/js/character-ability-rules.js'));exec(read('07_skill/js/character-view.js'));exec(read('07_skill/js/roster-view.js'));
const rules=exec('CHARACTER_ABILITY_RULES'),characters=csv('csv/character_stats.csv'),abilities=csv('csv/character_skills.csv'),chips=csv('csv/chip_list.csv'),chipRules=csv('csv/chip_stat_rules.csv'),icons=csv('csv/status_icon_map_all.csv');
const names=new Map(characters.map(c=>[c.id,c.name]));
context.chips=chips;context.statusIcons=new Map(icons.map(c=>[c.effect_key,c.icon_file]));context.mapKeywords=[];context.conditionsBox=new Element('div');
exec(section(character,'const specialIcons=','\n const getState'));
exec(section(character,'const partySupportControls=','\n function renderPartySupport'));
exec(section(character,'function makeIcon(','\n function neededInputs'));
exec(section(character,'function neededInputs(','\n // Received PT effects'));
exec(section(character,'function renderPartySupport(','\n // Follow-up preview'));
exec(section(character,'function renderTeruSupport(','\n function renderConditions'));
exec(section(character,'function renderConditions(','\n function updateActiveSkillUi'));
exec(section(character,'function sourceInput(','\n function renderSkillInputs'));
exec(section(character,'function updateActiveSkillUi(','\n function updateStats'));
exec(section(character,'const activeSkillMaxCooldown=','\n const activeEffectConditionMatches'));
exec(section(character,'function toggleable(','\n function updateChipListSelection'));
context.renderSkillInputs=()=>{};context.updateStats=()=>{};
context.byChip=new Map(chips.map(c=>[c.id,chipRules.filter(r=>r.chip_id===c.id)]));
context.abilityRules=()=>rules[String(context.selectedCharacter.id)];
context.state=()=>context.currentState;
context.abilityControlValue=key=>{const s=context.currentState,id=String(context.selectedCharacter.id);if(id==='6'&&key.startsWith('自己主張なし')&&s.numbers['マジで怒ったぞ'])return 2;return Number(s.numbers[key]??rules[id]?.controls?.find(c=>c.key===key)?.default)||0;};
context.number=(s,key)=>Math.min(key==='チャージ'?10:Infinity,Math.max(0,Number(s.numbers[key])||0));
context.activeRules=()=>chipRules.filter(r=>context.currentState.chips.includes(r.chip_id));
context.activeSkill=()=>rules[String(context.selectedCharacter.id)]?.activeSkills?.[0];
function render(id,numbers={},party=[],owned=[],mapId='',opponent=null){
 context.selectedCharacter=characters.find(c=>c.id===id);context.currentState={numbers,modes:{},chips:owned,phases:{},controlMaxBonuses:{},skillCooldowns:{}};context.partySlots=party;context.mapPicker={value:mapId};context.currentOpponent=opponent;context.mapKeywords=icons.filter(c=>c.map_id);exec('renderConditions()');return context.conditionsBox.children;
}
const descendants=e=>[e,...(e.children||[]).flatMap(descendants)];
function describe(element){const all=descendants(element),input=all.find(e=>e.tagName==='input'),button=all.find(e=>e.tagName==='button'),icon=all.find(e=>e.tagName==='img');return {key:(input?.attributes['aria-label']||button?.attributes['aria-label']||element.textContent).replace(/の数$|を増やす$/,'').split('：')[0],type:input?(input.type==='checkbox'?'チェック':'数値入力'):'ボタン',title:element.title||button?.title||'',icon:icon?.src?.replace(/^\.\.\/images\//,'')||'',note:!element.title&&!button?.title?'title未設定（aria-labelは別情報）':''};}
const columns=['ID','分類','キャラID','キャラクター','表示先','表示条件','操作名','種類','状態例','アイコン','現在の説明文','修正後の説明文','確認メモ','参照元','編集メモ'];
const rows=[],ids=new Set();
function add(id,category,owner,where,condition,name,type,variant,icon,title,source,note=''){
 if(ids.has(id))throw Error('Duplicate ID '+id);ids.add(id);rows.push(Object.fromEntries(columns.map((c,i)=>[c,[id,category,owner,names.get(owner)||owner||'共通',where,condition,name,type,variant,decodeURIComponent(icon),title,'',note,source,''][i]])));
}
function capture(id,category,owner,where,condition,element,variant='初期表示',note=''){
 const d=describe(element);add(id,category,owner,where,condition,d.key,d.type,variant,d.icon,d.title,'07_skill/js/character.js:renderConditions / character-view.js', [d.note,note].filter(Boolean).join('。'));
}
for(const c of characters){
 const id=c.id,base=render(id);
 for(const e of base){const d=describe(e);capture(`self:${id}:${d.key}:base`,'自キャラ',id,'自キャラ状態欄','自キャラが'+c.name,e);}
 for(const control of rules[id]?.controls||[]){
  if(control.placement)continue;
  const party=control.requiresParty?[control.requiresParty]:[];
  if(control.requiresParty){const e=render(id,{},party).find(e=>describe(e).key===control.key);if(!e)throw Error('Required-party control missing');capture(`self:${id}:${control.key}:required`,'自キャラ',id,'自キャラ状態欄','自キャラが'+c.name+'、PTに'+names.get(control.requiresParty),e);}
  const variants=control.type==='toggle'?[{value:1,label:'オン'}]:control.type==='choice'?(control.options||[]).filter(o=>o.value!==0).map(o=>({value:o.value,label:o.label})):control.iconAtMax?[{value:control.max,label:'最大値'}]:[];
  for(const v of variants){const e=render(id,{[control.key]:v.value},party).find(e=>describe(e).key===control.key);if(!e)throw Error('Variant control missing');capture(`self:${id}:${control.key}:${v.value}`,'自キャラ',id,'自キャラ状態欄','自キャラが'+c.name+(party.length?'、PTに'+names.get(party[0]):''),e,v.label);}
  if(control.iconAtMax){context.control=control;const title=exec("control.key+'：左クリックで＋1、右クリックで−1'");const e=render(id).find(e=>describe(e).key===control.key),d=describe(e);add(`self:${id}:${control.key}:edited`,'自キャラ',id,'自キャラ状態欄','自キャラが'+c.name,control.key,d.type,'値編集後・最大未満',d.icon,title,'07_skill/js/character.js:renderConditions:setValue','初期表示と記号・操作文が異なる。最大到達時は最大値行を参照');}
 }
 const skill=rules[id]?.activeSkills?.[0];if(!skill)throw Error('Missing skill '+id);
 render(id);exec('updateActiveSkillUi()');
 add(`skill:${id}`,'スキル',id,'スキル使用ボタン','自キャラが'+c.name,skill.label,'ボタン','通常／CT中（無効）','',elements.get('selected-character-skill').title,'07_skill/js/character.js:updateActiveSkillUi','CT中はボタン無効。効果全文とは別');
 add(`ct:${id}`,'スキル',id,'CTボタン','自キャラが'+c.name,'CT','ボタン','通常上限 '+skill.cooldown,'',elements.get('selected-character-ct').title,'07_skill/js/character.js:updateActiveSkillUi','CT短縮チップ15所持時は上限・説明の数字が1少なくなる');
 context.ability=abilities.find(a=>a.id===id)?.ability||'';context.characterRow=c;const text=exec('createCharacterSkillTooltipView(characterRow,ability).description.textContent');
 add(`ability:${id}`,'能力全文',id,'キャラクター一覧／詳細','スキルを表示がオンの時に一覧でホバー／詳細表示',c.name+'の能力','能力説明','07の表示文面','',text,'csv/character_skills.csv / 07_skill/js/character-view.js:createCharacterSkillTooltipView','07限定の見出し・文面調整反映済み。ボタンのtitleではない');
}
for(const donor of ['8','103','104','20','27','105','23','10','11']){
 const base=render('1',{},[donor]);
 for(const e of base){const d=describe(e);const condition='自キャラは受領側（抽出例ミミ）、PTに'+names.get(donor)+(donor==='10'?'':'。受領状態が残ればPT解除後も表示される場合あり');capture(`pt:${donor}:${d.key}:base`,'PT受領',donor,'自キャラ状態欄',condition,e,'初期表示');
  if(d.type==='ボタン'&&d.key!=='PTパンダマン回復＋2'){const values=d.key==='潜入調査'?[1,2,3]:[1];for(const value of values){const active=render('1',{[d.key]:value},[donor]).find(e=>describe(e).key===d.key);capture(`pt:${donor}:${d.key}:${value}`,'PT受領',donor,'自キャラ状態欄',condition,active,d.key==='潜入調査'?'フェーズ値 '+value:'オン');}}
 }
}
const blessing=render('106',{},['105']).find(e=>describe(e).key==='PTハンナ推理タイム＋1');capture('pt:105:blessing:106','PT受領','105','橘シェリーの状態欄','自キャラが橘シェリー、PTに遠野ハンナ／受領移動状態が残る間',blessing,'通常','aria-labelはPTハンナ推理タイム＋1。人形完成と祝福は別操作');
for(const id of ['16','26','23']){
 const specs=id==='23'?exec(character.match(/container\.append\(sourceInput\((\{key:'三神憑依攻撃補正'.*?\}),false\),sourceInput\((\{key:'三神憑依防御補正'.*?\}),false\)\)/).slice(1).join(',').replace(/^/,'[').replace(/$/,']')):rules[id].activeSkills[0].inputStats;
 render(id);for(const spec of specs){context.spec=spec;const e=exec('sourceInput(spec,false)');add(`input:${id}:${spec.key}`,'スキル入力',id,'スキル入力枠','自キャラが'+names.get(id)+'、スキルボタン押下後',spec.label,'数値入力','通常',describe(e).icon,e.title,'07_skill/js/character.js:sourceInput','現在のtitleは入力対象名のみ');}
}
const fanTitle=map.match(/partyFanReduce\.title=('[^']*');/)[1];add('monster:pt-fan-reduce','PT受領','101','モンスター一覧上部','超てんちゃんがPT','PTファン ATK−1','ボタン','通常','',exec(fanTitle),'07_skill/js/map.js:partyFanReduce');
const configs=exec(section(map,'for(const config of [','].filter(config=>').replace('for(const config of ','')+']');
for(const config of configs){context.config=config;const d=exec("createRosterCharacterStatusControl({},'対象モンスター',config).button");add(`monster:${config.key}`,'モンスター状態',config.characterId,'モンスター一覧',config.characterId==='29'?'自キャラがサイクスのみ（PTサイクスでは表示しない）':names.get(config.characterId)+'が自キャラまたはPT',config.label,config.stack?'スタック':'ボタン','通常',config.icon?'UT_Buff/'+config.icon:'',d.title,'07_skill/js/map.js:renderRoster / roster-view.js:createRosterCharacterStatusControl','撃破済みは操作無効');}
for(const partyKaisei of [false,true]){context.partyKaisei=partyKaisei;const expr=map.match(/button\.title=('フェイト・エコー[^\n]+);/)[1];add('monster:fate:'+partyKaisei,'モンスター状態','13','モンスター一覧',partyKaisei?'カイセイがPT（自キャラ以外）':'フェイト・エコー残数が1以上','フェイト・エコー','スタック',partyKaisei?'PT由来':'残数あり','UT_Buff/UT_Buff_114_Max.png',exec(expr),'07_skill/js/map.js:renderRoster','撃破済みは操作無効');}
const mark=exec("createRosterMarkControl({},'対象モンスター').field");add('monster:mark','モンスター状態','','モンスター一覧','全モンスター','マーク','スタック','通常','UT_Buff/UT_Buff_Lock.png',mark.title,'07_skill/js/roster-view.js:createRosterMarkControl');
// Map and chip-driven numeric controls are extracted from their actual input discovery path.
for(const mapId of [...new Set(icons.filter(c=>c.map_id).map(c=>c.map_id))])for(const e of render('1',{},[],[],mapId,mapId==='MAP0007'?{name:'クジャク係',mapId}:null)){const d=describe(e);capture(`map:${mapId}:${d.key}`,'共通・マップ','','自キャラ状態欄','マップ '+mapId+(d.key==='クジャク係の羽ばたき'?'、攻撃対象がクジャク係':''),e);if(d.type==='ボタン'){const active=render('1',{},[],[],mapId).find(x=>describe(x).key===d.key);context.currentState.modes[d.key]=1;exec('renderConditions()');capture(`map:${mapId}:${d.key}:on`,'共通・マップ','','自キャラ状態欄','マップ '+mapId,context.conditionsBox.children.find(x=>describe(x).key===d.key),'オン');}}
const shared=new Map();
for(const chip of chips){
 const numeric=render('1',{},[],[chip.id]);
 for(const e of numeric){const d=describe(e);if(d.type==='数値入力'){if(!shared.has(d.key))shared.set(d.key,{element:e,ids:[]});shared.get(d.key).ids.push(chip.id);}}
 context.chip=chip;context.chargeDelta=chip.category==='チャージ'&&chip.id!=='57'?({'51':2,'52':2,'53':2,'54':2,'55':-6,'56':-5,'58':-4}[chip.id]||0):null;
 const item=exec('createOwnedChipView(chip,chargeDelta,()=>{})');const d=describe(item);add(`chip:${chip.id}:owned`,'チップ',chip.id,'自キャラ所持チップ','該当チップ所持',chip.name,context.chargeDelta===null?'所持表示':'操作ボタン','通常',d.icon,item.title,'csv/chip_list.csv / 07_skill/js/character-view.js:createOwnedChipView','キャラクター列はチップ名。PT所持／選択一覧の文面は別行');rows.at(-1)['キャラクター']=chip.name;rows.at(-1)['キャラID']='';
 add(`chip:${chip.id}:pt`,'チップ','','PT所持チップ／チップ選択一覧','該当チップをPTが所持／チップ一覧表示',chip.name,'チップ表示','通常',d.icon,chip.name+'\n'+chip.effect,'csv/chip_list.csv / 07_skill/js/character-view.js:createPartyMemberView / character.js:renderChips','チャージ操作の追記なし');
 if(exec('toggleable(chip.id)'))for(const mode of chip.id==='112'?[0,1,2,3]:[0,1]){context.mode=mode;const element=exec('createChipConditionToggleView(chip,chip.id,mode,()=>{})');add(`chip:${chip.id}:toggle:${mode}`,'チップ','','自キャラ状態欄','該当チップ所持、条件切替対象',chip.name,'ボタン','モード '+mode,describe(element).icon,element.title,'07_skill/js/character-view.js:createChipConditionToggleView');}
}
for(const [key,value] of shared)capture('shared:'+key,'共通・チップ','','自キャラ状態欄','入力を参照するチップを所持：ID '+[...new Set(value.ids)].join(' / ')+(key==='ヒール'?'。自キャラ／PTルルまたは保持数>0でも表示':''),value.element);
for(const phase of ['攻撃時','移動時'])add('phase:'+phase,'共通・チップ','','自キャラ状態欄','対応する攻撃時／次の移動時チップ効果を所持',phase,'チェック','通常','','','07_skill/js/character-view.js:createConditionPhaseView','title未設定（表示ラベル・aria-labelのみ）');
// Static self stat buttons: take the literal title and artwork from index.html.
const html=read('07_skill/index.html');
for(const id of ['selected-character-portrait','selected-character-hp-fill','selected-character-atk-button','selected-character-def-button']){
 const tag=html.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>[\\s\\S]*?</button>'))[0];const title=tag.match(/title="([^"]*)"/)?.[1]||'',icon=tag.match(/src="\.\.\/images\/([^"]*)"/)?.[1]||'';
 add('common:'+id,'共通パラメータ','','自キャラパラメータ欄','自キャラ選択中',({'selected-character-portrait':'レベル変更','selected-character-hp-fill':'現在HP','selected-character-atk-button':'攻撃力','selected-character-def-button':'防御力'})[id],'ボタン','通常',icon,title,'07_skill/index.html','portraitはレベル操作。HP／ATK／DEFは手動操作');
}
// PT parameter button texts are generated by the actual builder.
context.partyRow=characters[0];const slot=exec("createPartyMemberView(partyRow,1,{level:0,currentHp:9,hp:9,atk:1,def:1,move:0},false,()=>{},[],()=>{})");
for(const e of descendants(slot).filter(e=>e.tagName==='button'&&e.title)){const label=e.attributes['aria-label']||'',name=label.replace(/^ミミの/,'').replace(/^ミミ Lv\.0：.*/,'レベル変更');add('party-param:'+e.className+':'+name,'共通パラメータ','','PTパラメータ欄','PTメンバー登録中',name,'ボタン','通常',describe(e).icon,e.title,'07_skill/js/character-view.js:createPartyMemberView','対象キャラ名はaria-labelで変化。titleは共通');}
// Preserve user-entered wording and notes across deterministic regeneration.
const output=path.join(out,'inventory.csv');const previous=fs.existsSync(output)?new Map(csv(path.relative(root,output)).map(r=>[r.ID,r])):new Map();
for(const [id,old] of previous)if(!ids.has(id)&&(old['修正後の説明文']||old['編集メモ']))throw Error('Edited row removed from source; review before export: '+id);
for(const row of rows){const old=previous.get(row.ID);if(old)for(const column of ['修正後の説明文','編集メモ'])row[column]=old[column]||'';}
const hashes=Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(read(file)).digest('hex')]));
const summary={rows:rows.length,categories:Object.fromEntries([...new Set(rows.map(r=>r['分類']))].map(c=>[c,rows.filter(r=>r['分類']===c).length])),characters:characters.length,sourceHashes:hashes};
const quote=s=>'"'+String(s).replaceAll('"','""')+'"';const content='\uFEFF'+[columns,...rows.map(r=>columns.map(c=>r[c]))].map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n';
if(process.argv.includes('--check')){if(!fs.existsSync(output)||read(path.relative(root,output))!==content||read('docs/hover-descriptions/source-manifest.json')!==JSON.stringify(summary,null,2)+'\n')throw Error('Inventory is stale; regenerate and review');}
else{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(output,content);fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(summary,null,2)+'\n');}
console.log(JSON.stringify({rows:summary.rows,categories:summary.categories,characters:summary.characters},null,2));
