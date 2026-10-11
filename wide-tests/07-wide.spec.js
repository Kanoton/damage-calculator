const {test,expect}=require('@playwright/test');
async function select(page,id){await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();}
async function bounds(page){return page.evaluate(()=>{const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};return {main:rect('.main-container'),round:rect('#round-progress-controls'),self:rect('#selected-character'),roster:rect('.map-roster'),overflowX:document.documentElement.scrollWidth>innerWidth+1,overflowY:document.documentElement.scrollHeight>innerHeight+1};});}
test('FHD: left main and right controls fit the viewport in all four modes',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/07_skill/');await select(page,'1');
 for(const role of ['map','character','attack','defense']){
  await page.locator(`.role-tab[data-role="${role}"]`).click();const b=await bounds(page);expect(b.overflowX).toBe(false);expect(b.overflowY).toBe(false);expect(b.round.x).toBe(b.main.x);expect(b.round.bottom).toBeLessThanOrEqual(b.main.y);expect(b.self.width).toBeGreaterThan(650);expect(b.self.y).toBeGreaterThanOrEqual(b.roster.bottom);expect(b.roster.bottom).toBeLessThanOrEqual(1080);expect(b.self.height).toBe(118);
  const tab=await page.locator(`.role-tab[data-role="${role}"]`).boundingBox();expect(Math.abs(tab.y+tab.height-b.main.y)).toBeLessThan(1);
  const borders=await page.evaluate(()=>({tab:getComputedStyle(document.querySelector('.role-tab.active')).borderTopColor,bottom:getComputedStyle(document.querySelector('.role-tab.active')).borderBottomWidth,panel:getComputedStyle(document.querySelector('.main-container')).borderTopColor}));expect(borders.tab).toBe(borders.panel);expect(borders.bottom).toBe('0px');
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

test('character toolbar: hover is opt-in and PT guidance shares tab row',async({page},info)=>{
 await page.goto('/07_skill/');await select(page,'1');const toggle=page.locator('#character-hover-skills'),card=page.locator('.character-select[data-id="1"]'),tooltip=page.locator('#character-skill-tooltip');
 await expect(toggle).not.toBeChecked();await expect(page.locator('.character-hover-toggle')).toHaveText('スキルを表示');const alignment=await page.evaluate(()=>({toggle:document.querySelector('.character-hover-toggle').getBoundingClientRect().right,toolbar:document.querySelector('.character-toolbar').getBoundingClientRect().right}));expect(Math.abs(alignment.toggle-alignment.toolbar)).toBeLessThan(1);await card.hover();await expect(tooltip).not.toBeVisible();await toggle.check();await card.hover();await expect(tooltip).toBeVisible();await expect(tooltip).toContainText('商品補充');await toggle.uncheck();await expect(tooltip).not.toBeVisible();await card.hover();await expect(tooltip).not.toBeVisible();
 await page.locator('#selected-party-tab').click();await expect(page.locator('#character-list-status')).toContainText('PT登録');const status=await page.locator('#character-list-status').boundingBox(),tab=await page.locator('#character-chip-tab').boundingBox();expect(status.x).toBeGreaterThan(tab.x+tab.width);expect(status.y).toBeLessThan(tab.y+tab.height);
 const gaps=await page.locator('.role-tabs').evaluate(e=>[...e.children].slice(1).map((c,i)=>c.getBoundingClientRect().left-e.children[i].getBoundingClientRect().right));expect(gaps.every(g=>Math.abs(g)<1)).toBe(true);await info.attach('character-toolbar-pt',{body:await page.screenshot(),contentType:'image/png'});
});


test('Teru: bounded stat dialog applies rounded halves and leaves the header clear',async({page},info)=>{
 await page.goto('/07_skill/');await select(page,'23');
 await expect(page.locator('#teru-stat-dialog')).not.toBeVisible();await page.getByRole('button',{name:'三神憑依を発動'}).click();
 await page.getByLabel('憑依する味方の攻撃力',{exact:true}).fill('5');await page.getByLabel('憑依する味方の防御力',{exact:true}).fill('3');
 const layout=await page.locator('#character-number-pad').evaluate(p=>{const r=p.getBoundingClientRect(),d=p.closest('dialog').getBoundingClientRect(),i=p.closest('dialog').querySelector('input').getBoundingClientRect();return{inside:r.left>=d.left&&r.right<=d.right&&r.bottom<=d.bottom,right:r.left>=i.right};});expect(layout).toEqual({inside:true,right:true});
 const bounds=await page.locator('#teru-stat-dialog').boundingBox(),viewport=page.viewportSize();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
 await info.attach('teru-stat-dialog',{body:await page.screenshot(),contentType:'image/png'});await page.locator('#teru-stat-dialog button[type="submit"]').click();await expect(page.locator('#selected-character-atk')).toHaveValue('5');await expect(page.locator('#teru-stat-dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const [id,label,skill,value] of [['16','オーバードライブのダイスの出目','オーバードライブ',10],['26','吸収した影の数','暗影融合',4]])test('Skill source fits beside button: '+id,async({page},info)=>{
 await page.goto('/07_skill/');await select(page,id);
 const field=page.getByLabel(label,{exact:true});await expect(field).toHaveCount(0);await page.getByRole('button',{name:skill+'を発動'}).click();await expect(field).toBeVisible();await field.fill(String(value));
 const boxes=await page.evaluate(()=>{const r=document.querySelector('#skill-source-dialog').getBoundingClientRect(),a=document.querySelector('#selected-character-skill').getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,gap:a.top-r.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};});expect(boxes.overflow).toBe(false);expect(boxes.x).toBeGreaterThanOrEqual(0);expect(boxes.y).toBeGreaterThanOrEqual(0);expect(boxes.right).toBeLessThanOrEqual(boxes.width);expect(boxes.bottom).toBeLessThanOrEqual(boxes.height);expect(boxes.gap).toBeLessThanOrEqual(10);
 const layout=await page.locator('#character-number-pad').evaluate(p=>{const r=p.getBoundingClientRect(),d=p.closest('dialog').getBoundingClientRect(),i=p.closest('dialog').querySelector('input').getBoundingClientRect();return{inside:r.left>=d.left&&r.right<=d.right&&r.bottom<=d.bottom,right:r.left>=i.right};});expect(layout).toEqual({inside:true,right:true});
 await info.attach('skill-source-'+id,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('#skill-source-dialog button[type="submit"]').click();await expect(page.locator('#selected-character-ct')).toContainText(id==='16'?'CT 4':'CT 3');
});


test('Rinrin: bounded passage dialog supports No, Undo and Yes target selection',async({page},info)=>{
 await page.goto('/07_skill/');await select(page,'28');
 const dialog=page.locator('#rinrin-area-dialog'),skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct');
 await skill.click();await expect(dialog).toBeVisible();
 const box=await dialog.boundingBox(),viewport=page.viewportSize();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 await expect(dialog.locator('.rinrin-yes')).toHaveCSS('font-size','14px');expect(await dialog.locator('.rinrin-yes').evaluate(p=>p.scrollWidth<=p.clientWidth)).toBe(true);
 await info.attach('rinrin-passage',{body:await page.screenshot(),contentType:'image/png'});
 await dialog.getByRole('button',{name:'No',exact:true}).click();await expect(ct).toHaveText('CT 3 / 3');await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await page.locator('#roster-undo').click();await expect(ct).toHaveText('CT 0 / 3');
 await skill.click();await dialog.getByRole('button',{name:'Yes',exact:true}).click();await expect(page.locator('#character-skill-target-banner')).toBeVisible();
 await page.locator('#character-skill-target-cancel').click();await expect(ct).toHaveText('CT 0 / 3');
});


test('Jill support: attack and defense have colored borders without healing buttons',async({page},info)=>{
 await page.goto('/07_skill/');await select(page,'1');
 await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="103"]').click();await page.locator('.character-select[data-id="104"]').click();await page.locator('#selected-self-tab').click();
 for(const [key,color] of [['PTカクテル攻撃','rgb(204, 51, 51)'],['PTカクテル防御','rgb(38, 115, 201)']]){const button=page.getByRole('button',{name:key+'を増やす'});await expect(button).toHaveCSS('border-top-color',color);await expect(button).toHaveCSS('border-top-width','2px');await expect(button).toHaveCSS('background-color',color);}
 await expect(page.getByRole('button',{name:'PTカクテル回復＋1',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'PTドロシー通過回復＋1',exact:true})).toHaveCount(0);
 await info.attach('cocktail-border',{body:await page.screenshot(),contentType:'image/png'});
});
