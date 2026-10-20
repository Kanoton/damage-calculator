(()=>{
 'use strict';
 const $=id=>document.getElementById('reader-'+id),video=$('video'),preview=$('preview'),ctx=preview.getContext('2d'),vision=window.ScreenReaderVision,bridge=window.ScreenReaderCharacterBridge;
 const dock=document.getElementById('reader-dock'),toggle=$('toggle');
 const setDock=open=>{dock.classList.toggle('is-open',open);dock.classList.toggle('is-dismissed',!open);toggle.setAttribute('aria-expanded',String(open));};
 toggle.addEventListener('pointerenter',()=>dock.classList.remove('is-dismissed'));
 toggle.addEventListener('click',()=>setDock(!dock.classList.contains('is-open')));
 dock.addEventListener('keydown',event=>{if(event.key==='Escape'){setDock(false);toggle.focus();}});
 const panel=$('panel'),moveHandle=$('move');let drag=null;
 function movePanel(x,y){const rect=panel.getBoundingClientRect();panel.style.left=Math.max(0,Math.min(innerWidth-rect.width,x))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-rect.height,y))+'px';panel.style.bottom='auto';panel.style.transform='none';}
 moveHandle.addEventListener('pointerdown',event=>{if(event.button!==0)return;setDock(true);const r=panel.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX-r.left,y:event.clientY-r.top};moveHandle.setPointerCapture(event.pointerId);event.preventDefault();});
 moveHandle.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)movePanel(event.clientX-drag.x,event.clientY-drag.y);});
 const endDrag=()=>{drag=null;};moveHandle.addEventListener('pointerup',endDrag);moveHandle.addEventListener('pointercancel',endDrag);moveHandle.addEventListener('lostpointercapture',endDrag);
 moveHandle.addEventListener('keydown',event=>{const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},step=steps[event.key];if(!step)return;event.preventDefault();const r=panel.getBoundingClientRect(),amount=event.shiftKey?40:10;movePanel(r.left+step[0]*amount,r.top+step[1]*amount);});
 $('position-reset').addEventListener('click',()=>{for(const key of ['left','top','bottom','transform','width','height'])panel.style.removeProperty(key);});
 $('close').addEventListener('click',()=>{setDock(false);toggle.focus();});
 window.addEventListener('resize',()=>{if(panel.style.top&&dock.classList.contains('is-open')){const r=panel.getBoundingClientRect();movePanel(r.left,r.top);}});
 const STORAGE='astral-08-screen-reader-profile-v1';
 let stream=null,rawSource=null,frame=null,busy=false,timer=null,generation=0,selecting=false,selectionStart=null,area=null,catalog=null,custom={characters:[],chips:[]};
 let worldContext=null,readStarted=null,partyLock=null,lastObservation=null,partyEdited=false,readerSession=false;
 const defeatTracker=window.ScreenReaderDefeatVision.createTracker();
 function resetDefeat(){defeatTracker.reset();$('defeat-result').textContent='';}
 function updateDefeat(source,time,world){
  if(!$('world-sync').checked||window.ScreenReaderMapBridge.snapshot().map!=='MAP0105'){resetDefeat();return [];}
  const context=window.ScreenReaderMapBridge.context();if(context!==worldContext){worldContext=context;resetDefeat();}
  const roster=window.ScreenReaderMapBridge.snapshot().monsters;
  const observations=(world?.monsters||[]).map(o=>({...o,instanceId:roster.find(e=>!e.defeated&&e.monsterId===o.monsterId&&e.serial===o.serial)?.instanceId}));
  const cues=defeatTracker.step(source,time,observations),applied=$('apply').checked?window.ScreenReaderMapBridge.applyDefeats(cues):[];
  if(cues.length)$('defeat-result').textContent=cues.map(c=>{
   const name=window.ScreenReaderMapBridge.monsterName(c.monsterId);
   return applied.includes(c)?'自動撃破：'+name+' '+c.serial+'（「１つもどす」で取消可能）':'撃破演出の候補：'+name+'（'+(c.serial===null?'番号未確認':'番号 '+c.serial+'・反映保留')+'）。一覧で確認してください。';
  }).join(' ／ ');
  return cues;
 }
 const stable=new Map();let lastHash=null,sameFrames=0,stableTick=0;
 function status(text){$('status').textContent=text;}
 function monitorInfo(text=''){
  const count=new Set((window.ScreenReaderWorldReferences?.names||[]).map(r=>r.id)).size;
  const map=window.ScreenReaderMapBridge?.snapshot(),pending=readerSession&&(!map?.map||!map?.difficulty);
  $('monitor-info').textContent=(pending?'マップ名・難易度：未判定（ルーム設定または結果画面から読み取ります。手動指定もできます） ／ ':'')+'モンスター読取：'+($('world-sync').checked?'ON':'OFF（反映をONにすると読取開始）')+' ／ 照合見本 '+count+'種類 ／ 自動撃破：秋幻の森・番号と位置を確認できた演出のみ（不明時は候補）'+(text?' ／ '+text:'');
 }
 const interval=()=>[250,500,1200].includes(Number($('interval').value))?Number($('interval').value):250;
 function isArea(a){return a&&['x','y','w','h'].every(k=>Number.isFinite(a[k]))&&a.x>=0&&a.y>=0&&a.w>=.05&&a.h>=.05&&a.x+a.w<=1.00001&&a.y+a.h<=1.00001;}
 function validateProfile(p){
  if(p?.version!==1||!Array.isArray(p.characters)||!Array.isArray(p.chips)||p.characters.length+p.chips.length>500)throw Error('見本ファイルの形式が違います。');
  const validData=r=>typeof r.data==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(r.data)&&atob(r.data).length===768;
  if(!p.characters.every(r=>catalog.characters.some(c=>c.id===r.id)&&['avatar','self','header'].includes(r.kind)&&validData(r))||!p.chips.every(r=>catalog.chips.some(c=>c.id===r.id)&&validData(r)))throw Error('見本に不正な項目があります。');
  if(p.area!==null&&p.area!==undefined&&!isArea(p.area))throw Error('読取範囲が不正です。');return p;
 }
 function save(){try{localStorage.setItem(STORAGE,JSON.stringify({version:1,...custom,area}));}catch{status('見本を保存できませんでした。ブラウザの保存領域を確認してください。');}updateReferenceStatus();}
 function updateReferenceStatus(){$('reference-status').textContent='追加した見本：キャラ '+custom.characters.length+'件／チップ '+custom.chips.length+'件';}
 function updateMappingPreview(){
  const mapping=window.ScreenReaderMiniCharacterMapping,summary=mapping.summary();
  $('mapping-status').textContent=summary.source+'：キャラ画像 '+summary.characters+'枚／対象外 '+summary.excluded+'枚';
  const rows=$('learn-kind').value.startsWith('chip-')?[]:mapping.forCharacter($('learn-id').value);
  $('mapping-preview').replaceChildren(...rows.map(row=>Object.assign(document.createElement('img'),{src:'../images/UT_Hero_ProfilePhoto/'+row.image_file,alt:row.name+' '+row.image_file,title:row.name+'：'+row.image_file,loading:'lazy'})));
 }
 function updateLearningOptions(){if(!catalog)return;const chips=$('learn-kind').value.startsWith('chip-'),items=chips?catalog.chips:catalog.characters;$('learn-slot-label').hidden=!chips;$('learn-id').replaceChildren(...items.map(row=>Object.assign(document.createElement('option'),{value:row.id,textContent:row.name})));updateMappingPreview();}
 function ready(){
  catalog=bridge.catalog();if(!catalog.characters.length){setTimeout(ready,100);return;}
  for(const row of catalog.characters)$('self').append(Object.assign(document.createElement('option'),{value:row.id,textContent:row.name}));
  try{const value=localStorage.getItem(STORAGE);if(value){const p=validateProfile(JSON.parse(value));custom={characters:p.characters,chips:p.chips};area=p.area||null;}}catch{status('保存済みの見本を読み込めませんでした。初期の見本で開始します。');}
  for(let slot=0;slot<4;slot++){
   const label=document.createElement('label'),select=document.createElement('select');select.id='reader-party-'+slot;label.append((slot+1)+'番目 ',select);
   select.append(Object.assign(document.createElement('option'),{value:'',textContent:'未判定'}),...catalog.characters.map(row=>Object.assign(document.createElement('option'),{value:row.id,textContent:row.name})));
   select.addEventListener('change',()=>{partyEdited=true;});$('party-slots').append(label);
  }
  updateLearningOptions();updateReferenceStatus();monitorInfo();
  window.ScreenReaderMiniCharacterMapping.load(catalog.characters).then(updateMappingPreview);
 }
 function releaseParty(){partyLock=null;lastObservation=null;partyEdited=false;$('party-confirm').disabled=false;$('party-unlock').disabled=true;$('party-status').textContent='PT未確定';for(const select of $('party-slots').querySelectorAll('select')){select.disabled=false;select.value='';}}

 function lockParty(ids,selfId,hud){
  const previousSelf=bridge.snapshot().selfId;
  partyLock={ids:[...ids],selfId:ids.includes(selfId)?selfId:ids.includes(previousSelf)?previousSelf:null,hud:{...hud}};
  for(let i=0;i<4;i++){$('party-'+i).value=ids[i];$('party-'+i).disabled=true;}
  $('party-confirm').disabled=true;$('party-unlock').disabled=false;
  $('party-status').textContent='PT確定：編成は再設定まで固定。'+(partyLock.selfId?'':'自キャラは未判定です。「自キャラ」で指定してください。');
 }
 function startReaderSession(keepAutomatic=false){
  const automatic=keepAutomatic&&$('auto').checked;
  window.ScreenReaderMapBridge.resetForReader();readerSession=true;$('auto').checked=automatic;$('world-sync').checked=true;monitorInfo();
 }
 function showFrame(source){frame=vision.normalize(source,area);ctx.drawImage(frame,0,0);$('area').disabled=false;$('learn').disabled=!catalog;}
 function drawResults(observation,accepted,automatic){
  lastObservation=observation;
  if(!partyLock&&!partyEdited)for(const m of observation.members)if(Number.isInteger(m.slot))$('party-'+m.slot).value=m.id||'';
  const current=bridge.snapshot(),apply=$('apply').checked;
  $('result-body').replaceChildren(...observation.members.filter(m=>Number.isInteger(m.slot)).map(m=>{
   const tr=document.createElement('tr'),previous=current.members.find(p=>p.slot===m.slot);
   // Never label the previous occupant's numbers as a new candidate's values.
   const held=previous?.id&&(!m.id||previous.id===m.id)?previous:null;
   const confirmed=accepted.members.find(p=>p.id===m.id&&p.slot===m.slot);
   const name=catalog.characters.find(c=>c.id===m.id)?.name??held?.name??'未判定';
   const cell=value=>{const td=document.createElement('td');if(typeof value==='string')td.textContent=value;else td.append(value);tr.append(td);return td;};
   const value=key=>{
    const field=document.createElement('span'),number=document.createElement('span'),label=document.createElement('small');field.className='reader-field';
    let state,text;
    if(m.id&&m[key]!==undefined){number.textContent=String(m[key]);state=automatic&&confirmed?.[key]===undefined?'pending':!apply?'preview':held?.[key]===m[key]?'read':'rejected';text={pending:'安定待ち',read:'今回',preview:'確認のみ',rejected:'反映保留'}[state];}
    else if(held?.[key]!==undefined){number.textContent=String(held[key]);state='held';text='保持';}
    else {number.textContent='—';state='unknown';text='未判定';}
    field.dataset.state=state;label.textContent=text;field.append(number,label);
    if(['pending','rejected'].includes(state)&&held?.[key]!==undefined)field.title=(state==='pending'?'連続2回の一致を待っています。':'ツールの状態と一致しないため反映していません。')+'ツールは '+held[key]+' を保持しています。';
    if(state==='held')field.title='今回この項目は読めなかったため、ツールの値を保持しています。';
    return field;
   };
   const pair=(a,b)=>{const span=document.createElement('span');span.className='reader-field-pair';span.append(value(a),document.createTextNode(' / '),value(b));return span;};
   cell(String(m.slot+1));
   const own=(m.id||held?.id)===current.selfId?'（自分）':m.id&&m.id===observation.selfId?'（自分候補）':'';
   const nameCell=cell(name+own);
   if(previous?.id&&m.id&&previous.id!==m.id){const note=document.createElement('small');note.className='reader-held-name';note.textContent='保持：'+previous.name;nameCell.append(note);}
   cell(value('level'));cell(pair('currentHp','maxHp'));cell(value('coin'));cell(pair('atk','def'));
   const pending=tr.querySelector('[data-state="pending"]'),keeping=tr.querySelector('[data-state="held"]'),rejected=tr.querySelector('[data-state="rejected"]');
   cell(!apply?'確認のみ':!m.id?'前回保持':automatic&&!confirmed?'安定待ち':pending?'一部安定待ち':rejected?'一部反映保留':keeping?'一部保持':'反映');
   return tr;
  }));
  const world=observation.world;if(world)$('world-result').textContent=(world.clock?'ラウンド '+world.clock.round+' ／ 進捗 '+world.clock.progress:'ラウンド・進捗：未判定')+' ／ '+(world.monsters.map(m=>(window.ScreenReaderMapBridge.monsterName(m.monsterId))+(m.serial===null?'':' '+m.serial)+' HP '+m.currentHp+'/'+m.maxHp).join('、')||'モンスター：未判定');
  $('view').textContent=observation.view+'：今回の読取と保持している値'+(!apply?'（確認のみ）':'');
  const owner=catalog.characters.find(c=>c.id===observation.chipOwnerId)?.name,owned=current.members.find(m=>m.id===observation.chipOwnerId)?.chips||[];
  const chipNames=observation.chipIds.map(id=>(catalog.chips.find(c=>c.id===id)?.name??id)+(automatic&&!accepted.chipIds.includes(id)?'（安定待ち）':apply?'（今回）':'（確認のみ）'));
  const chipRead=observation.chipRead;
  const reason=chipRead?.stage==='screen'?'一覧画面・選択タブを未判定。チップ一覧かステータス画面を表示してください。':chipRead?.stage==='panel'?'一覧の枠を確認できません（'+chipRead.matchedRims+'/10一致、7以上で読取）。':chipRead?.stage==='owner'?(chipRead.ownerSource==='name'?'一覧を確認。持ち主の名前の文字が未判定です。':'一覧を確認。持ち主のキャラが未判定です。'):null;
  $('chip-result').textContent=reason?'チップ読取：'+reason:observation.chipOwnerId?(owner+'のチップ'+(chipRead?.ownerSource==='name'?'（名前で判定）':'')+'：'+(chipNames.join('、')||(chipRead?.stage==='icons'?'一覧と持ち主は確認済み。アイコンは未判定または空欄です。':'今回判定できたチップなし'))+' ／ 取得済み '+owned.length+'件を保持'+(apply&&!current.members.some(m=>m.id===observation.chipOwnerId)?' ／ 持ち主のPT登録待ち':'')):'チップの対象キャラは未判定です。取得済みチップは保持しています。';
 }
 function accept(key,value){const prior=stable.get(key);const count=prior&&prior.value===value&&prior.tick===stableTick-1?prior.count+1:1;stable.set(key,{value,count,tick:stableTick});return count>=2;}
 function stabilize(observation){
  stableTick++;
  const out={...observation,members:[],selfId:null,chipIds:[],setup:null};if(observation.setup&&accept('start-context',JSON.stringify(observation.setup)))out.setup=observation.setup;if(observation.selfId&&accept('self',observation.selfId))out.selfId=observation.selfId;
  for(const m of observation.members){if(!m.id)continue;const identityReady=accept('slot:'+m.slot,m.id),item={id:m.id,slot:m.slot};for(const key of ['level','currentHp','maxHp','coin','atk','def'])if(m[key]!==undefined)item[key]=m[key];if(identityReady)out.members.push(item);}
  const ownerReady=observation.chipOwnerId&&accept('chipOwner',observation.chipOwnerId),chipIds=observation.chipIds.filter(id=>accept(observation.chipOwnerId+':chip:'+id,id));if(ownerReady)out.chipIds=chipIds;else out.chipOwnerId=null;
  if(observation.world){const w=observation.world;out.world={clock:null,monsters:[]};if(w.clock&&accept('world-clock',JSON.stringify(w.clock)))out.world.clock=w.clock;for(const m of w.monsters||[])if(accept('world-monster:'+m.monsterId+':'+m.serial,m.monsterId+':'+m.serial))out.world.monsters.push(m);}
  return out;
 }
 function frameHash(){
  let hash=0;
  // The coarse full-frame hash keeps world/popup changes visible. Exact HUD
  // pixels additionally catch HP/coin/star changes that 16x16 sampling loses.
  for(const box of [[0,0,1536,709],[165,498,288,187],[465,324,286,184],[125,430,435,40]])for(const v of vision.feature(frame,box))hash=(hash*31+v)|0;
  for(const source of frame.statusFrame?[frame,frame.popupFrame]:[frame]){
   const pixels=source.getContext('2d').getImageData(0,60,340,360).data;
   for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)hash=(hash*31+pixels[i+channel])|0;
  }
  if(partyLock){
   const pixels=(frame.popupFrame||frame).getContext('2d').getImageData(0,620,90,89).data;
   for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)hash=(hash*31+pixels[i+channel])|0;
  }
  // Fast-changing status values must invalidate the hash even with world OFF.
  const panel=vision.statusPanel(frame);
  for(const box of [[593,178,235,44],[535,235,120,45],[465,324,286,184]]){
   const pixels=panel.source.getContext('2d').getImageData(...box).data;
   for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)hash=(hash*31+pixels[i+channel])|0;
  }
  // Monster HP/name/serial changes can fall between coarse 16x16 samples.
  // Include exact map pixels only while world reading is enabled.
  if($('world-sync').checked){
   for(const [source,box] of [[frame.popupFrame||frame,[0,0,1536,709]],[frame.statusFrame||frame,[570,0,460,30]]]){
    const pixels=source.getContext('2d').getImageData(...box).data;
    for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)hash=(hash*31+pixels[i+channel])|0;
   }
  }
  return hash;
 }
 async function read(automatic=false){
  if(busy||!rawSource||!catalog||selecting)return;if(!readerSession&&$('apply').checked)startReaderSession(true);busy=true;$('read').disabled=true;const token=generation,started=performance.now(),gap=readStarted===null?null:started-readStarted;readStarted=started;
  const timing=()=> '処理 '+Math.round(performance.now()-started)+'ms'+(automatic&&gap!==null?' ／ 実間隔 '+Math.round(gap)+'ms':'')+' ／ 取得 '+(rawSource.videoWidth||rawSource.width)+'×'+(rawSource.videoHeight||rawSource.height);
  try{
   if(stream){if(!video.videoWidth)throw Error('共有映像を待っています。');rawSource=video;}
   const context=window.ScreenReaderMapBridge?.context();if(context!==worldContext){worldContext=context;resetDefeat();stable.clear();lastHash=null;sameFrames=0;}
   showFrame(rawSource);const hash=frameHash();sameFrames=hash===lastHash?sameFrames+1:0;lastHash=hash;
   if(automatic&&sameFrames>2){monitorInfo('画面変化待ち ／ '+timing());return;}
   // Yield to paint without overlapping jobs. Stop/reset invalidates this frame.
   await new Promise(resolve=>requestAnimationFrame(resolve));if(token!==generation)return;
   const observation=vision.analyze(frame,custom,partyLock);observation.setup=window.ScreenReaderStartVision.analyze(frame);if($('world-sync').checked)observation.world=window.ScreenReaderWorldVision.analyze(frame,{positions:true});else $('world-result').textContent='マップ読取はOFFです。マップ・難易度を選び、反映をONにしてください。';if(!partyLock&&$('self').value)observation.selfId=$('self').value;
   const accepted=automatic?stabilize(observation):{...observation,members:[...observation.members]};
   if($('apply').checked&&$('world-sync').checked&&accepted.setup)window.ScreenReaderMapBridge.configure(accepted.setup);
   if(automatic&&!partyLock&&!partyEdited&&$('apply').checked){
    const slots=[0,1,2,3].map(slot=>accepted.members.find(m=>m.slot===slot));
    if(slots.every(m=>m?.id)&&slots.filter(m=>m.coin!==undefined&&m.level!==undefined).length>=2&&new Set(slots.map(m=>m.id)).size===4)lockParty(slots.map(m=>m.id),accepted.selfId,observation.hud);
   }
   if(partyLock){if($('apply').checked&&!partyLock.selfId&&partyLock.ids.includes(accepted.selfId)){partyLock.selfId=accepted.selfId;$('self').value=accepted.selfId;$('party-status').textContent='PT確定：編成は再設定まで固定。自キャラも判定済みです。';}accepted.selfId=partyLock.selfId;accepted.partyIds=[...partyLock.ids];accepted.members=accepted.members.filter(m=>partyLock.ids.includes(m.id)&&(m.slot===undefined||partyLock.ids[m.slot]===m.id));}
   const result=$('apply').checked?bridge.apply(accepted):{updated:0,added:0};
   drawResults(observation,accepted,automatic);
   let worldSkipped=0;
   if($('apply').checked&&$('world-sync').checked){const applied=window.ScreenReaderMapBridge.apply(accepted.world,{allowDefeat:false});worldSkipped=applied.skipped||0;if(applied.skipped)$('world-result').textContent+=' ／ 反映保留 '+applied.skipped+'件'+(accepted.world?.monsters?.some(m=>m.currentHp===0)?'（HP0候補は撃破未確認のため保持）':'（マップ・難易度・既存個体との一致を確認してください）');}
   updateDefeat(frame,started,observation.world);
   monitorInfo((observation.world?'今回 '+observation.world.monsters.length+'体 ／ '+(automatic?'連続一致 '+accepted.world.monsters.length+'体':'手動読取')+' ／ '+(!$('apply').checked?'確認のみ ／ ':worldSkipped?'反映保留 '+worldSkipped+'件 ／ ':''):'')+timing());
   const names=observation.members.filter(m=>m.id).length;
   status((automatic?'自動読取':'画面読取')+'：'+names+'人を判定／チップ '+result.added+'件追加。'+(!observation.selfId?' 自キャラが未判定の場合は「自キャラ」を指定してください。':''));
  }catch(error){status('読み取れませんでした：'+error.message);}finally{busy=false;$('read').disabled=!rawSource;}
 }
 function schedule(){clearTimeout(timer);if(!$('auto').checked||!stream)return;const elapsed=readStarted===null?0:performance.now()-readStarted;timer=setTimeout(async()=>{await read(true);schedule();},Math.max(16,interval()-elapsed));}
 function stop(){resetDefeat();generation++;clearTimeout(timer);timer=null;readStarted=null;stable.clear();lastHash=null;sameFrames=0;$('auto').checked=false;$('auto').disabled=true;$('stop').disabled=true;if(stream){for(const t of stream.getTracks())t.stop();stream=null;}video.srcObject=null;rawSource=null;$('read').disabled=true;status('画面共有を停止しました。反映済みの情報は保持しています。');}
 $('connect').addEventListener('click',async()=>{
  if(!navigator.mediaDevices?.getDisplayMedia){status('このブラウザでは画面共有を開始できません。HTTPSまたはlocalhostで、PC版Chrome／Edgeを使用してください。画像読取も利用できます。');return;}
  let selected;
  try{
   // Request immediately inside the click, preserving transient activation.
   const request=navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'window',frameRate:{ideal:5,max:10}},audio:false});selected=await request;
   stop();readerSession=false;stream=selected;const token=generation;video.srcObject=stream;
   stream.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===selected)stop();});await video.play();if(token!==generation)return;
   rawSource=video;$('read').disabled=false;$('auto').disabled=false;$('stop').disabled=false;
   status('ゲーム画面を共有中です。「画面読取」または「自動読取」を選んでください。');
  }catch(error){if(selected&&stream!==selected)selected.getTracks().forEach(t=>t.stop());status(error.name==='NotAllowedError'?'画面共有がキャンセルされました。':'画面共有を開始できませんでした：'+error.message);}
 });
 $('stop').addEventListener('click',stop);$('read').addEventListener('click',()=>{$('details').open=true;read();});
 $('auto').addEventListener('change',()=>{stable.clear();sameFrames=0;lastHash=null;if($('auto').checked){status('自動読取を開始しました。安定して判定できた情報を更新します。');read(true).then(schedule);}else{clearTimeout(timer);status('自動読取を停止しました。画面共有は継続中です。');}});
 async function loadImage(file){
  if(!file?.type.startsWith('image/'))return;resetDefeat();if(stream)stop();generation++;const token=generation,url=URL.createObjectURL(file);
  try{const im=new Image();im.src=url;await im.decode();if(token!==generation)return;rawSource=im;$('read').disabled=false;$('details').open=true;await read();}catch(error){status('画像を開けませんでした：'+error.message);}finally{URL.revokeObjectURL(url);$('file').value='';}
 }
 $('file').addEventListener('change',()=>loadImage($('file').files[0]));
 document.addEventListener('paste',event=>{const file=[...(event.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();loadImage(file);}});
 $('party-confirm').addEventListener('click',()=>{
  const ids=Array.from({length:4},(_,i)=>$('party-'+i).value),selfId=$('self').value||lastObservation?.selfId;
  if(!lastObservation?.hud){$('party-status').textContent='ゲーム画面を一度読み取ってから確定してください。';return;}
  if(ids.some(id=>!catalog.characters.some(c=>c.id===id))||new Set(ids).size!==4){$('party-status').textContent='異なる4人を上から順に指定してください。';return;}
  if(selfId&&!ids.includes(selfId)){$('party-status').textContent='「自キャラ」でこのPTにいる自分のキャラを指定してください。';return;}
  if(!$('apply').checked){$('party-status').textContent='「判定できた情報を反映」をONにしてから確定してください。';return;}
  generation++;stable.clear();lastHash=null;sameFrames=0;
  lockParty(ids,selfId,lastObservation.hud);
  bridge.apply({selfId:partyLock.selfId,partyIds:ids,members:ids.map((id,slot)=>({id,slot}))});
  if(rawSource&&!busy)read();
 });
 $('party-unlock').addEventListener('click',()=>{const ids=partyLock?.ids||bridge.snapshot().members.map(m=>m.id);generation++;stable.clear();lastHash=null;sameFrames=0;releaseParty();partyEdited=true;for(let i=0;i<4;i++)$('party-'+i).value=ids[i]||'';if(rawSource&&!busy)read();});
 $('new-game').addEventListener('click',()=>{startReaderSession();status('読取用にゲーム状態をすべてリセットしました。自キャラ・PT・マップ・難易度は未判定です。');});
 $('self').addEventListener('change',()=>{if(partyLock){if(partyLock.ids.includes($('self').value))partyLock.selfId=$('self').value;else{$('self').value=partyLock.selfId||'';$('party-status').textContent='PTは固定中です。自キャラはPT内の人を指定してください。';}}generation++;stable.clear();sameFrames=0;lastHash=null;});
 $('world-sync').addEventListener('change',()=>{resetDefeat();stable.clear();sameFrames=0;lastHash=null;monitorInfo();});
 $('interval').addEventListener('change',()=>{if(!busy)schedule();});
 $('apply').addEventListener('change',()=>{resetDefeat();stable.clear();sameFrames=0;lastHash=null;});
 $('area').addEventListener('click',()=>{selecting=true;preview.classList.add('is-selecting');status('プレビュー上でゲーム画面の範囲をドラッグしてください。');});
 const point=event=>{const b=preview.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(event.clientY-b.top)/b.height))};};
 preview.addEventListener('pointerdown',event=>{if(!selecting)return;selectionStart=point(event);preview.setPointerCapture(event.pointerId);});
 preview.addEventListener('pointermove',event=>{if(!selectionStart||!frame)return;const p=point(event);ctx.drawImage(frame,0,0);ctx.strokeStyle='#b8ff44';ctx.lineWidth=4;ctx.strokeRect(selectionStart.x*1536,selectionStart.y*709,(p.x-selectionStart.x)*1536,(p.y-selectionStart.y)*709);});
 preview.addEventListener('pointerup',event=>{if(!selectionStart)return;const p=point(event),a=area||{x:0,y:0,w:1,h:1},next={x:a.x+Math.min(p.x,selectionStart.x)*a.w,y:a.y+Math.min(p.y,selectionStart.y)*a.h,w:Math.abs(p.x-selectionStart.x)*a.w,h:Math.abs(p.y-selectionStart.y)*a.h};selectionStart=null;selecting=false;preview.classList.remove('is-selecting');if(isArea(next)){area=next;generation++;stable.clear();lastHash=null;sameFrames=0;save();read();}else{ctx.drawImage(frame,0,0);status('範囲が小さすぎます。もう一度指定してください。');}});
 preview.addEventListener('pointercancel',()=>{selectionStart=null;selecting=false;preview.classList.remove('is-selecting');if(frame)ctx.drawImage(frame,0,0);});
 $('area-reset').addEventListener('click',()=>{area=null;resetDefeat();generation++;stable.clear();lastHash=null;sameFrames=0;save();if(rawSource)read();});
 $('learn-kind').addEventListener('change',updateLearningOptions);
 $('learn').addEventListener('click',()=>{if(!frame||!catalog)return;const [kind,index]=$('learn-kind').value.split(':'),id=$('learn-id').value,ref=vision.learn(frame,kind,id,kind.startsWith('chip-')?Number($('learn-slot').value):Number(index)),list=kind.startsWith('chip-')?custom.chips:custom.characters;if(custom.characters.length+custom.chips.length>=500){status('見本は最大500件です。');return;}if(!list.some(r=>r.id===ref.id&&r.kind===ref.kind&&r.data===ref.data))list.push(ref);generation++;stable.clear();sameFrames=0;lastHash=null;save();read();});
 $('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,...custom,area},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='screen-reader-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('import').addEventListener('change',async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>1000000)throw Error('ファイルが大きすぎます。');const p=validateProfile(JSON.parse(await file.text()));custom={characters:p.characters,chips:p.chips};area=p.area||null;generation++;stable.clear();sameFrames=0;lastHash=null;save();if(rawSource)read();status('見本を読み込みました。');}catch(error){status(error.message);}finally{$('import').value='';}});
 window.addEventListener('new-game-reset',()=>{resetDefeat();readerSession=false;releaseParty();generation++;clearTimeout(timer);timer=null;stable.clear();lastHash=null;sameFrames=0;$('auto').checked=false;$('self').value='';$('world-sync').checked=false;monitorInfo();$('world-result').textContent='';$('result-body').replaceChildren();$('chip-result').textContent='';$('view').textContent='リセット後の読取を待っています。';status('ゲーム状態をリセットしました。次のゲーム画面を読み取ってください。');});
 window.addEventListener('mobile-ui-change',()=>{if(document.body.classList.contains('mobile-ui'))stop();});
 window.addEventListener('pagehide',stop);
 $('learn-id').addEventListener('change',updateMappingPreview);
 window.ScreenReaderController={read,stop,stabilize,validateProfile,updateDefeat};ready();
})();
