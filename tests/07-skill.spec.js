const { test, expect } = require('@playwright/test');

async function prepareSherryTargets(page){
 await page.goto('/07_skill/');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 const choices=page.locator('#mp-monster-list .mp-monster:visible');let found=false;
 for(let i=0;i<await choices.count();i++){
  await page.locator('#roster-clear').click();await choices.nth(i).click();
  if(Number(await page.locator('#map-roster-list input[aria-label$="の残りHP"]').first().inputValue())<5)continue;
  await choices.nth(i).click();await choices.nth(i).click();found=true;break;
 }
 expect(found).toBe(true);
 await selectCharacter(page,'106');
 const cards=page.locator('#map-roster-list .roster-card');
 for(let i=0;i<3;i++){const hp=cards.nth(i).locator('input[aria-label$="の残りHP"]');await hp.fill('5');await hp.dispatchEvent('change');}
 return cards;
}

test('07 skill: Sherry toggles multiple targets and applies damage once only after OK',async({page})=>{
 const cards=await prepareSherryTargets(page),skill=page.getByRole('button',{name:'怪力魔法を発動'}),ok=page.locator('#character-skill-target-ok'),ct=page.locator('#selected-character-ct');
 await skill.click();await expect(ok).toBeVisible();await expect(ok).toBeDisabled();
 await page.locator('.role-tab[data-role="map"]').click();
 const target=i=>cards.nth(i).locator('.roster-select'),hp=i=>cards.nth(i).locator('input[aria-label$="の残りHP"]');
 await target(0).click();await target(1).click();
 await expect(target(0)).toHaveAttribute('aria-pressed','true');await expect(cards.nth(0)).toHaveClass(/is-skill-target-selected/);
 await target(0).click();await expect(target(0)).toHaveAttribute('aria-pressed','false');
 await target(2).focus();await target(2).press('Enter');
 for(let i=0;i<3;i++)await expect(hp(i)).toHaveValue('5');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await expect(page.locator('#character-skill-target-message')).toContainText('2体選択中');
 await ok.click();await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await expect(hp(0)).toHaveValue('5');await expect(hp(1)).toHaveValue('3');await expect(hp(2)).toHaveValue('3');
 await expect(ct).toHaveText(/^CT 2 \/ \d+$/);await expect(page.locator('.is-skill-target-selected')).toHaveCount(0);
 await ok.evaluate(button=>button.click());await expect(hp(1)).toHaveValue('3');
 await page.locator('#roster-undo').click();for(let i=0;i<3;i++)await expect(hp(i)).toHaveValue('5');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
});

test('07 skill: Sherry cancellation and removed targets consume no HP or CT',async({page})=>{
 const cards=await prepareSherryTargets(page),skill=page.getByRole('button',{name:'怪力魔法を発動'}),ok=page.locator('#character-skill-target-ok');
 await skill.click();await page.locator('.role-tab[data-role="map"]').click();await cards.first().locator('.roster-select').click();
 await page.locator('#character-skill-target-cancel').click();await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await expect(cards.first().locator('input[aria-label$="の残りHP"]')).toHaveValue('5');await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
 await skill.click();await expect(ok).toBeDisabled();await cards.first().locator('.roster-select').click();
 await cards.first().locator('.roster-delete').click();await expect(ok).toBeDisabled();await expect(page.locator('#character-skill-target-message')).toContainText('0体選択中');
 await page.locator('#character-skill-target-cancel').click();await skill.click();
 await cards.first().locator('.roster-select').click();await cards.first().locator('.roster-remove').click();await expect(ok).toBeDisabled();
 await selectCharacter(page,'9');await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await page.getByRole('button',{name:'引き寄せるを発動'}).click();await expect(ok).toBeHidden();
});

async function selectCharacter(page,id){
 await page.locator('.role-tab.character-tab').click();
 await page.locator(`.character-select[data-id="${id}"]`).click();
}

test('07 skill: Sherry batch can defeat one target and damage another',async({page})=>{
 const cards=await prepareSherryTargets(page);
 const ids=await Promise.all([0,1].map(i=>cards.nth(i).getAttribute('data-instance-id')));
 const target0=page.locator(`.roster-card[data-instance-id="${ids[0]}"]`),target1=page.locator(`.roster-card[data-instance-id="${ids[1]}"]`);
 const hp0=target0.locator('input[aria-label$="の残りHP"]'),hp1=target1.locator('input[aria-label$="の残りHP"]');
 await hp0.fill('1');await hp0.dispatchEvent('change');
 await page.getByRole('button',{name:'怪力魔法を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();await page.locator('#character-skill-target-ok').click();
 await expect(hp0).toHaveValue('0');await expect(target0).toHaveClass(/defeated/);await expect(hp1).toHaveValue('3');
 await page.locator('#roster-undo').click();await expect(hp0).toHaveValue('1');await expect(hp1).toHaveValue('5');await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
});


test('07 skill: Rinrin buffs herself once for multiple targets and expires only skill modifiers after two turn ends',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'28');
 const ids=await Promise.all([0,1,2].map(i=>cards.nth(i).getAttribute('data-instance-id')));
 const targets=ids.map(id=>page.locator(`.roster-card[data-instance-id="${id}"]`));
 const defense=i=>targets[i].locator('input[aria-label$="の防御力"]');
 for(let i=0;i<3;i++){await defense(i).fill(String(5-i));await defense(i).dispatchEvent('change');}
 const atk=page.locator('#selected-character-atk'),ct=page.locator('#selected-character-ct'),ok=page.locator('#character-skill-target-ok');
 await page.getByRole('button',{name:'インターセプトタックルを発動'}).click();
 await expect(ok).toBeDisabled();await page.locator('.role-tab[data-role="map"]').click();
 for(const target of targets)await target.locator('.roster-select').click();
 await targets[2].locator('.roster-select').click();
 await expect(atk).toHaveValue('2');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 for(let i=0;i<3;i++)await expect(defense(i)).toHaveValue(String(5-i));
 await ok.click();
 await expect(atk).toHaveValue('4');await expect(ct).toHaveText(/^CT 3 \/ \d+$/);
 await expect(defense(0)).toHaveValue('3');await expect(defense(1)).toHaveValue('2');await expect(defense(2)).toHaveValue('3');
 await page.locator('#selected-character-atk-button').click();await expect(atk).toHaveValue('5');
 await page.locator('#turn-end').click();
 await expect(atk).toHaveValue('5');await expect(defense(0)).toHaveValue('3');await expect(defense(1)).toHaveValue('2');
 await page.locator('#turn-end').click();
 await expect(atk).toHaveValue('3');for(let i=0;i<3;i++)await expect(defense(i)).toHaveValue(String(5-i));
 await expect(ct).toHaveText(/^CT 3 \/ \d+$/);
 await page.locator('#roster-undo').click();
 await expect(atk).toHaveValue('5');await expect(defense(0)).toHaveValue('3');await expect(defense(1)).toHaveValue('2');
 await page.locator('#turn-end').click();
 await expect(atk).toHaveValue('3');await expect(defense(0)).toHaveValue('5');await expect(defense(1)).toHaveValue('4');
});

test('07 skill: Rinrin cancellation and one undo preserve all targets and a single self bonus',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'28');
 const defense=cards.first().locator('input[aria-label$="の防御力"]');
 await defense.fill('5');await defense.dispatchEvent('change');
 const skill=page.getByRole('button',{name:'インターセプトタックルを発動'}),atk=page.locator('#selected-character-atk'),ct=page.locator('#selected-character-ct');
 await skill.click();await page.locator('.role-tab[data-role="map"]').click();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();
 await page.locator('#character-skill-target-cancel').click();
 await expect(defense).toHaveValue('5');await expect(atk).toHaveValue('2');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await skill.click();await expect(page.locator('#character-skill-target-ok')).toBeDisabled();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();
 await page.locator('#character-skill-target-ok').click();await expect(atk).toHaveValue('4');
 await page.locator('#roster-undo').click();
 await expect(defense).toHaveValue('5');await expect(atk).toHaveValue('2');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await page.locator('#turn-end').click();await page.locator('#turn-end').click();await expect(atk).toHaveValue('2');await expect(defense).toHaveValue('5');
});

async function selectChipCategory(page,category){
 await page.locator('#character-chip-tab').click();
 await page.locator(`.chip-category-tabs [data-category="${category}"]`).click();
}

test('07 skill: Extra Battery lowers only the owner CT cap and restores it on removal', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'1');
 const skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct');
 await skill.click();await expect(ct).toHaveText('CT 3 / 3');
 await selectChipCategory(page,'共通');
 const battery=page.locator('.chip-select[data-id="15"]');
 await battery.click();await expect(ct).toHaveText('CT 2 / 2');
 await ct.click({button:'right'});await expect(ct).toHaveText('CT 2 / 2');
 await ct.click();await ct.click();await skill.click();await expect(ct).toHaveText('CT 2 / 2');
 await page.locator('#character-list-tab').click();await selectCharacter(page,'2');
 await skill.click();await expect(ct).toHaveText('CT 2 / 2');
 await selectCharacter(page,'1');await expect(ct).toHaveText('CT 2 / 2');
 await selectChipCategory(page,'共通');await battery.click();
 await expect(ct).toHaveText('CT 2 / 3');
 await ct.click();await ct.click();await skill.click();await expect(ct).toHaveText('CT 3 / 3');
});

test('07 skill: Extra Battery cap also applies after monster target confirmation', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 await selectCharacter(page,'9');
 await selectChipCategory(page,'共通');await page.locator('.chip-select[data-id="15"]').click();
 await page.locator('#selected-character-skill').click();
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#map-roster-list .roster-select').first().click();
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);
});

test('07 skill: charge consumption requires full cost and Lightning Core reduces remaining CT', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'1');
 const ct=page.locator('#selected-character-ct');
 await page.locator('#selected-character-skill').click();
 await selectChipCategory(page,'チャージ');
 for(const [id,cost,name] of [['55',6,'エアバッグ'],['56',5,'ライトニングコア'],['58',4,'レールガン']]){
  const chip=page.locator(`.chip-select[data-id="${id}"]`);await chip.click();
  const charge=page.getByLabel('チャージの数'),owned=page.locator('.selected-character-chips .selected-chip').filter({has:page.getByAltText(name,{exact:true})});
  await charge.fill(String(cost-1));await charge.dispatchEvent('change');
  const before=await ct.textContent();
  await owned.click();await expect(charge).toHaveValue(String(cost-1));await expect(ct).toHaveText(before);
  await owned.focus();await owned.press('Enter');await expect(charge).toHaveValue(String(cost-1));await expect(ct).toHaveText(before);
  await charge.fill(String(cost));await charge.dispatchEvent('change');
  await owned.click();await expect(charge).toHaveValue('0');
  await expect(ct).toHaveText(id==='56'?'CT 2 / 3':before);
  await chip.click();
 }
 await page.locator('.chip-select[data-id="56"]').click();
 const charge=page.getByLabel('チャージの数'),core=page.locator('.selected-character-chips .selected-chip').filter({has:page.getByAltText('ライトニングコア',{exact:true})});
 await ct.click();await ct.click();await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await charge.fill('5');await charge.dispatchEvent('change');await core.focus();await core.press(' ');
 await expect(ct).toHaveText(/^CT 0 \/ \d+$/);await expect(charge).toHaveValue('0');
 await page.locator('.chip-select[data-id="51"]').click();
 await charge.fill('9');await charge.dispatchEvent('change');
 await page.locator('.selected-character-chips .selected-chip').filter({has:page.getByAltText('エネルギー回収',{exact:true})}).click();
 await expect(charge).toHaveValue('10');
});

test('07 skill: Sherry reasoning stacks modify attack and decay on turn end', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'106');
 const stack=page.getByLabel('推理タイムの数');
 await stack.fill('3');await stack.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.locator('#turn-end').click();
 await expect(stack).toHaveValue('2');
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');
});

test('07 skill: Nancy firewall toggles attack and defense bonuses', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'18');
 await page.getByRole('button',{name:/ファイアウォール：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');
});

test('07 skill: Hime Qigong Training heals and conditionally buffs attack for the turn', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'12');
 const hp=page.locator('#selected-character-current-hp'),energy=page.getByLabel('エネルギー保存の数'),skill=page.getByRole('button',{name:'気功修練を発動'});
 const maxHp=Number(await page.locator('#selected-character-hp').textContent());
 await hp.fill(String(Math.max(0,maxHp-3)));await hp.dispatchEvent('change');
 await skill.click();
 await expect(hp).toHaveValue(String(Math.min(maxHp,maxHp-1)));
 await expect(page.locator('#selected-character-atk')).toHaveValue('1');
 await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();
 await energy.fill('1');await energy.dispatchEvent('change');
 await hp.fill(String(Math.max(0,maxHp-2)));await hp.dispatchEvent('change');
 await skill.click();
 await expect(hp).toHaveValue(String(maxHp));
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await page.locator('#turn-end').click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
});

test('07 skill: Misaki manually targets a roster monster and applies Sakura Retsukuzan', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'14');
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const target=page.locator('#map-roster-list .roster-select').first(),hp=page.locator('#map-roster-list input[aria-label$="の残りHP"]').first();
 const before=Number(await hp.inputValue());
 await page.locator('.role-tab.character-tab').click();
 const aura=page.getByLabel('剣気の数'),skill=page.getByRole('button',{name:'桜裂空斬を発動'});
 await skill.click();
 const banner=page.locator('#character-skill-target-banner');
 await expect(banner).toBeVisible();
 await expect(banner).toContainText('桜裂空斬：対象のモンスターを選択してください');
 await expect(page.locator('.map-roster')).toHaveClass(/is-character-skill-targeting/);
 await expect(page.locator('.role-tab.character-tab')).toHaveClass(/active/);
 await page.locator('#character-skill-target-cancel').click();
 await expect(banner).toBeHidden();
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
 await skill.click();
 await expect(banner).toBeVisible();
 await page.locator('.role-tab[data-role="map"]').click();
 await target.click();
 await expect(banner).toBeHidden();
 if(before>2)await expect(hp).toHaveValue(String(before-2));else await expect(page.locator('#map-roster-list .roster-card').first()).toHaveClass(/defeated/);
 await expect(aura).toHaveValue('1');
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);
 await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();
 await aura.fill('3');await aura.dispatchEvent('change');
 await skill.click();await page.locator('.role-tab[data-role="map"]').click();
 const nextTarget=page.locator('#map-roster-list .roster-select:not(:disabled)').first();
 if(await nextTarget.count())await nextTarget.click();
 await expect(aura).toHaveValue('1');
});

test('07 skill: Kaisei Bonnie and Rinrin apply targeted monster effects', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const target=page.locator('#map-roster-list .roster-select').first();

 await selectCharacter(page,'13');
 await page.getByRole('button',{name:'フェイト・エコーを発動'}).click();
 await target.click();
 await expect(page.locator('.roster-fate-echo').first()).toContainText('フェイト・エコー2');
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);
 await target.click();
 await expect(page.locator('#damageAdd1')).toHaveValue('1');
 await page.locator('#turn-end').click();
 await expect(page.locator('.roster-fate-echo').first()).toContainText('フェイト・エコー1');
 await page.locator('#turn-end').click();
 await expect(page.locator('.roster-fate-echo')).toHaveCount(0);
 await expect(page.locator('#damageAdd1')).toHaveValue('0');

 await selectCharacter(page,'27');
 await page.getByRole('button',{name:'ミッション：インシークレットを発動'}).click();
 await target.click();
 await expect(page.locator('.roster-mark strong').first()).toHaveText('1');
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);

 await selectCharacter(page,'28');
 const defense=page.locator('#map-roster-list input[aria-label$="の防御力"]').first();
 const before=Number(await defense.inputValue());
 await page.getByRole('button',{name:'インターセプトタックルを発動'}).click();
 await target.click();
 await page.locator('#character-skill-target-ok').click();
 await expect(defense).toHaveValue(String(Math.max(0,before-2)));
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');
 await page.locator('#turn-end').click();
 await expect(defense).toHaveValue(String(Math.max(0,before-2)));
 await page.locator('#turn-end').click();
 await expect(defense).toHaveValue(String(before));
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});

test('07 skill: every character exposes active skill CT management', async ({ page }) => {
 await page.goto('/07_skill/');
 const expected={1:3,2:2,3:3,4:3,5:3,6:3,7:3,8:3,9:4,10:3,11:3,12:3,13:3,14:3,15:3,16:4,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:2,25:3,26:3,27:3,28:3,29:3,101:3,102:3,103:3,104:2,105:3,106:2};
 for(const [id,cooldown] of Object.entries(expected)){
  await selectCharacter(page,id);
  const skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct');
  await expect(skill).toBeVisible();
  await expect(ct).toHaveText('CT 0 / '+cooldown);
  await skill.click();
  if(['9','13','14','23','27','28','106'].includes(id)){
   await expect(ct).toHaveText('CT 0 / '+cooldown);
   continue;
  }
  await expect(ct).toHaveText('CT '+cooldown+' / '+cooldown);
  await ct.click();
  await expect(ct).toHaveText('CT '+(cooldown-1)+' / '+cooldown);
  await ct.click({button:'right'});
  await expect(ct).toHaveText('CT '+cooldown+' / '+cooldown);
 }
});

test('07 skill: Jasmine active skill applies turn effects and cooldown', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'16');
 const skill=page.getByRole('button',{name:'オーバードライブを発動'});
 const ct=page.locator('#selected-character-ct');
 await expect(page.locator('#selected-character-skill-controls')).toBeVisible();
 await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await expect(page.locator('#selected-character-move')).toHaveText('0');
 await expect(page.locator('#selected-character-def')).toHaveValue('0');
 await skill.click();
 await expect(page.locator('#selected-character-move')).toHaveText('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('0');
 await expect(ct).toHaveText(/^CT 4 \/ \d+$/);
 await expect(skill).toBeDisabled();
 await page.locator('#turn-end').click();
 await expect(page.locator('#selected-character-move')).toHaveText('0');
 await expect(page.locator('#selected-character-def')).toHaveValue('0');
 await expect(ct).toHaveText(/^CT 4 \/ \d+$/);
 await ct.click();
 await expect(ct).toHaveText(/^CT 3 \/ \d+$/);
 await ct.click({button:'right'});
 await expect(ct).toHaveText(/^CT 4 \/ \d+$/);
 await ct.click();await ct.click();await ct.click();await ct.click();
 await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await expect(skill).toBeEnabled();
});

test('07 skill: Jasmine result and cumulative movement modify stats', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'16');
 await expect(page.getByRole('button',{name:'累計移動ポイントを増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_117_Passive\.png$/);
 const movement=page.getByLabel('累計移動ポイントの数');
 await movement.fill('26');await movement.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(page.locator('#selected-character-def')).toHaveValue('1');
 await page.getByRole('button',{name:/オーバードライブ結果：変化なし/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');
});


test('07 skill: compatible character abilities use shared controls and modifiers', async ({ page }) => {
 await page.goto('/07_skill/');

 await selectCharacter(page,'12');
 await expect(page.getByRole('button',{name:'エネルギー保存を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_113_Passive\.png$/);
 const energy=page.getByLabel('エネルギー保存の数');
 await energy.fill('2');await energy.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await expect(page.locator('#selected-character-def')).toHaveValue('4');

 await selectCharacter(page,'14');
 await expect(page.getByRole('button',{name:'剣気を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_115\.png$/);
 const sword=page.getByLabel('剣気の数');
 await sword.fill('9');await sword.dispatchEvent('change');
 await expect(sword).toHaveValue('3');

 await selectCharacter(page,'24');
 await expect(page.getByRole('button',{name:'精確無比を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_125_Passive\.png$/);
 const precision=page.getByLabel('精確無比の数');
 await precision.fill('3');await precision.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await page.locator('#turn-end').click();
 await expect(precision).toHaveValue('2');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');

 await selectCharacter(page,'25');
 const awakening=page.getByLabel('覚醒の数');
 const awakeningButton=page.getByRole('button',{name:'覚醒を増やす'});
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1026\.png$/);
 await expect(page.getByRole('button',{name:/真龍/})).toHaveCount(0);
 await awakening.fill('7');await awakening.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1026\.png$/);
 await awakening.fill('8');await awakening.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1261204\.png$/);
 await awakening.fill('7');await awakening.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1026\.png$/);

 await selectCharacter(page,'104');
 await expect(page.getByRole('button',{name:'温もりを増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_304\.png$/);
 const warmth=page.getByLabel('温もりの数');
 await warmth.fill('5');await warmth.dispatchEvent('change');
 await expect(page.locator('#selected-character-def')).toHaveValue('5');
});


test('07 skill: Z3000 and Al apply bonuses per threshold', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'9');
 const defeats=page.getByLabel('モンスター撃破数の数');
 await defeats.fill('5');await defeats.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');

 await selectCharacter(page,'21');
 await expect(page.getByRole('button',{name:'スターライトを増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_StarLight\.png$/);
 const starlight=page.getByLabel('スターライトの数');
 await starlight.fill('13');await starlight.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');
});

test('07 skill: Papara gains attack at half HP or lower', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'7');
 const hp=page.locator('#selected-character-current-hp');
 await hp.fill('5');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await hp.fill('6');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});


test('07 skill: character list hover shows ability tooltip', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab.character-tab').click();
 const mimi=page.locator('.character-select[data-id="1"]');
 await mimi.hover();
 const tooltip=page.locator('#character-skill-tooltip');
 await expect(tooltip).toBeVisible();
 await expect(tooltip).toContainText('商品補充');
 await expect(tooltip).toContainText('リサイクル');
});

test('07 skill: character cards use Hero Card2 artwork and live stats while preserving selection', async ({ page }) => {
 await page.route('**/csv/character_stats.csv',async route=>{
  const response=await route.fetch();const csv=await response.text();
  await route.fulfill({response,body:csv.replace('12,10,9,1,1,0,11','12,10,19,7,6,0,11')});
 });
 await page.goto('/07_skill/');await page.locator('.role-tab.character-tab').click();
 await expect(page.locator('.character-select')).toHaveCount(35);
 const mimi=page.locator('.character-select[data-id="1"]');
 await expect(mimi.locator('.character-list-image')).toHaveAttribute('src','../images/UT_Hero_Card2/UT_Hero_Card2_108.png');
 await expect.poll(()=>mimi.locator('.character-list-image').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(mimi.locator('.character-list-name')).toHaveText('ミミ');
 for(const [key,value] of [['lv0_atk','7'],['lv0_def','6'],['lv0_hp','19']])await expect(mimi.locator(`[data-stat="${key}"]`)).toHaveText(value);
 await expect(mimi.locator('[data-stat="initial_coin"]')).toHaveText('12+10');
 await mimi.hover();await expect(page.locator('#character-skill-tooltip')).toContainText('商品補充');
 const parunan=page.locator('.character-select[data-id="2"]');await parunan.click();
 await expect(page.locator('#selected-character-name')).toHaveText('パルナン');
 await expect(parunan).toHaveAttribute('aria-pressed','true');
 await mimi.focus();await mimi.press('Enter');await expect(page.locator('#selected-character-name')).toHaveText('ミミ');
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await expect(page.locator('#selected-character-current-hp')).toHaveValue('19');
 await expect(page.locator('.character-select[data-id="4"] [data-stat="initial_coin"]')).toHaveText('6');
});

test('07 skill: character image mapping falls back when its CSV cannot be fetched', async ({ page }) => {
 await page.route('**/07_skill/csv/character_hero_card_mapping.csv',route=>route.abort());
 await page.goto('/07_skill/');await page.locator('.role-tab.character-tab').click();
 await expect(page.locator('.character-select[data-id="106"] .character-list-image')).toHaveAttribute('src','../images/UT_Hero_Card2/UT_Hero_Card2_306.png');
 await selectCharacter(page,'106');await expect(page.locator('#selected-character-name')).toHaveText('橘シェリー');
});

test('07 skill: file protocol keeps character cards, tooltip and selection', async ({ page }) => {
 const path=require('path'),{pathToFileURL}=require('url');
 await page.goto(pathToFileURL(path.resolve(__dirname,'../07_skill/index.html')).href);
 await page.locator('.role-tab.character-tab').click();
 await expect(page.locator('.character-select')).toHaveCount(35);
 const mimi=page.locator('.character-select[data-id="1"]');
 await expect(mimi.locator('.character-list-image')).toHaveAttribute('src','../images/UT_Hero_Card2/UT_Hero_Card2_108.png');
 await expect(mimi.locator('[data-stat="lv0_hp"]')).toHaveText('9');
 await mimi.hover();await expect(page.locator('#character-skill-tooltip')).toContainText('商品補充');
 await page.locator('.character-select[data-id="2"]').click();
 await expect(page.locator('#selected-character-name')).toHaveText('パルナン');
});


test('07 skill: additional character stat skills modify parameters', async ({ page }) => {
 await page.goto('/07_skill/');

 await selectCharacter(page,'4');
 await page.getByRole('button',{name:/前ターン被ダメなし：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');

 await selectCharacter(page,'6');
 await page.getByRole('button',{name:/自己主張なし攻撃補正：0/}).click();
 await page.getByRole('button',{name:/自己主張なし攻撃補正：\+1/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');
 await page.getByRole('button',{name:/自己主張なし防御補正：0/}).click();
 await expect(page.locator('#selected-character-def')).toHaveValue('3');

 await selectCharacter(page,'15');
 const handDiff=page.getByLabel('相手より多い手札の数');
 await handDiff.fill('5');await handDiff.dispatchEvent('change');
 await expect(handDiff).toHaveValue('3');
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');

 await selectCharacter(page,'26');
 const shadows=page.getByLabel('吸収した影の数');
 await shadows.fill('4');await shadows.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');

 await selectCharacter(page,'28');
 await page.getByRole('button',{name:/エリア拒止通過：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');

 await selectCharacter(page,'103');
 const attackCards=page.getByLabel('カクテル攻撃カードの数');
 const defenseCards=page.getByLabel('カクテル防御カードの数');
 await attackCards.fill('2');await attackCards.dispatchEvent('change');
 await defenseCards.fill('1');await defenseCards.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('2');
});


test('07 skill: contextual character attacks only apply when enabled', async ({ page }) => {
 await page.goto('/07_skill/');

 await selectCharacter(page,'10');
 const damage=page.getByLabel('このターンに受けたダメージの数');
 await damage.fill('4');await damage.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('1');
 await page.getByRole('button',{name:/カウンター攻撃：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');

 await selectCharacter(page,'17');
 await page.getByRole('button',{name:/真夜の一閃：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');

 await selectCharacter(page,'23');
 const foxfire=page.getByLabel('狐光の数');
 await foxfire.fill('3');await foxfire.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await page.getByRole('button',{name:/狐光追加攻撃：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');

 await selectCharacter(page,'27');
 await expect(page.getByLabel('対象のマークの数')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/マーク持ちを攻撃/})).toHaveCount(0);
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const mark=page.locator('#map-roster-list .roster-mark button').first();
 await mark.click();await mark.click();
 await page.locator('#map-roster-list .roster-select').first().click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.locator('.role-tab[data-role="character"]').click();
 await page.getByRole('button',{name:/潜伏：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
});


test('07 skill: edited monster HP stays stable when another monster is defeated', async ({ page }) => {
 await page.goto('/07_skill/');
 const mapTab=page.locator('.role-tab[data-role="map"]');
 await mapTab.click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));
  await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count()>=2)break;
 }
 const monsterTiles=page.locator('#mp-monster-list .mp-monster:visible');
 await expect(monsterTiles).toHaveCount(2,{timeout:5000}).catch(()=>{});
 expect(await monsterTiles.count()).toBeGreaterThanOrEqual(2);
 await monsterTiles.first().click();
 await monsterTiles.nth(1).click();
 const hpInputs=page.locator('#map-roster-list input[aria-label$="の残りHP"]');
 await expect(hpInputs).toHaveCount(2);
 const editedLabel=await hpInputs.first().getAttribute('aria-label');
 const editedInput=page.locator('input[aria-label="'+editedLabel+'"]');
 const firstHp=Number(await editedInput.inputValue());
 expect(firstHp).toBeGreaterThan(1);
 const editedHp=firstHp-1;
 await editedInput.fill(String(editedHp));
 await editedInput.dispatchEvent('change');
 await expect(editedInput).toHaveValue(String(editedHp));
 await page.locator('#map-roster-list .roster-remove').nth(1).click();
 await expect(page.locator('input[aria-label="'+editedLabel+'"]')).toHaveValue(String(editedHp));
});


test('07 skill: Z3000 Pull In manually targets a monster and deals 5 damage', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const target=page.locator('#map-roster-list .roster-select').first(),hp=page.locator('#map-roster-list input[aria-label$="の残りHP"]').first();
 const before=Number(await hp.inputValue());
 await selectCharacter(page,'9');
 await page.getByRole('button',{name:'引き寄せるを発動'}).click();
 await expect(page.locator('#character-skill-target-banner')).toContainText('引き寄せる：対象のモンスターを選択してください');
 await page.locator('.role-tab[data-role="map"]').click();
 await target.click();
 if(before>5)await expect(hp).toHaveValue(String(before-5));else await expect(page.locator('#map-roster-list .roster-card').first()).toHaveClass(/defeated/);
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 4 \/ \d+$/);
});


test('07 skill: Papara active skill forces half-HP attack bonus until turn end', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'7');
 const hp=page.locator('#selected-character-current-hp');await hp.fill('10');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await page.getByRole('button',{name:'ひとくちだけを発動'}).click();await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});

test('07 skill: Teru possession accepts ally stats and adds half for the turn', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'23');
 const atk=page.locator('#selected-character-atk'),def=page.locator('#selected-character-def');const beforeAtk=Number(await atk.inputValue()),beforeDef=Number(await def.inputValue());
 let dialogIndex=0;page.on('dialog',async dialog=>{await dialog.accept(dialogIndex++===0?'5':'3');});
 await page.getByRole('button',{name:'三神憑依を発動'}).click();
 await expect(atk).toHaveValue(String(beforeAtk+2.5));await expect(def).toHaveValue(String(beforeDef+1.5));
 await page.locator('#turn-end').click();await expect(atk).toHaveValue(String(beforeAtk));await expect(def).toHaveValue(String(beforeDef));
});

test('07 skill: Chouten fan count and Ame love are manually managed and referenced', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'101');
 const fan=page.getByLabel('ファンの数'),hp=page.locator('#selected-character-current-hp');await fan.fill('3');await fan.dispatchEvent('change');await hp.fill('1');await hp.dispatchEvent('change');
 await page.getByRole('button',{name:'インターネットエンジェルを発動'}).click();await expect(hp).toHaveValue('4');
 await selectCharacter(page,'102');const love=page.getByLabel('愛の数');await expect(love).toHaveValue('2');await love.fill('4');await love.dispatchEvent('change');
 const ameHp=page.locator('#selected-character-current-hp');await ameHp.fill('1');await ameHp.dispatchEvent('change');const baseMove=Number(await page.locator('#selected-character-move').textContent()),baseMaxHp=Number(await page.locator('#selected-character-hp').textContent());
 await page.getByRole('button',{name:'愛情の過剰摂取を発動'}).click();await expect(page.locator('#selected-character-move')).toHaveText(String(baseMove+4));await expect(love).toHaveValue('0');await expect(love).toHaveAttribute('max','5');await expect(page.locator('#selected-character-hp')).toHaveText(String(baseMaxHp+1));
});
