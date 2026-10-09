// Move the original owned-chip controls into a wide-mode dialog, retaining handlers.
(()=>{
 const trigger=document.getElementById('wide-chip-open'),chips=document.getElementById('selected-character-chips');
 const media=matchMedia('(min-width:1600px) and (min-aspect-ratio:3/2)');
 const anchor=document.createComment('owned chips home');chips.before(anchor);
 const dialog=document.createElement('dialog');dialog.className='wide-chip-dialog';dialog.setAttribute('aria-labelledby','wide-chip-title');
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');
 title.id='wide-chip-title';title.textContent='取得チップ';close.type='button';close.textContent='閉じる';header.append(title,close);dialog.append(header);document.body.append(dialog);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{anchor.after(chips);trigger.focus({preventScroll:true});});
 trigger.addEventListener('click',()=>{if(!media.matches||document.body.classList.contains('mobile-ui'))return;dialog.append(chips);dialog.showModal();});
 media.addEventListener('change',()=>{if(!media.matches&&dialog.open)dialog.close();});
})();
