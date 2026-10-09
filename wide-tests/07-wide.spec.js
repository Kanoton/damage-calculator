const {test,expect}=require('@playwright/test');
async function select(page,id){await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();}
async function bounds(page){return page.evaluate(()=>{const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};return {main:rect('.main-container'),round:rect('#round-progress-controls'),self:rect('#selected-character'),roster:rect('.map-roster'),overflowX:document.documentElement.scrollWidth>innerWidth+1,overflowY:document.documentElement.scrollHeight>innerHeight+1};});}
test('FHD: left main and right controls fit the viewport in all four modes',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/07_skill/');await select(page,'1');
 for(const role of ['map','character','attack','defense']){
  await page.locator(`.role-tab[data-role="${role}"]`).click();const b=await bounds(page);expect(b.overflowX).toBe(false);expect(b.overflowY).toBe(false);expect(b.round.x).toBe(b.main.x);expect(b.round.bottom).toBeLessThanOrEqual(b.main.y);expect(b.self.width).toBeGreaterThan(650);expect(b.self.y).toBeGreaterThanOrEqual(b.roster.bottom);expect(b.roster.bottom).toBeLessThanOrEqual(1080);expect(b.self.height).toBe(118);
  if(role==='map'){const header=await page.evaluate(()=>{const a=document.querySelector('.mp-filters').getBoundingClientRect(),b=document.querySelector('.mp-subtabs').getBoundingClientRect();return {overlap:a.x<b.right,aligned:Math.abs(a.y-b.y)<10};});expect(header.overlap).toBe(false);expect(header.aligned).toBe(true);}
  await page.mouse.move(0,0);await info.attach('fhd-'+role,{body:await page.screenshot(),contentType:'image/png'});
 }
 expect(errors).toEqual([]);
});
test('wide resize: state survives switching to portrait, narrow desktop and back',async({page})=>{
 await page.goto('/07_skill/');await select(page,'106');const f=page.getByLabel('推理タイムの数');await f.fill('3');await f.dispatchEvent('change');await page.locator('#selected-character-ct').click({button:'right'});
 await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="8"]').click();
 const before=await page.evaluate(()=>({self:captureCharacterAbilityState(),party:getPartyCharacterIds(),round:document.getElementById('current-round').textContent}));
 for(const viewport of [{width:1080,height:1920},{width:1366,height:768},{width:1600,height:1200},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const b=await bounds(page);expect(b.overflowX).toBe(false);
  if(viewport.width===1920)expect(b.self.x).toBeGreaterThan(b.main.right);else expect(b.self.y).toBeGreaterThanOrEqual(b.main.bottom);
  expect(await page.evaluate(()=>({self:captureCharacterAbilityState(),party:getPartyCharacterIds(),round:document.getElementById('current-round').textContent}))).toEqual(before);
 }
});
test('FHD: monster scrolling and numeric edits/Undo remain independent from left panel',async({page})=>{
 await page.goto('/07_skill/');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();await page.locator('#mp-map-select').selectOption('MAP0104');await page.locator('#roster-clear').click();
 for(let i=0;i<15;i++)await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const cards=page.locator('.roster-card');const first=await cards.nth(0).boundingBox(),second=await cards.nth(1).boundingBox();expect(second.x).toBeGreaterThan(first.x);expect(second.y).toBe(first.y);
 const list=page.locator('#map-roster-list');expect(await list.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);await list.evaluate(e=>e.scrollTop=e.scrollHeight);expect(await list.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);expect((await bounds(page)).overflowY).toBe(false);
 const hp=page.locator('.roster-card').first().getByRole('spinbutton',{name:/残りHP$/}),before=await hp.inputValue();await hp.fill(String(Number(before)-1));await hp.dispatchEvent('change');await page.locator('#roster-undo').click();await expect(hp).toHaveValue(before);
});
