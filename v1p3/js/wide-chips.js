// Preserve self-chip actions; party chips are an information-only view.
(()=>{
 const trigger=document.getElementById('wide-chip-open'),chips=document.getElementById('selected-character-chips');
 const media=matchMedia('(min-width:1600px) and (min-aspect-ratio:3/2)');
 const anchor=document.createComment('owned chips home');chips.before(anchor);
 const dialog=document.createElement('dialog');dialog.className='wide-chip-dialog';dialog.setAttribute('aria-labelledby','wide-chip-title');
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button'),partyList=document.createElement('div'),empty=document.createElement('p');
 title.id='wide-chip-title';close.type='button';close.textContent='閉じる';header.append(title,close);partyList.className='selected-character-chips';empty.textContent='取得済みチップはありません。';dialog.append(header);document.body.append(dialog);
 let opener=trigger,outsideDown=false;
 const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('pointerdown',event=>{outsideDown=outside(event);});
 dialog.addEventListener('click',event=>{if(outsideDown&&outside(event))dialog.close();outsideDown=false;});
 dialog.addEventListener('close',()=>{if(chips.parentElement===dialog)anchor.after(chips);partyList.remove();empty.remove();if(opener?.isConnected)opener.focus({preventScroll:true});});
 function open(source,name,self,items=[]){
  if(!media.matches||document.body.classList.contains('mobile-ui')||dialog.open)return;
  opener=source;title.textContent=(name?name+'の':'')+'取得チップ';
  if(self)dialog.append(chips);else{partyList.replaceChildren(...items.map(chip=>createOwnedChipView(chip,null,()=>{})));dialog.append(partyList);}
  if(!(self?chips.children.length:items.length))dialog.append(empty);
  dialog.showModal();
 }
 trigger.addEventListener('click',()=>open(trigger,'',true));
 document.addEventListener('wide-party-chips',event=>{const d=event.detail;open(d.opener,d.name,d.isSelf,d.chips);});
 media.addEventListener('change',()=>{if(!media.matches&&dialog.open)dialog.close();});
})();
