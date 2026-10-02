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
