// ===== キャラクター表示ヘルパー =====
function createOwnedChipView(chip,chargeDelta,onCharge){
 const item=document.createElement('span');item.className='selected-chip';item.title=chip.name+'\n'+chip.effect;
 const img=document.createElement('img');img.alt=chip.name;img.src='../images/chip_icon/'+encodeURIComponent(chip.images);item.append(img);
 if(chargeDelta!==null){
  item.classList.add('is-actionable');item.setAttribute('role','button');item.tabIndex=0;
  if(chargeDelta)item.title+='\nクリック：チャージ'+(chargeDelta>0?'+':'')+chargeDelta;
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
 const item=document.createElement('figure');item.className='character-asset';item.dataset.id=row.id;
 const img=document.createElement('img');img.alt=row.name||'';img.loading='lazy';img.decoding='async';
 const file=String(row[key]||row.images||'').trim();
 const missing=()=>{const text=document.createElement('figcaption');text.textContent=img.alt+'：画像を読み込めませんでした。';item.replaceChildren(text);};
 img.addEventListener('error',missing,{once:true});item.append(img);
 if(file)img.src='../images/'+folder+'/'+encodeURIComponent(file);else missing();
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
