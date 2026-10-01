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
