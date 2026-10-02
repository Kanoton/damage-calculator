const { test, expect } = require('@playwright/test');

test('06b smoke: initializes core UI without page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/06b_chara/');
  await expect(page.locator('#mp-map-select')).toBeVisible();
  await expect(page.locator('#selected-character')).toBeVisible();
  await page.locator('.role-tab[data-role="attack"]').click();
  await expect(page.locator('#attackPower1')).toBeVisible();
  await page.locator('.role-tab[data-role="defense"]').click();
  await expect(page.locator('.mode-content[data-role="defense"]')).toBeVisible();

  await expect(page.locator('#mp-map-select option')).not.toHaveCount(0);
  await expect(page.locator('#selected-character-name')).toHaveText('ミミ');
  await expect(page.locator('#character-image-list .character-select[data-id="1"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#mp-monster-list').locator('button, option, img')).not.toHaveCount(0);

  expect(errors).toEqual([]);
});

test('06b smoke: calculator reacts to input', async ({ page }) => {
  await page.goto('/06b_chara/');
  await page.locator('.role-tab[data-role="attack"]').click();
  const attack = page.locator('#attackPower1');
  await expect(attack).toBeVisible();
  await attack.fill('10');
  await attack.dispatchEvent('input');
  await expect(attack).toHaveValue('10');
});
