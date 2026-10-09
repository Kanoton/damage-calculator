// ===== キャラクター表示ヘルパー =====
function createOwnedChipView(chip,chargeDelta,onCharge){
 const item=document.createElement('span');item.className='selected-chip';item.title=chip.name+'\n'+chip.effect;
 const img=document.createElement('img');img.alt=chip.name;img.src='../images/chip_icon/'+encodeURIComponent(chip.images);item.append(img);
 const name=document.createElement("span");name.className="owned-chip-name";name.textContent=chip.name;item.append(name);
 if(chargeDelta!==null){
  item.classList.add('is-actionable');item.setAttribute('role','button');item.tabIndex=0;
  if(chargeDelta)item.title+='\nクリック：チャージ'+(chargeDelta>0?'+':'')+chargeDelta;
  if(chargeDelta<0)item.title+='（'+(-chargeDelta)+'以上必要）';
  if(chip.id==='56')item.title+='、CT-1';
  item.addEventListener('click',onCharge);item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onCharge();}});
 }
 return item;
}

function createConditionPhaseView(label,checked,onChange){
 const field=document.createElement('label');field.className='condition-phase';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=checked;checkbox.setAttribute('aria-label',label+'の効果を有効にする');
 checkbox.addEventListener('change',()=>onChange(checkbox.checked));field.append(checkbox,document.createTextNode(label));
 return field;
}

function createChipConditionToggleView(chip,id,mode,onToggle){
 const button=document.createElement('button');button.type='button';
 button.className='selected-chip condition-toggle'+(mode?' is-active':'')+(id==='112'&&mode===1?' is-red':'')+(id==='112'&&mode===2?' is-blue':'')+(id==='112'&&mode===3?' is-both':'');
 button.dataset.chipId=id;button.setAttribute('aria-pressed',String(mode>0));
 const status=id==='112'?(mode===1?'赤き呪い':mode===2?'青き呪い':mode===3?'赤き呪いと青き呪い':'オフ'):(mode?'オン':'オフ');
 button.setAttribute('aria-label',chip.name+'：'+status+'。クリックで切り替え');button.title=chip.name+'：'+status+'\nクリックで条件を切り替え';
 const img=document.createElement('img');img.alt='';img.src='../images/chip_icon/'+encodeURIComponent(chip.images);button.append(img);button.addEventListener('click',onToggle);
 return button;
}

function createMapConditionToggleView(key,active,icon,onToggle){
 const button=document.createElement('button');button.type='button';button.className='selected-chip condition-toggle'+(active?' is-active':'');
 button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',key+'：'+(active?'オン':'オフ')+'。クリックで切り替え');
 button.title=key+'：'+(active?'オン':'オフ')+'\nクリックで条件を切り替え';button.append(icon);button.addEventListener('click',onToggle);
 return button;
}

function createConditionNumberView(key,value,icon){
 const item=document.createElement('label');item.className='condition-item';item.title=key+'：アイコンを左クリックで+1、右クリックで-1';
 const button=document.createElement('button');button.type='button';button.className='condition-icon';button.setAttribute('aria-label',key+'を増やす');button.append(icon);
 const input=document.createElement('input');input.type='number';input.min='0';if(key==='チャージ')input.max='10';input.inputMode='numeric';input.className='condition-number';input.setAttribute('aria-label',key+'の数');input.value=value;
 item.append(button,input);return {item,button,input};
}

function createCharacterAssetView(row,folder,key){
 if(folder==='character_list')return createCharacterListCardView(row);
 const item=document.createElement('figure');item.className='character-asset';item.dataset.id=row.id;
 const img=document.createElement('img');img.alt=row.name||'';img.loading='lazy';img.decoding='async';
 const file=String(row[key]||row.images||'').trim();
 const missing=()=>{const text=document.createElement('figcaption');text.textContent=img.alt+'：画像を読み込めませんでした。';item.replaceChildren(text);};
 img.addEventListener('error',missing,{once:true});item.append(img);
 if(file)img.src='../images/'+folder+'/'+encodeURIComponent(file);else missing();
 const button=document.createElement('button');button.type='button';button.dataset.id=row.id;
 return {item,button};
}

function createCharacterListCardView(row){
 const item=document.createElement('figure');item.className='character-asset character-list-card';item.dataset.id=row.id;
 const portrait=document.createElement('div');portrait.className='character-list-portrait';
 const img=document.createElement('img');img.className='character-list-image';img.alt=row.name||'';img.loading='lazy';img.decoding='async';
 const missing=()=>{const text=document.createElement('span');text.className='character-list-image-missing';text.textContent='画像なし';portrait.replaceChildren(text);};
 img.addEventListener('error',missing,{once:true});portrait.append(img);
 if(row.hero_card_img)img.src='../images/UT_Hero_Card2/'+encodeURIComponent(row.hero_card_img);else missing();
 const details=document.createElement('div');details.className='character-list-details';
 const name=document.createElement('strong');name.className='character-list-name';name.textContent=row.name||'';
 const stats=document.createElement('div');stats.className='character-list-stats';
 for(const [key,label,icon] of [['lv0_atk','攻撃力','Attack.png'],['lv0_def','防御力','Defense.png'],['lv0_hp','HP','Hp.png'],['initial_coin','初期コイン','Coin.png']]){
  const entry=document.createElement('span');entry.className='character-list-stat';entry.dataset.stat=key;
  const value=String(row[key]??'—');const bonus=key==='initial_coin'?Number(row.lv1_coin_bonus||0):0;
  entry.title=label+(bonus?'（Lv1コイン加算 +'+bonus+'）':'');entry.setAttribute('aria-label',label+' '+value+(bonus?'、Lv1コイン加算 '+bonus:''));
  const image=document.createElement('img');image.className='character-list-stat-icon';image.src='../images/UT_Buff/'+icon;image.alt='';
  const text=document.createElement('span');text.textContent=value;entry.append(image,text);
  if(bonus){const extra=document.createElement('small');extra.className='character-list-coin-bonus';extra.textContent='+'+bonus;entry.append(extra);}
  stats.append(entry);
 }
 details.append(name,stats);item.append(portrait,details);
 const button=document.createElement('button');button.type='button';button.dataset.id=row.id;
 return {item,button};
}

function createCharacterSkillTooltipView(row,ability){
 const stats=document.createElement('div');stats.className='character-skill-stats';
 for(const [key,label,file] of [['atk','攻撃力','Attack.png'],['def','防御力','Defense.png'],['hp','HP','Hp.png'],['move','移動力',null]]){
  const entry=document.createElement('span');entry.className='character-skill-stat';entry.title=label;
  const icon=file?document.createElement('img'):document.createElement('span');
  if(file){icon.src='../images/UT_Buff/'+file;icon.alt='';}else{icon.className='character-skill-move-icon';icon.textContent='👟';icon.setAttribute('aria-hidden','true');}
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
 return {stats,description};
}

function createCharacterNumberPadView(){
 const numberPad=document.createElement('div');numberPad.id='character-number-pad';numberPad.className='character-number-pad';numberPad.setAttribute('role','group');numberPad.setAttribute('aria-label','数値入力用テンキー');numberPad.hidden=true;
 for(const label of ['1','2','3','4','5','6','7','8','9','消去','0','確定']){
  const key=document.createElement('button');key.type='button';key.textContent=label;key.dataset.key=label;numberPad.append(key);
 }
 return numberPad;
}

function createCharacterAbilityToggleView(key,active,icon,onToggle){
 const button=document.createElement('button');button.type='button';button.className='selected-chip condition-toggle'+(active?' is-active':'');
 button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',key+'：'+(active?'オン':'オフ')+'。クリックで切り替え');
 button.title=key+'：'+(active?'オン':'オフ')+'\nクリックで切り替え';button.append(icon);button.addEventListener('click',onToggle);
 return button;
}

function createCharacterAbilityChoiceView(key,option,icon,onCycle){
 const button=document.createElement('button');button.type='button';button.className='selected-chip condition-toggle'+(Number(option.value)?' is-active':'');
 button.setAttribute('aria-label',key+'：'+option.label+'。クリックで切り替え');button.title=key+'：'+option.label+'\nクリックで切り替え';
 button.append(icon,document.createTextNode(option.label));button.addEventListener('click',onCycle);
 return button;
}

const partyChipGridResizeObserver=new ResizeObserver(entries=>{
 for(const {target:list,contentRect} of entries){
  if(!list.isConnected){partyChipGridResizeObserver.unobserve(list);continue;}
  const count=list.children.length,width=Math.floor(contentRect.width),height=Math.floor(contentRect.height);
  if(!count||width<=0||height<=0)continue;
  const normalSize=Math.max(1,Math.floor((height-1)/2));
  const columns=Math.max(0,Math.floor((width+1)/(normalSize+1)));
  const rows=count<=columns*2?2:3,neededColumns=Math.ceil(count/rows);
  const size=rows===2?normalSize:Math.max(6,Math.min(Math.floor((height-2)/3),Math.floor((width-neededColumns+1)/neededColumns)));
  list.dataset.rows=String(rows);list.style.setProperty('--party-chip-rows',String(rows));list.style.setProperty('--party-chip-size',size+'px');
 }
});

function createPartyMemberView(row,index,parameters,isSelf,onLevelChange,ownedChips=[],onStatChange){
 const slot=document.createElement('div');slot.className='party-member-slot';slot.dataset.slot=String(index+1);slot.dataset.characterId=row?.id||'';slot.tabIndex=0;slot.draggable=Boolean(row);slot.setAttribute('role','group');
 slot.setAttribute('aria-label',(index+1)+'番目'+(isSelf?'（自分）':'')+'：'+(row?.name||'未登録'));
 slot.title=row?'名前・枠をクリックでチップ編集対象を選択／ドラッグで順番変更'+(isSelf?'':'／枠を右クリックでPT登録解除'):'キャラ一覧からクリックで登録';
 const order=document.createElement('span');order.className='party-slot-order';order.textContent=['1st','2nd','3rd','4th'][index];if(isSelf){const self=document.createElement('small');self.textContent='自分';order.append(self);}slot.append(order);
 const details=document.createElement('div');details.className='party-slot-details';
 let chipList=null;
 const identity=document.createElement('div');identity.className='party-slot-identity';
 const name=document.createElement('strong');name.className='party-slot-name';name.textContent=row?.name||'未登録';identity.append(name);details.append(identity);
 if(row){
  const levelTitle='左クリックでレベルアップ／右クリックでレベルダウン（Lv0～3）';
  const wireLevel=button=>{button.title=levelTitle;button.addEventListener('click',event=>{event.stopPropagation();onLevelChange(1);});button.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();onLevelChange(-1);});button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();event.stopPropagation();onLevelChange(-1);}});};
  const portrait=document.createElement('button');portrait.type='button';portrait.className='party-slot-portrait';portrait.setAttribute('aria-label',row.name+'のレベル変更');
  const image=document.createElement('img');image.src='../images/character/'+encodeURIComponent(row.images);image.alt=row.name;image.draggable=false;portrait.append(image);wireLevel(portrait);slot.append(portrait);
  const stats=document.createElement('div');stats.className='party-slot-stats';
  const level=document.createElement('button');level.type='button';level.className='party-slot-level';level.textContent='Lv.'+parameters.level;level.setAttribute('aria-label',row.name+' Lv.'+parameters.level+'：'+levelTitle);wireLevel(level);identity.append(level);
  for(const [key,label,icon] of [['hp','HP','Hp.png'],['atk','攻撃力','Attack.png'],['def','防御力','Defense.png'],['move','移動力','run.png']]){
   const stat=document.createElement('span');stat.className='party-slot-stat';stat.dataset.stat=key;stat.title=label;stat.setAttribute('aria-label',label+' '+(key==='hp'?parameters.currentHp+' / '+parameters.hp:parameters[key]));
   const button=document.createElement('button');button.type='button';button.className='party-slot-stat-icon';button.setAttribute('aria-label',row.name+'の'+(key==='hp'?'現在HP':label)+'を増やす');button.title=label+'：左クリックで＋1／右クリックで−1';
   const image=document.createElement('img');image.src='../images/UT_Buff/'+icon;image.alt=label;image.draggable=false;button.append(image);button.addEventListener('click',event=>{event.stopPropagation();onStatChange?.(key,1);});button.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();onStatChange?.(key,-1);});
   const value=document.createElement('b');value.textContent=key==='hp'?parameters.currentHp+'/'+parameters.hp:parameters[key];stat.append(button,value);stats.append(stat);
  }
  const chipButton=document.createElement('button');chipButton.type='button';chipButton.className='party-chip-open';chipButton.textContent='チップ';chipButton.setAttribute('aria-label',row.name+'の取得チップを表示');chipButton.setAttribute('aria-haspopup','dialog');
  chipButton.addEventListener('click',event=>{event.stopPropagation();document.dispatchEvent(new CustomEvent('wide-party-chips',{detail:{name:row.name,id:String(row.id),isSelf,chips:ownedChips,opener:chipButton}}));});
  chipButton.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();});const chipControl=document.createElement('div');chipControl.className='party-chip-control';const chipCount=document.createElement('span');chipCount.className='party-chip-count';chipCount.textContent='×'+ownedChips.length;chipCount.setAttribute('aria-label','取得チップ '+ownedChips.length+'個');chipControl.append(chipButton,chipCount);identity.append(chipControl);
  details.append(stats);
  if(ownedChips.length){
   const list=document.createElement('div');list.className='party-slot-chips';list.setAttribute('role','list');list.setAttribute('aria-label',row.name+'の取得済みチップ');list.style.setProperty('--party-chip-count',String(ownedChips.length));
   for(const chip of ownedChips){
    const item=document.createElement('span');item.className='party-slot-chip';item.dataset.chipId=chip.id;item.setAttribute('role','listitem');item.title=chip.name+'\n'+chip.effect;
    const image=document.createElement('img');image.src='../images/chip_icon/'+encodeURIComponent(chip.images);image.alt=chip.name;image.draggable=false;item.append(image);list.append(item);
   }
   chipList=list;
  }
 }
 if(chipList){
  const body=document.createElement('div');body.className='party-slot-body';body.append(details,chipList);slot.classList.add('has-self-chips');slot.append(body);partyChipGridResizeObserver.observe(chipList);
 }else slot.append(details);
 return slot;
}
