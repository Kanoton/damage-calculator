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

test('08: initializes independently without script errors and keeps PT dimensions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 expect((await snapshot(page)).selfId).toBe('1');await expect(page.locator('#reader-read')).toBeDisabled();
 await page.locator('.role-tab[data-role="character"]').click();
 expect((await page.locator('#selected-character').boundingBox()).height).toBe(118);expect(errors).toEqual([]);
});

test('08: recognizes sanitized real game frames, adds chips to their owners and updates observed stats',async({page})=>{
 await open(page);await readFixture(page,'6248');let s=await snapshot(page);
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

test('08: partial observations preserve invisible chips, unknown stats and self identity',async({page})=>{
 await open(page);await readFixture(page,'6248');
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'13',slot:1,coin:19,currentHp:4}],chipOwnerId:'105',chipIds:['30','30','not-a-chip']}));
 let s=await snapshot(page);expect(s.selfId).toBe('105');expect(s.members[0].chips).toEqual(['30']);expect(s.members[1].currentHp).toBe(4);expect(s.members[1].coin).toBe(19);expect(s.members[1].maxHp).toBe(10);
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({members:[{id:'105',slot:0,maxHp:13,currentHp:12,atk:5,move:6}],chipOwnerId:null,chipIds:[]}));
 s=await snapshot(page);expect([s.members[0].maxHp,s.members[0].currentHp,s.members[0].atk,s.members[0].move]).toEqual([13,12,5,6]);
 await page.locator('#reader-new-game').click();s=await snapshot(page);expect(s.members[0].level).toBe(0);expect(s.members[0].chips).toEqual([]);expect(s.members.slice(1).every(m=>!m.id)).toBe(true);expect(s.members[0].maxHp).toBe(9);
});

test('08: automatic stabilization requires consecutive matching observations for each field',async({page})=>{
 await open(page);
 const r=await page.evaluate(()=>{const c=ScreenReaderController,o={members:[{id:'13',slot:1,currentHp:8,maxHp:10,coin:12}],selfId:'105',chipOwnerId:'13',chipIds:['26']};return [c.stabilize(o),c.stabilize(o),c.stabilize({...o,members:[{...o.members[0],currentHp:7}]}),c.stabilize({...o,members:[],chipIds:[]}),c.stabilize(o)];});
 expect(r[0].members).toEqual([]);expect(r[0].chipIds).toEqual([]);expect(r[1].members[0].currentHp).toBe(8);expect(r[1].chipIds).toEqual(['26']);expect(r[2].members[0].currentHp).toBeUndefined();expect(r[4].members).toEqual([]);expect(r[4].chipIds).toEqual([]);
});

test('08: window capture reads real video frames, auto updates and stops tracks',async({page})=>{
 await open(page);
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
