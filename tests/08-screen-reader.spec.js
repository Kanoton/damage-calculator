const {test,expect}=require('@playwright/test');
const fixture=n=>require('./fixtures/screen-reader/'+n+'.json').image;

async function open(page){await page.goto('/08_screen_reader/');await page.locator('#reader-toggle').click();await page.waitForFunction(()=>window.ScreenReaderCharacterBridge?.catalog().characters.length===35);await expect(page.locator('#reader-self option')).toHaveCount(36);}
async function readFixture(page,n){
 const image=fixture(n),data=Buffer.from(image.split(',')[1],'base64');
 await page.locator('#reader-file').setInputFiles({name:n+'.png',mimeType:'image/png',buffer:data});
 await expect(page.locator('#reader-file')).toHaveValue('');
 await expect(page.locator('#reader-status')).toContainText('画面読取：');
 await expect(page.locator('#reader-read')).toBeEnabled();
}
const snapshot=page=>page.evaluate(()=>window.ScreenReaderCharacterBridge.snapshot());

test('08: left-aligned HUD reads the reviewed party, all numbers and independent self portrait',async({page})=>{
 await open(page);await readFixture(page,'left-hud');
 const s=await snapshot(page);expect(s.selfId).toBe('105');
 expect(s.members.map(m=>[m.id,m.currentHp,m.maxHp,m.coin,m.level])).toEqual([
  ['105',9,9,12,0],['106',10,10,12,0],['3',10,10,12,0],['18',9,9,6,0]
 ]);
 const learned=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return {actual:ScreenReaderVision.learn(im,'avatar','106',1).data,expected:btoa(String.fromCharCode(...ScreenReaderVision.feature(im,[55,159,73,42])))};},fixture('left-hud'));
 expect(learned.actual).toBe(learned.expected);
 // Switching back must not leave a cached layout or change the old HUD crops.
 await readFixture(page,'6248');const old=await snapshot(page);
 expect(old.members.map(m=>m.id)).toEqual(['105','13','21','26']);expect(old.members[0].coin).toBe(17);
});

test('08: left HUD reads changed coins and retains unreadable fields without inventing a self',async({page})=>{
 await open(page);await readFixture(page,'left-hud');
 const o=await page.evaluate(async({left,old})=>{
  const a=new Image(),b=new Image();a.src=left;b.src=old;await Promise.all([a.decode(),b.decode()]);
  const c=document.createElement('canvas');c.width=1536;c.height=709;const ctx=c.getContext('2d');ctx.drawImage(a,0,0);
  ctx.drawImage(b,235,98,27,24,167,98,27,24);ctx.fillStyle='#141414';ctx.fillRect(167,191,27,24);ctx.fillRect(116,445,139,116);
  const observation=ScreenReaderVision.analyze(c);ScreenReaderCharacterBridge.apply(observation);return observation;
 },{left:fixture('left-hud'),old:fixture('6248')});
 expect(o.members[0].coin).toBe(17);expect(o.members[1].coin).toBeUndefined();expect(o.selfId).toBeNull();expect(o.chipIds).toEqual([]);
 const s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members[1].coin).toBe(12);expect(s.members[0].coin).toBe(17);
});

test('08: profile assets expand real normal-screen PT identity without declaring party members self',async({page})=>{
 await open(page);await readFixture(page,'6234');
 const s=await snapshot(page);expect(s.selfId).toBe('105');
 expect(s.members.map(m=>m.id)).toEqual(['105','19','106','27']);
 // Validate the new matcher independently from the original game-screen seeds.
 const identities=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return ScreenReaderVision.regions.avatar.map(box=>ScreenReaderVision.profileMatch(ScreenReaderVision.feature(im,box))?.id??null);},fixture('6234'));
 expect(identities).toEqual(['105','19','106','27']);
});

test('08: masked profile matching covers 35 base portraits and rejects all included monster identities',async({page})=>{
 await open(page);
 const result=await page.evaluate(()=>{
  const refs=ScreenReaderProfileReferences.characters,base=new Map(),monsters=new Map();
  for(const r of refs){if(r.id&&/^UT_Hero_ProfilePhoto_\d+\.png$/.test(r.image))base.set(r.id,base.get(r.id)||r);if(!r.id)monsters.set(r.image,monsters.get(r.image)||r);}
  const bytes=r=>Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));
  const wrong=[...base].filter(([id,r])=>ScreenReaderVision.profileMatch(bytes(r))?.id!==id).map(([id])=>id);
  const falseMonsters=[...monsters].filter(([,r])=>ScreenReaderVision.profileMatch(bytes(r))).map(([file])=>file);
  const blank=ScreenReaderVision.profileMatch(new Uint8Array(768));
  return {count:base.size,wrong,monsterCount:monsters.size,falseMonsters,blank};
 });
 expect(result).toEqual({count:35,wrong:[],monsterCount:56,falseMonsters:[],blank:null});
});

test('08: profiles recognize an unseen outfit with transparency and preserve duplicate-slot rejection',async({page})=>{
 await open(page);
 const results=await page.evaluate(async()=>{
  const im=new Image();im.src='../images/UT_Hero_ProfilePhoto/UT_Hero_ProfilePhoto_101_01.png';await im.decode();
  const c=document.createElement('canvas');c.width=1536;c.height=709;const context=c.getContext('2d');context.fillStyle='#731b34';context.fillRect(0,0,c.width,c.height);
  for(const box of ScreenReaderVision.regions.avatar.slice(0,2))context.drawImage(im,40,65,115,115*42/73,...box);
  const masked=ScreenReaderVision.profileMatch(ScreenReaderVision.feature(c,ScreenReaderVision.regions.avatar[0]));
  return {masked,observation:ScreenReaderVision.analyze(c)};
 });
 expect(results.masked?.id).toBe('2');
 expect(results.observation.members.every(m=>!m.id)).toBe(true);
 expect(results.observation.selfId).toBeNull();
 expect(results.observation.chipIds).toEqual([]);
});

test('08: CSV maps all variants to canonical characters and excludes monsters from training',async({page})=>{
 await open(page);
 await expect(page.locator('#reader-mapping-status')).toContainText('CSV対応表');
 expect(await page.evaluate(()=>ScreenReaderMiniCharacterMapping.summary())).toEqual({source:'CSV対応表',total:194,characters:130,excluded:64});
 await page.locator('#reader-details').evaluate(el=>el.open=true);
 await page.locator('.reader-training summary').click();
 await page.locator('#reader-learn-id').selectOption('2');
 await expect(page.locator('#reader-mapping-preview img')).toHaveCount(4);
 await expect(page.locator('#reader-mapping-preview img').first()).toHaveAttribute('alt',/^パルナン /);
 expect(await page.locator('#reader-mapping-preview img').evaluateAll(imgs=>Promise.all(imgs.map(async im=>{await im.decode();return im.naturalWidth>0;})))).toEqual([true,true,true,true]);
 expect(await page.locator('#reader-learn-id option').count()).toBe(35);
 expect(await page.evaluate(()=>ScreenReaderMiniCharacterMapping.forCharacter('M0005'))).toEqual([]);
 await page.locator('#reader-learn-kind').selectOption('chip-small:0');
 await expect(page.locator('#reader-mapping-preview img')).toHaveCount(0);
});

for(const mode of ['unavailable','invalid','incomplete'])test('08: mapping fallback survives '+mode+' CSV',async({page})=>{
 await page.route('**/csv/mini_character_mapping.csv',route=>mode==='unavailable'?route.abort():route.fulfill({contentType:'text/csv',body:mode==='invalid'?'image_file,entity_type,character_id,name,reader_target,status\n../bad.png,キャラクター,1,ミミ,対象,確認済み':'image_file,entity_type,character_id,monster_ids,name,reader_target,status\nUT_Hero_ProfilePhoto_108.png,キャラクター,1,,ミミ,対象,確認済み'}));
 await open(page);await expect(page.locator('#reader-mapping-status')).toContainText('CSV取得・検証失敗');
 expect(await page.evaluate(()=>ScreenReaderMiniCharacterMapping.forCharacter('1').length)).toBe(6);
 await readFixture(page,'6234');expect((await snapshot(page)).selfId).toBe('105');
});

test('08: initializes independently without script errors and keeps PT dimensions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 expect((await snapshot(page)).selfId).toBe('1');await expect(page.locator('#reader-read')).toBeDisabled();
 await page.locator('.role-tab[data-role="character"]').click();
 expect((await page.locator('#selected-character').boundingBox()).height).toBe(118);expect(errors).toEqual([]);
});

test('08: recognizes sanitized real game frames, adds chips to their owners and updates observed stats',async({page})=>{
 await open(page);await readFixture(page,'6234');expect((await snapshot(page)).selfId).toBe('105');await readFixture(page,'6248');let s=await snapshot(page);
 expect(s.selfId).toBe('105');expect(s.members.map(m=>m.id)).toEqual(['105','13','21','26']);
 expect(s.members.map(m=>[m.currentHp,m.maxHp])).toEqual([[11,11],[8,10],[7,9],[10,10]]);
 expect(s.members.map(m=>m.coin)).toEqual([17,12,24,9]);expect(s.members[0].level).toBe(1);
 expect(s.members[0].chips).toEqual(['30']);expect(s.members[1].chips).toEqual([]);
 await readFixture(page,'6250');s=await snapshot(page);
 expect(s.members[1].chips).toEqual(['26']);expect(s.members[0].chips).toEqual(['30']);expect(s.members[1].currentHp).toBe(12);expect(s.members[1].level).toBe(1);
 await readFixture(page,'6251');s=await snapshot(page);expect([s.members[0].atk,s.members[0].def]).toEqual([1,2]);expect(s.members[2].currentHp).toBe(9);
 await readFixture(page,'6252');s=await snapshot(page);expect([s.members[1].atk,s.members[1].def]).toEqual([1,1]);expect(s.members[1].chips).toEqual(['26']);expect(s.members[0].chips).toEqual(['30']);
 await page.screenshot({path:'test-results/08-screen-reader-ui.png',fullPage:true});
});

test('08: blank/unknown frames retain previously observed state and never invent chips',async({page})=>{
 await open(page);await readFixture(page,'6252');const before=await snapshot(page);
 const result=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1536;c.height=709;c.getContext('2d').fillRect(0,0,1536,709);const o=ScreenReaderVision.analyze(c);ScreenReaderCharacterBridge.apply(o);return o;});
 expect(result.members.every(m=>!m.id)).toBe(true);expect(result.chipIds).toEqual([]);expect(await snapshot(page)).toEqual(before);
});

test('08: an occluding small chip popup does not decide which party member is self',async({page})=>{
 await open(page);await readFixture(page,'6250');expect((await snapshot(page)).selfId).toBe('1');
 await page.locator('#reader-self').selectOption('105');await page.locator('#reader-read').click();await expect.poll(async()=> (await snapshot(page)).selfId).toBe('105');
 const s=await snapshot(page);expect(s.members[1].chips).toEqual(['26']);expect(s.members[0].chips).toEqual([]);
});

test('08: partial observations preserve invisible chips, unknown stats and self identity',async({page})=>{
 await open(page);await readFixture(page,'6234');await readFixture(page,'6248');
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'13',slot:1,coin:19,currentHp:4}],chipOwnerId:'105',chipIds:['30','30','not-a-chip']}));
 let s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members[0].chips).toEqual(['30']);expect(s.members[1].currentHp).toBe(4);expect(s.members[1].coin).toBe(19);expect(s.members[1].maxHp).toBe(10);
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'105',slot:0,maxHp:13,currentHp:12,atk:5,move:6}],chipOwnerId:null,chipIds:[]}));
 s=await snapshot(page);expect([s.members[0].maxHp,s.members[0].currentHp,s.members[0].atk,s.members[0].move]).toEqual([13,12,5,6]);
 await page.locator('#reader-new-game').click();s=await snapshot(page);expect(s.members[0].level).toBe(0);expect(s.members[0].chips).toEqual([]);expect(s.members.slice(1).every(m=>!m.id)).toBe(true);expect(s.members[0].maxHp).toBe(9);
});

test('08: owned coin reading preserves separate manually tracked coin controls',async({page})=>{
 await open(page);await readFixture(page,'6234');await page.evaluate(()=>{const s=captureCharacterAbilityState();s.numbers['スターコイン']=42;s.numbers['コイン']=3;restoreCharacterAbilityState(s);});
 await readFixture(page,'6248');expect((await snapshot(page)).members[0].coin).toBe(17);const controls=await page.evaluate(()=>captureCharacterAbilityState().numbers);expect(controls['スターコイン']).toBe(42);expect(controls['コイン']).toBe(3);
});

test('08: automatic stabilization requires consecutive matching observations for each field',async({page})=>{
 await open(page);
 const r=await page.evaluate(()=>{const c=ScreenReaderController,o={members:[{id:'13',slot:1,currentHp:8,maxHp:10,coin:12}],selfId:'105',chipOwnerId:'13',chipIds:['26']};return [c.stabilize(o),c.stabilize(o),c.stabilize({...o,members:[{...o.members[0],currentHp:7}]}),c.stabilize({...o,members:[],chipIds:[]}),c.stabilize(o)];});
 expect(r[0].members).toEqual([]);expect(r[0].chipIds).toEqual([]);expect(r[1].members[0].currentHp).toBe(8);expect(r[1].chipIds).toEqual(['26']);expect(r[2].members[0].currentHp).toBeUndefined();expect(r[4].members).toEqual([]);expect(r[4].chipIds).toEqual([]);
});

test('08: window capture reads real video frames, auto updates and stops tracks',async({page})=>{
 await open(page);await readFixture(page,'6234');
 await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=1536;c.height=709;c.getContext('2d').drawImage(im,0,0);window.testCapture=c.captureStream(2);window.testCaptureCanvas=c;navigator.mediaDevices.getDisplayMedia=async()=>window.testCapture;},fixture('6248'));
 await page.locator('#reader-connect').click();await expect(page.locator('#reader-auto')).toBeEnabled();await page.locator('#reader-auto').check();
 await expect.poll(async()=> (await snapshot(page)).members[0].chips,{timeout:10000}).toEqual(['30']);
 await page.locator('#reader-stop').click();await expect(page.locator('#reader-auto')).not.toBeChecked();await expect(page.locator('#reader-read')).toBeDisabled();expect(await page.evaluate(()=>testCapture.getTracks().every(t=>t.readyState==='ended'))).toBe(true);expect((await snapshot(page)).members[0].chips).toEqual(['30']);
});

test('08: capture denial is recoverable; preview-only mode does not mutate the tool',async({page})=>{
 await open(page);await page.evaluate(()=>{navigator.mediaDevices.getDisplayMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});await page.locator('#reader-connect').click();await expect(page.locator('#reader-status')).toContainText('キャンセル');
 await page.locator('#reader-details').evaluate(el=>el.open=true);await page.locator('#reader-apply').uncheck();await readFixture(page,'6248');expect((await snapshot(page)).selfId).toBe('1');await expect(page.locator('#reader-result-body')).toContainText('遠野ハンナ');
});

test('08: learning persists locally and profile validation rejects invalid references',async({page})=>{
 await open(page);await readFixture(page,'6252');await page.locator('.reader-training summary').click();await page.locator('#reader-learn-kind').selectOption('header:0');await page.locator('#reader-learn-id').selectOption('13');await page.locator('#reader-learn').click();
 await expect(page.locator('#reader-reference-status')).toContainText('キャラ 1件');await page.reload();await expect(page.locator('#reader-reference-status')).toContainText('キャラ 1件');
 const rejected=await page.evaluate(()=>{try{ScreenReaderController.validateProfile({version:1,characters:[{id:'13',kind:'header',data:'bad'}],chips:[],area:null});return false;}catch{return true;}});expect(rejected).toBe(true);
});

test('08: 16:9 status screenshots identify chip owners and preserve additive ownership',async({page})=>{
 await open(page);
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'18',slot:1},{id:'3',slot:2},{id:'106',slot:3}]}));
 for(const [stamp,owner,chip] of [['184601','18','42'],['184606','3','26'],['184610','106','121']]){
  await readFixture(page,'status-'+stamp);
  const s=await snapshot(page);expect(s.members.find(m=>m.id===owner).chips).toEqual([chip]);expect(s.selfId).toBe('1');
  const result=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im),o=ScreenReaderVision.analyze(c);const learned=ScreenReaderVision.learn(c,'chip-large',o.chipIds[0],0);return {o,learned:learned.data,expected:btoa(String.fromCharCode(...ScreenReaderVision.feature(c.statusFrame,[517,334,36,36])))};},fixture('status-'+stamp));
  expect(result.o.view).toBe('ステータス画面');expect(result.o.chipOwnerId).toBe(owner);expect(result.o.chipIds).toEqual([chip]);expect(result.learned).toBe(result.expected);
 }
 const s=await snapshot(page);for(const [owner,chip] of [['18','42'],['3','26'],['106','121']])expect(s.members.find(m=>m.id===owner).chips).toEqual([chip]);
});


test('08: status reading never emits movement from hand-size digits',async({page})=>{
 await open(page);
 for(const n of ['6251','6252','status-184601','status-184606','status-184610']){
  const result=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return ScreenReaderVision.analyze(ScreenReaderVision.normalize(im));},fixture(n));
  expect(result.members.every(m=>!Object.hasOwn(m,'move'))).toBe(true);
 }
 const stable=await page.evaluate(()=>{const o={members:[{id:'13',slot:1,move:99}],selfId:null,chipOwnerId:null,chipIds:[]};ScreenReaderController.stabilize(o);return ScreenReaderController.stabilize(o);});
 expect(stable.members[0].move).toBeUndefined();
});

test('08: reader opens on hover without moving the calculator and supports click and Escape',async({page})=>{
 await page.goto('/08_screen_reader/');await page.mouse.move(0,500);
 const panel=page.locator('#reader-panel'),toggle=page.locator('#reader-toggle'),body=page.locator('.tool-wrapper');
 await expect(panel).toBeHidden();const before=await body.boundingBox();
 await toggle.hover();await expect(panel).toBeVisible();expect(await body.boundingBox()).toEqual(before);
 await page.mouse.move(0,500);await expect(panel).toBeHidden();
 await toggle.click();await page.mouse.move(0,500);await expect(panel).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await toggle.press('Escape');await expect(panel).toBeHidden();expect(await body.boundingBox()).toEqual(before);
});

test('08: lower popup uses scaled geometry, selected tab and PT identity without inventing self',async({page})=>{
 await open(page);await readFixture(page,'popup-11');await page.locator('#reader-self').selectOption('105');
 const cases=[['11','105',[]],['36','106',['121']],['41','3',['26','39','36','2']],['43','18',['42','36','24']]];
 for(const [stamp,owner,chips]of cases){
  await readFixture(page,'popup-'+stamp);
  const s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members.find(m=>m.id===owner).chips).toEqual(chips);
  const observations=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return [1,.75].map(scale=>{const c=document.createElement('canvas');c.width=im.width*scale;c.height=im.height*scale;c.getContext('2d').drawImage(im,0,0,c.width,c.height);return ScreenReaderVision.analyze(ScreenReaderVision.normalize(c));});},fixture('popup-'+stamp));
  for(const o of observations){expect(o.chipOwnerId).toBe(owner);expect(o.chipIds).toEqual(chips);expect(o.selfId).toBeNull();}
 }
 await readFixture(page,'popup-11');const s=await snapshot(page);expect(s.members.find(m=>m.id==='18').chips).toEqual(['42','36','24']);
});

for(const [width,height] of [[2048,1152],[1280,720],[2560,1080]])test(`08: height-scaled left HUD preserves the reviewed party at ${width}x${height}`,async({page})=>{
 await open(page);
 const result=await page.evaluate(async({image,width,height})=>{
  const im=new Image();im.src=image;await im.decode();
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const ctx=c.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(0,0,width,height);
  ctx.drawImage(im,0,0,im.width*height/im.height,height);
  const frame=ScreenReaderVision.normalize(c),o=ScreenReaderVision.analyze(frame);
  ScreenReaderCharacterBridge.apply(o);
  return {o,learned:ScreenReaderVision.learn(frame,'avatar','106',1).data,expected:btoa(String.fromCharCode(...ScreenReaderVision.feature(frame.popupFrame,[55,159,73,42])))};
 },{image:fixture('left-hud'),width,height});
 expect(result.o.selfId).toBe('105');
 expect(result.o.members.map(m=>[m.id,m.currentHp,m.maxHp,m.coin,m.level])).toEqual([
  ['105',9,9,12,0],['106',10,10,12,0],['3',10,10,12,0],['18',9,9,6,0]
 ]);
 expect(result.learned).toBe(result.expected);
});

test('08: calculator reset clears reader stabilization and a fresh frame can select self again',async({page})=>{
 await open(page);await readFixture(page,'left-hud');
 await page.locator('#reader-toggle').click();await page.mouse.move(0,500);
 await page.locator('#new-game').click();await page.locator('#new-game-confirm').click();
 expect((await snapshot(page)).selfId).toBe('');
 await page.locator('#reader-toggle').click();await readFixture(page,'left-hud');
 const s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members.map(m=>m.id)).toEqual(['105','106','3','18']);
});

test.describe('08 touch display transitions',()=>{
 test.use({hasTouch:true});
 test('08: synchronized wide and mobile layouts keep reader overlay independent',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1920,height:1080});await open(page);await readFixture(page,'left-hud');
 const before=await page.locator('.tool-wrapper').boundingBox();
 await page.locator('#reader-toggle').click();await page.mouse.move(0,500);
 await expect(page.locator('#reader-panel')).toBeHidden();expect(await page.locator('.tool-wrapper').boundingBox()).toEqual(before);
 await page.setViewportSize({width:375,height:812});await expect(page.locator('body')).toHaveClass(/mobile-ui/);await expect(page.locator('#reader-toggle')).toBeHidden();
 await page.setViewportSize({width:1280,height:900});await expect(page.locator('#reader-toggle')).toBeVisible();expect((await snapshot(page)).selfId).toBe('105');expect(errors).toEqual([]);
 });
});

test('08: automatic capture resumes for a coin-only HUD change after a static screen',async({page})=>{
 await open(page);
 await page.evaluate(async image=>{
  const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=1536;c.height=709;c.getContext('2d').drawImage(im,0,0);
  window.testCaptureCanvas=c;window.testCapture=c.captureStream(5);navigator.mediaDevices.getDisplayMedia=async()=>testCapture;
 },fixture('left-hud'));
 await page.locator('#reader-connect').click();await page.locator('#reader-auto').check();
 await expect.poll(async()=> (await snapshot(page)).members[0].coin,{timeout:10000}).toBe(12);
 // Allow the unchanged-frame optimization to engage, then change only coins.
 await page.waitForTimeout(4000);
 await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();testCaptureCanvas.getContext('2d').drawImage(im,235,98,27,24,167,98,27,24);},fixture('6248'));
 await expect.poll(async()=> (await snapshot(page)).members[0].coin,{timeout:10000}).toBe(17);
 expect((await snapshot(page)).selfId).toBe('105');await page.locator('#reader-stop').click();
});

async function closeReader(page){
 if(await page.locator('#reader-toggle').getAttribute('aria-expanded')==='true')await page.locator('#reader-toggle').click();
 await page.mouse.move(0,700);await expect(page.locator('#reader-panel')).toBeHidden();
}
async function commonChips(page){await page.locator('.role-tab[data-role="character"]').click();await page.locator('#character-chip-tab').click();await page.locator('.chip-category-tabs button[data-category="共通"]').click();}

for(const protocol of ['http','file'])test('08: observed maximum permits manual HP, chip and level changes and re-anchors on '+protocol,async({page})=>{
 if(protocol==='http')await open(page);else {await page.goto(require('url').pathToFileURL(require('path').resolve('08_screen_reader/index.html')).href);await page.waitForFunction(()=>ScreenReaderCharacterBridge?.catalog().characters.length===35);}
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'7',members:[{id:'7',slot:0,level:0,maxHp:14,currentHp:6,coin:12}]}));
 if(protocol==='http')await closeReader(page);await commonChips(page);
 const hp=page.locator('#selected-character-current-hp'),atk=page.locator('#selected-character-atk'),cookie=page.locator('.chip-select[data-id="7"]');
 await cookie.click();await expect(hp).toHaveValue('8');await expect(hp).toHaveAttribute('max','16');await expect(atk).toHaveValue('5');
 await cookie.click();await expect(hp).toHaveValue('8');await expect(hp).toHaveAttribute('max','14');await expect(atk).toHaveValue('2');
 await cookie.click();await expect(hp).toHaveValue('10');await page.locator('#selected-character-hp-fill').click();await expect(hp).toHaveValue('9');await page.locator('#selected-character-hp-fill').click({button:'right'});await expect(hp).toHaveValue('10');
 await page.locator('#selected-character-portrait').click();await expect(hp).toHaveValue('11');await expect(hp).toHaveAttribute('max','17');
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'7',slot:0,coin:15}],chipOwnerId:'7',chipIds:['7']}));await expect(hp).toHaveValue('11');await expect(hp).toHaveAttribute('max','17');
 for(let i=0;i<2;i++)await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'7',slot:0,level:1,maxHp:18,currentHp:12}],chipOwnerId:'7',chipIds:['7','7']}));
 await expect(hp).toHaveValue('12');await expect(hp).toHaveAttribute('max','18');expect((await snapshot(page)).members[0].chips).toEqual(['7']);
});

test('08: party observed HP bonuses survive manual edits and self/party role changes',async({page})=>{
 await open(page);await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'7',members:[{id:'7',slot:0,maxHp:14,currentHp:6},{id:'1',slot:1,level:0,maxHp:13,currentHp:8,coin:6}]}));await closeReader(page);
 await page.locator('.role-tab[data-role="character"]').click();await page.locator('#selected-party-tab').click();const slot=page.locator('.party-member-slot[data-character-id="1"]');
 await slot.locator('.party-slot-portrait').click();await expect(slot.locator('[data-stat="hp"] b')).toHaveText('10/15');await slot.locator('.party-slot-name').click();await commonChips(page);
 await page.locator('.chip-select[data-id="7"]').click();await expect(slot.locator('[data-stat="hp"] b')).toHaveText('12/17');
 const values=s=>s.members.filter(m=>m.id).map(m=>[m.id,m.currentHp,m.maxHp,m.level,m.coin,m.chips]).sort();const before=values(await snapshot(page));
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'1',members:[]}));expect(values(await snapshot(page))).toEqual(before);
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'7',members:[]}));expect(values(await snapshot(page))).toEqual(before);
});

test('08: discovering an existing HP chip with hidden max HP preserves the total and current HP',async({page})=>{
 await open(page);await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'1',slot:0,maxHp:13,currentHp:7,level:0}]}));
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'1',slot:0,level:1}],chipOwnerId:'1',chipIds:['7']}));let s=await snapshot(page);expect([s.members[0].currentHp,s.members[0].maxHp]).toEqual([7,13]);
 await closeReader(page);await commonChips(page);await page.locator('.chip-select[data-id="7"]').click();await expect(page.locator('#selected-character-current-hp')).toHaveAttribute('max','11');
 await page.locator('.chip-select[data-id="7"]').click();s=await snapshot(page);expect([s.members[0].currentHp,s.members[0].maxHp]).toEqual([9,13]);
});

test('08: conflicting member IDs or slots cannot overwrite retained numbers',async({page})=>{
 await open(page);await readFixture(page,'left-hud');const before=await snapshot(page);
 for(const members of [[{id:'105',slot:0,currentHp:1,coin:1},{id:'105',slot:1,currentHp:2,coin:2}],[{id:'105',slot:0,currentHp:1},{id:'106',slot:0,currentHp:2}],[{id:'105',slot:9,currentHp:1}]])await page.evaluate(members=>ScreenReaderCharacterBridge.apply({members}),members);
 expect(await snapshot(page)).toEqual(before);
});

test('08: results distinguish new readings, retained fields, stability waiting and preview',async({page})=>{
 await open(page);await readFixture(page,'left-hud');
 await page.evaluate(()=>{const original=ScreenReaderVision.analyze;ScreenReaderVision.analyze=source=>{const o=original(source);delete o.members[1].coin;return o;};});
 await page.locator('#reader-read').click();await expect(page.locator('#reader-result-body tr').nth(1).locator('td').nth(4)).toContainText('12');await expect(page.locator('#reader-result-body tr').nth(1).locator('[data-state="held"]')).not.toHaveCount(0);
 await page.locator('#reader-apply').uncheck();await page.locator('#reader-read').click();await expect(page.locator('#reader-result-body')).toContainText('確認のみ');
 await page.locator('#reader-apply').check();const before=await snapshot(page);await page.evaluate(()=>ScreenReaderController.read(true));await expect(page.locator('#reader-result-body')).toContainText('安定待ち');expect(await snapshot(page)).toEqual(before);
 await page.evaluate(()=>ScreenReaderController.read(true));await expect(page.locator('#reader-result-body [data-state="pending"]')).toHaveCount(0);await expect(page.locator('#reader-result-body [data-state="read"]')).not.toHaveCount(0);
 await page.screenshot({path:'test-results/08-reader-field-states.png',fullPage:true});
});

for(const [scale,blur] of [[.75,0],[.5,0],[1,.5],[1,1]])test(`08: reviewed HUD stays identifiable under scale ${scale} and blur ${blur}`,async({page})=>{
 await open(page);const o=await page.evaluate(async({image,scale,blur})=>{const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);const ctx=c.getContext('2d');ctx.filter=`blur(${blur}px)`;ctx.drawImage(im,0,0,c.width,c.height);return ScreenReaderVision.analyze(ScreenReaderVision.normalize(c));},{image:fixture('left-hud'),scale,blur});
 expect(o.members.map(m=>m.id)).toEqual(['105','106','3','18']);expect(o.selfId).toBe('105');expect(o.chipIds).toEqual([]);
 const expected=[{currentHp:9,maxHp:9,coin:12,level:0},{currentHp:10,maxHp:10,coin:12,level:0},{currentHp:10,maxHp:10,coin:12,level:0},{currentHp:9,maxHp:9,coin:6,level:0}];
 for(let i=0;i<4;i++)for(const key of Object.keys(expected[i]))if(o.members[i][key]!==undefined)expect(o.members[i][key]).toBe(expected[i][key]);
});

test('08: obscured faces and numbers retain state without deciding self or erasing chips',async({page})=>{
 await open(page);await readFixture(page,'left-hud');await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[],chipOwnerId:'106',chipIds:['121']}));const before=await snapshot(page);
 const o=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im),ctx=c.getContext('2d');ctx.fillStyle='#141414';for(const box of [[55,159,73,42],[23,103,60,42],[167,98,27,24],[116,445,139,116]])ctx.fillRect(...box);const o=ScreenReaderVision.analyze(c);ScreenReaderCharacterBridge.apply(o);return o;},fixture('left-hud'));
 expect(o.selfId).toBeNull();expect(o.members[1].id).toBeUndefined();expect(o.members[0].currentHp).toBeUndefined();expect(o.members[0].coin).toBeUndefined();expect(o.chipIds).toEqual([]);expect(await snapshot(page)).toEqual(before);
});
