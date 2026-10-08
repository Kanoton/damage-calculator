const {test,expect}=require('@playwright/test');
const fixture=n=>require('./fixtures/screen-reader/'+n+'.json').image;

async function open(page){await page.goto('/08_screen_reader/');await page.waitForFunction(()=>window.ScreenReaderCharacterBridge?.catalog().characters.length===35);await expect(page.locator('#reader-self option')).toHaveCount(36);}
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
 await readFixture(page,'6251');s=await snapshot(page);expect([s.members[0].atk,s.members[0].def,s.members[0].move]).toEqual([1,2,4]);expect(s.members[2].currentHp).toBe(9);
 await readFixture(page,'6252');s=await snapshot(page);expect([s.members[1].atk,s.members[1].def,s.members[1].move]).toEqual([1,1,5]);expect(s.members[1].chips).toEqual(['26']);expect(s.members[0].chips).toEqual(['30']);
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
