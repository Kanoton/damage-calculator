let applyCharacterToCalculator=()=>{};
let applyAttackTargetEffects=()=>{};
let clearCharacterAttackPhase=()=>{};
let applyCharacterTurnStartEffects=()=>{};
let hasSelectedCharacter=()=>false;
(()=>{
const root=document.getElementById('map-draft'),data=normalizeMapData(INITIAL_MAP_DATA),pick=document.getElementById('mp-map-select'),difficulty=document.getElementById('mp-difficulty'),list=document.getElementById('mp-monster-list'),status=document.getElementById('mp-action-status');

const eventPreview=createEventMapPreview(document.getElementById('mp-map-image'),document.getElementById('mp-event-image-layer'),file=>new Promise(resolve=>{
 // File names refer to images/MapEvent, including optional subfolders.
 const url=safeAssetUrl('../images/MapEvent/',file);if(!url){resolve(null);return;}
 const img=new Image();img.onload=()=>resolve(url);img.onerror=()=>resolve(null);img.src=url;
}));
root.addEventListener('keydown',event=>{if(event.key==='Escape')eventPreview.reset();});
document.querySelectorAll('.role-tab,.mp-subtabs button').forEach(button=>button.addEventListener('click',()=>eventPreview.reset()));

// Route choices change the view, never execute events or reset the roster.
const routeState={context:'',route:'',moved:false};
const routeControls=document.createElement('div');routeControls.id='mp-route-controls';routeControls.hidden=true;
root.querySelector('.mp-map-only').prepend(routeControls);
const routeNote=document.createElement('p');routeNote.id='mp-route-note';routeNote.textContent='√決定後分岐';routeNote.hidden=true;root.querySelector('.mp-event-section h2').after(routeNote);
function availableRoutes(){return (data.maps[pick.value]?.routes||[]).filter(r=>!r.levels.length||r.levels.includes(difficulty.value));}
function ensureRoute(){const routes=availableRoutes(),context=JSON.stringify([pick.value,difficulty.value]);if(routeState.context!==context||!routes.some(r=>r.id===routeState.route)){routeState.context=context;routeState.route=(routes.find(r=>r.id==='COMMON')||routes[0])?.id||'';routeState.moved=false;}if(!routes.find(r=>r.id===routeState.route)?.movedImage)routeState.moved=false;return routes;}
function routeRows(rows){const keepCommon=availableRoutes().some(route=>route.id==='COMMON');return rows.filter(row=>{if(row.map_id!==pick.value||(rows!==data.missions&&!routeLevelMatches(row,difficulty.value)))return false;const route=String(row.route_id||'').trim();if(pick.value==='MAP0007'&&routeState.route&&routeState.route!=='COMMON'&&route==='COMMON'&&/^(クジャク|オシドリ)の試練に入る$/.test(String(row['報酬']||'').trim()))return false;return !route||route===routeState.route||(keepCommon&&route==='COMMON');});}
function currentMapImage(){const route=availableRoutes().find(r=>r.id===routeState.route);return route?(routeState.moved?route.movedImage:route.image):data.maps[pick.value]?.image;}
function renderRouteControls(){
 const focused=document.activeElement?.closest('#mp-route-controls')?document.activeElement.dataset.routeFocus:null;
 const routes=ensureRoute();routeNote.hidden=!(routes.length>1&&routeState.route==='COMMON');routeControls.replaceChildren();routeControls.hidden=routes.length===0;root.querySelector('.mp-map-only').classList.toggle('has-route-switches',routes.length>0);
 const makeGroup=(label,choices)=>{const group=document.createElement('div');group.className='mp-route-group';group.setAttribute('role','group');group.setAttribute('aria-label',label);for(const choice of choices){const button=document.createElement('button');button.type='button';button.textContent=choice.name;button.dataset.routeFocus=choice.key;button.setAttribute('aria-pressed',String(choice.active));button.addEventListener('click',()=>{choice.select();eventPreview.reset();render();});group.append(button);}routeControls.append(group);};
 if(routes.length)makeGroup('ルート表示',routes.map(r=>({name:r.name,key:'route:'+r.id,active:r.id===routeState.route,select:()=>{routeState.route=r.id;routeState.context=JSON.stringify([pick.value,difficulty.value]);if(!r.movedImage)routeState.moved=false;}})));
 if(routes.find(r=>r.id===routeState.route)?.movedImage)makeGroup('マップ表示',[{name:'共通マップ',key:'view:base',active:!routeState.moved,select:()=>routeState.moved=false},{name:'移動先マップ',key:'view:moved',active:routeState.moved,select:()=>routeState.moved=true}]);
 if(focused)[...routeControls.querySelectorAll('button')].find(b=>b.dataset.routeFocus===focused)?.focus();
}
function populateMaps(){const previous=pick.value;pick.replaceChildren();const entries=Object.entries(data.maps);entries.forEach(([id,map])=>{const option=document.createElement('option');option.value=id;option.textContent=map.name;pick.append(option);});pick.value=data.maps[previous]?previous:(entries.at(-1)?.[0]||'');pick.disabled=!entries.length;}populateMaps();
let monsterTipVersion=0;
let selected=null;const buff={attack:0,defense:0};
const gimmickCounts=new Map();
const gimmickArea=document.createElement('div');gimmickArea.className='mp-gimmicks';gimmickArea.setAttribute('aria-label','マップ固有ギミック');
function mapGimmicks(){return (data.gimmicks||[]).filter(r=>r.map_id===pick.value);}
function gimmickCount(row){return Math.min(gimmickMaximum(row),gimmickCounts.get(gimmickKey(row))??0);}
function effectiveStat(stats,key){
 if(!stats||stats[key]===''||stats[key]===undefined)return null;
 let value=Number(stats[key])+(key==='攻撃'?buff.attack:key==='防御'?buff.defense:0);

 mapGimmicks().filter(r=>r.monster_id===stats.monster_id&&(!r['難易度']||r['難易度']===difficulty.value)).forEach(r=>{
  value+=Number(r[key]||0)*gimmickCount(r);

 });
 return value;
}
function renderGimmicks(){
 const focused=document.activeElement?.dataset?.gimmick;gimmickArea.replaceChildren();
 const unique=new Map();mapGimmicks().forEach(r=>{if(!unique.has(r.gimmick_id))unique.set(r.gimmick_id,r);});
 unique.forEach(row=>{
  const button=document.createElement('button');button.type='button';button.dataset.gimmick=row.gimmick_id;const max=gimmickMaximum(row);const count=gimmickCount(row);button.textContent=row['表示名']+(max===1?'':' '+count);button.classList.toggle('mp-gimmick-complete',count>=max);button.setAttribute('aria-pressed',String(count>0));button.setAttribute('aria-label',row['表示名']+' '+gimmickCount(row)+'、左クリックで増加、右クリックで減少');
  button.title='左クリック：＋1 ／ 右クリック：−1';
  const change=delta=>{const current=gimmickCount(row),maximum=gimmickMaximum(row);const next=Math.max(0,Math.min(maximum,current+delta));if(next===current)return;if(pick.value==='MAP0104'&&row.gimmick_id==='warden_defeated'&&delta>0){rememberRoster();const defeated=defeatActiveWardens();if(!defeated)rosterCounts.set('MAP0104:warden_defeated',(rosterCounts.get('MAP0104:warden_defeated')||0)+1);render();return;}gimmickCounts.set(gimmickKey(row),next);render();};
  button.addEventListener('click',()=>change(1));button.addEventListener('contextmenu',event=>{event.preventDefault();change(-1);});button.addEventListener('keydown',event=>{if(event.shiftKey&&event.key==='Enter'){event.preventDefault();change(-1);}});
  gimmickArea.append(button);if(focused===row.gimmick_id)button.focus();
 });
 gimmickArea.hidden=unique.size===0;
}

// Roster buffs and gimmicks are independent of the source list.
const rosterBuff={attack:0,defense:0},rosterCounts=new Map();
let rosterEvidenceConsider=false;
window.addEventListener('character-evidence-change',()=>{if(pick.value==='MAP0104')renderRoster();});
function rosterStat(stats,key){
 if(!stats||stats[key]===''||stats[key]===undefined)return null;
 let value=Number(stats[key])+(key==='攻撃'?rosterBuff.attack:key==='防御'?rosterBuff.defense:0);
 mapGimmicks().filter(r=>r.monster_id===stats.monster_id&&(!r['難易度']||r['難易度']===difficulty.value)).forEach(r=>{value+=Number(r[key]||0)*Math.min(gimmickMaximum(r),rosterCounts.get(gimmickKey(r))||0);});
 if(key==='攻撃'&&rosterEvidenceConsider&&pick.value==='MAP0104'&&['M0115','M0116','M0117'].includes(stats.monster_id))value+=Number(window.getCharacterEvidenceStack?.()||0);
 return value;
}
const defeatTotals=new Map();
const executedEvents=new Set();
const missionCounters=new Map();
const rosterState=createRosterState({map:pick.value,difficulty:difficulty.value,route:'',moved:false});
function addPlacedMonster(enemy){return addRosterMonster(rosterState,enemy);}
function monsterDisplayName(enemy){return rosterMonsterDisplayName(enemy);}
const roster=document.getElementById('map-roster-list'),rosterEmpty=document.getElementById('map-roster-empty'),rosterNotice=document.createElement('span');
const rosterError=document.getElementById('roster-error'),rosterUndo=document.getElementById('roster-undo'),eventError=document.getElementById('mp-event-error');
// Undo snapshots last for this page session, until 全削除.
const roundDisplay=document.getElementById('current-round'),progressDisplay=document.getElementById('current-progress');
function roundProgressReady(){return Boolean(data.maps[pick.value]&&hasSelectedCharacter());}
function renderRoundProgress(){roundDisplay.textContent=rosterState.round;progressDisplay.textContent=rosterState.progress;document.getElementById('round-progress-controls').hidden=!roundProgressReady();}
function executeProgressEvents(){if(!roundProgressReady())return;groupMapEvents(routeRows(data.events)).filter(group=>Number(group['進捗'])===rosterState.progress).forEach(group=>executeEvent(group,{remember:false,render:false}));updateEventRows();renderRoster();}
function changeProgress(delta){const next=Math.max(0,rosterState.progress+delta);if(next===rosterState.progress)return;rememberRoster();rosterState.progress=next;renderRoundProgress();executeProgressEvents();}
document.getElementById('progress-minus').addEventListener('click',()=>changeProgress(-1));
document.getElementById('progress-plus').addEventListener('click',()=>changeProgress(1));
document.getElementById('turn-end').addEventListener('click',()=>{rememberRoster();applyCharacterTurnStartEffects();const clueCount=rosterCounts.get('MAP0104:clue')||0;rosterState.monsters.forEach(enemy=>{enemy.markStacks=Math.max(0,(enemy.markStacks||0)-1);enemy.fateEchoStacks=Math.max(0,(enemy.fateEchoStacks||0)-1);if(enemy.skillDefenseTurns>0){enemy.skillDefenseTurns-=1;if(enemy.skillDefenseTurns<=0)enemy.skillDefenseModifier=0;}});renderRoster();if(rosterState.selectedId){const selectedEnemy=rosterState.monsters.find(enemy=>enemy.instanceId===rosterState.selectedId&&!enemy.defeated);if(selectedEnemy)registerEnemy(selectedEnemy,false);}rosterState.round+=1;rosterState.progress+=1;renderRoundProgress();executeProgressEvents();if(pick.value==='MAP0104'&&(rosterState.round>=8||clueCount>=4))executeLibraryTruth();});
renderRoundProgress();
window.addEventListener('character-selection-change',()=>{if(!roundProgressReady()){renderRoundProgress();return;}rosterState.round=1;rosterState.progress=1;renderRoundProgress();executeProgressEvents();});

function rememberRoster(){rosterError.textContent='';rosterState.history.push(structuredClone({monsters:rosterState.monsters,buff:rosterBuff,counts:[...rosterCounts],selected:rosterState.selectedId,next:rosterState.nextId,serials:[...rosterState.serials],context:rosterState.context,missions:[...missionCounters],events:[...executedEvents],defeats:[...defeatTotals],characterEvidence:window.captureCharacterEvidence?.(),characterAbilities:window.captureCharacterAbilityState?.(),evidenceConsider:rosterEvidenceConsider,round:rosterState.round,progress:rosterState.progress}));}
rosterUndo.addEventListener('click',()=>{
 rosterError.textContent='';const previous=rosterState.history.pop();if(!previous)return;if(!data.maps[previous.context.map]){rosterState.history.length=0;renderRoster();return;}
 defeatTotals.clear();(previous.defeats||[]).forEach(([k,v])=>defeatTotals.set(k,v));executedEvents.clear();(previous.events||[]).forEach(key=>executedEvents.add(key));missionCounters.clear();(previous.missions||[]).forEach(([k,v])=>missionCounters.set(k,v));rosterState.monsters.splice(0,rosterState.monsters.length,...previous.monsters);Object.assign(rosterBuff,previous.buff);rosterCounts.clear();previous.counts.forEach(([k,v])=>rosterCounts.set(k,v));rosterEvidenceConsider=Boolean(previous.evidenceConsider);rosterState.round=Math.max(1,Number(previous.round)||1);rosterState.progress=Math.max(0,Number(previous.progress)??1);renderRoundProgress();window.restoreCharacterEvidence?.(previous.characterEvidence);window.restoreCharacterAbilityState?.(previous.characterAbilities);rosterState.selectedId=previous.selected;window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:rosterState.monsters.find(enemy=>enemy.instanceId===rosterState.selectedId&&!enemy.defeated)?{name:rosterState.monsters.find(enemy=>enemy.instanceId===rosterState.selectedId).name,mapId:previous.context.map}:null}));rosterState.nextId=previous.next;rosterState.serials.clear();(previous.serials||[]).forEach(([id,serial])=>rosterState.serials.set(id,serial));pick.value=previous.context.map;difficulty.value=previous.context.difficulty;rosterState.context=previous.context;Object.assign(routeState,{context:JSON.stringify([pick.value,difficulty.value]),route:previous.context.route||'',moved:!!previous.context.moved});selected=null;render();
});
document.getElementById('roster-clear').addEventListener('click',()=>{clearRoster();rosterState.history.length=0;rosterState.nextId=1;renderRoster();});
function registerEnemy(enemy, switchTab=true){
 if(switchTab)applyAttackTargetEffects(enemy);
 document.getElementById('defensePower1').value=enemy.defense;
 document.getElementById('hp1').value=enemy.hp;
 document.getElementById('attackPower2').value=enemy.attack;
 window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:{name:enemy.name,mapId:enemy.mapId,markStacks:enemy.markStacks||0,fateEchoStacks:enemy.fateEchoStacks||0}}));
 applyCharacterToCalculator();
 calculateDamage(document.querySelector('[data-role="attack"].mode-content'),false);
 calculateDamage(document.querySelector('[data-role="defense"].mode-content'),true);
 // Clicking a roster monster always opens the attack calculator.
 if(switchTab)document.querySelector('.role-tab[data-role="attack"]').click();
}
function clearRoster(){rosterError.textContent='';rosterState.round=1;rosterState.progress=1;renderRoundProgress();defeatTotals.clear();executedEvents.clear();rosterState.monsters.length=0;rosterState.serials.clear();rosterState.selectedId=null;window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:null}));skillChoiceId=null;rosterBuff.attack=0;rosterBuff.defense=0;rosterCounts.clear();rosterEvidenceConsider=false;rosterNotice.textContent='';}
function updateEnemy(enemy){updateRosterEnemy(enemy,rosterStat);enemy.defense=Math.max(0,enemy.defense+(Number(enemy.skillDefenseModifier)||0));}
function spawnGimmickMonsters(trigger){
 const matching=mapGimmicks().filter(r=>r.gimmick_id===trigger.gimmick_id&&(!r['難易度']||r['難易度']===difficulty.value));
 const configurations=new Map();matching.forEach(r=>{const ids=String(r['出現monster_id']||'').trim();if(ids)configurations.set(JSON.stringify([ids,String(r['出現数']||'').trim()]),r);});
 const pending=[];try{for(const row of configurations.values()){
 const ids=String(row['出現monster_id']).split('|').map(v=>v.trim()),amounts=String(row['出現数']||'').split('|').map(v=>v.trim());if(ids.length!==amounts.length)throw Error('出現IDと出現数の個数が一致していません。');
 ids.forEach((id,index)=>{const count=Number(amounts[index]);if(!id||!amounts[index]||!Number.isSafeInteger(count)||count<1)throw Error('出現IDと1以上の出現数を指定してください。');const stats=data.stats.find(r=>r.monster_id===id&&r['難易度']===difficulty.value);if(!stats||['攻撃','防御','HP'].some(k=>rosterStat(stats,k)===null||!Number.isFinite(rosterStat(stats,k))))throw Error(id+' の'+difficulty.value+'のステータスが未登録です。');if(rosterStat(stats,'HP')<=0)throw Error(id+' の反映後HPが0以下のため出現できません。');pending.push({stats,count});});
 }}catch(error){rosterError.textContent=trigger['表示名']+'：'+error.message;return;}
 for(const {stats,count} of pending){for(let i=0;i<count;i++)addPlacedMonster({instanceId:rosterState.nextId++,monsterId:stats.monster_id,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],base:{...stats},damageTaken:0,attack:rosterStat(stats,'攻撃'),defense:rosterStat(stats,'防御'),hp:rosterStat(stats,'HP'),coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'});}
}
function defeatActiveWardens(){const wardens=rosterState.monsters.filter(enemy=>enemy.mapId==='MAP0104'&&enemy.difficulty===difficulty.value&&enemy.monsterId==='M0116'&&!enemy.defeated);wardens.forEach(removeEnemy);return wardens.length;}
function removeEnemy(enemy){if(enemy.defeated)return;clearCharacterAttackPhase();enemy.wardenReviveReady=enemy.mapId==='MAP0104'&&enemy.monsterId==='M0117'&&(rosterCounts.get('MAP0104:clue')||0)<2;decrementMonsterMissions(data.missions,missionCounters,enemy.mapId,enemy.monsterId,enemy.difficulty);applyDefeatGimmicks(data.gimmicks,defeatTotals,rosterCounts,enemy.mapId,enemy.difficulty,enemy.monsterId,spawnGimmickMonsters);if(enemy.mapId==='MAP0006')executeGhostDefeatEvent(enemy.monsterId);enemy.defeated=true;enemy.hp=0;if(rosterState.selectedId===enemy.instanceId){rosterState.selectedId=null;window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:null}));}}
// 看守の復活待ちは撃破時の手がかり数で確定し、履歴にも保存する。
function pendingWarden(){return [...rosterState.monsters].reverse().find(enemy=>enemy.wardenReviveReady&&enemy.defeated&&enemy.mapId===pick.value&&enemy.difficulty===difficulty.value);}
function reviveWarden(){
 if(pick.value!=='MAP0104')return;
 const source=pendingWarden();if(!source)return;
 const base={...source.base,HP:String(Number(source.base['HP'])+2)};
 const hp=rosterStat(base,'HP'),attack=rosterStat(base,'攻撃'),defense=rosterStat(base,'防御');
 if(![hp,attack,defense].every(Number.isFinite)||hp<=0){rosterError.textContent='看守の復活後ステータスを確認してください。';return;}
 rememberRoster();
 source.wardenReviveReady=false;
 addPlacedMonster({instanceId:rosterState.nextId++,monsterId:source.monsterId,name:source.name,mapName:source.mapName,mapId:source.mapId,difficulty:source.difficulty,image:source.image,base,damageTaken:0,attack,defense,hp,coin:source.coin,boss:source.boss,reflect:source.reflect});
 renderRoster();
 rosterNotice.textContent='看守が最大HP＋2で復活しました。';
}
const rosterGimmicks=document.getElementById('roster-gimmicks');
document.getElementById('roster-reset').addEventListener('click',()=>{if(!rosterBuff.attack&&!rosterBuff.defense&&![...rosterCounts.values()].some(Boolean))return;rememberRoster();rosterBuff.attack=0;rosterBuff.defense=0;rosterCounts.clear();renderRoster();rosterNotice.textContent='下の一覧のバフ・固有ギミックをリセットしました。';});
// ターンやクールダウンは記録せず、ボタンを押した時だけ召喚する。
const summonSkills=MAP_SUMMON_SKILLS;
let skillChoiceId=null;
function summonFromSkill(caster,targetId){
 const skill=summonSkills[caster.monsterId];
 if(!skill||caster.defeated||caster.mapId!==pick.value||caster.difficulty!==difficulty.value||skill.map!==pick.value||!skill.targets.includes(targetId))return;
 const targetIds=[targetId];
 if(caster.monsterId==='M0021'&&caster.hp<=rosterStat(caster.base,'HP')/2)targetIds.push('M0026');
 const pending=[];
 for(const id of targetIds){
  const stats=data.stats.find(row=>row.monster_id===id&&row['難易度']===difficulty.value);
  if(!stats||['攻撃','防御','HP'].some(key=>rosterStat(stats,key)===null||!Number.isFinite(rosterStat(stats,key)))||rosterStat(stats,'HP')<=0){
   rosterError.textContent=id+' の'+difficulty.value+'の召喚用ステータスを確認してください。';
   return;
  }
  pending.push(stats);
 }
 rememberRoster();
 for(const stats of pending){
  addPlacedMonster({instanceId:rosterState.nextId++,monsterId:stats.monster_id,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],base:{...stats},damageTaken:0,attack:rosterStat(stats,'攻撃'),defense:rosterStat(stats,'防御'),hp:rosterStat(stats,'HP'),coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'});
 }
 skillChoiceId=null;
 renderRoster();
 rosterNotice.textContent=monsterDisplayName(caster)+'のスキルで'+pending.map(stats=>stats['モンスター名']).join('・')+'を追加しました。';
}
let characterSkillTargetRequest=null;
const targetBanner=document.getElementById('character-skill-target-banner'),targetMessage=document.getElementById('character-skill-target-message'),targetCancel=document.getElementById('character-skill-target-cancel'),rosterSection=document.querySelector('.map-roster');
function renderCharacterSkillTargetUi(){
 const active=characterSkillTargetRequest?.target==='monster';
 targetBanner.hidden=!active;rosterSection.classList.toggle('is-character-skill-targeting',active);
 if(active)targetMessage.textContent='🎯 '+characterSkillTargetRequest.label+'：対象のモンスターを選択してください';
}
function cancelCharacterSkillTarget(){if(!characterSkillTargetRequest)return;characterSkillTargetRequest=null;renderCharacterSkillTargetUi();rosterNotice.textContent='スキルの対象選択をキャンセルしました。';}
targetCancel.addEventListener('click',cancelCharacterSkillTarget);
window.addEventListener('character-skill-target-request',event=>{const detail=event.detail||{};if(detail.target!=='monster')return;characterSkillTargetRequest=detail;rosterNotice.textContent=detail.label+'：対象モンスターを選択してください。';renderCharacterSkillTargetUi();renderRoster();});
function resolveCharacterSkillTarget(enemy){
 const request=characterSkillTargetRequest;if(!request||enemy.defeated)return false;
 rememberRoster();
 const skillEffects=window.getCharacterActiveSkillEffects?.(request.skillKey)||[];
 const damage=skillEffects.filter(effect=>effect.type==='damage_monster').reduce((sum,effect)=>sum+(Number(effect.value)||0),0);
 if(damage>0){enemy.manualHp=Math.max(0,enemy.hp-damage);enemy.hp=enemy.manualHp;enemy.damageTaken=Math.max(0,rosterStat(enemy.base,'HP')-enemy.hp);}
 for(const effect of skillEffects){
  if(effect.type==='modify_monster_mark')enemy.markStacks=Math.max(0,(enemy.markStacks||0)+(Number(effect.delta)||0));
  if(effect.type==='fate_echo')enemy.fateEchoStacks=Math.max(0,Number(effect.stacks)||0);
  if(effect.type==='modify_monster_def'){enemy.skillDefenseModifier=Number(effect.value)||0;enemy.skillDefenseTurns=Math.max(0,Number(effect.durationTurns)||0);}
 }
 characterSkillTargetRequest=null;
 renderCharacterSkillTargetUi();
 renderRoster();
 window.dispatchEvent(new CustomEvent('character-skill-target-resolved',{detail:{skillKey:request.skillKey,success:true,targetId:enemy.instanceId}}));
 rosterNotice.textContent=request.label+'を'+monsterDisplayName(enemy)+'に使用しました。';
 return true;
}
function renderRoster(){
 let newlyDefeated;do{newlyDefeated=false;for(const enemy of rosterState.monsters){if(enemy.defeated)continue;updateEnemy(enemy);if(enemy.hp<=0){removeEnemy(enemy);newlyDefeated=true;}}}while(newlyDefeated);
 updateEventRows();
 rosterState.context={map:pick.value,difficulty:difficulty.value,route:routeState.route,moved:routeState.moved};rosterUndo.disabled=rosterState.history.length===0;
 const focused=document.activeElement?.closest('#roster-gimmicks')?document.activeElement.dataset.gimmick:null;
 rosterGimmicks.replaceChildren();
 if(pick.value==='MAP0104'){
  const controls=createLibraryGimmickControls({truthDone:executedEvents.has(libraryTruthKey()),evidenceEnabled:!!window.hasSelectedCharacter?.(),evidenceActive:rosterEvidenceConsider,evidenceCount:Number(window.getCharacterEvidenceStack?.()||0),wardenPending:!!pendingWarden(),onTruth:executeLibraryTruth,onEvidence:()=>{rememberRoster();rosterEvidenceConsider=!rosterEvidenceConsider;renderRoster();},onRevive:reviveWarden});rosterGimmicks.append(...controls);
 }
 if(pick.value==='MAP0006'){
  const total=id=>defeatTotals.get(JSON.stringify([pick.value,difficulty.value,id]))||0,choices=[{unlock:'M0041',spawn:'M0042',label:'厄兆出現'},{unlock:'M0042',spawn:'M0043',label:'混乱出現'}];choices.forEach(choice=>{if(total(choice.unlock)<1)return;const done=executedEvents.has(ghostSpawnKey(choice.spawn));rosterGimmicks.append(createGhostSpawnButton(choice,done,()=>spawnGhostBoss(choice.spawn,choice.label.replace('出現',''))));});
 }
 const unique=new Map();mapGimmicks().forEach(row=>{if(!unique.has(row.gimmick_id))unique.set(row.gimmick_id,row);});
 document.getElementById('roster-reset').hidden=unique.size===0;
 unique.forEach(row=>{
 const maximum=gimmickMaximum(row),count=Math.min(maximum,rosterCounts.get(gimmickKey(row))||0);const change=delta=>{const next=Math.max(0,Math.min(maximum,count+delta));if(next===count)return;rememberRoster();if(pick.value==='MAP0104'&&row.gimmick_id==='warden_defeated'&&delta>0){const defeated=defeatActiveWardens();if(!defeated){rosterCounts.set(gimmickKey(row),next);spawnGimmickMonsters(row);}renderRoster();return;}rosterCounts.set(gimmickKey(row),next);if(next>count)spawnGimmickMonsters(row);renderRoster();};const button=createRosterGimmickButton(row,maximum,count,change);rosterGimmicks.append(button);if(focused===row.gimmick_id)button.focus();
 });
 
 document.querySelectorAll('#mp-mission-body tr').forEach(updateMissionRow);
 const active=rosterState.monsters.find(e=>e.instanceId===rosterState.selectedId);if(active)registerEnemy(active,false);
 roster.replaceChildren();rosterEmpty.hidden=rosterState.monsters.length>0;
 document.getElementById('roster-counts').textContent='累計 '+rosterState.monsters.length+'体 ／ 出現中 '+rosterState.monsters.filter(e=>!e.defeated).length+'体 ／ 撃破 '+rosterState.monsters.filter(e=>e.defeated).length+'体';
 [...rosterState.monsters].sort((a,b)=>Number(!!a.defeated)-Number(!!b.defeated)||Number(data.nativeMapByMonster[b.monsterId]===pick.value)-Number(data.nativeMapByMonster[a.monsterId]===pick.value)||a.monsterId.localeCompare(b.monsterId,'en',{numeric:true})||a.instanceId-b.instanceId).forEach(enemy=>{
   const displayName=monsterDisplayName(enemy),{card,select,nameText,actions,top}=createRosterCardShell(enemy,rosterState.selectedId,displayName,assignMapImage,data.icons);
  const stats=createRosterStats(enemy,displayName,assignMapImage,data.icons,({key,field,label,input,value})=>{const next=Number(value);if(String(value).trim()===''||!Number.isSafeInteger(next)||next<0){input.value=enemy[field];return;}if(next===enemy[field])return;rememberRoster();if(key==='HP'){if(next===0){removeEnemy(enemy);rosterNotice.textContent=displayName+'を撃破しました。';}else{enemy.manualHp=next;enemy.hp=next;enemy.damageTaken=Math.max(0,rosterStat(enemy.base,'HP')-next);}}else{enemy[key==='攻撃'?'manualAttack':'manualDefense']=next-rosterStat(enemy.base,key);rosterNotice.textContent=displayName+'の'+label+'を'+next+'に変更しました。';}if(next===0&&key==='HP'){renderRoster();return;}updateEnemy(enemy);input.value=enemy[field];rosterUndo.disabled=false;if(rosterState.selectedId===enemy.instanceId)registerEnemy(enemy,false);});
  select.addEventListener('click',()=>{if(resolveCharacterSkillTarget(enemy))return;rosterState.selectedId=enemy.instanceId;registerEnemy(enemy);renderRoster();rosterNotice.textContent=monsterDisplayName(enemy)+'を計算機に登録しました。';});
  const remove=createRosterActionButton('roster-remove',enemy.defeated?'撃破済':'撃破',displayName+'を撃破',!!enemy.defeated);remove.addEventListener('click',()=>{rememberRoster();removeEnemy(enemy);renderRoster();rosterNotice.textContent=monsterDisplayName(enemy)+'を撃破しました。';});
  const deleteButton=createRosterActionButton('roster-delete','削除',displayName+'を削除');deleteButton.addEventListener('click',()=>{rememberRoster();const i=rosterState.monsters.indexOf(enemy);if(i>=0)rosterState.monsters.splice(i,1);if(rosterState.selectedId===enemy.instanceId){rosterState.selectedId=null;window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:null}));}renderRoster();});
   actions.append(remove,deleteButton);
   const {field:markField,button:markButton}=createRosterMarkControl(enemy,displayName);const changeMark=delta=>{if(enemy.defeated)return;const next=Math.max(0,(enemy.markStacks||0)+delta);if(next===(enemy.markStacks||0))return;rememberRoster();enemy.markStacks=next;if(rosterState.selectedId===enemy.instanceId)registerEnemy(enemy,false);renderRoster();};markButton.addEventListener('click',event=>{event.stopPropagation();changeMark(1);});markButton.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();changeMark(-1);});nameText.append(markField);
  if((enemy.fateEchoStacks||0)>0){const fate=document.createElement('span');fate.className='roster-fate-echo';fate.title='フェイト・エコー：受けるダメージ+1、ターン終了時に1減少';const label=document.createElement('span');label.textContent='フェイト・エコー';const value=document.createElement('strong');value.textContent=String(enemy.fateEchoStacks);fate.append(label,value);nameText.append(fate);}
  const skill=summonSkills[enemy.monsterId],skillOpen=skillChoiceId===enemy.instanceId;
  const skillTargets=skill?.targets.map(id=>{const target=data.stats.find(row=>row.monster_id===id&&row['難易度']===difficulty.value);return target?{id,name:target['モンスター名'],image:data.images[target.image]}:null;})||[];
  const skillView=createRosterSkillView(enemy,displayName,skill,skillOpen,skillTargets,assignMapImage,()=>{skillChoiceId=skillOpen?null:enemy.instanceId;renderRoster();},id=>summonFromSkill(enemy,id));
  if(skillView.button){top.classList.add('has-skill');top.append(skillView.button);}card.append(top);if(skillView.choices)card.append(skillView.choices);
  card.append(stats);roster.append(card);
 });
}
function spawnSelectedMonster(){
 if(!selected)return;
 const stats=data.stats.find(s=>s.monster_id===selected&&s['難易度']===difficulty.value);
 if(!stats){status.textContent='この難易度の能力値は未登録です。';return;}
 const attack=rosterStat(stats,'攻撃'),defense=rosterStat(stats,'防御'),hp=rosterStat(stats,'HP');
 if([attack,defense,hp].some(n=>n===null||!Number.isFinite(n))){status.textContent='能力値が不足しているため追加できません。';return;}
 rememberRoster();
 const enemy={instanceId:rosterState.nextId++,monsterId:selected,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],attack,defense,hp,coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'};
 enemy.base={...stats};enemy.damageTaken=0;addPlacedMonster(enemy);renderRoster();status.textContent=monsterDisplayName(enemy)+'をマップ上のモンスターに追加しました。';rosterNotice.textContent=rosterState.monsters.length+'体を登録中';
}
renderRoster();

function selectMonster(id){selected=id;list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));status.textContent='';}

function updateMissionRow(tr){updateMissionCounterRow(tr,missionCounters);}
function attachMissionCounter(tr,row){attachMissionCounterRow(tr,row,difficulty.value,missionCounters,rememberRoster,()=>{rosterUndo.disabled=false;});}

document.getElementById('mp-mission-reset').addEventListener('click',()=>{
 const rows=routeRows(data.missions);if(!rows.some(row=>missionCounters.has(missionCounterKey(row,difficulty.value))&&missionCounters.get(missionCounterKey(row,difficulty.value))!==Number(row['カウンタ'])))return;
 rememberRoster();rows.forEach(row=>missionCounters.delete(missionCounterKey(row,difficulty.value)));document.querySelectorAll('#mp-mission-body tr').forEach(updateMissionRow);rosterUndo.disabled=false;
});
function eventKey(group){return mapEventKey(pick.value,difficulty.value,group);}
function updateEventRows(){updateMapEventRows(root,executedEvents);}
function executeEvent(group,options={}){
 const key=eventKey(group);if(executedEvents.has(key))return;
 const remember=options.remember!==false,rerender=options.render!==false;
 let pending,buffDelta;try{({pending,buffDelta}=collectEventChanges(group,data.stats,difficulty.value,rosterStat));}catch(error){eventError.textContent=error.message;return;}
 if(remember)rememberRoster();
 rosterBuff.attack+=buffDelta.attack;rosterBuff.defense+=buffDelta.defense;
 if(pick.value==='MAP0002'&&((difficulty.value==='悪夢'&&group['進捗']==='11')||(difficulty.value==='狂気'&&group['進捗']==='10'))){
  absorbSoulSpirits(rosterState.monsters,pick.value,difficulty.value);
  if(rosterState.selectedId!==null&&!rosterState.monsters.some(enemy=>enemy.instanceId===rosterState.selectedId))rosterState.selectedId=null;
 }
 for(const {stats,count} of pending){for(let i=0;i<count;i++)addPlacedMonster({instanceId:rosterState.nextId++,monsterId:stats.monster_id,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],base:{...stats},damageTaken:0,attack:rosterStat(stats,'攻撃'),defense:rosterStat(stats,'防御'),hp:rosterStat(stats,'HP'),coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'});}
 executedEvents.add(key);eventError.textContent='';if(rerender)renderRoster();
}
function executeGhostDefeatEvent(monsterId){
 if(pick.value!=='MAP0006')return;
 const progress=monsterId==='M0041'?'天崩撃破':monsterId==='M0042'?'厄兆撃破':'';
 if(!progress)return;
 const group=groupMapEvents(routeRows(data.events)).find(item=>String(item['進捗']).trim()===progress);
 if(group)executeEvent(group,{remember:false,render:false});
}
function ghostSpawnKey(monsterId){return ghostEventKey(difficulty.value,monsterId);}
function spawnGhostBoss(monsterId,label){
 const key=ghostSpawnKey(monsterId);if(executedEvents.has(key))return;
 const stats=data.stats.find(r=>r.monster_id===monsterId&&r['難易度']===difficulty.value);
 if(!stats||['攻撃','防御','HP'].some(k=>rosterStat(stats,k)===null||!Number.isFinite(rosterStat(stats,k)))||rosterStat(stats,'HP')<=0){rosterError.textContent=label+'の現在の難易度の能力値を確認してください。';return;}
 rememberRoster();
 addPlacedMonster({instanceId:rosterState.nextId++,monsterId:stats.monster_id,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],base:{...stats},damageTaken:0,attack:rosterStat(stats,'攻撃'),defense:rosterStat(stats,'防御'),hp:rosterStat(stats,'HP'),coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'});
 executedEvents.add(key);renderRoster();rosterNotice.textContent=label+'を出現させました。';
}
function libraryTruthKey(){return libraryEventKey(pick.value,difficulty.value);}
function executeLibraryTruth(){
 if(pick.value!=='MAP0104'||executedEvents.has(libraryTruthKey()))return;
 const stats=data.stats.find(r=>r.monster_id==='M0115'&&r['難易度']===difficulty.value);
 if(!stats||['攻撃','防御','HP'].some(k=>rosterStat(stats,k)===null||!Number.isFinite(rosterStat(stats,k)))||rosterStat(stats,'HP')<=0){rosterError.textContent='ゴクチョー【真相】の現在の難易度の能力値を確認してください。';return;}
 rememberRoster();
 for(let i=rosterState.monsters.length-1;i>=0;i--){const enemy=rosterState.monsters[i];if(enemy.monsterId==='M0116'&&enemy.mapId===pick.value&&enemy.difficulty===difficulty.value){if(rosterState.selectedId===enemy.instanceId)rosterState.selectedId=null;rosterState.monsters.splice(i,1);}}
 if(!rosterState.monsters.some(e=>e.monsterId==='M0115'&&e.mapId===pick.value&&e.difficulty===difficulty.value&&!e.defeated)){
 addPlacedMonster({instanceId:rosterState.nextId++,monsterId:stats.monster_id,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],base:{...stats},damageTaken:0,attack:rosterStat(stats,'攻撃'),defense:rosterStat(stats,'防御'),hp:rosterStat(stats,'HP'),coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'});
 }
 executedEvents.add(libraryTruthKey());rosterError.textContent='';renderRoster();rosterNotice.textContent='真相発覚：ゴクチョーを削除し、ゴクチョー【真相】を出現させました。';
}
function renderMapInformation(){
 eventPreview.reset();
 // CSV order is the display order; external mission/event IDs are not required.
 const missions=routeRows(data.missions);
 const events=routeRows(data.events);
 function fill(id,emptyId,rows,columns){
  const body=document.getElementById(id);body.replaceChildren();
  rows.forEach(row=>{const tr=document.createElement('tr');columns.forEach(key=>{const td=document.createElement('td');td.textContent=row[key];tr.append(td);});if(id==='mp-mission-body')attachMissionCounter(tr,row);body.append(tr);});
  body.closest('table').hidden=rows.length===0;document.getElementById(emptyId).hidden=rows.length!==0;
 }
 fill('mp-mission-body','mp-mission-empty',missions,['カウンタ','内容','報酬']);
 const groupedEvents=groupMapEvents(events);
 fill('mp-event-body','mp-event-empty',groupedEvents,['進捗','内容']);
 const body=document.getElementById('mp-event-body');
 [...body.children].forEach((tr,i)=>{const group=groupedEvents[i];tr.dataset.eventKey=eventKey(group);const button=document.createElement('button');button.type='button';button.className='mp-event-button';button.textContent=group['内容'];button.setAttribute('aria-label',group['進捗']+' のイベントを実行');tr.children[1].replaceChildren(button);tr.addEventListener('click',()=>executeEvent(group));
 const files=eventImageFiles(group);if(files.length){tr.classList.add('mp-event-has-image');tr.title='マウスを乗せると出現位置を表示';let pointerInside=false;const show=()=>eventPreview.show(files,(data.maps[pick.value]?.name||'')+'：'+group['進捗']+' の出現位置');tr.addEventListener('mouseenter',()=>{pointerInside=true;show();});tr.addEventListener('mouseleave',()=>{pointerInside=false;eventPreview.reset();});tr.addEventListener('focusin',event=>{if(event.target.matches(':focus-visible'))show();});tr.addEventListener('focusout',event=>{if(!tr.contains(event.relatedTarget)&&!pointerInside)eventPreview.reset();});}});
 eventError.textContent='';updateEventRows();
}

function render(){
 hideMonsterTip();
 if(!data.maps[pick.value]){routeControls.hidden=true;root.querySelector('.mp-map-only').classList.remove('has-route-switches');selected=null;list.replaceChildren();difficulty.replaceChildren();difficulty.disabled=true;const img=document.getElementById('mp-map-image');img.hidden=true;img.removeAttribute('src');img.alt='';renderMapInformation();status.textContent=Object.keys(data.maps).length?'マップを選択してください。':'表示対象のマップがありません。CSVの「表示」列を確認してください。';renderRoster();return;}
 difficulty.disabled=false;

 const previousDifficulty=difficulty.value;
 const allowed=['普通','困難','悪夢','狂気'];
 difficulty.replaceChildren(...allowed.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;return option;}));
 difficulty.value=allowed.includes(previousDifficulty)?previousDifficulty:'普通';
 const map=data.maps[pick.value],level=difficulty.value,scroll=list.scrollTop;
 renderRouteControls();
 renderMapInformation();

 const img=document.getElementById('mp-map-image');assignMapImage(img,currentMapImage());img.alt=map.name+'のマップ';list.replaceChildren();
 const visibleRows=visibleMonsterRows(data,pick.value,level);
 visibleRows.forEach(stats=>{const id=stats.monster_id;
  const base=stats,tile=document.createElement('button');
  tile.type='button';tile.className='mp-monster';tile.dataset.id=id;tile.setAttribute('aria-pressed','false');tile.setAttribute('aria-label',base['モンスター名']+'をマップに追加');tile.addEventListener('mouseenter',()=>showMonsterTip(tile));tile.addEventListener('mouseleave',hideMonsterTip);tile.addEventListener('focus',()=>showMonsterTip(tile));tile.addEventListener('blur',hideMonsterTip);
  const name=document.createElement('div');name.className='mp-name';const pic=document.createElement('img');assignMapImage(pic,data.images[base.image]||'');pic.alt='';const nameText=document.createElement('span');nameText.className='monster-name-text';nameText.textContent=base['モンスター名'];name.append(pic,nameText);if(String((stats||base)['ボス']).trim()==='1'){const boss=document.createElement('img');boss.className='mp-boss-icon';boss.alt='マップボス';boss.title='マップボス';assignMapImage(boss,'../images/icon/Boss.png');nameText.append(boss);}if(String((stats||base)['反撃'])==='1'){const reflect=document.createElement('img');assignMapImage(reflect,data.icons.reflect);reflect.alt='反撃可能';reflect.className='mp-reflect';nameText.append(reflect);}
  const values=document.createElement('div');values.className='mp-stats';
  ['攻撃','防御','HP','コイン'].forEach(key=>{
   if(key==='コイン'&&(!stats||stats[key]==='')){const blank=document.createElement('div');blank.className='mp-stat';blank.setAttribute('aria-hidden','true');values.append(blank);return;}
   const cell=document.createElement('div'),icon=document.createElement('img'),number=document.createElement('strong');cell.className='mp-stat';cell.dataset.kind=key;
   const adjusted=effectiveStat(stats,key);
   const value=adjusted===null?'—':adjusted;
   const extra=adjusted===null?0:adjusted-Number(stats[key]);
   cell.setAttribute('aria-label',key+' '+(value==='—'?'未登録':value));assignMapImage(icon,data.icons[key]);icon.alt=key;number.textContent=value;
   if(extra&&value!=='—')number.className='mp-boosted';cell.append(icon,number);values.append(cell);
  });
  tile.append(name,values);tile.addEventListener('click',()=>{selectMonster(id);spawnSelectedMonster();});list.append(tile);
 });
 selectMonster(visibleRows.some(row=>row.monster_id===selected)?selected:null);list.scrollTop=scroll;
 document.getElementById('mp-buff-status').textContent=[buff.attack?'攻撃 ＋'+buff.attack:'',buff.defense?'防御 ＋'+buff.defense:''].filter(Boolean).join(' ／ ');
 renderRoster();
}
root.querySelectorAll('[data-buff]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.buff;if(kind==='attack'||kind==='both')buff.attack++;if(kind==='defense'||kind==='both')buff.defense++;render();}));
pick.addEventListener('change',()=>{rememberRoster();clearRoster();selected=null;render();renderRoundProgress();list.scrollTop=0;});difficulty.addEventListener('change',()=>{rememberRoster();clearRoster();render();renderRoundProgress();});
const tabs=[...document.querySelectorAll('.mp-subtabs [role="tab"]')];tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>tabs.forEach(other=>{const active=other===tab;other.setAttribute('aria-selected',String(active));document.getElementById(other.getAttribute('aria-controls')).hidden=!active;}));tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-index;tabs[next].click();tabs[next].focus();}});});
render();

function hideMonsterTip(){monsterTipVersion++;const tip=document.getElementById('monster-tooltip');if(tip){tip.hidden=true;tip.replaceChildren();}}
function showMonsterTip(tile){
 hideMonsterTip();const tip=document.getElementById('monster-tooltip');if(!tip)return;
 const stats=data.stats.find(row=>row.monster_id===tile.dataset.id&&row['難易度']===difficulty.value);
 const file=String(stats?.info||stats?.['情報画像']||'').trim();if(!file)return;
 const source=safeAssetUrl('../images/MonsterInfo/',file);if(!source)return;
 const version=monsterTipVersion,img=new Image();img.alt=stats['モンスター名']+'の説明画像';
 img.onload=()=>{if(version!==monsterTipVersion||!tile.isConnected||!img.naturalWidth||!img.naturalHeight)return;
 const margin=8,ratio=img.naturalWidth/img.naturalHeight,width=Math.min(438,img.naturalWidth,window.innerWidth-margin*2,(window.innerHeight-margin*2)*ratio),height=width/ratio;
 const box=tile.getBoundingClientRect(),gap=12;
 let left=box.right+gap;if(left+width>window.innerWidth-margin)left=box.left-width-gap;
 left=Math.max(margin,Math.min(left,window.innerWidth-width-margin));
 const top=Math.max(margin,Math.min(box.top,window.innerHeight-height-margin));
 img.style.width=width+'px';img.style.height=height+'px';tip.style.left=left+'px';tip.style.top=top+'px';tip.replaceChildren(img);tip.hidden=false;
 };
 img.onerror=()=>{if(version===monsterTipVersion)hideMonsterTip();};
 img.src=source;
}
window.addEventListener('resize',hideMonsterTip);
document.addEventListener('scroll',hideMonsterTip,true);
list.addEventListener('scroll',hideMonsterTip);root.addEventListener('keydown',e=>{if(e.key==='Escape')hideMonsterTip();});document.querySelectorAll('.role-tab').forEach(b=>b.addEventListener('click',hideMonsterTip));
async function refreshCSV(){if(location.protocol==='file:')return;const files={maps:'maps_renumbered.csv',relations:'map_monsters_renumbered.csv',stats:'monster_stats.csv',missions:'map_mission.csv',events:'map_event.csv',gimmicks:'map_gimmick.csv'};const result=await Promise.allSettled(Object.entries(files).map(async([key,file])=>{const response=await fetch('../csv/'+file,{cache:'no-cache'});if(!response.ok)throw Error(file);const rows=parseMapCSV(await response.text());if(rows.length&&!Object.hasOwn(rows[0],key==='stats'?'monster_id':'map_id'))throw Error(file);return [key,rows];}));const raw={...INITIAL_MAP_DATA};result.forEach(item=>{if(item.status==='fulfilled')raw[item.value[0]]=item.value[1];});const next=normalizeMapData(raw);const previousMap=pick.value;Object.assign(data,next);populateMaps();if(pick.value!==previousMap){clearRoster();rosterState.history.length=0;}render();if(result.some(item=>item.status==='rejected'))status.textContent='一部のCSVを取得できないため同梱データを表示しています。';}refreshCSV();

})();
document.querySelectorAll('.parameter-icon').forEach(img=>assignMapImage(img,img.getAttribute('src').replace('/icon/','/Icon/')));
