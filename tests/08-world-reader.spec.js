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
