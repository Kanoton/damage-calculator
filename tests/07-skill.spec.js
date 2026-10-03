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
 const marks=page.getByLabel('対象のマークの数');
 await marks.fill('2');await marks.dispatchEvent('change');
 await page.getByRole('button',{name:/マーク持ちを攻撃：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.getByRole('button',{name:/潜伏：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
});


test('07 skill: edited monster HP stays stable when another monster is defeated', async ({ page }) => {
 await page.goto('/07_skill/');
 const mapTab=page.locator('.role-tab[data-role="map"]');
 await mapTab.click();
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
 const firstHp=Number(await hpInputs.first().inputValue());
 expect(firstHp).toBeGreaterThan(1);
 const editedHp=firstHp-1;
 await hpInputs.first().fill(String(editedHp));
 await hpInputs.first().dispatchEvent('change');
 await expect(hpInputs.first()).toHaveValue(String(editedHp));
 await page.locator('#map-roster-list .roster-remove').nth(1).click();
 await expect(page.locator('#map-roster-list input[aria-label$="の残りHP"]').first()).toHaveValue(String(editedHp));
});
