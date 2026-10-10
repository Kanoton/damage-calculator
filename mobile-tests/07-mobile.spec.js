const {test,expect}=require('@playwright/test');
async function start(page,id='1'){
 await page.goto('/07_skill/');await expect(page.locator('body')).toHaveClass(/mobile-ui/);await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();
}
async function change(page,selector,plus){await page.locator(selector).tap();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:plus?'＋ 増やす':'− 減らす',exact:true}).tap();}
async function add(page,id){await page.locator('#selected-party-tab').tap();await page.locator('#character-list-tab').tap();await page.locator(`.character-select[data-id="${id}"]`).tap();}
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
test('phone: HP, level, CT and stacks can increase and decrease without right click',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page,'106');
 const hp=Number(await page.locator('#selected-character-current-hp').inputValue());await change(page,'#selected-character-hp-fill',false);await expect(page.locator('#selected-character-current-hp')).toHaveValue(String(hp-1));await change(page,'#selected-character-hp-fill',true);await expect(page.locator('#selected-character-current-hp')).toHaveValue(String(hp));
 await change(page,'#selected-character-portrait',true);await expect(page.locator('#selected-character-level')).toHaveText('Lv.1');await change(page,'#selected-character-portrait',false);await expect(page.locator('#selected-character-level')).toHaveText('Lv.0');
 await change(page,'#selected-character-ct',true);await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 1/);await change(page,'#selected-character-ct',false);await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0/);
 await change(page,'[aria-label="推理タイムを増やす"]',true);await expect(page.getByLabel('推理タイムの数')).toHaveValue('1');await change(page,'[aria-label="推理タイムを増やす"]',false);await expect(page.getByLabel('推理タイムの数')).toHaveValue('0');
 await page.getByLabel('推理タイムの数').tap();await expect(page.locator('#character-number-pad')).toBeHidden();await noOverflow(page);expect(errors).toEqual([]);
});
test('phone: PT edits, swaps with empty slot, removes and preserves self identity',async({page})=>{
 await start(page);await add(page,'8');const slot='.party-member-slot[data-character-id="8"]';await change(page,slot+' .party-slot-level',true);await expect(page.locator(slot+' .party-slot-level')).toHaveText('Lv.1');await change(page,slot+' .party-slot-level',false);await expect(page.locator(slot+' .party-slot-level')).toHaveText('Lv.0');
 await page.getByRole('button',{name:'レンの操作',exact:true}).tap();await page.getByRole('button',{name:'4番目と入れ替え',exact:true}).tap();await expect(page.locator(slot)).toHaveAttribute('data-slot','4');
 await page.getByRole('button',{name:'レンの操作',exact:true}).tap();await page.getByRole('button',{name:'PT登録を解除',exact:true}).tap();await expect(page.locator(slot)).toHaveCount(0);expect(await page.evaluate(()=>captureCharacterAbilityState().id)).toBe('1');
 await noOverflow(page);
});
test('phone: ability details, chip foldout and table foldout are explicit and accessible',async({page},info)=>{
 await start(page);await page.getByRole('button',{name:'ミミの能力の詳細',exact:true}).tap();await expect(page.getByRole('dialog')).toContainText('パッシブ');await page.getByRole('button',{name:'閉じる',exact:true}).tap();
 await expect(page.locator('.mobile-chip-details')).not.toHaveAttribute('open','');await page.locator('.mobile-chip-details summary').tap();await expect(page.locator('.mobile-chip-details')).toHaveAttribute('open','');
 await page.locator('.role-tab[data-role="attack"]').tap();await expect(page.locator('.mode-content.active .damage-table')).toBeHidden();await page.locator('.mode-content.active .mobile-table-toggle').tap();await expect(page.locator('.mode-content.active .damage-table')).toBeVisible();await noOverflow(page);
 expect((await page.locator('#Atk1').boundingBox()).width).toBeGreaterThanOrEqual(32);await page.locator('.plus-button[data-target="Atk1"]').tap();await expect(page.locator('#Atk1')).toHaveValue('1');
 await page.evaluate(()=>scrollTo(0,0));
 await info.attach('phone-calculator',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});
test('phone: narrow and landscape layouts do not overflow and desktop resize restores layout',async({page},info)=>{
 await page.setViewportSize({width:360,height:780});await start(page);for(const id of ['103','104','8'])await add(page,id);await noOverflow(page);
 expect(await page.evaluate(()=>document.getElementById('selected-character').getBoundingClientRect().top<document.querySelector('.main-container').getBoundingClientRect().top)).toBe(true);
 await page.evaluate(()=>scrollTo(0,0));
 await info.attach('phone-party',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await page.setViewportSize({width:844,height:390});await noOverflow(page);await page.locator('#selected-self-tab').tap();await noOverflow(page);
 await page.setViewportSize({width:1100,height:800});await expect(page.locator('body')).not.toHaveClass(/mobile-ui/);await expect(page.locator('.mobile-party-actions').first()).toBeHidden();
});

test('phone: monster HP changes once, modal cancellation is harmless and Undo restores HP',async({page})=>{
 await start(page);await page.locator('.role-tab[data-role="map"]').tap();await page.locator('#mp-tab-monsters').tap();await page.locator('#mp-map-select').selectOption('MAP0104');await page.locator('#roster-clear').tap();await page.locator('#mp-monster-list .mp-monster:visible').first().tap();
 const card=page.locator('#map-roster-list .roster-card').first(),hp=card.getByRole('spinbutton',{name:/残りHP$/}),before=Number(await hp.inputValue());
 const icon=card.getByRole('button',{name:/残りHPを減らす$/});await icon.tap();await page.getByRole('button',{name:'閉じる',exact:true}).tap();await expect(hp).toHaveValue(String(before));
 await icon.tap();await page.getByRole('button',{name:'− 減らす',exact:true}).tap();await expect(hp).toHaveValue(String(before-1));await page.locator('#roster-undo').tap();await expect(hp).toHaveValue(String(before));await noOverflow(page);
});


test('Teru: bounded stat dialog applies rounded halves and leaves the header clear',async({page},info)=>{
 await start(page,'23');
 await expect(page.locator('#teru-stat-dialog')).not.toBeVisible();await page.getByRole('button',{name:'三神憑依を発動'}).click();
 await page.getByLabel('憑依する味方の攻撃力',{exact:true}).fill('5');await page.getByLabel('憑依する味方の防御力',{exact:true}).fill('3');
 const bounds=await page.locator('#teru-stat-dialog').boundingBox(),viewport=page.viewportSize();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
 await info.attach('teru-stat-dialog',{body:await page.screenshot(),contentType:'image/png'});await page.getByRole('button',{name:'憑依を確定'}).click();await expect(page.locator('#selected-character-atk')).toHaveValue('5');await expect(page.locator('#teru-stat-dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const [id,label,skill,value] of [['16','オーバードライブのダイスの出目','オーバードライブ',10],['26','吸収した影の数','暗影融合',4]])test('Skill source fits beside button: '+id,async({page},info)=>{
 await start(page,id);
 const field=page.getByLabel(label,{exact:true});await expect(field).toHaveCount(0);await page.getByRole('button',{name:skill+'を発動'}).click();await expect(field).toBeVisible();await field.fill(String(value));
 const boxes=await page.evaluate(()=>{const r=document.querySelector('#skill-source-dialog').getBoundingClientRect(),a=document.querySelector('#selected-character-skill').getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,gap:a.top-r.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};});expect(boxes.overflow).toBe(false);expect(boxes.x).toBeGreaterThanOrEqual(0);expect(boxes.y).toBeGreaterThanOrEqual(0);expect(boxes.right).toBeLessThanOrEqual(boxes.width);expect(boxes.bottom).toBeLessThanOrEqual(boxes.height);expect(boxes.gap).toBeLessThanOrEqual(10);
 await info.attach('skill-source-'+id,{body:await page.screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'スキルを確定',exact:true}).click();await expect(page.locator('#selected-character-ct')).toContainText(id==='16'?'CT 4':'CT 3');
});


test('Rinrin: bounded passage dialog supports No, Undo and Yes target selection',async({page},info)=>{
 await start(page,'28');
 const dialog=page.locator('#rinrin-area-dialog'),skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct');
 await skill.tap();await expect(dialog).toBeVisible();
 const box=await dialog.boundingBox(),viewport=page.viewportSize();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 expect(await dialog.locator('.rinrin-yes').evaluate(p=>p.scrollWidth<=p.clientWidth)).toBe(true);
 await info.attach('rinrin-passage',{body:await page.screenshot(),contentType:'image/png'});
 await dialog.getByRole('button',{name:'No',exact:true}).tap();await expect(ct).toHaveText('CT 3 / 3');await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await page.locator('#roster-undo').tap();await expect(ct).toHaveText('CT 0 / 3');
 await skill.tap();await dialog.getByRole('button',{name:'Yes',exact:true}).tap();await expect(page.locator('#character-skill-target-banner')).toBeVisible();
 await page.locator('#character-skill-target-cancel').tap();await expect(ct).toHaveText('CT 0 / 3');
});


test('Jill support: attack and defense have colored borders without healing buttons',async({page},info)=>{
 await start(page,'1');
 await page.locator('#selected-party-tab').tap();await page.locator('.character-select[data-id="103"]').tap();await page.locator('.character-select[data-id="104"]').tap();await page.locator('#selected-self-tab').tap();
 for(const [key,color] of [['PTカクテル攻撃','rgb(204, 51, 51)'],['PTカクテル防御','rgb(38, 115, 201)']]){const button=page.getByRole('button',{name:key+'を増やす'});await expect(button).toHaveCSS('border-top-color',color);await expect(button).toHaveCSS('border-top-width','2px');}
 await expect(page.getByRole('button',{name:'PTカクテル回復＋1',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'PTドロシー通過回復＋1',exact:true})).toHaveCount(0);
 await info.attach('cocktail-border',{body:await page.screenshot(),contentType:'image/png'});
});
