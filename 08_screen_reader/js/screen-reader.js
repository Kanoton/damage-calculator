(()=>{
 'use strict';
 const $=id=>document.getElementById('reader-'+id),video=$('video'),preview=$('preview'),ctx=preview.getContext('2d'),vision=window.ScreenReaderVision,bridge=window.ScreenReaderCharacterBridge;
 const STORAGE='astral-08-screen-reader-profile-v1';
 let stream=null,rawSource=null,frame=null,busy=false,timer=null,generation=0,selecting=false,selectionStart=null,area=null,catalog=null,custom={characters:[],chips:[]};
 const stable=new Map();let lastHash=null,sameFrames=0,stableTick=0;
 function status(text){$('status').textContent=text;}
 function isArea(a){return a&&['x','y','w','h'].every(k=>Number.isFinite(a[k]))&&a.x>=0&&a.y>=0&&a.w>=.05&&a.h>=.05&&a.x+a.w<=1.00001&&a.y+a.h<=1.00001;}
 function validateProfile(p){
  if(p?.version!==1||!Array.isArray(p.characters)||!Array.isArray(p.chips)||p.characters.length+p.chips.length>500)throw Error('見本ファイルの形式が違います。');
  const validData=r=>typeof r.data==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(r.data)&&atob(r.data).length===768;
  if(!p.characters.every(r=>catalog.characters.some(c=>c.id===r.id)&&['avatar','self','header'].includes(r.kind)&&validData(r))||!p.chips.every(r=>catalog.chips.some(c=>c.id===r.id)&&validData(r)))throw Error('見本に不正な項目があります。');
  if(p.area!==null&&p.area!==undefined&&!isArea(p.area))throw Error('読取範囲が不正です。');return p;
 }
 function save(){try{localStorage.setItem(STORAGE,JSON.stringify({version:1,...custom,area}));}catch{status('見本を保存できませんでした。ブラウザの保存領域を確認してください。');}updateReferenceStatus();}
 function updateReferenceStatus(){$('reference-status').textContent='追加した見本：キャラ '+custom.characters.length+'件／チップ '+custom.chips.length+'件';}
 function updateLearningOptions(){if(!catalog)return;const chips=$('learn-kind').value.startsWith('chip-'),items=chips?catalog.chips:catalog.characters;$('learn-slot-label').hidden=!chips;$('learn-id').replaceChildren(...items.map(row=>Object.assign(document.createElement('option'),{value:row.id,textContent:row.name})));}
 function ready(){
  catalog=bridge.catalog();if(!catalog.characters.length){setTimeout(ready,100);return;}
  for(const row of catalog.characters)$('self').append(Object.assign(document.createElement('option'),{value:row.id,textContent:row.name}));
  try{const value=localStorage.getItem(STORAGE);if(value){const p=validateProfile(JSON.parse(value));custom={characters:p.characters,chips:p.chips};area=p.area||null;}}catch{status('保存済みの見本を読み込めませんでした。初期の見本で開始します。');}
  updateLearningOptions();updateReferenceStatus();
 }
 function showFrame(source){frame=vision.normalize(source,area);ctx.drawImage(frame,0,0);$('area').disabled=false;$('learn').disabled=!catalog;}
 function drawResults(observation){
  $('result-body').replaceChildren(...observation.members.filter(m=>Number.isInteger(m.slot)).map(m=>{const tr=document.createElement('tr'),name=catalog.characters.find(c=>c.id===m.id)?.name??'未判定';for(const value of [m.slot+1,name+(m.id===observation.selfId?'（自分）':''),m.level??'—',m.currentHp===undefined&&m.maxHp===undefined?'—':(m.currentHp??'—')+'/'+(m.maxHp??'—'),m.coin??'—',['atk','def','move'].map(k=>m[k]??'—').join('／')]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}return tr;}));
  $('view').textContent=observation.view+'：今回読み取れた情報';
  const owner=catalog.characters.find(c=>c.id===observation.chipOwnerId)?.name;
  $('chip-result').textContent=observation.chipOwnerId?(owner+'のチップ：'+(observation.chipIds.map(id=>catalog.chips.find(c=>c.id===id)?.name??id).join('、')||'判定できたチップなし')):'チップの対象キャラは未判定です。';
 }
 function accept(key,value){const prior=stable.get(key);const count=prior&&prior.value===value&&prior.tick===stableTick-1?prior.count+1:1;stable.set(key,{value,count,tick:stableTick});return count>=2;}
 function stabilize(observation){
  stableTick++;
  const out={...observation,members:[],selfId:null,chipIds:[]};if(observation.selfId&&accept('self',observation.selfId))out.selfId=observation.selfId;
  for(const m of observation.members){if(!m.id)continue;const identityReady=accept('slot:'+m.slot,m.id),item={id:m.id,slot:m.slot};for(const key of ['level','currentHp','maxHp','coin','atk','def','move'])if(m[key]!==undefined&&accept(m.id+':'+key,m[key]))item[key]=m[key];if(identityReady)out.members.push(item);}
  const ownerReady=observation.chipOwnerId&&accept('chipOwner',observation.chipOwnerId),chipIds=observation.chipIds.filter(id=>accept(observation.chipOwnerId+':chip:'+id,id));if(ownerReady)out.chipIds=chipIds;else out.chipOwnerId=null;
  return out;
 }
 function frameHash(){let hash=0;for(const box of [[0,0,1536,430],[165,498,288,187],[465,324,286,184],[125,430,435,40]])for(const v of vision.feature(frame,box))hash=(hash*31+v)|0;return hash;}
 async function read(automatic=false){
  if(busy||!rawSource||!catalog||selecting)return;busy=true;$('read').disabled=true;const token=generation;
  try{
   if(stream){if(!video.videoWidth)throw Error('共有映像を待っています。');rawSource=video;}
   showFrame(rawSource);const hash=frameHash();sameFrames=hash===lastHash?sameFrames+1:0;lastHash=hash;
   if(automatic&&sameFrames>2)return;
   // Yield to paint without overlapping jobs. Stop/reset invalidates this frame.
   await new Promise(resolve=>requestAnimationFrame(resolve));if(token!==generation)return;
   const observation=vision.analyze(frame,custom);if($('self').value)observation.selfId=$('self').value;
   drawResults(observation);const result=$('apply').checked?bridge.apply(automatic?stabilize(observation):observation):{updated:0,added:0};
   const names=observation.members.filter(m=>m.id).length;
   status((automatic?'自動読取':'画面読取')+'：'+names+'人を判定／チップ '+result.added+'件追加。'+(!observation.selfId?' 自キャラが未判定の場合は「自キャラ」を指定してください。':''));
  }catch(error){status('読み取れませんでした：'+error.message);}finally{busy=false;$('read').disabled=!rawSource;}
 }
 function schedule(){clearTimeout(timer);if(!$('auto').checked||!stream)return;timer=setTimeout(async()=>{await read(true);schedule();},1200);}
 function stop(){generation++;clearTimeout(timer);timer=null;stable.clear();lastHash=null;sameFrames=0;$('auto').checked=false;$('auto').disabled=true;$('stop').disabled=true;if(stream){for(const t of stream.getTracks())t.stop();stream=null;}video.srcObject=null;rawSource=null;$('read').disabled=true;status('画面共有を停止しました。反映済みの情報は保持しています。');}
 $('connect').addEventListener('click',async()=>{
  if(!navigator.mediaDevices?.getDisplayMedia){status('このブラウザでは画面共有を開始できません。HTTPSまたはlocalhostで、PC版Chrome／Edgeを使用してください。画像読取も利用できます。');return;}
  let selected;
  try{
   // Request immediately inside the click, preserving transient activation.
   const request=navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'window',frameRate:{ideal:2,max:5}},audio:false});selected=await request;
   stop();stream=selected;const token=generation;video.srcObject=stream;
   stream.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===selected)stop();});await video.play();if(token!==generation)return;
   rawSource=video;$('read').disabled=false;$('auto').disabled=false;$('stop').disabled=false;
   status('ゲーム画面を共有中です。「画面読取」または「自動読取」を選んでください。');
  }catch(error){if(selected&&stream!==selected)selected.getTracks().forEach(t=>t.stop());status(error.name==='NotAllowedError'?'画面共有がキャンセルされました。':'画面共有を開始できませんでした：'+error.message);}
 });
 $('stop').addEventListener('click',stop);$('read').addEventListener('click',()=>{$('details').open=true;read();});
 $('auto').addEventListener('change',()=>{stable.clear();sameFrames=0;lastHash=null;if($('auto').checked){status('自動読取を開始しました。安定して判定できた情報を更新します。');read(true).then(schedule);}else{clearTimeout(timer);status('自動読取を停止しました。画面共有は継続中です。');}});
 async function loadImage(file){
  if(!file?.type.startsWith('image/'))return;if(stream)stop();generation++;const token=generation,url=URL.createObjectURL(file);
  try{const im=new Image();im.src=url;await im.decode();if(token!==generation)return;rawSource=im;$('read').disabled=false;$('details').open=true;await read();}catch(error){status('画像を開けませんでした：'+error.message);}finally{URL.revokeObjectURL(url);$('file').value='';}
 }
 $('file').addEventListener('change',()=>loadImage($('file').files[0]));
 document.addEventListener('paste',event=>{const file=[...(event.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();loadImage(file);}});
 $('new-game').addEventListener('click',()=>{generation++;clearTimeout(timer);$('auto').checked=false;stable.clear();lastHash=null;sameFrames=0;bridge.reset();$('result-body').replaceChildren();$('chip-result').textContent='';$('view').textContent='新しいゲームの読取を待っています。';status('Lv、HP、補正、取得チップを初期化し、自動読取を停止しました。次のゲームで読取を再開してください。');});
 $('self').addEventListener('change',()=>{generation++;stable.clear();sameFrames=0;lastHash=null;});
 $('apply').addEventListener('change',()=>{stable.clear();sameFrames=0;lastHash=null;});
 $('area').addEventListener('click',()=>{selecting=true;preview.classList.add('is-selecting');status('プレビュー上でゲーム画面の範囲をドラッグしてください。');});
 const point=event=>{const b=preview.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(event.clientY-b.top)/b.height))};};
 preview.addEventListener('pointerdown',event=>{if(!selecting)return;selectionStart=point(event);preview.setPointerCapture(event.pointerId);});
 preview.addEventListener('pointermove',event=>{if(!selectionStart||!frame)return;const p=point(event);ctx.drawImage(frame,0,0);ctx.strokeStyle='#b8ff44';ctx.lineWidth=4;ctx.strokeRect(selectionStart.x*1536,selectionStart.y*709,(p.x-selectionStart.x)*1536,(p.y-selectionStart.y)*709);});
 preview.addEventListener('pointerup',event=>{if(!selectionStart)return;const p=point(event),a=area||{x:0,y:0,w:1,h:1},next={x:a.x+Math.min(p.x,selectionStart.x)*a.w,y:a.y+Math.min(p.y,selectionStart.y)*a.h,w:Math.abs(p.x-selectionStart.x)*a.w,h:Math.abs(p.y-selectionStart.y)*a.h};selectionStart=null;selecting=false;preview.classList.remove('is-selecting');if(isArea(next)){area=next;generation++;stable.clear();lastHash=null;sameFrames=0;save();read();}else{ctx.drawImage(frame,0,0);status('範囲が小さすぎます。もう一度指定してください。');}});
 preview.addEventListener('pointercancel',()=>{selectionStart=null;selecting=false;preview.classList.remove('is-selecting');if(frame)ctx.drawImage(frame,0,0);});
 $('area-reset').addEventListener('click',()=>{area=null;generation++;stable.clear();lastHash=null;sameFrames=0;save();if(rawSource)read();});
 $('learn-kind').addEventListener('change',updateLearningOptions);
 $('learn').addEventListener('click',()=>{if(!frame||!catalog)return;const [kind,index]=$('learn-kind').value.split(':'),id=$('learn-id').value,ref=vision.learn(frame,kind,id,kind.startsWith('chip-')?Number($('learn-slot').value):Number(index)),list=kind.startsWith('chip-')?custom.chips:custom.characters;if(custom.characters.length+custom.chips.length>=500){status('見本は最大500件です。');return;}if(!list.some(r=>r.id===ref.id&&r.kind===ref.kind&&r.data===ref.data))list.push(ref);generation++;stable.clear();sameFrames=0;lastHash=null;save();read();});
 $('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,...custom,area},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='screen-reader-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('import').addEventListener('change',async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>1000000)throw Error('ファイルが大きすぎます。');const p=validateProfile(JSON.parse(await file.text()));custom={characters:p.characters,chips:p.chips};area=p.area||null;generation++;stable.clear();sameFrames=0;lastHash=null;save();if(rawSource)read();status('見本を読み込みました。');}catch(error){status(error.message);}finally{$('import').value='';}});
 window.addEventListener('pagehide',stop);
 window.ScreenReaderController={read,stop,stabilize,validateProfile};ready();
})();
