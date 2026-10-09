const {test,expect}=require('@playwright/test');
async function select(page,id){await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();}
async function bounds(page){return page.evaluate(()=>{const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};return {main:rect('.main-container'),round:rect('#round-progress-controls'),self:rect('#selected-character'),roster:rect('.map-roster'),overflowX:document.documentElement.scrollWidth>innerWidth+1,overflowY:document.documentElement.scrollHeight>innerHeight+1};});}
test('FHD: left main and right controls fit the viewport in all four modes',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/07_skill/');await select(page,'1');
 for(const role of ['map','character','attack','defense']){
  await page.locator(`.role-tab[data-role="${role}"]`).click();const b=await bounds(page);expect(b.overflowX).toBe(false);expect(b.overflowY).toBe(false);expect(b.round.x).toBe(b.main.x);expect(b.round.bottom).toBeLessThanOrEqual(b.main.y);expect(b.self.width).toBeGreaterThan(650);expect(b.self.y).toBeGreaterThanOrEqual(b.roster.bottom);expect(b.roster.bottom).toBeLessThanOrEqual(1080);expect(b.self.height).toBe(118);
  const tab=await page.locator(`.role-tab[data-role="${role}"]`).boundingBox();expect(Math.abs(tab.y+tab.height-b.main.y-3)).toBeLessThan(1);
  const borders=await page.evaluate(()=>({tab:getComputedStyle(document.querySelector('.role-tab.active')).borderTopColor,bottom:getComputedStyle(document.querySelector('.role-tab.active')).borderBottomColor,panel:getComputedStyle(document.querySelector('.main-container')).borderTopColor}));expect(borders.tab).toBe(borders.panel);expect(borders.bottom).toBe(borders.panel);
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
 const outer=await page.locator('.map-roster').boundingBox();const gaps=[first.x-outer.x,second.x-first.x-first.width,outer.x+outer.width-second.x-second.width];expect(Math.max(...gaps)-Math.min(...gaps)).toBeLessThanOrEqual(2.1);
 const list=page.locator('#map-roster-list');expect(await list.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);await list.evaluate(e=>e.scrollTop=e.scrollHeight);expect(await list.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);expect((await bounds(page)).overflowY).toBe(false);
 const firstCard=page.locator('.roster-card').first();for(const [label,value] of [['攻撃力','99'],['防御力','99'],['残りHP','999']]){const input=firstCard.getByRole('spinbutton',{name:new RegExp(label+'$')});await input.fill(value);await input.dispatchEvent('change');}
 const row=await firstCard.locator('.roster-stats').evaluate(e=>({ys:[...e.children].map(c=>c.getBoundingClientRect().y),fits:[...e.children].every(c=>c.scrollWidth<=c.clientWidth+1)}));expect(new Set(row.ys).size).toBe(1);expect(row.fits).toBe(true);
 const hp=page.locator('.roster-card').first().getByRole('spinbutton',{name:/残りHP$/}),before=await hp.inputValue();await hp.fill(String(Number(before)-1));await hp.dispatchEvent('change');await page.locator('#roster-undo').click();await expect(hp).toHaveValue(before);
});

test('wide chips: original charge action works in dialog and survives close/resize',async({page},info)=>{
 await page.goto('/07_skill/');await select(page,'6');
 await page.locator('#character-chip-tab').click();await page.locator('#chip-category-3').click();
 const chip=page.locator('.chip-select[data-name="エネルギー回収"]');await chip.click();
 await page.locator('#wide-chip-open').click();
 const dialog=page.locator('.wide-chip-dialog');await expect(dialog).toBeVisible();await info.attach('wide-chip-dialog',{body:await page.screenshot(),contentType:'image/png'});
 await dialog.locator('.selected-chip.is-actionable').first().click();
 await expect(page.getByLabel('チャージの数',{exact:true})).toHaveValue('2');
 await page.mouse.click(10,100);await expect(dialog).not.toBeVisible();
 await page.locator('#wide-chip-open').click();await page.setViewportSize({width:1080,height:1920});await expect(dialog).not.toBeVisible();
 await expect(page.locator('#selected-character-chips .selected-chip')).toBeVisible();
});

test('PT chip buttons show each member ownership without changing self chips',async({page},info)=>{
 await page.goto('/07_skill/');await select(page,'6');
 await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="8"]').click();
 await expect(page.locator('.party-member-slot[data-character-id="8"] .party-chip-count')).toHaveText('×0');
 await page.locator('.party-member-slot[data-character-id="8"]').click();await page.locator('#character-chip-tab').click();await page.locator('#chip-category-3').click();await page.locator('.chip-select[data-name="エネルギー回収"]').click();
 await expect(page.locator('.party-member-slot[data-character-id="8"] .party-chip-count')).toHaveText('×1');
 await page.locator('.chip-select[data-name="エナジーソード"]').click();await expect(page.locator('.party-member-slot[data-character-id="8"] .party-chip-count')).toHaveText('×2');
 const before=await page.evaluate(()=>captureCharacterAbilityState());
 await page.getByRole('button',{name:'レンの取得チップを表示',exact:true}).click();const dialog=page.locator('.wide-chip-dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading')).toHaveText('レンの取得チップ');await expect(dialog.getByAltText('エネルギー回収',{exact:true})).toBeVisible();await expect(dialog.locator('.is-actionable')).toHaveCount(0);
 const b=await dialog.boundingBox();expect(b.x+b.width).toBeGreaterThan(1850);expect(b.y+b.height).toBeGreaterThan(1000);await info.attach('pt-chip-popup',{body:await page.screenshot(),contentType:'image/png'});
 await dialog.getByRole('button',{name:'閉じる',exact:true}).click();await expect(dialog).not.toBeVisible();expect(await page.evaluate(()=>captureCharacterAbilityState())).toEqual(before);
 await page.getByRole('button',{name:'パッドマンの取得チップを表示',exact:true}).click();await expect(dialog.getByText('取得済みチップはありません。',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await info.attach('pt-chip-counts',{body:await page.screenshot(),contentType:'image/png'});
});

test('character toolbar: hover is opt-in and PT guidance shares tab row',async({page})=>{
 await page.goto('/07_skill/');await select(page,'1');const toggle=page.locator('#character-hover-skills'),card=page.locator('.character-select[data-id="1"]'),tooltip=page.locator('#character-skill-tooltip');
 await expect(toggle).not.toBeChecked();await card.hover();await expect(tooltip).not.toBeVisible();await toggle.check();await card.hover();await expect(tooltip).toBeVisible();await expect(tooltip).toContainText('商品補充');await toggle.uncheck();await expect(tooltip).not.toBeVisible();await card.hover();await expect(tooltip).not.toBeVisible();
 await page.locator('#selected-party-tab').click();await expect(page.locator('#character-list-status')).toContainText('PT登録');const status=await page.locator('#character-list-status').boundingBox(),tab=await page.locator('#character-chip-tab').boundingBox();expect(status.x).toBeGreaterThan(tab.x+tab.width);expect(status.y).toBeLessThan(tab.y+tab.height);
 const gaps=await page.locator('.role-tabs').evaluate(e=>[...e.children].slice(1).map((c,i)=>c.getBoundingClientRect().left-e.children[i].getBoundingClientRect().right));expect(gaps.every(g=>Math.abs(g)<1)).toBe(true);
});
