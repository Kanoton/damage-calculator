const {test,expect}=require('@playwright/test');
const {selectCharacter}=require('../test-helpers/07-ui');
const {pathToFileURL}=require('url');
const path=require('path');
for(const [name,viewport] of [['desktop',{width:1280,height:720}],['wide',{width:1920,height:1080}],['mobile',{width:390,height:844}]]){
 for(const protocol of ['http','file'])test(`v1p3 ${name} ${protocol}: startup, images, HP chip and skill`,async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.setViewportSize(viewport);
  await page.goto(protocol==='file'?pathToFileURL(path.resolve(__dirname,'../v1p3/index.html')).href:'/v1p3/');
  await expect(page.locator('#mp-map-select')).toHaveValue('MAP0001');
  await selectCharacter(page,'7');
  const hp=page.locator('#selected-character-current-hp'),atk=page.locator('#selected-character-atk');
  await hp.fill('4');await hp.dispatchEvent('change');
  await page.locator('#character-chip-tab').click();await page.locator('.chip-category-tabs [data-category="共通"]').click();
  await page.locator('.chip-select[data-id="7"]').click();
  await expect(hp).toHaveValue('6');await expect(hp).toHaveAttribute('max','12');await expect(atk).toHaveValue('5');
  await hp.fill('7');await hp.dispatchEvent('change');await expect(atk).toHaveValue('2');
  await page.locator('#selected-character-skill').click();await expect(atk).toHaveValue('5');
  await expect(page.locator('#selected-character-ct')).toHaveText('CT 3 / 3');
  await expect.poll(()=>page.locator('#selected-character-image').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  await expect.poll(()=>page.locator('.chip-select[data-id="7"] img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);await info.attach(`v1p3-${name}-${protocol}`,{body:await page.screenshot(),contentType:'image/png'});
 });
}
