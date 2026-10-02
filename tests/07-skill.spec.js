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
 const energy=page.getByLabel('エネルギー保存の数');
 await energy.fill('2');await energy.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await expect(page.locator('#selected-character-def')).toHaveValue('4');

 await selectCharacter(page,'14');
 const sword=page.getByLabel('剣気の数');
 await sword.fill('9');await sword.dispatchEvent('change');
 await expect(sword).toHaveValue('3');

 await selectCharacter(page,'24');
 const precision=page.getByLabel('精確無比の数');
 await precision.fill('3');await precision.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await page.locator('#turn-end').click();
 await expect(precision).toHaveValue('2');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');

 await selectCharacter(page,'25');
 const awakening=page.getByLabel('覚醒の数');
 await awakening.fill('8');await awakening.dispatchEvent('change');
 await page.getByRole('button',{name:/真龍：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');

 await selectCharacter(page,'104');
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
 const starlight=page.getByLabel('スターライトの数');
 await starlight.fill('13');await starlight.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');
});

test('07 skill: Papara gains attack at half HP or lower', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'7');
 const hp=page.locator('#selected-character-hp');
 await hp.fill('5');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await hp.fill('6');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});
