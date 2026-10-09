// Touch layout is opt-in by capability and viewport; calculator/state rules are shared.
(()=>{
 const media=matchMedia('(max-width: 900px) and (pointer: coarse)');
 const dialog=document.createElement('dialog');dialog.id='mobile-action-dialog';dialog.className='mobile-action-dialog';dialog.setAttribute('aria-labelledby','mobile-action-title');document.body.append(dialog);
 let bypass=false,opener=null;
 function close(){if(dialog.open)dialog.close();if(opener?.isConnected)opener.focus({preventScroll:true});}
 dialog.addEventListener('cancel',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
 function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);return b;}
 function open(title){close();dialog.replaceChildren();const heading=document.createElement('h2');heading.id='mobile-action-title';heading.textContent=title;dialog.append(heading,button('閉じる',close));dialog.showModal();}
 window.showMobileInformation=(title,nodes)=>{open(title);const content=document.createElement('div');content.className='mobile-information';content.append(...nodes);dialog.append(content);};
 function dispatchOriginal(target,right=false){close();bypass=true;try{if(target.isConnected){if(right)target.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));else target.click();}}finally{bypass=false;}}
 const numericSelector=['#selected-character-portrait','#selected-character-hp-fill','#selected-character-atk-button','#selected-character-def-button','#selected-character-ct','.condition-icon','.party-slot-level','.party-slot-portrait','.party-slot-stat-icon','.roster-stat-icon','.roster-mark-button'].join(',');
 document.addEventListener('click',event=>{
  if(!media.matches||bypass)return;const target=event.target.closest(numericSelector);if(!target||target.disabled||target.closest('dialog'))return;
  // Toggle statuses remain a direct tap; only numeric status counters need +/−.
  if(target.classList.contains('roster-status-button')&&target.getAttribute('aria-pressed')!==null)return;
  event.preventDefault();event.stopImmediatePropagation();opener=target;
  const title=target.id==='selected-character-portrait'?'レベル':target.id==='selected-character-ct'?'CT':(target.getAttribute('aria-label')||target.title||'数値の変更').split(/[:：\n]/)[0].replace(/を(?:1)?(?:増やす|減らす)$/,'');open(title);
  const ct=target.id==='selected-character-ct';dialog.append(button('＋ 増やす',()=>dispatchOriginal(target,ct)),button('− 減らす',()=>dispatchOriginal(target,!ct)));
 },true);
 document.addEventListener('click',event=>{
  if(!media.matches)return;const target=event.target.closest('.mobile-party-actions');if(!target)return;
  event.stopPropagation();const slot=target.closest('.party-member-slot'),index=Number(slot.dataset.slot)-1;opener=target;open(slot.querySelector('.party-slot-name')?.textContent||'PT操作');
  dialog.append(button('チップ編集',()=>{close();slot.click();}));
  for(let to=0;to<4;to++)if(to!==index)dialog.append(button((to+1)+'番目と入れ替え',()=>{close();document.dispatchEvent(new CustomEvent('mobile-party-swap',{detail:{from:index,to}}));}));
  if(!slot.querySelector('.party-slot-order small'))dialog.append(button('PT登録を解除',()=>dispatchOriginal(slot,true)));
 },true);
 const party=document.getElementById('selected-party-grid');
 const decorate=()=>{for(const slot of party.querySelectorAll('.party-member-slot[data-character-id]'))if(slot.dataset.characterId&&!slot.querySelector('.mobile-party-actions')){const b=button('操作',()=>{});b.className='mobile-only mobile-party-actions';b.setAttribute('aria-label',(slot.querySelector('.party-slot-name')?.textContent||'PT')+'の操作');slot.append(b);}};
 new MutationObserver(decorate).observe(party,{childList:true});decorate();
 const chips=document.querySelector('.selected-character-chips'),details=document.createElement('details');details.className='mobile-chip-details';const summary=document.createElement('summary');summary.textContent='取得チップ';chips.before(details);details.append(summary,chips);
 for(const table of document.querySelectorAll('.damage-table')){const toggle=button('出目の表を表示',()=>{const expanded=table.classList.toggle('mobile-expanded');toggle.textContent=expanded?'出目の表を閉じる':'出目の表を表示';toggle.setAttribute('aria-expanded',String(expanded));});toggle.className='mobile-only mobile-table-toggle';toggle.setAttribute('aria-expanded','false');table.before(toggle);}
 const tabs=document.querySelector('.role-tabs'),tabAnchor=document.createComment('desktop role tabs');tabs.before(tabAnchor);
 const panel=document.getElementById('selected-character'),round=document.getElementById('round-progress-controls'),panelAnchor=document.createComment('desktop character'),roundAnchor=document.createComment('desktop round');panel.before(panelAnchor);round.before(roundAnchor);
 function update(){close();document.body.classList.toggle('mobile-ui',media.matches);window.dispatchEvent(new Event('mobile-ui-change'));if(!media.matches){details.open=true;tabAnchor.after(tabs);roundAnchor.after(round);panelAnchor.after(panel);}else{details.open=false;const main=document.querySelector('.main-container');main.before(tabs,round,panel);}}
 media.addEventListener('change',update);update();
})();
