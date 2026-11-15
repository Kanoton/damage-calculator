// Manual plant placement. Coordinates and card effects come from the map CSVs.
function createAutumnBuildingEditor({root,beforeChange}){
 const stage=root.querySelector('.mp-map-stage'),image=root.querySelector('#mp-map-image'),eventLayer=root.querySelector('#mp-event-image-layer'),section=root.querySelector('#mp-caliburn');
 const layer=document.createElement('div');layer.id='mp-building-layer';layer.hidden=true;stage.append(layer);
 const dialog=document.createElement('dialog');dialog.id='mp-building-picker';dialog.setAttribute('aria-labelledby','mp-building-picker-title');
 const title=document.createElement('h2');title.id='mp-building-picker-title';const choices=document.createElement('div');choices.className='mp-building-choices';
 const actions=document.createElement('div');actions.className='mp-building-actions';const remove=document.createElement('button');remove.type='button';remove.textContent='撤去';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='キャンセル';actions.append(remove,cancel);dialog.append(title,choices,actions);document.body.append(dialog);
 let contexts={},context='',mapId='',slots=[],features=[],selected=null;
 const current=()=>contexts[context]||{};
 const cards=()=>features.filter(row=>row.map_id===mapId&&row.kind==='card');
 const validPlacement=(slot,name)=>slots.some(row=>row.slot_id===slot)&&cards().some(row=>row.name===name);
 const count=()=>Object.entries(current()).filter(([slot,name])=>validPlacement(slot,name)).length;
 function close(){if(dialog.open)dialog.close();selected=null;}
 function layout(){
  layer.hidden=!slots.length||image.hidden||!eventLayer.hidden||image.style.visibility==='hidden';
  if(layer.hidden||!image.naturalWidth||!image.naturalHeight)return;
  const box=image.getBoundingClientRect(),parent=stage.getBoundingClientRect(),scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  Object.assign(layer.style,{left:(box.left-parent.left+(box.width-width)/2)+'px',top:(box.top-parent.top+(box.height-height)/2)+'px',width:width+'px',height:height+'px'});
 }
 function icon(row,alt,cls){const img=document.createElement('img');img.alt=alt;img.className=cls;const source=safeAssetUrl('../images/',row.image);if(source)img.src=source;return img;}
 function renderSummary(){
  section.replaceChildren();const rules=features.filter(row=>row.map_id===mapId&&row.kind==='caliburn');section.hidden=!slots.length||!rules.length;if(section.hidden)return;
  const heading=document.createElement('h2');heading.textContent='カリバーン';const status=document.createElement('p');status.id='mp-building-count';status.setAttribute('aria-live','polite');status.textContent='植物建築：'+count()+' / 10';
  const meter=document.createElement('progress');meter.max=10;meter.value=Math.min(10,count());meter.setAttribute('aria-label','カリバーンの植物建築数');section.append(heading,status,meter);
  for(const row of rules){const item=document.createElement('article');item.className='mp-caliburn-effect';item.dataset.threshold=row.threshold;item.dataset.unlocked=String(count()>=Number(row.threshold));const name=document.createElement('h3');name.textContent=row.threshold+'個：'+row.name+'（'+(count()>=Number(row.threshold)?'条件達成':'未達成')+'）';name.append(icon(row,row.name,'mp-feature-icon'));const text=document.createElement('p');text.textContent=row.description;item.append(name,text);section.append(item);}
  const hint=document.createElement('p');hint.className='mp-building-hint';hint.textContent='マップの外枠から植物を配置・変更・撤去できます。効果の付与・解除はキャラクター欄で操作します。';
  const clear=document.createElement('button');clear.type='button';clear.textContent='このマップの建築を撤去';clear.disabled=count()===0;clear.addEventListener('click',()=>{if(!count())return;beforeChange();delete contexts[context];render();});section.append(hint,clear);
 }
 function render(){
  layer.replaceChildren();slots.forEach((slot,index)=>{
   const row=cards().find(card=>card.name===current()[slot.slot_id]);const button=document.createElement('button');button.type='button';button.className='mp-building-slot';button.dataset.slot=slot.slot_id;button.dataset.card=row?.name||'';button.setAttribute('aria-label','建築可能マス'+(index+1)+'：'+(row?.name||'未設置')+'。植物建築を選択');button.setAttribute('aria-haspopup','dialog');button.title=row?row.name+'：'+row.building_effect:'クリックして植物建築を選択';
   Object.assign(button.style,{left:(Number(slot.x)/Number(slot.map_width)*100)+'%',top:(Number(slot.y)/Number(slot.map_height)*100)+'%',width:(128/Number(slot.map_width)*100)+'%'});
   if(row?.replacement_tile){const tile=document.createElement('img');tile.src=safeAssetUrl('../images/',row.replacement_tile);tile.alt='変更後のマス';tile.className='mp-building-tile';button.append(tile);}
   if(row)button.append(icon(row,row.name,'mp-building-plant'));else{const plus=document.createElement('span');plus.className='mp-building-plus';plus.setAttribute('aria-hidden','true');plus.textContent='＋';button.append(plus);}
   button.addEventListener('click',()=>open(slot.slot_id,index));layer.append(button);
  });renderSummary();layout();
 }
 function place(name){
  const slot=selected;if(!slot||!slots.some(row=>row.slot_id===slot)||name&&!validPlacement(slot,name))return;
  const old=current()[slot]||'';if(old===name){close();return;}
  beforeChange();contexts[context]??={};if(name)contexts[context][slot]=name;else delete contexts[context][slot];close();render();layer.querySelector('[data-slot="'+slot+'"]')?.focus();
 }
 function open(slot,index){
  selected=slot;title.textContent='建築可能マス'+(index+1)+'の植物建築';choices.replaceChildren();
  for(const row of cards()){
   const button=document.createElement('button');button.type='button';button.className='mp-building-choice';button.dataset.card=row.name;button.setAttribute('aria-label',row.name+'を配置');button.setAttribute('aria-pressed',String(current()[slot]===row.name));
   const name=document.createElement('strong');name.textContent=row.name;const text=document.createElement('span');text.textContent=row.description+' 設置後：'+row.building_effect;button.append(icon(row,row.name,''),name,text);button.addEventListener('click',()=>place(row.name));choices.append(button);
  }remove.disabled=!current()[slot];dialog.showModal();
 }
 remove.addEventListener('click',()=>place(''));cancel.addEventListener('click',close);dialog.addEventListener('close',()=>{selected=null;});
 image.addEventListener('load',layout);new ResizeObserver(layout).observe(stage);new ResizeObserver(layout).observe(image);new MutationObserver(layout).observe(eventLayer,{attributes:true,attributeFilter:['hidden']});
 return {
  update(value){const next=JSON.stringify([value.mapId,value.difficulty]);if(context!==next)close();context=next;mapId=value.mapId;slots=(value.slots||[]).filter(row=>row.map_id===mapId);features=value.features||[];render();},
  snapshot:()=>JSON.parse(JSON.stringify(contexts)),
  restore(value){contexts=value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):{};close();render();},
  reset(){contexts={};close();render();}
 };
}
