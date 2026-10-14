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
 expect((await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).round).toBe(4);
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
