const {test,expect}=require('@playwright/test');
const fixture=n=>require('./fixtures/screen-reader/world-'+n+'.json').image;
async function open(page){await page.goto('/08_screen_reader/');await page.waitForFunction(()=>window.ScreenReaderCharacterBridge?.catalog().characters.length===35);}
async function read(page,n,scale=1){return page.evaluate(async({image,scale})=>{const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=im.width*scale;c.height=im.height*scale;c.getContext('2d').drawImage(im,0,0,c.width,c.height);return ScreenReaderWorldVision.analyze(ScreenReaderVision.normalize(c));},{image:fixture(n),scale});}
async function map(page){await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0003');await page.locator('#mp-difficulty').selectOption('普通');}

test('08 world: rounds and icon progress use neighbouring numbers; name and serial link HP',async({page})=>{
 await open(page);
 for(const scale of [1,.75]){
  const a=await read(page,'11',scale);expect(a.clock).toEqual({round:4,progress:4});expect(a.monsters).toEqual([{monsterId:'M0017',serial:5,currentHp:7,maxHp:7},{monsterId:'M0014',serial:null,currentHp:91,maxHp:120}]);
  expect((await read(page,'41',scale)).clock).toEqual({round:5,progress:5});const b=await read(page,'43',scale);expect(b.clock).toEqual({round:5,progress:5});expect(b.monsters).toEqual([{monsterId:'M0017',serial:7,currentHp:7,maxHp:7}]);
 }
});

test('08 world: unknown/occluded names, serials and HP are never linked by proximity alone',async({page})=>{
 await open(page);
 const observations=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const outputs=[];for(const region of [[374,228,130,28],[509,228,28,28],[409,264,41,24]]){const c=ScreenReaderVision.normalize(im),ctx=c.popupFrame.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(...region);outputs.push(ScreenReaderWorldVision.analyze(c));}return outputs;},fixture('11'));
 for(const o of observations)expect(o.monsters.some(m=>m.monsterId==='M0017')).toBe(false);
});

test('08 world: event catch-up is once-only; serials stay separate and unseen HP persists',async({page})=>{
 await open(page);await map(page);const first=await read(page,'11');
 const initial=await page.evaluate(o=>{ScreenReaderMapBridge.apply(o);return ScreenReaderMapBridge.snapshot();},first);
 expect(initial.round).toBe(4);expect(initial.progress).toBe(4);expect(initial.monsters.find(m=>m.monsterId==='M0017'&&m.serial===5).hp).toBe(7);expect(initial.monsters.find(m=>m.monsterId==='M0014').hp).toBe(91);
 const same=await page.evaluate(o=>{ScreenReaderMapBridge.apply(o);return ScreenReaderMapBridge.snapshot();},first);expect(same).toEqual(initial);
 const next=await read(page,'43');const advanced=await page.evaluate(o=>{ScreenReaderMapBridge.apply(o);return ScreenReaderMapBridge.snapshot();},next);expect(advanced.progress).toBe(5);expect(advanced.events.length).toBeGreaterThan(initial.events.length);
 const updated=await page.evaluate(()=>{ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0017',serial:7,currentHp:3,maxHp:7}]});return ScreenReaderMapBridge.snapshot();});expect(updated.monsters.find(m=>m.monsterId==='M0017'&&m.serial===7).hp).toBe(3);expect(updated.monsters.find(m=>m.monsterId==='M0017'&&m.serial===5).hp).toBe(7);expect(updated.monsters.find(m=>m.monsterId==='M0014').hp).toBe(91);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({clock:{round:5,progress:5},monsters:[]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(updated);
 await page.locator('#roster-undo').click();expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).monsters.find(m=>m.monsterId==='M0017'&&m.serial===7).hp).toBe(7);
});

test('08 world: reject conflicting IDs, max HP mismatch and stale rounds; never infer defeat from absence',async({page})=>{
 await open(page);await map(page);await page.evaluate(()=>ScreenReaderMapBridge.apply({clock:{round:5,progress:5},monsters:[{monsterId:'M0017',serial:7,currentHp:5,maxHp:7}]}));
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 for(const o of [{clock:{round:4,progress:4},monsters:[]},{monsters:[{monsterId:'M0017',serial:7,currentHp:1,maxHp:8}]},{monsters:[{monsterId:'M0017',serial:7,currentHp:1,maxHp:7},{monsterId:'M0017',serial:7,currentHp:2,maxHp:7}]},{monsters:[]}])await page.evaluate(o=>ScreenReaderMapBridge.apply(o),o);
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
});

test('08 world: only consecutive observations stabilize and actual controller applies opt-in map sync',async({page})=>{
 await open(page);await map(page);
 const o=await read(page,'11');const stabilized=await page.evaluate(world=>{const o={members:[],selfId:null,chipOwnerId:null,chipIds:[],world};return [ScreenReaderController.stabilize(o),ScreenReaderController.stabilize(o)];},o);expect(stabilized[0].world).toEqual({clock:null,monsters:[]});expect(stabilized[1].world).toEqual(o);
 await page.locator('#reader-toggle').click();await page.locator('#reader-details').evaluate(e=>e.open=true);await page.locator('#reader-world-sync').check();
 await page.locator('#reader-file').setInputFiles({name:'world.png',mimeType:'image/png',buffer:Buffer.from(fixture('11').split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');await expect(page.locator('#reader-world-result')).toContainText('進捗 4');
 expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).round).toBeNull();
 // The first applied read starts empty; choose the context after that reset.
 await page.locator('#reader-toggle').click();await page.mouse.move(0,700);await map(page);
 await page.locator('#reader-toggle').click();await page.locator('#reader-read').click();
 await expect.poll(()=>page.evaluate(()=>ScreenReaderMapBridge.snapshot().round)).toBe(4);
});

const videoLabels=require('./fixtures/screen-reader/monster-labels.json');
async function readVideoLabel(page,row,hidden){
 return page.evaluate(async({image,hidden})=>{
  const im=new Image();im.src=image;await im.decode();const source=ScreenReaderVision.normalize(im);
  if(hidden){const ctx=source.popupFrame.getContext('2d'),scale=709/im.height;ctx.fillStyle='#141414';ctx.fillRect(hidden[0]*scale-2,hidden[1]*scale-2,hidden[2]*scale+4,hidden[3]*scale+4);}
  return ScreenReaderWorldVision.analyze(source);
 },{image:require('./fixtures/screen-reader/'+row.fixture+'.json').image,hidden});
}

test('08 world: recorded video labels link exact names, serials and HP',async({page})=>{
 await open(page);
 for(const row of videoLabels){const result=await readVideoLabel(page,row);if(row.allowAbstain&&!result.monsters.length)continue;expect(result.monsters,row.fixture).toEqual(row.expected?[row.expected]:[]);}
});

test('08 world: video labels abstain when a name, individual serial or HP is hidden',async({page})=>{
 await open(page);
 for(const row of videoLabels.filter(r=>r.training)){
  for(const hidden of [row.nameBox,row.hpBox,row.serialBox].filter(Boolean))expect((await readVideoLabel(page,row,hidden)).monsters,row.fixture).toEqual([]);
 }
});

test('08 world: academy boss HP and separate guardian numbers use the existing opt-in bridge',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0004');await page.locator('#mp-difficulty').selectOption('普通');
 const boss=await readVideoLabel(page,videoLabels.find(r=>r.id==='M0020'&&r.training));
 const guardians=await Promise.all(videoLabels.filter(r=>r.id==='M0023').map(r=>readVideoLabel(page,r)));
 await page.evaluate(observations=>observations.forEach(o=>ScreenReaderMapBridge.apply(o)),[boss,...guardians]);
 let state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.monsters.find(m=>m.monsterId==='M0020').hp).toBe(86);
 expect(state.monsters.find(m=>m.monsterId==='M0023'&&m.serial===1).hp).toBe(12);expect(state.monsters.find(m=>m.monsterId==='M0023'&&m.serial===2).hp).toBe(15);
 const next=await readVideoLabel(page,videoLabels.find(r=>r.id==='M0020'&&!r.training));await page.evaluate(o=>ScreenReaderMapBridge.apply(o),next);
 state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.monsters.find(m=>m.monsterId==='M0020').hp).toBe(66);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(state);
});


test('08 world: dream boss damage and individual monster HP reach the opt-in bridge',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0001');await page.locator('#mp-difficulty').selectOption('普通');
 for(const [id,frame] of [['M0001',207],['M0003',454],['M0004',317],['M0004',140]]){
  const observation=await readVideoLabel(page,videoLabels.find(r=>r.source==='dream'&&r.id===id&&r.frame===frame));await page.evaluate(o=>ScreenReaderMapBridge.apply(o),observation);
 }
 const state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 expect(state.monsters.find(m=>m.monsterId==='M0001').hp).toBe(85);
 expect(state.monsters.find(m=>m.monsterId==='M0003'&&m.serial===1).hp).toBe(19);
 expect(state.monsters.find(m=>m.monsterId==='M0004'&&m.serial===4).hp).toBe(6);
 expect(state.monsters.find(m=>m.monsterId==='M0004'&&m.serial===1).hp).toBe(4);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(state);
});


test('08 world: ghost alley HP changes keep different box serials and unrelated monsters separate',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0006');await page.locator('#mp-difficulty').selectOption('普通');
 for(const row of videoLabels.filter(r=>r.source==='ghost'&&r.training))await page.evaluate(o=>ScreenReaderMapBridge.apply(o),await readVideoLabel(page,row));
 let state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 for(const [id,serial,hp] of [['M0037',3,8],['M0038',1,16],['M0039',1,22],['M0040',2,8],['M0041',1,26]])expect(state.monsters.find(m=>m.monsterId===id&&m.serial===serial).hp).toBe(hp);
 for(const row of videoLabels.filter(r=>r.source==='ghost'&&!r.training))await page.evaluate(o=>ScreenReaderMapBridge.apply(o),await readVideoLabel(page,row));
 state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.monsters.find(m=>m.monsterId==='M0041'&&m.serial===1).hp).toBe(23);
 expect(state.monsters.find(m=>m.monsterId==='M0037'&&m.serial===3).hp).toBe(8);expect(state.monsters.find(m=>m.monsterId==='M0037'&&m.serial===7).hp).toBe(8);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(state);
});


test('08 world: library native and shared monster labels update individual HP',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0104');await page.locator('#mp-difficulty').selectOption('普通');
 for(const row of videoLabels.filter(r=>r.source==='library'&&r.id!=='M0115'))await page.evaluate(o=>ScreenReaderMapBridge.apply(o),await readVideoLabel(page,row));
 const state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 for(const [id,serial,hp] of [['M0117',2,17],['M0117',3,17],['M0119',2,13],['M0118',1,14],['M0118',2,12],['M0024',1,12]])expect(state.monsters.find(m=>m.monsterId===id&&m.serial===serial).hp).toBe(hp);
 await page.locator('#reader-toggle').click();await page.locator('#reader-details').evaluate(e=>e.open=true);await page.locator('#reader-world-sync').check();
 const row=videoLabels.find(r=>r.source==='library'&&r.id==='M0117');const image=require('./fixtures/screen-reader/'+row.fixture+'.json').image;
 await page.locator('#reader-file').setInputFiles({name:'library.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});await expect(page.locator('#reader-world-result')).toContainText('看守');
});

test('08 world: warden truth requires matching HP and persists through absence or old ordinary labels; undo restores the form',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0104');await page.locator('#mp-difficulty').selectOption('普通');
 await page.evaluate(o=>ScreenReaderMapBridge.apply(o),await readVideoLabel(page,videoLabels.find(r=>r.source==='library'&&r.id==='M0116')));
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(before.monsters.filter(m=>m.monsterId==='M0116')).toHaveLength(1);expect(before.monsters.find(m=>m.monsterId==='M0116').hp).toBe(8);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0115',serial:null,currentHp:200,maxHp:230}]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
 const truth=await readVideoLabel(page,videoLabels.find(r=>r.source==='library'&&r.id==='M0115'));await page.evaluate(o=>ScreenReaderMapBridge.apply(o),truth);
 const state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.monsters.some(m=>m.monsterId==='M0116')).toBe(false);expect(state.monsters.find(m=>m.monsterId==='M0115').hp).toBe(228);
 for(const o of [{monsters:[]},{monsters:[{monsterId:'M0116',serial:null,currentHp:8,maxHp:9}]}])await page.evaluate(o=>ScreenReaderMapBridge.apply(o),o);
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(state);await page.locator('#roster-undo').click();expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
});

test('08 world: shared names still reject maps without the registered relation',async({page})=>{
 await open(page);await map(page);const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 const wizard=await readVideoLabel(page,videoLabels.find(r=>r.source==='library'&&r.id==='M0024'&&r.training));await page.evaluate(o=>ScreenReaderMapBridge.apply(o),wizard);expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
});


test('08 world: visible monitor diagnostics distinguish disabled reading and preview from detection',async({page})=>{
 await open(page);await page.locator('#reader-toggle').click();
 await expect(page.locator('#reader-monitor-info')).toContainText('OFF');
 await expect(page.locator('#reader-monitor-info')).toContainText('29種類');
 await expect(page.locator('#reader-interval')).toHaveValue('250');
 await expect(page.locator('#reader-world-sync')).toBeVisible();
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 await page.locator('#reader-world-sync').check();await page.locator('#reader-details').evaluate(e=>e.open=true);await page.locator('#reader-apply').uncheck();
 await page.locator('#reader-file').setInputFiles({name:'world.png',mimeType:'image/png',buffer:Buffer.from(fixture('11').split(',')[1],'base64')});
 await expect(page.locator('#reader-monitor-info')).toContainText('今回 2体');
 await expect(page.locator('#reader-monitor-info')).toContainText('確認のみ');
 await expect(page.locator('#reader-monitor-info')).toContainText('処理');
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
});

test('08 world: automatic capture resumes for tiny map-only changes after a static screen',async({page})=>{
 await open(page);await page.locator('#reader-toggle').click();await page.locator('#reader-world-sync').check();await page.locator('#reader-interval').selectOption('250');
 await page.evaluate(async image=>{
  const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=1536;c.height=709;c.getContext('2d').drawImage(im,0,0);
  window.testCaptureCanvas=c;window.testCapture=c.captureStream(10);window.testWorldReads=0;
  const analyze=ScreenReaderWorldVision.analyze;ScreenReaderWorldVision.analyze=(...args)=>{testWorldReads++;return analyze(...args);};
  navigator.mediaDevices.getDisplayMedia=async options=>{window.testCaptureOptions=options;return testCapture;};
 },fixture('11'));
 await page.locator('#reader-connect').click();await page.locator('#reader-auto').check();
 await expect(page.locator('#reader-monitor-info')).toContainText('画面変化待ち',{timeout:15000});
 const count=await page.evaluate(()=>testWorldReads);
 // This small pixel change is invisible to all coarse hash samples and the HUD.
 const coarseUnchanged=await page.evaluate(()=>{
  const boxes=[[0,0,1536,709],[165,498,288,187],[465,324,286,184],[125,430,435,40]];
  const features=()=>JSON.stringify(boxes.map(b=>Array.from(ScreenReaderVision.feature(testCaptureCanvas,b))));
  const before=features();testCaptureCanvas.getContext('2d').fillStyle='#ffffff';testCaptureCanvas.getContext('2d').fillRect(1001,301,2,2);return before===features();
 });
 expect(coarseUnchanged).toBe(true);
 await expect.poll(()=>page.evaluate(()=>testWorldReads),{timeout:10000}).toBeGreaterThan(count);
 await expect(page.locator('#reader-monitor-info')).toContainText('実間隔');
 expect(await page.evaluate(()=>testCaptureOptions.video.frameRate)).toEqual({ideal:5,max:10});
 await page.locator('#reader-stop').click();expect(await page.evaluate(()=>testCapture.getTracks().every(t=>t.readyState==='ended'))).toBe(true);
});

test('08 world: Dream ship shark label records number and HP; two explicit zero HP observations are applied together with undo',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0001');await page.locator('#mp-difficulty').selectOption('狂気');
 const shark=await readVideoLabel(page,videoLabels.find(r=>r.id==='M0002'));
 expect(shark.monsters).toEqual([{monsterId:'M0002',serial:1,currentHp:15,maxHp:22}]);
 const pirate={monsterId:'M0004',serial:9,currentHp:10,maxHp:10};
 await page.evaluate(o=>ScreenReaderMapBridge.apply(o),{monsters:[...shark.monsters,pirate]});
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 expect(before.monsters.find(m=>m.monsterId==='M0002'&&m.serial===1)?.hp).toBe(15);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
 // Explicit zero-HP input is synthetic: the video disappearance itself is not a death signal.
 await page.evaluate(o=>ScreenReaderMapBridge.apply(o),{monsters:[...shark.monsters,pirate].map(m=>({...m,currentHp:0}))});
 const after=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 for(const [id,serial] of [['M0002',1],['M0004',9]])expect(after.monsters.find(m=>m.monsterId===id&&m.serial===serial)?.defeated).toBe(true);
 await page.locator('#roster-undo').click();expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
});

test('08 world: observed serials do not consume phantom numbers and progress events do not duplicate observed spawns',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0001');await page.locator('#mp-difficulty').selectOption('狂気');
 const o={clock:{round:9,progress:9},monsters:[{monsterId:'M0004',serial:4,currentHp:10,maxHp:10},{monsterId:'M0004',serial:2,currentHp:8,maxHp:10}]};
 await page.evaluate(o=>ScreenReaderMapBridge.apply(o),o);
 const first=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(first.monsters.map(m=>[m.monsterId,m.serial])).toEqual([['M0004',4],['M0004',2]]);
 await page.evaluate(o=>ScreenReaderMapBridge.apply(o),o);expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(first);
 await page.locator('#mp-tab-monsters').click();await page.locator('.mp-monster[data-id="M0004"]').click();
 const after=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(after.monsters.filter(m=>m.monsterId==='M0004').map(m=>m.serial)).toEqual([4,2,5]);
});

test('08 world: first sighting at zero HP is held, while a previously observed alive serial can be defeated and undone',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0001');await page.locator('#mp-difficulty').selectOption('狂気');
 const zero={monsters:[{monsterId:'M0004',serial:3,currentHp:0,maxHp:10}]};
 const rejected=await page.evaluate(o=>ScreenReaderMapBridge.apply(o),zero);expect(rejected.skipped).toBe(1);expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).monsters).toEqual([]);
 await page.locator('#mp-tab-monsters').click();await page.locator('.mp-monster[data-id="M0004"]').click();
 const manualBefore=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0004',serial:1,currentHp:0,maxHp:10}]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(manualBefore);
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0004',serial:1,currentHp:5,maxHp:10}]}));const alive=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0004',serial:1,currentHp:0,maxHp:10}]}));expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).monsters[0].defeated).toBe(true);
 await page.locator('#roster-undo').click();expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(alive);
});

test('08 world: complete labels below the old scan limit are readable while edge-clipped HP abstains',async({page})=>{
 await open(page);
 const results=await page.evaluate(async image=>{
  const im=new Image();im.src=image;await im.decode();const src=ScreenReaderVision.normalize(im).popupFrame;
  return [625,655].map(y=>{const c=document.createElement('canvas');c.width=1536;c.height=709;const ctx=c.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(0,0,1536,709);ctx.drawImage(src,370,225,170,70,650,y,170,70);return ScreenReaderWorldVision.analyze(c).monsters;});
 },fixture('11'));
 expect(results[0]).toEqual([{monsterId:'M0017',serial:5,currentHp:7,maxHp:7}]);expect(results[1]).toEqual([]);
});

test('08 world: image HP zero candidates never defeat an observed living shark at either polling speed',async({page})=>{
 await open(page);await page.locator('#reader-toggle').click();
 await page.locator('#reader-file').setInputFiles({name:'world.png',mimeType:'image/png',buffer:Buffer.from(fixture('11').split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');
 await page.locator('#mp-map-select').evaluate(el=>{el.value='MAP0001';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('#mp-difficulty').evaluate(el=>{el.value='狂気';el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.evaluate(()=>{ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0004',serial:3,currentHp:10,maxHp:10}]});window.zeroReadCount=0;ScreenReaderWorldVision.analyze=()=>{zeroReadCount++;return {clock:null,monsters:[{monsterId:'M0004',serial:3,currentHp:0,maxHp:10}]};};const normalize=ScreenReaderVision.normalize;let tick=0;ScreenReaderVision.normalize=(...args)=>{const c=normalize(...args);for(const src of [c,c.popupFrame]){const ctx=src.getContext('2d');ctx.fillStyle='rgb('+(++tick)+',0,0)';ctx.fillRect(1001,301,2,2);}return c;};});
 for(const speed of ['500','250']){
  await page.locator('#reader-interval').selectOption(speed);const before=await page.evaluate(()=>zeroReadCount);
  for(let i=0;i<4;i++)await page.evaluate(()=>ScreenReaderController.read(true));
  expect(await page.evaluate(()=>zeroReadCount)).toBe(before+4);
  const shark=await page.evaluate(()=>ScreenReaderMapBridge.snapshot().monsters.find(m=>m.monsterId==='M0004'&&m.serial===3));expect(shark.hp).toBe(10);expect(shark.defeated).toBe(false);
 }
 await expect(page.locator('#reader-world-result')).toContainText('撃破未確認');
 // Explicit non-image updates still support confirmed zero and Undo.
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0004',serial:3,currentHp:0,maxHp:10}]}));expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot().monsters.find(m=>m.monsterId==='M0004'&&m.serial===3).defeated)).toBe(true);
});

const startupFixture=n=>require('./fixtures/screen-reader/'+n+'.json').image;
async function startupRead(page,name){return page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const source=ScreenReaderVision.normalize(im);return {setup:ScreenReaderStartVision.analyze(source),...ScreenReaderWorldVision.analyze(source)};},startupFixture(name));}

test('08 world: explicit replay map and difficulty are independent from the previous result round',async({page})=>{
 await open(page);
 for(const name of ['start-dream-result','start-dream-result-held']){const result=await startupRead(page,name);expect(result.setup).toEqual({map:'MAP0001',difficulty:'狂気'});expect(result.clock).toBeNull();expect(result.monsters).toEqual([]);}
 expect((await startupRead(page,'start-dream-loading')).setup).toBeNull();
 const hud=await startupRead(page,'start-dream-hud');expect(hud.setup).toBeNull();expect(hud.clock).toEqual({round:1,progress:1});
 // Either explicit text being absent must prevent a context guess.
 for(const box of [[357,646,539,49],[1049,657,72,35]]){
  const result=await page.evaluate(async({image,box})=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im);c.getContext('2d').clearRect(...box);return ScreenReaderStartVision.analyze(c);},{image:startupFixture('start-dream-result'),box});expect(result).toBeNull();
 }
});

test('08 world: replay startup fills unknown context, respects manual choices and catches up the first event once',async({page})=>{
 await open(page);const setup=(await startupRead(page,'start-dream-result')).setup,hud=await startupRead(page,'start-dream-hud');
 await page.evaluate(setup=>{ScreenReaderMapBridge.resetForReader();ScreenReaderMapBridge.configure(setup);},setup);
 let state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.map).toBe('MAP0001');expect(state.difficulty).toBe('狂気');expect(state.round).toBeNull();expect(state.events).toEqual([]);
 await page.evaluate(hud=>ScreenReaderMapBridge.apply(hud,{allowDefeat:false}),hud);state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.round).toBe(1);expect(state.progress).toBe(1);expect(state.events.length).toBeGreaterThan(0);expect(state.monsters).toEqual([]);
 await page.evaluate(hud=>ScreenReaderMapBridge.apply(hud,{allowDefeat:false}),hud);expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(state);
 await page.evaluate(()=>ScreenReaderMapBridge.resetForReader());await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0003');await page.locator('#mp-difficulty').selectOption('普通');
 expect(await page.evaluate(setup=>ScreenReaderMapBridge.configure(setup),setup)).toBe(false);state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.map).toBe('MAP0003');expect(state.difficulty).toBe('普通');
});

test('08 world: replay shark 3 retains its complete HP through camera motion',async({page})=>{
 await open(page);await page.evaluate(()=>{ScreenReaderMapBridge.resetForReader();ScreenReaderMapBridge.configure({map:'MAP0001',difficulty:'狂気'});});
 // Real sampled frames: the 1 in 10/10 moves left of the old x=270 scan edge.
 const names=[59,60,61,66,67,82];
 for(const n of names){const raw=await startupRead(page,'replay-shark3-'+n);const expected={monsterId:'M0004',serial:3,currentHp:10,maxHp:10};if(n===60)expect(raw.monsters.every(m=>JSON.stringify(m)===JSON.stringify(expected))).toBe(true);else expect(raw.monsters).toEqual([expected]);await page.evaluate(raw=>{const accepted=ScreenReaderController.stabilize({members:[],chipIds:[],world:raw});ScreenReaderMapBridge.apply(accepted.world,{allowDefeat:false});},raw);}
 const state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.monsters).toHaveLength(1);expect(state.monsters[0]).toMatchObject({monsterId:'M0004',serial:3,hp:10,defeated:false});
});

test('08 world: automatic reader takes explicit setup then the first live event without manual map input',async({page})=>{
 await open(page);await page.locator('#reader-toggle').click();await page.locator('#reader-details').evaluate(e=>e.open=true);
 // Seed a source without applying; the following automatic read must reset it.
 await page.locator('#reader-apply').uncheck();await page.locator('#reader-file').setInputFiles({name:'result.png',mimeType:'image/png',buffer:Buffer.from(startupFixture('start-dream-result').split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');await page.locator('#reader-apply').check();
 await page.evaluate(async()=>{await ScreenReaderController.read(true);await ScreenReaderController.read(true);});
 let state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.map).toBe('MAP0001');expect(state.difficulty).toBe('狂気');expect(state.round).toBeNull();expect(state.events).toEqual([]);
 await page.locator('#reader-file').setInputFiles({name:'hud.png',mimeType:'image/png',buffer:Buffer.from(startupFixture('start-dream-hud').split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');
 state=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(state.round).toBe(1);expect(state.progress).toBe(1);expect(state.events.length).toBeGreaterThan(0);
 await page.locator('#reader-file').setInputFiles({name:'shark.png',mimeType:'image/png',buffer:Buffer.from(startupFixture('replay-shark3-66').split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');
 const after=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(after.monsters).toHaveLength(1);expect(after.monsters[0]).toMatchObject({monsterId:'M0004',serial:3,hp:10,defeated:false});expect(after.events).toEqual(state.events);
});

test('08 world: late observations display same-species serials numerically while preserving card identity and undo',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0001');await page.locator('#mp-difficulty').selectOption('狂気');await page.locator('#mp-tab-monsters').click();
 const observation=serials=>({monsters:serials.map(serial=>({monsterId:'M0004',serial,currentHp:10,maxHp:10}))});
 await page.evaluate(o=>ScreenReaderMapBridge.apply(o),observation([4,2,10]));
 const cards=page.locator('#map-roster-list .roster-select'),labels=serials=>serials.map(n=>'海賊サメ '+n+'を計算機に登録');
 await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([2,4,10]));
 await page.getByRole('button',{name:'海賊サメ 4を計算機に登録',exact:true}).press('Enter');const selected=await page.locator('#map-roster-list .roster-card.selected').getAttribute('data-instance-id');
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());await page.evaluate(o=>ScreenReaderMapBridge.apply(o),observation([1]));
 await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([1,2,4,10]));expect(await page.locator('#map-roster-list .roster-card.selected').getAttribute('data-instance-id')).toBe(selected);
 const after=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(after.monsters.slice(0,3)).toEqual(before.monsters);
 await page.getByRole('button',{name:'海賊サメ 4を撃破',exact:true}).click();await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([1,2,10,4]));await expect(page.locator('#map-roster-list .roster-card.defeated')).toHaveCount(1);
 await page.locator('#roster-undo').click();await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([1,2,4,10]));await expect(page.locator('#map-roster-list .roster-card.defeated')).toHaveCount(0);
});

test('08 world: fast-changing monster HP follows a confirmed name and serial without requiring repeated HP',async({page})=>{
 await open(page);
 const values=await page.evaluate(()=>[10,9,8,7].map(hp=>ScreenReaderController.stabilize({members:[],chipIds:[],world:{clock:null,monsters:[{monsterId:'M0004',serial:3,currentHp:hp,maxHp:10}]}}).world.monsters));
 expect(values[0]).toEqual([]);expect(values.slice(1).map(ms=>ms[0].currentHp)).toEqual([9,8,7]);
});

const generatedMapText=require('./fixtures/screen-reader/map-text-generated.json');
test('08 world: room text resolves registered maps and difficulties independently',async({page})=>{
 await open(page);
 // These font-rendered combinations verify coverage/wiring, not live-game accuracy.
 const results=await page.evaluate(async({room,cases})=>{
  const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
  const base=await load(room),out=[];
  for(const map of cases.maps)for(const difficulty of cases.difficulties){
   const c=ScreenReaderVision.normalize(base),ctx=c.getContext('2d');
   ctx.fillStyle='black';ctx.fillRect(340,242,280,41);ctx.fillRect(350,330,270,40);
   ctx.drawImage(await load(map.image),360,242,240,41);ctx.drawImage(await load(difficulty.image),360,330,240,40);
   out.push({expected:{map:map.id,difficulty:difficulty.id},actual:ScreenReaderStartVision.analyze(c)});
  }return out;
 },{room:startupFixture('start-autumn-room'),cases:generatedMapText});
 expect(results).toHaveLength(36);for(const row of results)expect(row.actual).toEqual(row.expected);
});

test('08 world: autumn room requires both labelled fields and protects manual context',async({page})=>{
 await open(page);const setup=(await startupRead(page,'start-autumn-room')).setup;
 expect(setup).toEqual({map:'MAP0105',difficulty:'困難'});
 for(const box of [[340,242,280,41],[350,330,270,40],[205,242,96,41],[205,330,96,40]]){
  const got=await page.evaluate(async({image,box})=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im);c.getContext('2d').clearRect(...box);return ScreenReaderStartVision.analyze(c);},{image:startupFixture('start-autumn-room'),box});expect(got).toBeNull();
 }
 const stability=await page.evaluate(setup=>{const o={members:[],chipIds:[],setup};return [ScreenReaderController.stabilize(o).setup,ScreenReaderController.stabilize(o).setup];},setup);expect(stability).toEqual([null,setup]);
 const unknown=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im),ctx=c.getContext('2d');ctx.fillStyle='black';ctx.fillRect(340,242,280,41);ctx.fillStyle='white';ctx.font='25px monospace';ctx.fillText('UNKNOWN',400,273);return ScreenReaderStartVision.analyze(c);},startupFixture('start-autumn-room'));expect(unknown).toBeNull();
 await page.evaluate(()=>ScreenReaderMapBridge.resetForReader());
 expect(await page.evaluate(o=>ScreenReaderMapBridge.configure(o),setup)).toBe(true);
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toMatchObject(setup);
 await page.evaluate(()=>ScreenReaderMapBridge.resetForReader());await map(page);
 expect(await page.evaluate(o=>ScreenReaderMapBridge.configure(o),setup)).toBe(false);
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toMatchObject({map:'MAP0003',difficulty:'普通'});
});


test('08 world: replay printed map is independent of all four difficulty words',async({page})=>{
 await open(page);
 const results=await page.evaluate(async({room,cases})=>{
  const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
  const base=await load(room),out=[];
  for(const row of cases){
   const c=ScreenReaderVision.normalize(base),ctx=c.getContext('2d'),token=document.createElement('canvas');token.width=240;token.height=42;const tc=token.getContext('2d');tc.drawImage(await load(row.image),0,0);const p=tc.getImageData(0,0,240,42);
   for(let i=0;i<p.data.length;i+=4){const ink=p.data[i]>215;p.data[i]=ink?255:20;p.data[i+1]=ink?50:20;p.data[i+2]=ink?140:20;}
   tc.putImageData(p,0,0);ctx.drawImage(token,970,652);out.push(ScreenReaderStartVision.analyze(c));
  }return out;
 },{room:startupFixture('start-dream-result'),cases:generatedMapText.difficulties});
 expect(results).toEqual(generatedMapText.difficulties.map(r=>({map:'MAP0001',difficulty:r.id})));
});

const resultBanner=require('./fixtures/screen-reader/result-banner-synthetic.json');
const realResultBanner=require('./fixtures/screen-reader/result-banner-autumn-real.json');
test('08 world: result banner rejects its pale background and nearby decorations',async({page})=>{
 await open(page);
 // Error diagnostics use the same source with private helpers exposed only in
 // this isolated test page; no diagnostic API is added to the application.
 const debugSource=require('fs').readFileSync(require('path').join(__dirname,'../08_screen_reader/js/screen-reader-start.js'),'utf8').replace('{analyze,readRound}','{analyze,readRound,word,textPixels}').replace('const ranked=[...scores].sort((a,b)=>a[1]-b[1]);','const ranked=[...scores].sort((a,b)=>a[1]-b[1]);window.__wordRanks=ranked.slice(0,2);');
 await page.addScriptTag({content:debugSource});
 for(const scale of [1,.75]){
  const result=await page.evaluate(async({image,scale})=>{const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);const source=ScreenReaderVision.normalize(c);const setup=ScreenReaderStartVision.analyze(source);let debug=null;
   if(!setup){const text=ScreenReaderStartReferences.text,maps=text.maps.filter(r=>r.nameOnly),v=ScreenReaderStartVision,box=[357,647,680,45];const check=(box,kind,refs,coverage=0)=>{const {mask}=v.textPixels(source,box,kind),w=box[2];let left=w,right=0,top=box[3],bottom=0;for(let i=0;i<mask.length;i++)if(mask[i]){left=Math.min(left,i%w);right=Math.max(right,i%w+1);top=Math.min(top,Math.floor(i/w));bottom=Math.max(bottom,Math.floor(i/w)+1);}window.__wordRanks=null;const value=v.word(source,box,kind,refs,coverage);return {box,bounds:[left,top,right,bottom],value,ranks:window.__wordRanks};};
    const {mask}=v.textPixels(source,box,'result-white'),cols=new Uint16Array(680),candidates=[];for(let i=0;i<mask.length;i++)cols[i%680]+=mask[i];let start=null;for(let x=0;x<=680;x++){if(x<680&&cols[x]>=2){if(start===null)start=x;continue;}if(start!==null&&x-start>=7&&x-start<=24&&start>70&&start<600)candidates.push({name:check([357,647,start-2,45],'result-white',maps),suffix:check([357+start-2,647,682-start,45],'result-white',text.suffixes),nameCovered:check([357,647,start-2,45],'result-white',maps,.75),suffixCovered:check([357+start-2,647,682-start,45],'result-white',text.suffixes,.75)});start=null;}
    debug={difficulty:check([1050,656,74,33],'pink',text.difficulties),candidates};}
   return {setup,debug,world:ScreenReaderWorldVision.analyze(source),failedImage:setup?null:source.toDataURL()};},{image:resultBanner.image,scale});
  if(result.failedImage){const path=test.info().outputPath('result-banner-scale-'+scale+'.png');require('fs').writeFileSync(path,Buffer.from(result.failedImage.split(',')[1],'base64'));await test.info().attach('result-banner',{path,contentType:'image/png'});}
  expect(result.setup,'scale='+scale+' '+JSON.stringify(result.debug)).toEqual(resultBanner.expected);expect(result.world.clock).toBeNull();expect(result.world.monsters).toEqual([]);
 }
 const suffix=resultBanner.regions.qualifier;
 for(const box of [resultBanner.regions.map,resultBanner.regions.difficulty,[suffix[0]+70,suffix[1],150,suffix[3]]]){
  const got=await page.evaluate(async({image,box})=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im);c.getContext('2d').clearRect(...box);return ScreenReaderStartVision.analyze(c);},{image:resultBanner.image,box});expect(got).toBeNull();
 }
});

test('08 world: result banner separates registered name lengths from the observed qualifier',async({page})=>{
 await open(page);
 const results=await page.evaluate(async({image,qualifier,cases})=>{
  const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
  const base=await load(image),suffix=ScreenReaderVision.normalize(await load(qualifier)),out=[];
  for(const map of cases.maps)for(const difficulty of cases.difficulties){
   const c=ScreenReaderVision.normalize(base),ctx=c.getContext('2d');ctx.fillStyle='rgb(235,40,140)';ctx.fillRect(357,647,680,45);
   const token=document.createElement('canvas');token.width=240;token.height=42;const tc=token.getContext('2d');tc.drawImage(await load(map.image),0,0);let p=tc.getImageData(0,0,240,42),left=240,right=0,top=42,bottom=0;
   for(let i=0;i<240*42;i++)if(p.data[i*4]>215){const x=i%240,y=Math.floor(i/240);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
   const width=(right-left)/(bottom-top)*38;ctx.drawImage(token,left,top,right-left,bottom-top,362,651,width,38);ctx.drawImage(suffix,508,650,370,38,Math.ceil(362+width)+7,651,370,38);
   tc.clearRect(0,0,240,42);tc.drawImage(await load(difficulty.image),0,0);p=tc.getImageData(0,0,240,42);for(let i=0;i<p.data.length;i+=4){const ink=p.data[i]>215;p.data[i]=ink?255:20;p.data[i+1]=ink?50:20;p.data[i+2]=ink?140:20;}tc.putImageData(p,0,0);
   ctx.save();ctx.beginPath();ctx.rect(1050,656,74,38);ctx.clip();ctx.drawImage(token,970,652);ctx.restore();
   out.push({expected:{map:map.id,difficulty:difficulty.id},actual:ScreenReaderStartVision.analyze(c)});
  }return out;
 },{image:resultBanner.image,qualifier:startupFixture('start-dream-result'),cases:generatedMapText});
 expect(results).toHaveLength(36);for(const row of results)expect(row.actual).toEqual(row.expected);
});

for(const [name,banner] of [['synthetic',resultBanner],['real autumn',realResultBanner]])test('08 world: result banner '+name+' configures the reader without importing the previous round',async({page})=>{
 await open(page);await page.locator('#reader-toggle').click();await page.locator('#reader-details').evaluate(e=>e.open=true);
 await page.locator('#reader-apply').uncheck();await page.locator('#reader-file').setInputFiles({name:'result.png',mimeType:'image/png',buffer:Buffer.from(banner.image.split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');await page.locator('#reader-apply').check();
 await page.evaluate(async()=>{await ScreenReaderController.read(true);await ScreenReaderController.read(true);});
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toMatchObject({map:'MAP0105',difficulty:'困難',round:null,progress:null,events:[],monsters:[]});
});


test('08 world: result banner from the actual autumn screenshot survives rescaling and rejects missing fields',async({page})=>{
 await open(page);
 for(const scale of [1,.75,1.25]){
  const actual=await page.evaluate(async({image,scale})=>{
   const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
   return ScreenReaderStartVision.analyze(ScreenReaderVision.normalize(c));
  },{image:realResultBanner.image,scale});
  expect(actual,'real screenshot scale='+scale).toEqual(realResultBanner.expected);
 }
 for(const box of [[357,647,197,45],[1050,656,74,38],[600,647,150,45]]){
  const actual=await page.evaluate(async({image,box})=>{
   const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im);c.getContext('2d').clearRect(...box);return ScreenReaderStartVision.analyze(c);
  },{image:realResultBanner.image,box});expect(actual).toBeNull();
 }
});

const autumnLive=require('./fixtures/screen-reader/autumn-live-sequence.json');
test('08 world: short autumn replay confirms three owls and one dinosaur at quarter-second sampling',async({page})=>{
 await open(page);
 const results=await page.evaluate(async samples=>{
  const observations=[];for(const row of samples){const im=new Image();im.src=row.image;await im.decode();observations.push(ScreenReaderWorldVision.analyze(ScreenReaderVision.normalize(im)));}return observations;
 },autumnLive.samples);
 for(let i=0;i<results.length;i++)expect(results[i].monsters,'sample '+(i+1)).toEqual(autumnLive.samples[i].expected?[autumnLive.samples[i].expected]:[]);
 const run=async step=>page.evaluate(({observations,step})=>{
  document.getElementById('reader-new-game').click();ScreenReaderMapBridge.configure({map:'MAP0105',difficulty:'困難'});
  for(let i=0;i<observations.length;i+=step){const accepted=ScreenReaderController.stabilize({members:[],selfId:null,chipOwnerId:null,chipIds:[],world:observations[i]});ScreenReaderMapBridge.apply(accepted.world,{allowDefeat:false});}
  return ScreenReaderMapBridge.snapshot();
 },{observations:results,step});
 // This observed phase at 500ms reproduces the user's owl-3-only result.
 const slow=await run(2);expect(slow.monsters.map(m=>[m.monsterId,m.serial])).toEqual([['M0123',3]]);
 const fast=await run(1);expect(fast).toMatchObject({round:1,progress:1});
 expect(fast.monsters.map(m=>[m.monsterId,m.serial,m.hp])).toEqual([['M0123',1,9],['M0123',2,9],['M0123',3,9],['M0122',1,22]]);
});

const defeatFolder='tests/fixtures/screen-reader/defeat/autumn-reviewed-20261019';
const defeatManifest=require('./fixtures/screen-reader/defeat/autumn-reviewed-20261019/manifest.json');
async function defeatFrame(page,snap,time,options={}){
 const image='data:image/webp;base64,'+require('fs').readFileSync(require('path').join(defeatFolder,snap.image)).toString('base64');
 return page.evaluate(async({image,time,options})=>{const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=2560;c.height=1440;const ctx=c.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,640+(options.shift||0),360);if(options.capture)return c.toDataURL('image/png');const frame=ScreenReaderVision.normalize(c);
  if(!options.identity)return window.defeatTestTracker.step(frame,time);
  const world=ScreenReaderWorldVision.analyze(frame,{positions:true});
  if(options.alive)world.monsters=options.alive;
  if(options.ambiguous&&world.monsters[0])world.monsters.push({...world.monsters[0],serial:99});
  if(options.unlocated&&world.monsters[0])world.monsters.push({...world.monsters[0],serial:99,marker:null});
  if(options.controller){ScreenReaderMapBridge.apply(world,{allowDefeat:false});return {world,cues:ScreenReaderController.updateDefeat(frame,time,world)};}
  return {world,cues:window.defeatTestTracker.step(frame,time,world.monsters)};
 },{image,time,options});
}
test('08 autumn defeat cues: partial gray patches then beam; spawn, absence and unknown serial never defeat a roster individual',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0105');await page.getByRole('button',{name:'3 のイベントを実行',exact:true}).click();
 const initial=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());
 for(const sample of defeatManifest.samples){
  await page.evaluate(()=>window.defeatTestTracker=ScreenReaderDefeatVision.createTracker());const output=[];
  for(const snap of sample.snapshots){const cues=await defeatFrame(page,snap,snap.source_pts_s*1000);if(snap.phase==='before'||snap.phase==='gray')expect(cues,sample.id+' '+snap.phase).toEqual([]);output.push(...cues);}
  // Including the moving camera/overlaid boss text: identify only a species, never a guessed boss or serial.
  require('fs').mkdirSync('artifacts',{recursive:true});require('fs').writeFileSync('artifacts/defeat-'+test.info().project.name+'-'+sample.id+'.json',JSON.stringify(output,null,2));
  expect(output.map(c=>[c.monsterId,c.serial]),sample.id).toEqual(sample.expected_event==='defeat'?[[sample.monster_id,null]]:[]);
 }
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(initial);
 // Gray by itself, stale frames and a beam in a new independent capture are insufficient.
 const sample=defeatManifest.samples[0],gray=sample.snapshots.find(s=>s.phase==='gray'),beam=sample.snapshots.find(s=>s.phase==='beam');
 for(const gap of [0,2000]){await page.evaluate(()=>window.defeatTestTracker=ScreenReaderDefeatVision.createTracker());await defeatFrame(page,gray,100);expect(await defeatFrame(page,beam,100+gap)).toEqual([]);}
 await page.evaluate(()=>window.defeatTestTracker=ScreenReaderDefeatVision.createTracker());expect(await defeatFrame(page,beam,100)).toEqual([]);
});

const identitySample=defeatManifest.samples.find(s=>s.id==='dinosaur-1');
// Temporal contract: hold the real before image for two captures, then replay
// actual gray/beam/after frames. Not a claim of full-video or 4fps accuracy.
const identitySequence=[{...identitySample.snapshots[0],source_pts_s:identitySample.snapshots[0].source_pts_s-.2},...identitySample.snapshots];
test('08 autumn defeat automatic: unchanged-frame waiting keeps observed identities fresh',async({page})=>{
 await open(page);await page.locator('#reader-toggle').click();
 const image=await defeatFrame(page,identitySequence[0],0,{capture:true});
 await page.locator('#reader-file').setInputFiles({name:'held-map.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');
 await page.locator('#mp-map-select').evaluate(e=>{e.value='MAP0105';e.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#mp-difficulty').evaluate(e=>{e.value='普通';e.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.evaluate(()=>{window.heldWorldReads=[];const analyze=ScreenReaderWorldVision.analyze;ScreenReaderWorldVision.analyze=(frame,...options)=>{const world=analyze(frame,...options);heldWorldReads.push(world);return world;};});
 await page.evaluate(()=>{window.readerTestNow=1000;Object.defineProperty(performance,'now',{configurable:true,value:()=>readerTestNow});});
 for(let i=0;i<8;i++)await page.evaluate(async time=>{readerTestNow=time;await ScreenReaderController.read(true);},1000+i*500);
 await expect(page.locator('#reader-monitor-info')).toContainText('画面変化待ち');
 const held=await page.evaluate(()=>heldWorldReads);expect(held.at(-1).monsters.find(m=>m.monsterId==='M0122'),JSON.stringify(held)).toMatchObject({serial:2,marker:expect.any(Array)});
 for(const [snap,time] of [[identitySample.snapshots[1],5000],[identitySample.snapshots[2],5500]]){
  const image=await defeatFrame(page,snap,0,{capture:true});
  await page.evaluate(async({image,time})=>{const im=new Image();im.src=image;await im.decode();window.readerOriginalNormalize??=ScreenReaderVision.normalize;ScreenReaderVision.normalize=(_source,area)=>readerOriginalNormalize(im,area);readerTestNow=time;await ScreenReaderController.read(true);},{image,time});
  if(time===5000)expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).monsters.find(m=>m.monsterId==='M0122'&&m.serial===2)?.defeated).toBe(false);
 }
 await expect(page.locator('#reader-defeat-result')).toContainText('自動撃破：おもちゃの恐竜 2');
 expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).monsters.find(m=>m.monsterId==='M0122'&&m.serial===2)?.defeated).toBe(true);
 // Failed analysis of a different hash must not reuse the old frame's labels.
 await page.evaluate(()=>{window.failedMapReads=0;ScreenReaderWorldVision.analyze=()=>{failedMapReads++;throw Error('test unread frame');};const normalize=ScreenReaderVision.normalize;ScreenReaderVision.normalize=(...args)=>{const c=normalize(...args);c.popupFrame.getContext('2d').fillStyle='#f00';c.popupFrame.getContext('2d').fillRect(1000,100,2,2);return c;};});
 for(let i=0;i<4;i++)await page.evaluate(async time=>{readerTestNow=time;await ScreenReaderController.read(true);},6000+i*500);
 expect(await page.evaluate(()=>failedMapReads)).toBe(4);
});
for(const protocol of ['http','file'])for(const size of [{width:1440,height:900},{width:950,height:1200}])test(`08 autumn defeat automatic: real numbered leader and partial animation; undo (${protocol} ${size.width})`,async({page})=>{
 await page.setViewportSize(size);
 if(protocol==='file')await page.goto(require('url').pathToFileURL(require('path').resolve('08_screen_reader/index.html')).href);else await open(page);
 await page.waitForFunction(()=>window.ScreenReaderCharacterBridge?.catalog().characters.length===35);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0105');await page.locator('#mp-difficulty').selectOption('普通');
 await page.locator('#reader-world-sync').evaluate(e=>{e.checked=true;e.dispatchEvent(new Event('change'));});
 // Other numbered dinosaurs, including equal HP, must not be selected by roster count or HP alone.
 await page.evaluate(()=>ScreenReaderMapBridge.apply({monsters:[{monsterId:'M0122',serial:1,currentHp:19,maxHp:19},{monsterId:'M0122',serial:3,currentHp:8,maxHp:19}]}));
 for(const snap of identitySequence.slice(0,2)){
  const r=await defeatFrame(page,snap,snap.source_pts_s*1000,{identity:true,controller:true});
  expect(r.world.monsters.find(m=>m.monsterId==='M0122')).toMatchObject({serial:2,currentHp:8,maxHp:19,marker:expect.any(Array)});expect(r.cues).toEqual([]);
 }
 const alive=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());const output=[];
 for(const snap of identitySequence.slice(2))output.push(...(await defeatFrame(page,snap,snap.source_pts_s*1000,{identity:true,controller:true})).cues);
 expect(output).toEqual([expect.objectContaining({monsterId:'M0122',serial:2,reason:'gray_then_beam'})]);
 const after=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(after.monsters.filter(m=>m.defeated).map(m=>m.serial)).toEqual([2]);
 expect(after.monsters.filter(m=>m.serial!==2)).toEqual(alive.monsters.filter(m=>m.serial!==2));
 await expect(page.locator('#reader-defeat-result')).toContainText('自動撃破：おもちゃの恐竜 2');
 await page.locator('#roster-undo').click();expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(alive);
});

test('08 autumn defeat automatic: missing, ambiguous, stale or moving identity abstains; no HP-zero shortcut',async({page})=>{
 test.setTimeout(60000);
 await open(page);
 const before=identitySequence[0],second=identitySequence[1],gray=identitySample.snapshots[1],beam=identitySample.snapshots[2];
 for(const mode of ['one','ambiguous','unlocated','stale','camera','reset','alive']){
  await page.evaluate(()=>window.defeatTestTracker=ScreenReaderDefeatVision.createTracker());
  await defeatFrame(page,before,100,{identity:true,ambiguous:mode==='ambiguous',unlocated:mode==='unlocated'});
  let alive=[];if(mode!=='one')alive=(await defeatFrame(page,second,300,{identity:true,ambiguous:mode==='ambiguous',unlocated:mode==='unlocated'})).world.monsters;
  if(mode==='reset')await page.evaluate(()=>defeatTestTracker.reset());
  const offset=mode==='stale'?3000:0;
  await defeatFrame(page,gray,800+offset,{identity:true,shift:mode==='camera'?180:0});
  const r=await defeatFrame(page,beam,1250+offset,{identity:true,shift:mode==='camera'?180:0,alive:mode==='alive'?alive:null});
  expect(r.cues.every(c=>c.serial===null),mode).toBe(true);
 }
});

test('08 autumn defeat automatic: preview, wrong instance and max HP never mutate; duplicate cues are idempotent',async({page})=>{
 await open(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0105');
 await page.locator('#reader-world-sync').evaluate(e=>{e.checked=true;e.dispatchEvent(new Event('change'));});
 await page.locator('#reader-apply').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change'));});
 for(const snap of identitySequence)await defeatFrame(page,snap,snap.source_pts_s*1000,{identity:true,controller:true});
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(before.monsters.find(m=>m.monsterId==='M0122'&&m.serial===2)?.defeated).toBe(false);
 const actual=before.monsters.find(m=>m.monsterId==='M0122'&&m.serial===2),cue={monsterId:'M0122',serial:2,instanceId:actual.instanceId,maxHp:19,reason:'gray_then_beam'};
 for(const invalid of [{...cue,instanceId:99999},{...cue,maxHp:22},{...cue,serial:null},{...cue,reason:'absent'}]){
  expect(await page.evaluate(c=>ScreenReaderMapBridge.applyDefeats([c]),invalid)).toEqual([]);expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toEqual(before);
 }
 expect(await page.evaluate(c=>ScreenReaderMapBridge.applyDefeats([c,c]).length,cue)).toBe(1);
 expect(await page.evaluate(c=>ScreenReaderMapBridge.applyDefeats([c]),cue)).toEqual([]);
});

test('08 autumn defeat memory: missing names, registered camera motion, later survivors and ambiguous tracks',async({page})=>{
 test.setTimeout(90000);await open(page);
 // Held real snapshots exercise the memory contract, not continuous-video accuracy.
 const images=[];for(const snap of identitySample.snapshots.slice(0,3))images.push(await defeatFrame(page,snap,0,{capture:true}));
 const results=await page.evaluate(async images=>{
  const loaded=[];for(const image of images){const im=new Image();im.src=image;await im.decode();loaded.push(im);}
  const frame=(i,mask=null,shift=0)=>{const c=document.createElement('canvas');c.width=2560;c.height=1440;const x=c.getContext('2d');x.fillStyle='#141414';x.fillRect(0,0,c.width,c.height);x.drawImage(loaded[i],shift,0);const f=ScreenReaderVision.normalize(c);if(mask){const p=f.popupFrame.getContext('2d');p.fillStyle='#141414';p.fillRect(...mask);}return f;};
  const before=frame(0),known=ScreenReaderWorldVision.analyze(before,{positions:true}).monsters[0];known.instanceId=2;
  const results={};for(const mode of ['held','shift','camera-cut','ambiguous','reset','later','alive','expired','two-kills']){
   const tracker=ScreenReaderDefeatVision.createTracker(),roster=[1,2,3].map(serial=>({monsterId:known.monsterId,serial,maxHp:known.maxHp,instanceId:serial,seen:true,defeated:false}));
   const context={counts:{[known.monsterId]:3},monsters:roster},seed=[{...known,serial:1,instanceId:1,labelBox:null,marker:null},known,{...known,serial:3,instanceId:3,labelBox:null,marker:null}];
   if(['ambiguous','later','alive','expired','two-kills'].includes(mode))seed[0]={...known,serial:1,instanceId:1};
   tracker.step(before,100,seed,context); // already confirmed in the roster
   const cues=[];const shift=mode==='shift'?30:mode==='camera-cut'?400:0;
   for(let t=350;t<=3100;t+=250)cues.push(...tracker.step(frame(0,known.labelBox,shift),t,[],context));
   if(mode==='reset')tracker.reset();
   cues.push(...tracker.step(frame(1,null,shift),3600,[],context),...tracker.step(frame(2,null,shift),4100,[],context));
   if(mode==='two-kills')cues.push(...tracker.step(frame(1),4350,[],context),...tracker.step(frame(2),4600,[],context));
   if(['later','alive','expired','two-kills'].includes(mode)){
    if(mode==='expired')for(let t=4350;t<=9600;t+=250)tracker.step(before,t,[],context);
    const start=mode==='expired'?9850:mode==='two-kills'?4850:4350;
    const survivors=mode==='alive'?[known]:[seed[0],seed[2]];
    for(const t of [start,start+250])cues.push(...tracker.step(before,t,survivors,context));
   }
   results[mode]=cues;
  }return results;
 },images);
 for(const mode of ['held','shift'])expect(results[mode],mode).toEqual([expect.objectContaining({serial:2,instanceId:2,association:'tracked'})]);
 expect(results.later.filter(c=>c.serial!==null)).toEqual([expect.objectContaining({serial:2,association:'later-survivors'})]);
 for(const mode of ['camera-cut','ambiguous','reset','alive','expired','two-kills'])expect(results[mode].every(c=>c.serial===null),mode).toBe(true);
});

let turnFrameDirectory;
function turnFramePath(index){
 const fs=require('fs'),path=require('path');
 if(!turnFrameDirectory){turnFrameDirectory=fs.mkdtempSync(path.join(require('os').tmpdir(),'autumn-turn-'));require('child_process').execFileSync('ffmpeg',['-v','error','-i',path.resolve('tests/fixtures/screen-reader/defeat/autumn-turn-20261020/full-replay.mp4'),'-vf','fps=4',path.join(turnFrameDirectory,'f%04d.png')]);}
 return path.join(turnFrameDirectory,'f'+String(index).padStart(4,'0')+'.png');
}
for(const [protocol,size] of [['http',{width:1440,height:900}],['file',{width:950,height:1200}]])test(`08 autumn defeat full turn: real controller keeps HP, four identities and the surviving owl (${protocol})`,async({page})=>{
 test.setTimeout(240000);await page.setViewportSize(size);
 if(protocol==='file')await page.goto(require('url').pathToFileURL(require('path').resolve('08_screen_reader/index.html')).href);else await open(page);
 await page.waitForFunction(()=>window.ScreenReaderCharacterBridge?.catalog().characters.length===35);
 await page.locator('#reader-toggle').click();await page.locator('#reader-file').setInputFiles({name:'turn-start.png',mimeType:'image/png',buffer:require('fs').readFileSync(turnFramePath(37))});await expect(page.locator('#reader-file')).toHaveValue('');
 await page.locator('#mp-map-select').evaluate(e=>{e.value='MAP0105';e.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#mp-difficulty').evaluate(e=>{e.value='普通';e.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.evaluate(()=>{
  window.turnNow=1000;Object.defineProperty(performance,'now',{configurable:true,value:()=>turnNow});window.turnOriginalNormalize=ScreenReaderVision.normalize;
  window.turnInput=document.createElement('canvas');turnInput.width=2560;turnInput.height=1440;ScreenReaderVision.normalize=(_source,area)=>turnOriginalNormalize(turnInput,area);
  window.turnResult={checkpoints:{},defeats:[],diagnostics:[],last:''};
 });
 for(let index=37;index<=370;index++)await page.evaluate(async({index,image})=>{
   const im=new Image();im.src='data:image/png;base64,'+image;await im.decode();turnInput.getContext('2d').drawImage(im,0,0);
   turnNow=1000+index*250;await ScreenReaderController.read(true);
   const {checkpoints,defeats,diagnostics}=turnResult;
   const state=ScreenReaderMapBridge.snapshot(),text=document.getElementById('reader-defeat-result').textContent;
   if(text!==turnResult.last&&text.startsWith('自動撃破'))defeats.push({index,text});turnResult.last=text;
   if(index===224||index===268)checkpoints[index]=state;
   if([58,68,224,268].includes(index))diagnostics.push({index,world:ScreenReaderWorldVision.analyze(turnOriginalNormalize(turnInput),{positions:true}),status:document.getElementById('reader-status').textContent,monitor:document.getElementById('reader-monitor-info').textContent});
 },{index,image:require('fs').readFileSync(turnFramePath(index)).toString('base64')});
 const result=await page.evaluate(()=>({...turnResult,state:ScreenReaderMapBridge.snapshot()}));
 require('fs').mkdirSync('artifacts',{recursive:true});require('fs').writeFileSync(`artifacts/full-turn-${test.info().project.name}-${protocol}.json`,JSON.stringify(result,null,2));
 expect(result.checkpoints[224].monsters.find(m=>m.monsterId==='M0123'&&m.serial===2)).toMatchObject({hp:6,defeated:false});
 expect(result.checkpoints[268].monsters.find(m=>m.monsterId==='M0122'&&m.serial===1)).toMatchObject({hp:5,defeated:false});
 expect(result.state.monsters.filter(m=>m.defeated).map(m=>[m.monsterId,m.serial]).sort()).toEqual([['M0122',1],['M0123',1],['M0123',2],['M0123',3]]);
 expect(result.defeats).toHaveLength(4);
 await page.locator('#reader-close').click();
 await page.locator('#roster-undo').click();expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).monsters.find(m=>m.monsterId==='M0123'&&m.serial===2)?.defeated).toBe(false);
});
