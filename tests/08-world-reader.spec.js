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
 await expect(page.locator('#reader-monitor-info')).toContainText('25種類');
 await expect(page.locator('#reader-interval')).toHaveValue('500');
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
 await page.getByRole('button',{name:'海賊サメ 4を計算機に登録',exact:true}).click();const selected=await page.locator('#map-roster-list .roster-card.selected').getAttribute('data-instance-id');
 const before=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());await page.evaluate(o=>ScreenReaderMapBridge.apply(o),observation([1]));
 await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([1,2,4,10]));expect(await page.locator('#map-roster-list .roster-card.selected').getAttribute('data-instance-id')).toBe(selected);
 const after=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(after.monsters.slice(0,3)).toEqual(before.monsters);
 await page.getByRole('button',{name:'海賊サメ 4を撃破',exact:true}).click();await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([1,2,10,4]));await expect(page.locator('#map-roster-list .roster-card.defeated')).toHaveCount(1);
 await page.locator('#roster-undo').click();await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(labels([1,2,4,10]));await expect(page.locator('#map-roster-list .roster-card.defeated')).toHaveCount(0);
});
