// Mission counter UI helpers. State ownership remains in map.js.
function updateMissionCounterRow(tr,counters){
 const key=tr.dataset.counterKey,maximum=Number(tr.dataset.maximum),count=counters.has(key)?counters.get(key):maximum;
 tr.children[0].textContent=count+' / '+maximum;tr.classList.toggle('mp-mission-done',count===0);
 const control=tr.querySelector('button');control.setAttribute('aria-label',tr.dataset.description+'、残り'+count+' / '+maximum+'。クリックで1減らす、右クリックまたはShiftキーを押しながらEnterで1増やす');
}
function attachMissionCounterRow(tr,row,level,counters,onBeforeChange,onChanged){
 const key=missionCounterKey(row,level);tr.dataset.counterKey=key;tr.dataset.maximum=String(Number(row['カウンタ']));tr.dataset.description=row['内容'];
 const button=document.createElement('button');button.type='button';button.className='mp-mission-counter-button';button.textContent=row['内容'];tr.children[1].replaceChildren(button);tr.children[0].setAttribute('aria-live','polite');
 function change(delta){const maximum=Number(tr.dataset.maximum),current=counters.has(key)?counters.get(key):maximum,next=Math.max(0,Math.min(maximum,current+delta));if(next===current)return;onBeforeChange();counters.set(key,next);updateMissionCounterRow(tr,counters);onChanged();}
 tr.addEventListener('click',()=>change(-1));tr.addEventListener('contextmenu',event=>{event.preventDefault();change(1);});button.addEventListener('keydown',event=>{if(event.shiftKey&&event.key==='Enter'){event.preventDefault();change(1);}});updateMissionCounterRow(tr,counters);
}
