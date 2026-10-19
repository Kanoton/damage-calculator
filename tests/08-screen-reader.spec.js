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

for(const [name,owner,chips]of [['sherry-late','106',['52','58','9','45','43','55']],['yume-late','20',['23','102','48']]])test('08: chip artwork reads reviewed late '+name+' without missing chips or inventing a whetstone',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'2',slot:0},{id:'20',slot:1},{id:'106',slot:2},{id:'17',slot:3}]}));
 await readFixture(page,'chip-grid-'+name);const s=await snapshot(page);expect(s.members.find(m=>m.id===owner).chips).toEqual(chips);
 const actual=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return ScreenReaderVision.analyze(ScreenReaderVision.normalize(im));},fixture('chip-grid-'+name));
 expect(actual.chipOwnerId).toBe(owner);expect(actual.chipIds).toEqual(chips);expect(actual.chipIds).not.toContain('13');
});

test('08: party stars update red and green levels and retain a level when stars are hidden',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();
 const result=await page.evaluate(async image=>{
  ScreenReaderCharacterBridge.apply({members:[{id:'2',slot:0,level:0},{id:'20',slot:1,level:0},{id:'106',slot:2,level:0},{id:'17',slot:3,level:0}]});
  const initial=ScreenReaderCharacterBridge.snapshot();const im=new Image();im.src=image;await im.decode();const frame=ScreenReaderVision.normalize(im),o=ScreenReaderVision.analyze(frame);ScreenReaderCharacterBridge.apply(o);
  const updated=ScreenReaderCharacterBridge.snapshot();const c=document.createElement('canvas');c.width=1536;c.height=709;const ctx=c.getContext('2d');ctx.drawImage(frame,0,0);ctx.fillStyle='#141414';ctx.fillRect(210,98,64,26);
  const hidden=ScreenReaderVision.analyze(c);ScreenReaderCharacterBridge.apply(hidden);return {initial,o,updated,hidden,retained:ScreenReaderCharacterBridge.snapshot()};
 },fixture('party-stars-late'));
 expect(result.o.members.map(m=>[m.id,m.level])).toEqual([['2',2],['20',1],['106',3],['17',3]]);
 expect(result.initial.members.map(m=>[m.id,m.level])).toEqual([['2',0],['20',0],['106',0],['17',0]]);
 expect(result.updated.members.find(m=>m.id==='2').level).toBe(2);expect(result.updated.members.find(m=>m.id==='20').level).toBe(1);
 expect(result.hidden.members.find(m=>m.id==='2').level).toBeUndefined();expect(result.retained.members.find(m=>m.id==='2').level).toBe(2);
 expect(result.o.chipIds).toEqual([]);
});

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
 await open(page);await readFixture(page,'6250');expect((await snapshot(page)).selfId).toBe('');
 await page.locator('#reader-self').selectOption('105');await page.locator('#reader-read').click();await expect.poll(async()=> (await snapshot(page)).selfId).toBe('105');
 const s=await snapshot(page);expect(s.members[1].chips).toEqual(['26']);expect(s.members[0].chips).toEqual([]);
});

test('08: partial observations preserve invisible chips, unknown stats and self identity',async({page})=>{
 await open(page);await readFixture(page,'6234');await readFixture(page,'6248');
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'13',slot:1,coin:19,currentHp:4}],chipOwnerId:'105',chipIds:['30','30','not-a-chip']}));
 let s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members[0].chips).toEqual(['30']);expect(s.members[1].currentHp).toBe(4);expect(s.members[1].coin).toBe(19);expect(s.members[1].maxHp).toBe(10);
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'105',slot:0,maxHp:13,currentHp:12,atk:5,move:6}],chipOwnerId:null,chipIds:[]}));
 s=await snapshot(page);expect([s.members[0].maxHp,s.members[0].currentHp,s.members[0].atk,s.members[0].move]).toEqual([13,12,5,6]);
 await page.locator('#reader-new-game').click();s=await snapshot(page);expect(s.selfId).toBe('');expect(s.members.every(m=>!m.id)).toBe(true);
});

test('08: owned coin reading preserves separate manually tracked coin controls',async({page})=>{
 await open(page);await readFixture(page,'6234');await page.evaluate(()=>{const s=captureCharacterAbilityState();s.numbers['スターコイン']=42;s.numbers['コイン']=3;restoreCharacterAbilityState(s);});
 await readFixture(page,'6248');expect((await snapshot(page)).members[0].coin).toBe(17);const controls=await page.evaluate(()=>captureCharacterAbilityState().numbers);expect(controls['スターコイン']).toBe(42);expect(controls['コイン']).toBe(3);
});

test('08: automatic stabilization confirms identities and chips while numeric values update each readable frame',async({page})=>{
 await open(page);
 const r=await page.evaluate(()=>{const c=ScreenReaderController,o={members:[{id:'13',slot:1,currentHp:8,maxHp:10,coin:12}],selfId:'105',chipOwnerId:'13',chipIds:['26']};return [c.stabilize(o),c.stabilize(o),c.stabilize({...o,members:[{...o.members[0],currentHp:7}]}),c.stabilize({...o,members:[],chipIds:[]}),c.stabilize(o)];});
 expect(r[0].members).toEqual([]);expect(r[0].chipIds).toEqual([]);expect(r[1].members[0].currentHp).toBe(8);expect(r[1].chipIds).toEqual(['26']);expect(r[2].members[0].currentHp).toBe(7);expect(r[4].members).toEqual([]);expect(r[4].chipIds).toEqual([]);
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
 await open(page);await page.locator('#reader-new-game').click();
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'18',slot:1},{id:'3',slot:2},{id:'106',slot:3}]}));
 for(const [stamp,owner,chip] of [['184601','18','42'],['184606','3','26'],['184610','106','121']]){
  await readFixture(page,'status-'+stamp);
  const s=await snapshot(page);expect(s.members.find(m=>m.id===owner).chips).toEqual([chip]);expect(s.selfId).toBe('');
  const result=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im),o=ScreenReaderVision.analyze(c);const learned=ScreenReaderVision.learn(c,'chip-large',o.chipIds[0],0);return {o,learned:learned.data,expected:btoa(String.fromCharCode(...ScreenReaderVision.feature(c.statusFrame,[517,334,36,36])))};},fixture('status-'+stamp));
  expect(result.o.view).toBe('ステータス画面');expect(result.o.chipOwnerId).toBe(owner);expect(result.o.chipIds).toEqual([chip]);expect(result.o.chipRead.stage).toBe('read');expect(result.o.chipRead.matchedRims).toBeGreaterThanOrEqual(7);expect(result.learned).toBe(result.expected);
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
 await page.evaluate(()=>{const original=ScreenReaderVision.analyze;ScreenReaderVision.analyze=source=>{const o=original(source);delete o.members[0].id;o.members[0].currentHp=1;return o;};});
 await page.locator('#reader-read').click();const first=page.locator('#reader-result-body tr').first();await expect(first.locator('td').nth(3)).toContainText('9');await expect(first.locator('td').nth(3).locator('[data-state="held"]')).toHaveCount(2);expect((await snapshot(page)).members[0].currentHp).toBe(9);
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

test('08: Yume 123_02 outfit matches the recorded avatar without weakening ambiguity checks',async({page})=>{
 await open(page);
 const actual=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return ScreenReaderVision.profileMatch(ScreenReaderVision.feature(im,[55,159,73,42]));},fixture('yume-outfit-123-02'));
 expect(actual?.id).toBe('20');expect(actual?.confidence).toBeGreaterThanOrEqual(90);
});

test('08: confirmed party reads slot numbers without portraits and rejects an absent HUD',async({page})=>{
 await open(page);
 const result=await page.evaluate(async image=>{
  const im=new Image();im.src=image;await im.decode();
  const c=ScreenReaderVision.normalize(im),first=ScreenReaderVision.analyze(c),ctx=c.getContext('2d');
  const party={ids:['2','106','3','18'],selfId:'18',hud:first.hud};
  for(const box of [[55,66,73,42],[55,159,73,42],[55,253,73,42],[55,345,73,42],[116,445,139,116]]){ctx.fillStyle='#141414';ctx.fillRect(...box);}
  const o=ScreenReaderVision.analyze(c,undefined,party);
  ctx.fillStyle='#141414';ctx.fillRect(0,0,1536,709);
  return {o,blank:ScreenReaderVision.analyze(c,undefined,party)};
 },fixture('left-hud'));
 expect(result.o.members.map(m=>[m.id,m.currentHp,m.maxHp,m.coin,m.level])).toEqual([
  ['2',9,9,12,0],['106',10,10,12,0],['3',10,10,12,0],['18',9,9,6,0]
 ]);
 expect(result.o.selfId).toBe('18');expect(result.o.chipIds).toEqual([]);
 expect(result.blank.members.every(m=>!m.id&&m.coin===undefined&&m.level===undefined)).toBe(true);
});

test('08: party confirmation resolves initial self conflict, pins order and resets for a new game',async({page})=>{
 await open(page);await readFixture(page,'left-hud');
 // Reproduce the initial Mimi occupying the first slot while the correct self is elsewhere.
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[],selfId:'1'}));
 await page.locator('#reader-self').selectOption('18');
 await page.locator('#reader-party-0').selectOption('2');
 await page.locator('#reader-party-1').selectOption('106');
 await page.locator('#reader-party-2').selectOption('3');
 await page.locator('#reader-party-3').selectOption('18');
 await page.locator('#reader-party-confirm').click();
 await expect(page.locator('#reader-party-status')).toContainText('PT確定');
 await expect.poll(async()=> (await snapshot(page)).members[0].coin).toBe(12);
 let s=await snapshot(page);expect(s.selfId).toBe('18');expect(s.members.map(m=>m.id)).toEqual(['2','106','3','18']);
 await page.locator('#reader-read').click();await expect(page.locator('#reader-party-0')).toBeDisabled();
 s=await snapshot(page);expect(s.members[0].id).toBe('2');expect(s.members[0].currentHp).toBe(9);
 await page.locator('#reader-new-game').click();await expect(page.locator('#reader-party-status')).toHaveText('PT未確定');await expect(page.locator('#reader-party-0')).toBeEnabled();
});

test('08: party confirmation requires a unique full party and a self from that party',async({page})=>{
 await open(page);await readFixture(page,'left-hud');
 await page.locator('#reader-party-1').selectOption('105');await page.locator('#reader-party-confirm').click();await expect(page.locator('#reader-party-status')).toContainText('異なる4人');
 await page.locator('#reader-party-1').selectOption('106');await page.locator('#reader-self').selectOption('1');await page.locator('#reader-party-confirm').click();await expect(page.locator('#reader-party-status')).toContainText('自分のキャラを指定');
 await expect(page.locator('#reader-party-unlock')).toBeDisabled();
});

test('08: a status screen updates its owner while the confirmed self stays fixed',async({page})=>{
 await open(page);await readFixture(page,'6248');
 await page.locator('#reader-self').selectOption('26');await page.locator('#reader-party-confirm').click();await expect(page.locator('#reader-party-status')).toContainText('PT確定');
 await expect(page.locator('#reader-read')).toBeEnabled();await readFixture(page,'6252');
 const s=await snapshot(page);expect(s.selfId).toBe('26');expect(s.members.map(m=>m.id)).toEqual(['105','13','21','26']);
 expect(s.members[1].chips).toEqual(['26']);expect([s.members[1].atk,s.members[1].def]).toEqual([1,1]);
 await page.locator('#reader-party-unlock').click();await expect(page.locator('#reader-party-status')).toHaveText('PT未確定');await expect(page.locator('#reader-party-0')).toBeEnabled();
});

for(const [name,atk] of [['frame15',8],['frame24',9],['frame46',8]])test('08: own persistent HUD '+name+' updates only confirmed self',async({page})=>{
 await open(page);
 const result=await page.evaluate(async({hud,partyImage})=>{
  const im=new Image(),base=new Image();im.src=hud;base.src=partyImage;await Promise.all([im.decode(),base.decode()]);
  const c=ScreenReaderVision.normalize(base),ctx=c.getContext('2d'),first=ScreenReaderVision.analyze(c);
  for(const target of [c,c.popupFrame])target.getContext('2d').drawImage(im,3,620,78,89,3,620,78,89);
  const before=ScreenReaderVision.analyze(c),after=ScreenReaderVision.analyze(c,undefined,{ids:['105','106','3','18'],selfId:'18',hud:first.hud});
  ctx.fillStyle='#141414';ctx.fillRect(3,620,38,89);const hidden=ScreenReaderVision.readSelfStats(c);
  return {before,after,hidden};
 },{hud:fixture('self-hud-'+name),partyImage:fixture('left-hud')});
 expect(result.before.members.every(m=>m.atk===undefined&&m.def===undefined)).toBe(true);
 expect(result.after.members.filter(m=>m.atk!==undefined||m.def!==undefined).map(m=>[m.id,m.atk,m.def])).toEqual([['18',atk,2]]);
 expect(result.hidden).toEqual({});
});

test('08: first applied read clears the previous game, including Mimi, context, roster and Undo',async({page})=>{
 await open(page);
 await page.evaluate(()=>{
  ScreenReaderCharacterBridge.apply({selfId:'1',members:[{id:'1',slot:0,level:2,currentHp:3,coin:99}],chipOwnerId:'1',chipIds:['30']});
  ScreenReaderMapBridge.apply({clock:{round:6,progress:6},monsters:[]});
 });
 await readFixture(page,'6250'); // The popup does not identify self.
 const s=await snapshot(page);expect(s.selfId).toBe('');expect(s.members.map(m=>m.id)).toEqual(['105','13','21','26']);
 expect(s.members.find(m=>m.id==='13').chips).toEqual(['26']);expect(s.members.some(m=>m.id==='1')).toBe(false);
 const map=await page.evaluate(()=>ScreenReaderMapBridge.snapshot());expect(map).toMatchObject({map:'',difficulty:'',round:null,progress:null,events:[],monsters:[]});
 await expect(page.locator('#roster-undo')).toBeDisabled();await expect(page.locator('#reader-monitor-info')).toContainText('マップ名・難易度：未判定');
 await page.locator('#reader-self').selectOption('105');await page.locator('#reader-read').click();
 await expect.poll(async()=> (await snapshot(page)).selfId).toBe('105');
 const after=await snapshot(page);expect(after.members.map(m=>m.id)).toEqual(['105','13','21','26']);expect(after.members[1].chips).toEqual(['26']);
});

test('08: party observations survive until self is known without assigning the first slot to self',async({page})=>{
 await open(page);await page.evaluate(()=>ScreenReaderCharacterBridge.reset());
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'2',slot:0,currentHp:7,maxHp:10,coin:21,level:1},{id:'18',slot:3,currentHp:6,maxHp:9,coin:5}],chipOwnerId:'18',chipIds:['30']}));
 let s=await snapshot(page);expect(s.selfId).toBe('');expect(s.members[0]).toMatchObject({id:'2',currentHp:7,coin:21});expect(s.members[3].chips).toEqual(['30']);
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'18',members:[]}));s=await snapshot(page);
 expect(s.selfId).toBe('18');expect(s.members[3]).toMatchObject({id:'18',currentHp:6,maxHp:9,coin:5,chips:['30']});expect(s.members[0].id).toBe('2');
});

test('08: map and difficulty remain unknown after reader reset and late CSV refresh',async({page})=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/csv/maps_renumbered.csv',async route=>{await gate;await route.continue();});
 await open(page);await page.locator('#reader-new-game').click();
 const response=page.waitForResponse(response=>response.url().endsWith('/csv/maps_renumbered.csv'));release();await response;
 await expect(page.locator('#mp-map-select')).toHaveValue('');await expect(page.locator('#mp-difficulty')).toHaveValue('');
 await closeReader(page);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0003');
 await expect(page.locator('#mp-difficulty')).toHaveValue('');
 const rejected=await page.evaluate(()=>ScreenReaderMapBridge.apply({clock:{round:4,progress:4},monsters:[]}));expect(rejected.skipped).toBe(1);
 await page.locator('#mp-difficulty').selectOption('普通');
 await page.evaluate(()=>ScreenReaderMapBridge.apply({clock:{round:4,progress:4},monsters:[]}));
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toMatchObject({map:'MAP0003',difficulty:'普通',round:4,progress:4});
 // Identifying self later must not rewind the clock or synthesize progress 1.
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'18',members:[]}));
 expect(await page.evaluate(()=>ScreenReaderMapBridge.snapshot())).toMatchObject({round:4,progress:4});
});

for(const width of [1280,1920])test('08: observed party is visible before self is identified at width '+width,async({page})=>{
 await page.setViewportSize({width,height:1080});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await open(page);await readFixture(page,'6250');
 const before=await snapshot(page);expect(before.selfId).toBe('');expect(before.members.map(m=>m.id)).toEqual(['105','13','21','26']);
 await closeReader(page);
 await expect(page.locator('#selected-character')).toBeVisible();await expect(page.locator('#selected-party-grid')).toBeVisible();
 for(const m of before.members)await expect(page.locator('.party-member-slot[data-character-id="'+m.id+'"]')).toBeVisible();
 await expect(page.locator('#selected-self-tab')).toBeDisabled();await expect(page.locator('#selected-self-tab')).toHaveText('自分未判定');
 await page.locator('#reader-toggle').click();await page.locator('#reader-self').selectOption('105');await page.locator('#reader-read').click();
 await expect.poll(async()=> (await snapshot(page)).selfId).toBe('105');await closeReader(page);
 await expect(page.locator('#selected-party-grid')).toBeVisible();await expect(page.locator('#selected-self-tab')).toBeEnabled();
 const after=await snapshot(page);expect(after.members.map(m=>m.id)).toEqual(before.members.map(m=>m.id));expect(after.members[1].chips).toEqual(['26']);
 await page.locator('#selected-self-tab').click();await expect(page.locator('#selected-character-name')).toHaveText('遠野ハンナ');await expect(page.locator('#selected-character-details')).toBeVisible();
 await page.locator('#reader-toggle').click();await page.locator('#reader-new-game').click();await closeReader(page);
 await expect(page.locator('#selected-character')).toBeHidden();expect((await snapshot(page)).members.every(m=>!m.id)).toBe(true);expect(errors).toEqual([]);
});

test('08: party can be fixed before self, survives wrong battle identities and resize, and accepts self without unlocking',async({page})=>{
 await open(page);await readFixture(page,'6250');
 await page.locator('#reader-party-confirm').click();await expect(page.locator('#reader-party-status')).toContainText('PT確定');
 await expect(page.locator('#reader-party-0')).toBeDisabled();
 // A battle overlay is adversarial input. The controller must reject its identities even if a matcher returns them.
 await page.evaluate(()=>{const analyze=ScreenReaderVision.analyze;ScreenReaderVision.analyze=(...args)=>{const o=analyze(...args);return {...o,selfId:'1',members:[{id:'1',slot:0,coin:99},{id:'2',slot:1,coin:99}]};};});
 await page.locator('#reader-read').click();await expect(page.locator('#reader-read')).toBeEnabled();
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({partyIds:['105','13','21','26'],selfId:'1',members:[{id:'1',slot:0,coin:99}]}));
 let s=await snapshot(page);expect(s.selfId).toBe('');expect(s.members.map(m=>m.id)).toEqual(['105','13','21','26']);expect(s.members[0].coin).not.toBe(99);
 await page.locator('#reader-self').selectOption('26');await page.locator('#reader-read').click();
 await expect.poll(async()=> (await snapshot(page)).selfId).toBe('26');await expect(page.locator('#reader-party-0')).toBeDisabled();
 // Changing capture dimensions must not silently release the confirmed identities.
 const data=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=document.createElement('canvas');c.width=1200;c.height=700;c.getContext('2d').drawImage(im,0,0,1200,700);return c.toDataURL();},fixture('6250'));
 await page.locator('#reader-file').setInputFiles({name:'resized.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');
 expect((await snapshot(page)).members.map(m=>m.id)).toEqual(['105','13','21','26']);await expect(page.locator('#reader-party-0')).toBeDisabled();
});

test('08: two stable automatic party observations fix the order without requiring a self identity',async({page})=>{
 await open(page);await readFixture(page,'6250');
 await page.evaluate(()=>ScreenReaderController.read(true));await page.evaluate(()=>ScreenReaderController.read(true));
 await expect(page.locator('#reader-party-confirm')).toBeDisabled();await expect(page.locator('#reader-party-status')).toContainText('PT確定');
 expect((await snapshot(page)).selfId).toBe('');
});

test('08: chip icons and active tabs alone cannot authorize chip additions without panel rims',async({page})=>{
 await open(page);
 const results=await page.evaluate(async images=>{
  const outputs=[];
  for(const [name,image] of images){
   const im=new Image();im.src=image;await im.decode();const source=ScreenReaderVision.normalize(im);
   const kind=name==='6250'?'small':name==='popup-41'?'lower':'large';
   const centers=kind==='small'?[[239,527],[312,527],[386,527],[199,591],[273,591],[347,591],[421,591],[239,655],[312,655],[386,655]]:kind==='lower'?[[142,527],[216,527],[289,527],[103,591],[177,591],[251,591],[325,591],[142,655],[216,655],[289,655]]:[[535,352],[609,352],[682,352],[495,416],[570,416],[644,416],[719,416],[535,481],[609,481],[682,481]];
   const target=kind==='lower'?source.popupFrame:kind==='large'?(source.statusFrame||source):source;
   const ctx=target.getContext('2d');ctx.fillStyle='#141414';for(const [x,y] of centers){ctx.fillRect(x-9,y-30,18,8);ctx.fillRect(x-9,y+22,18,8);}
   const o=ScreenReaderVision.analyze(source);outputs.push({name,owner:o.chipOwnerId,chips:o.chipIds,chipRead:o.chipRead});
  }return outputs;
 },['6250','popup-41','status-184601'].map(n=>[n,fixture(n)]));
 for(const o of results){expect(o.owner,o.name).toBeNull();expect(o.chips,o.name).toEqual([]);expect(o.chipRead.stage,o.name).toBe('panel');expect(o.chipRead.matchedRims,o.name).toBeLessThan(7);}
});

test('08: a confirmed party with unknown self identifies the later lower-left portrait without changing order',async({page})=>{
 await open(page);await readFixture(page,'popup-11');await page.locator('#reader-party-confirm').click();
 expect((await snapshot(page)).selfId).toBe('');
 const data=await page.evaluate(async({base,own})=>{
  const a=new Image(),b=new Image();a.src=base;b.src=own;await Promise.all([a.decode(),b.decode()]);
  const c=ScreenReaderVision.normalize(a);c.getContext('2d').drawImage(b,116,445,139,116,116,445,139,116);return c.toDataURL();
 },{base:fixture('left-hud'),own:fixture('self-sherry-24')});
 await page.locator('#reader-apply').uncheck();
 await page.locator('#reader-file').setInputFiles({name:'self-later.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');
 expect((await snapshot(page)).selfId).toBe('');
 await page.locator('#reader-apply').check();await page.locator('#reader-read').click();
 let s=await snapshot(page);expect(s.selfId).toBe('106');expect(s.members.map(m=>m.id)).toEqual(['105','106','3','18']);await expect(page.locator('#reader-party-0')).toBeDisabled();
 await readFixture(page,'left-hud');s=await snapshot(page);expect(s.selfId).toBe('106');expect(s.members.map(m=>m.id)).toEqual(['105','106','3','18']);
});

test('08: later self portrait still needs two automatic observations and cannot identify someone outside the fixed party',async({page})=>{
 await open(page);
 const result=await page.evaluate(async({base,own})=>{
  const a=new Image(),b=new Image();a.src=base;b.src=own;await Promise.all([a.decode(),b.decode()]);const c=ScreenReaderVision.normalize(a);c.getContext('2d').drawImage(b,116,445,139,116,116,445,139,116);c.popupFrame=c;
  const party={ids:['105','106','3','18'],selfId:null,hud:{layout:'left',source:'primary'}},o=ScreenReaderVision.analyze(c,undefined,party);
  return {first:ScreenReaderController.stabilize(o).selfId,second:ScreenReaderController.stabilize(o).selfId,outside:ScreenReaderVision.analyze(c,undefined,{...party,ids:['105','13','3','18']}).selfId,known:ScreenReaderVision.analyze(c,undefined,{...party,selfId:'18'}).selfId};
 },{base:fixture('left-hud'),own:fixture('self-sherry-15')});
 expect(result).toEqual({first:null,second:'106',outside:null,known:'18'});
});

for(const [name,id]of [['live-map','13'],['replay-map','2']])test('08: reviewed '+name+' self portrait identifies the fixed party member',async({page})=>{
 await open(page);
 const result=await page.evaluate(async({base,own,id})=>{
  const a=new Image(),b=new Image();a.src=base;b.src=own;await Promise.all([a.decode(),b.decode()]);const c=ScreenReaderVision.normalize(a);c.getContext('2d').drawImage(b,116,445,139,116,116,445,139,116);c.popupFrame=c;
  return ScreenReaderVision.analyze(c,undefined,{ids:[id,'106','3','18'],selfId:null,hud:{layout:'left',source:'primary'}}).selfId;
 },{base:fixture('left-hud'),own:fixture('self-start-'+name),id});expect(result).toBe(id);
});

test('08: bottom reader launcher opens a draggable panel, clamps after resize, closes and resets its position',async({page})=>{

 await page.setViewportSize({width:1600,height:1000});await open(page);

 const toggle=page.locator('#reader-toggle'),panel=page.locator('#reader-panel'),body=page.locator('.tool-wrapper');
 const launcher=await toggle.boundingBox();expect(launcher.y+launcher.height).toBeCloseTo(1000,0);
 const layout=await body.boundingBox(),before=await panel.boundingBox(),handle=await page.locator('#reader-move').boundingBox();
 await page.mouse.move(handle.x+50,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+190,handle.y+handle.height/2-100,{steps:5});await page.mouse.up();
 const moved=await panel.boundingBox();expect(moved.x-before.x).toBeCloseTo(140,0);expect(moved.y-before.y).toBeCloseTo(-100,0);expect(await body.boundingBox()).toEqual(layout);
 await page.locator('#reader-move').focus();await page.keyboard.press('ArrowLeft');expect((await panel.boundingBox()).x).toBeCloseTo(moved.x-10,0);
 await page.setViewportSize({width:1200,height:720});await expect.poll(async()=>{const r=await panel.boundingBox();return r.x+r.width;}).toBeLessThanOrEqual(1201);const resized=await panel.boundingBox();expect(resized.x).toBeGreaterThanOrEqual(0);expect(resized.x+resized.width).toBeLessThanOrEqual(1201);expect(resized.y).toBeGreaterThanOrEqual(0);expect(resized.y+resized.height).toBeLessThanOrEqual(721);
 await page.locator('#reader-close').click();await expect(panel).toBeHidden();
 await toggle.click();await page.locator('#reader-position-reset').click();expect(await panel.evaluate(el=>el.style.top)).toBe('');
});

test('08: chip diagnostics distinguish a missing list from an empty or unreadable inventory and retain registered chips',async({page})=>{
 await open(page);await readFixture(page,'left-hud');await expect(page.locator('#reader-chip-result')).toContainText('一覧画面・選択タブを未判定');await expect(page.locator('#reader-monitor-info')).toContainText('自動撃破：未対応');
 await readFixture(page,'6248');await expect(page.locator('#reader-chip-result')).toContainText('取得済み 1件を保持');expect((await snapshot(page)).members.find(m=>m.id==='105').chips).toEqual(['30']);
 await readFixture(page,'popup-11');await expect(page.locator('#reader-chip-result')).toContainText('一覧と持ち主は確認済み');await expect(page.locator('#reader-chip-result')).toContainText('アイコンは未判定または空欄');expect((await snapshot(page)).members.find(m=>m.id==='105').chips).toEqual(['30']);
});

test('08: a visible large chip grid with an unknown header reports missing ownership without assigning another party member',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'18',slot:1},{id:'3',slot:2},{id:'106',slot:3}]}));await readFixture(page,'status-184601');const before=await snapshot(page);
 const o=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();const c=ScreenReaderVision.normalize(im),ctx=c.statusFrame.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(427,80,51,50);return ScreenReaderVision.analyze(c);},fixture('status-184601'));
 expect(o.chipRead).toMatchObject({stage:'owner'});expect(o.chipRead.matchedRims).toBeGreaterThanOrEqual(7);expect(o.chipOwnerId).toBeNull();expect(o.chipIds).toEqual([]);
 await page.evaluate(o=>ScreenReaderCharacterBridge.apply(o),o);expect((await snapshot(page)).members.map(m=>m.chips)).toEqual(before.members.map(m=>m.chips));
});

test('08: printed status name owns parameters and chips independently of the pixel portrait and current self',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'105',members:[{id:'105',slot:0},{id:'13',slot:1},{id:'20',slot:2},{id:'2',slot:3}]}));
 await readFixture(page,'status-name-kaisei');await expect(page.locator('#reader-chip-result')).toContainText('カイセイのチップ（名前で判定）');
 const outputs=await page.evaluate(async({name,other})=>{
  const images=await Promise.all([name,other].map(async src=>{const im=new Image();im.src=src;await im.decode();return ScreenReaderVision.normalize(im);}));
  const out=[];
  for(const portrait of ['hidden','different']){
   const c=ScreenReaderVision.normalize(images[0]),ctx=c.getContext('2d');
   // images[0] already has legacy-stretched geometry; use its centered panel.
   const target=images[0].statusFrame||images[0];ctx.drawImage(target,0,0);
   ctx.fillStyle='#141414';ctx.fillRect(427,80,51,50);
   if(portrait==='different')ctx.drawImage(images[1].statusFrame||images[1],431,84,43,42,431,84,43,42);
   ctx.drawImage(images[1].statusFrame||images[1],517,334,36,36,517,334,36,36);
   const observation=ScreenReaderVision.analyze(c);ScreenReaderCharacterBridge.apply(observation);out.push(observation);
  }
  return out;
 },{name:fixture('status-name-kaisei'),other:fixture('status-184601')});
 for(const o of outputs){expect(o.chipOwnerId).toBe('13');expect(o.chipRead.ownerSource).toBe('name');expect(o.chipIds).toEqual(['42']);expect(o.members.find(m=>m.id==='13')).toMatchObject({atk:1,def:1});expect(o.members.find(m=>m.id==='13').move).toBeUndefined();expect(o.selfId).toBeNull();}
 const s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members.map(m=>m.id)).toEqual(['105','13','20','2']);expect(s.members[1].chips).toEqual(['42']);expect(s.members[0].chips).toEqual([]);
});

test('08: status names require a real grid and visible unknown text cannot fall back to a portrait',async({page})=>{
 await open(page);
 const outputs=await page.evaluate(async src=>{
  const im=new Image();im.src=src;await im.decode();const out={};
  for(const kind of ['normal','no-grid','unknown','cropped']){
   const frame=ScreenReaderVision.normalize(im),target=frame.statusFrame||frame,ctx=target.getContext('2d');
   if(kind==='no-grid'){ctx.fillStyle='#141414';ctx.fillRect(465,324,286,184);ctx.fillRect(427,80,51,50);}
   if(kind==='unknown'){ctx.fillStyle='#141414';ctx.fillRect(593,178,400,44);ctx.fillStyle='white';ctx.fillRect(610,185,180,28);}
   if(kind==='cropped'){ctx.fillStyle='#141414';ctx.fillRect(593,178,400,44);ctx.fillStyle='white';ctx.fillRect(593,184,70,30);}
   out[kind]=ScreenReaderVision.analyze(frame);
  }
  return out;
 },fixture('status-name-kaisei'));
 expect(outputs.normal.chipOwnerId).toBe('13');expect(outputs.normal.chipIds).toEqual([]);
 for(const kind of ['no-grid','unknown','cropped']){expect(outputs[kind].chipOwnerId,kind).toBeNull();expect(outputs[kind].chipIds,kind).toEqual([]);}
 expect(outputs.unknown.chipRead.stage).toBe('owner');expect(outputs.cropped.chipRead.stage).toBe('owner');
});

for(const [name,owner,chip,def] of [['sherry','106','52',1],['luka','17','1',2]])test('08: zoomed status '+name+' aligns by panel anchors and reads the owner, chip and parameters',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'106',slot:0},{id:'17',slot:1},{id:'105',slot:2},{id:'13',slot:3}]}));
 await readFixture(page,'live-status-'+name);const s=await snapshot(page),m=s.members.find(m=>m.id===owner);expect(m.chips).toEqual([chip]);expect([m.atk,m.def]).toEqual([3,def]);expect(s.selfId).toBe('');
 const outputs=await page.evaluate(async({src,owner})=>{
  const im=new Image();im.src=src;await im.decode();const out=[];
  for(const scale of [1,.75]){
   const c=document.createElement('canvas');c.width=Math.round(im.width*scale)+150;c.height=Math.round(im.height*scale)+100;const ctx=c.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,85,45,im.width*scale,im.height*scale);
   const frame=ScreenReaderVision.normalize(c),o=ScreenReaderVision.analyze(frame);out.push(o);
   const panel=ScreenReaderVision.statusPanel(frame).source,p=panel.getContext('2d');p.fillStyle='#141414';p.fillRect(427,80,51,50);
   // The printed name remains sufficient when its outfit portrait is absent.
   out.push(ScreenReaderVision.analyze(frame));
  }
  return out;
 },{src:fixture('live-status-'+name),owner});
 for(const o of outputs){expect(o.chipOwnerId).toBe(owner);expect(o.chipIds).toEqual([chip]);expect(o.chipRead.aligned).toBe(true);expect(o.chipRead.matchedRims).toBeGreaterThanOrEqual(7);expect(o.members.find(m=>m.id===owner)).toMatchObject({atk:3,def});expect(o.members.find(m=>m.id===owner).currentHp).toBeUndefined();}
});

test('08: fast-changing HP attack and defense follow each readable observation after identity confirmation',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();
 const states=await page.evaluate(()=>{
  ScreenReaderCharacterBridge.apply({selfId:'105',members:[{id:'105',slot:0},{id:'13',slot:1}]});
  const states=[];
  for(const [hp,atk,def] of [[9,1,1],[8,3,2],[7,5,4],[6,2,1]]){
   const accepted=ScreenReaderController.stabilize({members:[{id:'105',slot:0,currentHp:hp,maxHp:10,atk,def}],selfId:'105',chipOwnerId:null,chipIds:[]});ScreenReaderCharacterBridge.apply(accepted);states.push({accepted,snapshot:ScreenReaderCharacterBridge.snapshot()});
  }
  return states;
 });
 expect(states[0].accepted.members).toEqual([]);
 for(const [i,hp,atk,def] of [[1,8,3,2],[2,7,5,4],[3,6,2,1]])expect(states[i].snapshot.members[0]).toMatchObject({currentHp:hp,atk,def});
 const missing=await page.evaluate(()=>{ScreenReaderCharacterBridge.apply(ScreenReaderController.stabilize({members:[{id:'105',slot:0}],selfId:'105',chipOwnerId:null,chipIds:[]}));return ScreenReaderCharacterBridge.snapshot();});expect(missing.members[0]).toMatchObject({currentHp:6,atk:2,def:1});
});

test('08: zoomed status alignment rejects a divider and status-colored tab without a chip grid',async({page})=>{
 await open(page);
 const o=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1536;c.height=709;const ctx=c.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='white';ctx.fillRect(100,350,1200,3);ctx.fillStyle='#78ff20';ctx.fillRect(100,20,360,80);return ScreenReaderVision.analyze(c);});
 expect(o.chipRead.aligned).toBe(false);expect(o.chipOwnerId).toBeNull();expect(o.chipIds).toEqual([]);
});

for(const [name,owner,chips] of [['luka','17',['1','41','6','42','43']],['parunan','2',['29','30','44']]])test('08: chip grid '+name+' reads every supplied occupied position and preserves additions',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'2',slot:0},{id:'20',slot:1},{id:'106',slot:2},{id:'17',slot:3}]}));
 await readFixture(page,'chip-grid-'+name);let s=await snapshot(page);expect(s.members.find(m=>m.id===owner).chips).toEqual(chips);
 await readFixture(page,name==='luka'?'live-status-luka':'chip-grid-luka');s=await snapshot(page);expect(s.members.find(m=>m.id===owner).chips).toEqual(chips);
});

test('08: chip artwork uses real foreground and rarity independently of the reviewed color samples',async({page})=>{
 await open(page);
 const outputs=await page.evaluate(async images=>{
  const out=[];
  for(const [src,slots]of images){const im=new Image();im.src=src;await im.decode();const panel=ScreenReaderVision.statusPanel(ScreenReaderVision.normalize(im)).source;for(const [x,y,id]of slots)out.push({id,actual:ScreenReaderChipShape.match(panel,x,y)?.id??null});}
  return out;
 },[[fixture('chip-grid-luka'),[[535,352,'1'],[609,352,'41'],[495,416,'42'],[570,416,'43']]],[fixture('chip-grid-parunan'),[[535,352,'29'],[609,352,'30'],[682,352,'44']]]]);
 for(const result of outputs)expect(result.actual,result.id).toBe(result.id);
});

test('08: chip artwork distinguishes shared raw illustrations by blue, purple and gold rings',async({page})=>{
 await open(page);
 const outputs=await page.evaluate(async()=>{
  const groups=[['Attack',['1','2','3']],['Gold',['26','27','28']],['50030',['34','41',null]],['50010',[null,'42','43']],['Heal',['44',null,'45']]],colors=['#00baff','#cf00ff','#ffcb00'],out=[];
  for(const [file,ids]of groups){
   const im=new Image();im.src='/images/UT_Relic/UT_Relic_'+file+'.png';await im.decode();
   for(let i=0;i<ids.length;i++)if(ids[i])for(const size of [38,42,46]){
    const c=document.createElement('canvas');c.width=c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#171717';ctx.fillRect(0,0,80,80);ctx.strokeStyle=colors[i];ctx.lineWidth=6;ctx.beginPath();ctx.arc(40,40,23,0,Math.PI*2);ctx.stroke();ctx.drawImage(im,(80-size)/2,(80-size)/2,size,size);
    out.push({id:ids[i],size,actual:ScreenReaderChipShape.match(c,40,40)?.id??null});
   }
  }
  return out;
 });
 expect(outputs).toHaveLength(36);
 // Thin outlines can legitimately be held at one renderer/scale. Each
 // identity must be recognized at a supported size, with no wrong IDs at any.
 for(const result of outputs)if(result.actual!==null)expect(result.actual,JSON.stringify(result)).toBe(result.id);
 for(const id of new Set(outputs.map(r=>r.id)))expect(outputs.some(r=>r.id===id&&r.actual===id),JSON.stringify(outputs.filter(r=>r.id===id))).toBe(true);
});

test('08: chip grid reads the first item in all ten slots and retains an earlier page',async({page})=>{
 await open(page);await page.locator('#reader-new-game').click();await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'2',slot:0}]}));
 const outputs=await page.evaluate(async src=>{
  const im=new Image();im.src=src;await im.decode();const panel=ScreenReaderVision.statusPanel(ScreenReaderVision.normalize(im)).source,centers=[[535,352],[609,352],[682,352],[495,416],[570,416],[644,416],[719,416],[535,481],[609,481],[682,481]],out=[];
  for(const [x,y]of centers){
   const c=document.createElement('canvas');c.width=1536;c.height=709;const ctx=c.getContext('2d');ctx.drawImage(panel,0,0);
   for(const [xx,yy]of centers)ctx.drawImage(panel,591,463,36,36,xx-18,yy-18,36,36);
   ctx.drawImage(panel,517,334,36,36,x-18,y-18,36,36);
   const observation=ScreenReaderVision.analyze(ScreenReaderVision.normalize(c));ScreenReaderCharacterBridge.apply(observation);out.push(observation);
  }
  return out;
 },fixture('chip-grid-parunan'));
 for(const o of outputs){expect(o.chipOwnerId).toBe('2');expect(o.chipIds).toEqual(['29']);}
 await readFixture(page,'chip-grid-parunan');expect((await snapshot(page)).members.find(m=>m.id==='2').chips).toEqual(['29','30','44']);
});

test('08: chip artwork holds empty highlighted slots and unknown artwork instead of a weak color guess',async({page})=>{
 await open(page);
 const results=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=c.height=80;const ctx=c.getContext('2d'),out=[];
  for(const kind of ['highlight','unknown']){ctx.fillStyle='#00bbff';ctx.fillRect(0,0,80,80);if(kind==='unknown'){ctx.fillStyle='white';ctx.beginPath();ctx.arc(40,40,22,0,Math.PI*2);ctx.fill();}out.push(ScreenReaderChipShape.match(c,40,40));}
  return out;
 });expect(results).toEqual([null,null]);
});

const autumnLive=require('./fixtures/screen-reader/autumn-live-sequence.json');
test('08: short autumn replay preserves four identities without reading a clipped 10 as zero',async({page})=>{
 await open(page);
 const results=await page.evaluate(async rows=>{
  const out=[];for(const row of rows){const im=new Image();im.src=row.image;await im.decode();out.push(ScreenReaderVision.analyze(ScreenReaderVision.normalize(im)));}return out;
 },autumnLive.hud);
 for(const result of results){expect(result.members.map(m=>m.id)).toEqual(autumnLive.party);expect(result.members[0].currentHp).not.toBe(0);}
 // open() already opens the reader; keep it open for the controls.
 // Both automatic observations must identify Sykes before fixing the order.
 await page.locator('#reader-details').evaluate(e=>e.open=true);await page.locator('#reader-apply').uncheck();
 await page.locator('#reader-file').setInputFiles({name:'hud.png',mimeType:'image/png',buffer:Buffer.from(autumnLive.hud[0].image.split(',')[1],'base64')});await expect(page.locator('#reader-file')).toHaveValue('');await page.locator('#reader-apply').check();
 await page.evaluate(async()=>{await ScreenReaderController.read(true);await ScreenReaderController.read(true);});
 expect((await page.evaluate(()=>ScreenReaderCharacterBridge.snapshot())).members.map(m=>m.id)).toEqual(autumnLive.party);
 await expect(page.locator('#reader-party-status')).toContainText('PT確定');
});

test.afterEach(async({page},info)=>{
 if(info.title.includes('monster text tooltip')&&info.status!==info.expectedStatus)await page.screenshot({path:info.outputPath('monster-failure.png')});
});

async function openMonsterText(page,map='MAP0105',offline=false){
 if(offline){const {pathToFileURL}=require('url');const path=require('path');await page.goto(pathToFileURL(path.resolve(__dirname,'../08_screen_reader/index.html')).href);}
 else await page.goto('/08_screen_reader/');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption(map);await page.locator('#mp-tab-monsters').click();
}

test('08: monster text tooltip follows difficulty and also works on roster cards',async({page})=>{
 await openMonsterText(page);const tile=page.locator('.mp-monster[data-id="M0120"]'),tip=page.locator('#monster-tooltip');
 for(const [level,threshold] of [['普通',72],['困難',78],['悪夢',84],['狂気',90]]){
  await page.locator('#mp-difficulty').selectOption(level);await tile.focus();await expect(tip).toBeVisible();
  await expect(tip).toContainText('キッズガオー');await expect(tip.locator('.monster-skill-meta')).toContainText(level);
  await expect(tip).toContainText('60%（'+threshold+'）以下');await expect(tip).toContainText('仲間を呼ぼう［CT 3］');
  await expect(tip.locator('.character-skill-stats img')).toHaveCount(4);await expect(tip.locator('img[src*="MonsterInfo"]')).toHaveCount(0);
  expect(await tip.locator('.character-skill-text strong').count()).toBe(4);
  await page.keyboard.press('Escape');await expect(tip).toBeHidden();
 }
 await tile.click();const card=page.locator('#map-roster-list .roster-card[data-id="M0120"]').first();await card.hover();
 await expect(tip).toContainText('60%（90）以下');await expect(card).toHaveAttribute('aria-describedby','monster-tooltip');
 await page.locator('#mp-map-select').selectOption('MAP0001');await expect(tip).toBeHidden();
});

test('08: monster text tooltip retains readable long text and viewport bounds',async({page})=>{
 await openMonsterText(page,'MAP0104');const tile=page.locator('.mp-monster[data-id="M0116"]'),tip=page.locator('#monster-tooltip');
 for(const viewport of [{width:1280,height:800},{width:760,height:560}]){
  await page.setViewportSize(viewport);await tile.scrollIntoViewIfNeeded();await tile.hover();await expect(tip).toContainText('証拠の否認［CT 3］');
  const box=await tip.boundingBox();expect(box.x).toBeGreaterThanOrEqual(7);expect(box.y).toBeGreaterThanOrEqual(7);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width-7);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height-7);
  await tip.hover();await page.screenshot({path:test.info().outputPath('monster-before-scroll-'+viewport.width+'.png')});await page.mouse.wheel(0,2400);await expect.poll(()=>tip.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await expect(tip).toBeVisible();
  await tip.evaluate(el=>el.scrollTop=0);await page.screenshot({path:test.info().outputPath('monster-text-'+viewport.width+'.png')});
  await page.keyboard.press('Escape');await expect(tip).toBeHidden();
 }
});

test('08: monster text tooltip uses the bundled CSV snapshot through file protocol',async({page})=>{
 await openMonsterText(page,'MAP0105',true);await page.locator('#mp-difficulty').selectOption('悪夢');
 await page.locator('.mp-monster[data-id="M0123"]').focus();const tip=page.locator('#monster-tooltip');
 await expect(tip).toContainText('ファイナルカウント');await expect(tip).toContainText('50%（5）以下');
});

test('08: monster text tooltip safely renders CSV text and states missing descriptions',async({page})=>{
 await openMonsterText(page);const values=await page.evaluate(()=>{
  const render=ability=>{const box=document.createElement('div');box.append(createMonsterSkillTooltipView({'モンスター名':'試験','難易度':'普通','能力':ability}, {},()=>{}));return {text:box.textContent,scripts:box.querySelectorAll('script').length,headings:box.querySelectorAll('.character-skill-text strong').length};};
  return {missing:render(''),literal:render('スキル - <script>alert(1)</script>\n本文')};
 });
 expect(values.missing.text).toContain('説明は未登録です。');expect(values.literal.text).toContain('<script>alert(1)</script>');expect(values.literal.scripts).toBe(0);expect(values.literal.headings).toBe(1);
});

for(const protocol of ['http','file'])test('08 autumn icon stacks: derived attack, strict counter boundary, low-HP owl and self-only attention '+protocol,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(protocol==='file'?require('url').pathToFileURL(require('path').resolve('08_screen_reader/index.html')).href:'/08_screen_reader/');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-map-select').selectOption('MAP0105');
 await page.getByRole('button',{name:'3 のイベントを実行',exact:true}).click();
 const gao=page.locator('#map-roster-list .roster-card[data-id="M0120"]'),energy=gao.locator('.roster-status-energyStacks button'),attack=gao.getByLabel('キッズガオーの攻撃力',{exact:true}),hp=gao.getByLabel('キッズガオーの残りHP',{exact:true});
 await expect(gao.locator('.roster-gao-start,.roster-gao-battle')).toHaveCount(0);await expect(energy.locator('img')).toHaveAttribute('src',/UT_Buff_1071_01.png$/);
 await energy.click();await expect(attack).toHaveValue('2');await energy.click();await expect(attack).toHaveValue('4');await energy.click({button:'right'});await expect(attack).toHaveValue('2');
 await attack.fill('10');await attack.dispatchEvent('change');await energy.click();await expect(attack).toHaveValue('12');await page.locator('#roster-undo').click();await expect(attack).toHaveValue('10');
 for(const [value,counter] of [[61,false],[60,false],[59,true],[60,false]]){await hp.fill(String(value));await hp.dispatchEvent('change');await expect(gao.getByAltText('反撃可能')).toHaveCount(counter?1:0);}
 await page.locator('#mp-tab-monsters').click();await page.locator('.mp-monster[data-id="M0122"]').click();await page.locator('.mp-monster[data-id="M0122"]').click();await page.locator('.mp-monster[data-id="M0123"]').click();
 const dinos=page.locator('#map-roster-list .roster-card[data-id="M0122"]'),dino=dinos.last(),anger=dino.locator('.roster-status-angerStacks button'),dinoAttack=dino.locator('input[aria-label$="の攻撃力"]'),base=Number(await dinoAttack.inputValue());
 const other=await dinos.first().locator('input[aria-label$="の攻撃力"]').inputValue();await expect(anger.locator('img')).toHaveAttribute('src',/UT_Buff_1072.png$/);
 await anger.click();await anger.click();await expect(dinoAttack).toHaveValue(String(base+2));await expect(dinos.first().locator('input[aria-label$="の攻撃力"]')).toHaveValue(other);
 await dinoAttack.fill('20');await dinoAttack.dispatchEvent('change');await anger.click({button:'right'});await expect(dinoAttack).toHaveValue('19');await page.locator('#roster-undo').click();await expect(dinoAttack).toHaveValue('20');
 const owl=page.locator('#map-roster-list .roster-card[data-id="M0123"]').last(),owlHp=owl.locator('input[aria-label$="の残りHP"]');
 for(const [value,active] of [[5,false],[4,true],[3,true],[5,false]]){await owlHp.fill(String(value));await owlHp.dispatchEvent('change');await expect(owl.locator('.roster-owl-low-hp')).toHaveCount(active?1:0);}
 await page.locator('.role-tab[data-role="character"]').click();await page.locator('#selected-self-tab').click();
 const attention=page.locator('#selected-character-conditions').getByRole('button',{name:'ミミにガオーの注目を付与',exact:true}),defense=page.locator('#selected-character-def'),move=page.locator('#selected-character-move'),def0=Number(await defense.inputValue()),move0=Number(await move.textContent());
 await expect(attention.locator('img')).toHaveAttribute('src',/UT_Buff_1071_02.png$/);await attention.click();await expect(attention).toContainText('2T');await expect(defense).toHaveValue(String(Math.max(0,def0-1)));await expect(move).toHaveText(String(move0-1));
 await attention.click();await expect(defense).toHaveValue(String(Math.max(0,def0-1)));
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#turn-end').click();await page.locator('.role-tab[data-role="character"]').click();await expect(attention).toContainText('1T');
 await attention.click({button:'right'});await expect(defense).toHaveValue(String(def0));await expect(move).toHaveText(String(move0));
 await page.screenshot({path:'artifacts/autumn-attention-'+protocol+'-'+test.info().project.name+'.png'});
 await page.locator('#selected-party-tab').click();await expect(page.locator('#selected-party-grid .autumn-attention')).toHaveCount(0);
 await page.locator('.role-tab[data-role="map"]').click();await expect.poll(()=>gao.locator('.roster-autumn-controls img').evaluateAll(imgs=>imgs.every(im=>im.complete&&im.naturalWidth>0))).toBe(true);
 expect(await energy.locator('img').evaluate(im=>{const r=im.getBoundingClientRect();return r.width<=25&&r.height<=25;})).toBe(true);
 await hp.fill('59');await hp.dispatchEvent('change');await owlHp.fill('4');await owlHp.dispatchEvent('change');
 await page.screenshot({path:'artifacts/autumn-icons-'+protocol+'-'+test.info().project.name+'.png',fullPage:true});expect(errors).toEqual([]);
});
