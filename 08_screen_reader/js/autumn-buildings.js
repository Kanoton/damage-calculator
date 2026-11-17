// Manual plant placement. Coordinates and card effects come from the map CSVs.
function createAutumnBuildingEditor({root,beforeChange,onInteraction,onChange}){
 const stage=root.querySelector('.mp-map-stage'),image=root.querySelector('#mp-map-image'),eventLayer=root.querySelector('#mp-event-image-layer'),section=root.querySelector('#mp-caliburn'),legend=root.querySelector('#mp-building-legend');
 const layer=document.createElement('div');layer.id='mp-building-layer';layer.hidden=true;stage.append(layer);
 const dialog=document.createElement('dialog');dialog.id='mp-building-picker';dialog.setAttribute('aria-labelledby','mp-building-picker-title');
 const title=document.createElement('h2');title.id='mp-building-picker-title';const choices=document.createElement('div');choices.className='mp-building-choices';
 const actions=document.createElement('div');actions.className='mp-building-actions';const remove=document.createElement('button');remove.type='button';remove.textContent='撤去';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='キャンセル';actions.append(remove,cancel);dialog.append(title,choices,actions);document.body.append(dialog);
 let contexts={},context='',mapId='',slots=[],features=[],selected=null,previewGuard=false;
 const current=()=>contexts[context]||{};
 const cards=()=>features.filter(row=>row.map_id===mapId&&row.kind==='card');
 const validPlacement=(slot,name)=>slots.some(row=>row.slot_id===slot)&&cards().some(row=>row.name===name);
 const count=()=>Object.entries(current()).filter(([slot,name])=>validPlacement(slot,name)).length;
 function close(){if(dialog.open){previewGuard=true;dialog.close();onInteraction();requestAnimationFrame(onInteraction);}selected=null;}
 function layout(){
  layer.hidden=!slots.length||image.hidden||!eventLayer.hidden||image.style.visibility==='hidden';
  if(layer.hidden||!image.naturalWidth||!image.naturalHeight)return;
  const box=image.getBoundingClientRect(),parent=stage.getBoundingClientRect(),scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  Object.assign(layer.style,{left:(box.left-parent.left+(box.width-width)/2)+'px',top:(box.top-parent.top+(box.height-height)/2)+'px',width:width+'px',height:height+'px'});
  // Align the legend with the bottom row of external construction buttons.
  legend.style.top=(box.top-parent.top+(box.height-height)/2+height*Math.max(...slots.map(slot=>Number(slot.plant_y)/Number(slot.map_height))))+'px';
 }
 function icon(row,alt,cls){const img=document.createElement('img');img.alt=alt;img.className=cls;const source=safeAssetUrl('../images/',row.image);if(source)img.src=source;return img;}
 function renderSummary(){
  section.replaceChildren();const rules=features.filter(row=>row.map_id===mapId&&row.kind==='caliburn');section.hidden=!slots.length||!rules.length;if(section.hidden)return;
  const heading=document.createElement('h2');heading.textContent='カリバーン';const status=document.createElement('p');status.id='mp-building-count';status.setAttribute('aria-live','polite');status.textContent='植物建築：'+count()+' / 10';
  const meter=document.createElement('progress');meter.max=10;meter.value=Math.min(10,count());meter.setAttribute('aria-label','カリバーンの植物建築数');section.append(heading,status,meter);
  for(const row of rules){const item=document.createElement('article');item.className='mp-caliburn-effect';item.dataset.threshold=row.threshold;item.dataset.unlocked=String(count()>=Number(row.threshold));const name=document.createElement('h3');name.textContent=row.threshold+'個\n'+row.name+'（'+(count()>=Number(row.threshold)?'条件達成':'未達成')+'）';name.append(icon(row,row.name,'mp-feature-icon'));const text=document.createElement('p');text.textContent=row.description.replace(/[：:]/g,'\n');item.append(name,text);section.append(item);}
  const hint=document.createElement('p');hint.className='mp-building-hint';hint.textContent='マップの外枠から植物を配置・変更・撤去できます。効果の付与・解除はキャラクター欄で操作します。';
  const clear=document.createElement('button');clear.type='button';clear.textContent='このマップの建築を撤去';clear.disabled=count()===0;clear.addEventListener('click',()=>{if(!count())return;beforeChange();delete contexts[context];render();});section.append(hint,clear);
 }
 function render(){
  layer.replaceChildren();
  const links=document.createElementNS('http://www.w3.org/2000/svg','svg');links.setAttribute('viewBox','0 0 1804 1948');links.setAttribute('aria-hidden','true');links.classList.add('mp-building-links');layer.append(links);
  slots.forEach((slot,index)=>{
   const x=Number(slot.x),y=Number(slot.y),px=Number(slot.plant_x),py=Number(slot.plant_y),dx=Math.sign(px-x),dy=Math.sign(py-y);
   const link=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value] of Object.entries({x1:x+dx*46,y1:y+dy*46,x2:px-dx*36,y2:py-dy*36}))link.setAttribute(key,value);links.append(link);
   const row=cards().find(card=>card.name===current()[slot.slot_id]);const button=document.createElement('button');button.type='button';button.className='mp-building-slot';button.dataset.slot=slot.slot_id;button.dataset.card=row?.name||'';button.setAttribute('aria-label','建築可能マス'+(index+1)+'：'+(row?.name||'未設置')+'。植物建築を選択');button.setAttribute('aria-haspopup','dialog');button.title=row?row.name+'：'+row.building_effect:'クリックして植物建築を選択';
   Object.assign(button.style,{left:(px/Number(slot.map_width)*100)+'%',top:(py/Number(slot.map_height)*100)+'%',width:(72/Number(slot.map_width)*100)+'%'});
   if(row?.replacement_tile){const tile=document.createElement('img');tile.src=safeAssetUrl('../images/',row.replacement_tile);tile.alt='変更後のマス';tile.className='mp-building-tile';tile.dataset.tileSlot=slot.slot_id;Object.assign(tile.style,{left:(x/Number(slot.map_width)*100)+'%',top:(y/Number(slot.map_height)*100)+'%',width:(72/Number(slot.map_width)*100)+'%'});layer.append(tile);}
   if(row)button.append(icon(row,row.name,'mp-building-plant'));else{const plus=document.createElement('span');plus.className='mp-building-plus';plus.setAttribute('aria-hidden','true');plus.textContent='＋';button.append(plus);}
   button.addEventListener('click',()=>open(slot.slot_id,index));layer.append(button);
  });renderSummary();layout();onChange();
 }
 function place(name){
  const slot=selected;if(!slot||!slots.some(row=>row.slot_id===slot)||name&&!validPlacement(slot,name))return;
  const old=current()[slot]||'';if(old===name){close();return;}
  beforeChange();contexts[context]??={};if(name)contexts[context][slot]=name;else delete contexts[context][slot];close();render();layer.querySelector('[data-slot="'+slot+'"]')?.focus();
 }
 // Screen-reader writes must be independently verified and must never erase a manual placement.
 // Missing or obstructed plants are unknown, not evidence of an empty slot.
 function applyRecognized(result){
  const rejected={added:0,unchanged:0,skipped:0,reason:'unverified'};
  if(mapId!=='MAP0105'||!slots.length||!result||result.mapId!==mapId||result.difficulty!==JSON.parse(context||'[]')[1]||!Array.isArray(result.placements))return rejected;
  if(result.placements.length<1||result.placements.length>16)return {...rejected,reason:'invalid-count'};
  // A view must anchor the location, the type, and two independent frames.
  if(result.viewVerified!==true||result.viewAmbiguous===true||!Array.isArray(result.landmarkClasses)||new Set(result.landmarkClasses).size<3||result.landmarkClasses.some(id=>typeof id!=='string'||!id||id.length>64)||!Number.isFinite(result.geometryResidualPx)||result.geometryResidualPx<0||result.geometryResidualPx>10||!Number.isInteger(result.frameCount)||result.frameCount<2||!Number.isFinite(result.confidence)||result.confidence<.95||!Array.isArray(result.observationIds)||result.observationIds.length<2||new Set(result.observationIds).size<2||result.observationIds.some(id=>typeof id!=='string'||!id||id.length>128))return rejected;
  const seen=new Set();
  for(const placement of result.placements){
   if(!placement||typeof placement.slotId!=='string'||seen.has(placement.slotId)||!validPlacement(placement.slotId,placement.name)||
      placement.locationVerified!==true||placement.typeVerified!==true||!Number.isFinite(placement.confidence)||placement.confidence<.95){
    return {...rejected,reason:'ambiguous-placement'};
   }
   seen.add(placement.slotId);
  }
  const allowed=result.placements.filter(item=>!current()[item.slotId]);
  const conflicts=result.placements.filter(item=>current()[item.slotId]&&current()[item.slotId]!==item.name);
  const unchanged=result.placements.length-allowed.length-conflicts.length;
  if(!allowed.length)return {added:0,unchanged,skipped:conflicts.length,reason:conflicts.length?'manual-conflict':'unchanged'};
  beforeChange();contexts[context]??={};
  for(const item of allowed)contexts[context][item.slotId]=item.name;
  render();
  return {added:allowed.length,unchanged,skipped:conflicts.length,reason:conflicts.length?'partial-conflict':'applied'};
 }
 // Explicit single-capture human review is independent from automated recognition.
 // Never trust an O/I slot or plant name guessed from an unverified color blob.
 function applyManuallyReviewed(result){
  const rejected={added:0,unchanged:0,skipped:1,reason:'manual-review-required'};
  if(mapId!=='MAP0105'||!slots.length||!result||
     result.mode!=='single-capture-human-review'||result.humanConfirmed!==true||
     result.mapId!==mapId||result.difficulty!==JSON.parse(context||'[]')[1]||
     typeof result.slotId!=='string'||typeof result.name!=='string'||
     !validPlacement(result.slotId,result.name))return rejected;
  if(current()[result.slotId]){
   return {added:0,unchanged:Number(current()[result.slotId]===result.name),
           skipped:Number(current()[result.slotId]!==result.name),
           reason:current()[result.slotId]===result.name?'unchanged':'manual-conflict'};
  }
  beforeChange();contexts[context]??={};contexts[context][result.slotId]=result.name;
  render();
  return {added:1,unchanged:0,skipped:0,reason:'manually-confirmed'};
 }
 function manualReviewOptions(){
  let difficulty='';
  try{difficulty=JSON.parse(context||'[]')[1]||'';}catch{return {mapId,difficulty,slots:[],cards:[]};}
  return {mapId,difficulty,
   slots:slots.map((row,index)=>({slotId:row.slot_id,label:'建築可能マス'+(index+1)+' ('+row.slot_id+')',
    mapPlantX:Number(row.plant_x),mapPlantY:Number(row.plant_y),
    mapWidth:Number(row.map_width),mapHeight:Number(row.map_height)})),
   cards:cards().map(row=>({name:row.name}))};
 }
 function open(slot,index){
  previewGuard=true;onInteraction();selected=slot;title.textContent='建築可能マス'+(index+1)+'の植物建築';choices.replaceChildren();
  for(const row of cards()){
   const button=document.createElement('button');button.type='button';button.className='mp-building-choice';button.dataset.card=row.name;button.setAttribute('aria-label',row.name+'を配置');button.setAttribute('aria-pressed',String(current()[slot]===row.name));
   const name=document.createElement('strong');name.textContent=row.name;const text=document.createElement('span');text.textContent=row.description+' 設置後：'+row.building_effect;button.append(icon(row,row.name,''),name,text);button.addEventListener('click',()=>place(row.name));choices.append(button);
  }remove.disabled=!current()[slot];dialog.showModal();
 }
 remove.addEventListener('click',()=>place(''));cancel.addEventListener('click',close);dialog.addEventListener('close',()=>{if(!dialog.open){selected=null;previewGuard=true;onInteraction();requestAnimationFrame(onInteraction);}});document.addEventListener('pointermove',()=>{if(!dialog.open)previewGuard=false;},{passive:true});
 document.addEventListener('keydown',()=>{if(!dialog.open)previewGuard=false;});
 image.addEventListener('load',layout);new ResizeObserver(layout).observe(stage);new ResizeObserver(layout).observe(image);new MutationObserver(layout).observe(eventLayer,{attributes:true,attributeFilter:['hidden']});
 return {
  update(value){const next=JSON.stringify([value.mapId,value.difficulty]);if(context!==next)close();context=next;mapId=value.mapId;slots=(value.slots||[]).filter(row=>row.map_id===mapId);features=value.features||[];render();},
  count:()=>count(),
  applyRecognized,
  applyManuallyReviewed,
  manualReviewOptions,
  allowsPreview:()=>!dialog.open&&!previewGuard,
  snapshot:()=>JSON.parse(JSON.stringify(contexts)),
  restore(value){contexts=value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):{};close();render();},
  reset(){contexts={};close();render();}
 };
}
