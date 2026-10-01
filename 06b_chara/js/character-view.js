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
