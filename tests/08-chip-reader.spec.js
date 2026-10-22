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

for(const protocol of ['http','file'])for(const [width,height] of [[1000,1400],[1920,1080]])test(`08: chip artwork reads Parunan recommendation and friendship badge at ${width}x${height} ${protocol}`,async({page})=>{
 await page.setViewportSize({width,height});
 await page.goto(protocol==='file'?'file://'+require('path').resolve(__dirname,'../08_screen_reader/index.html'):'/08_screen_reader/');
 await page.locator('#reader-toggle').click();await page.waitForFunction(()=>window.ScreenReaderCharacterBridge?.catalog().characters.length===35);
 await page.locator('#reader-new-game').click();
 await page.evaluate(()=>ScreenReaderCharacterBridge.apply({selfId:'13',members:[{id:'13',slot:0},{id:'2',slot:1},{id:'16',slot:2},{id:'20',slot:3}],chipOwnerId:'2',chipIds:['29']}));
 const actual=await page.evaluate(async image=>{const im=new Image();im.src=image;await im.decode();return ScreenReaderVision.analyze(ScreenReaderVision.normalize(im));},fixture('chip-grid-parunan-20261022'));
 expect(actual.chipOwnerId).toBe('2');expect(actual.chipIds).toEqual(['16','50']);expect(actual.chipRead.matchedRims).toBe(10);
 await readFixture(page,'chip-grid-parunan-20261022');
 const first=await snapshot(page);expect(first.selfId).toBe('13');expect(first.members.find(m=>m.id==='2').chips).toEqual(['29','16','50']);expect(first.members.find(m=>m.id==='13').chips).toEqual([]);
 await readFixture(page,'chip-grid-parunan-20261022');const again=await snapshot(page);expect(again.members.find(m=>m.id==='2').chips).toEqual(['29','16','50']);expect(again.selfId).toBe('13');
});

