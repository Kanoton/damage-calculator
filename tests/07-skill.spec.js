const { test, expect } = require('@playwright/test');

async function selectCharacter(page,id){
 await page.locator('.role-tab.character-tab').click();
 await page.locator(`.character-select[data-id="${id}"]`).click();
}

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
 await expect(page.locator('#selected-character-ct')).toHaveText('CT 0');
 await skill.click();
 await expect(banner).toBeVisible();
 await page.locator('.role-tab[data-role="map"]').click();
 await target.click();
 await expect(banner).toBeHidden();
 if(before>2)await expect(hp).toHaveValue(String(before-2));else await expect(page.locator('#map-roster-list .roster-card').first()).toHaveClass(/defeated/);
 await expect(aura).toHaveValue('1');
 await expect(page.locator('#selected-character-ct')).toHaveText('CT 3');
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
 await expect(page.locator('#selected-character-ct')).toHaveText('CT 3');
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
 await expect(page.locator('#selected-character-ct')).toHaveText('CT 3');

 await selectCharacter(page,'28');
 const defense=page.locator('#map-roster-list input[aria-label$="の防御力"]').first();
 const before=Number(await defense.inputValue());
 await page.getByRole('button',{name:'インターセプトタックルを発動'}).click();
 await target.click();
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
  await expect(ct).toHaveText('CT 0');
  await skill.click();
  if(['9','13','14','23','27','28','106'].includes(id)){
   await expect(ct).toHaveText('CT 0');
   continue;
  }
  await expect(ct).toHaveText('CT '+cooldown);
  await ct.click();
  await expect(ct).toHaveText('CT '+(cooldown-1));
  await ct.click({button:'right'});
  await expect(ct).toHaveText('CT '+cooldown);
 }
});

test('07 skill: Jasmine active skill applies turn effects and cooldown', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'16');
 const skill=page.getByRole('button',{name:'オーバードライブを発動'});
 const ct=page.locator('#selected-character-ct');
 await expect(page.locator('#selected-character-skill-controls')).toBeVisible();
 await expect(ct).toHaveText('CT 0');
 await expect(page.locator('#selected-character-move')).toHaveText('0');
 await expect(page.locator('#selected-character-def')).toHaveValue('0');
 await skill.click();
 await expect(page.locator('#selected-character-move')).toHaveText('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('0');
 await expect(ct).toHaveText('CT 4');
 await expect(skill).toBeDisabled();
 await page.locator('#turn-end').click();
 await expect(page.locator('#selected-character-move')).toHaveText('0');
 await expect(page.locator('#selected-character-def')).toHaveValue('0');
 await expect(ct).toHaveText('CT 4');
 await ct.click();
 await expect(ct).toHaveText('CT 3');
 await ct.click({button:'right'});
 await expect(ct).toHaveText('CT 4');
 await ct.click();await ct.click();await ct.click();await ct.click();
 await expect(ct).toHaveText('CT 0');
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
 await expect(page.locator('#selected-character-ct')).toHaveText('CT 4');
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
 const ameHp=page.locator('#selected-character-current-hp');await ameHp.fill('1');await ameHp.dispatchEvent('change');const baseMove=Number(await page.locator('#selected-character-move').textContent());
 await page.getByRole('button',{name:'愛情の過剰摂取を発動'}).click();await expect(page.locator('#selected-character-move')).toHaveText(String(baseMove+4));await expect(love).toHaveValue('0');
});

test('07 skill: Sherry Mighty Magic manually targets a monster and deals 2 damage', async ({ page }) => {
 await page.goto('/07_skill/');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');for(const option of await mapSelect.locator('option').all()){await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;}
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();const hp=page.locator('#map-roster-list input[aria-label$="の残りHP"]').first(),target=page.locator('#map-roster-list .roster-select').first();const before=Number(await hp.inputValue());
 await selectCharacter(page,'106');await page.getByRole('button',{name:'怪力魔法を発動'}).click();await target.click();if(before>2)await expect(hp).toHaveValue(String(before-2));else await expect(page.locator('#map-roster-list .roster-card').first()).toHaveClass(/defeated/);await expect(page.locator('#selected-character-ct')).toHaveText('CT 2');
});
