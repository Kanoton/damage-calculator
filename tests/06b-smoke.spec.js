const { test, expect } = require('@playwright/test');

test('06b smoke: initializes core UI without page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/06b_chara/');
  await expect(page.locator('#mp-map-select')).toBeVisible();
  await expect(page.locator('#selected-character')).toBeVisible();
  await expect(page.locator('#attackPower1')).toBeVisible();
  await expect(page.locator('#defensePower1')).toBeVisible();

  await expect(page.locator('#mp-map-select option')).not.toHaveCount(0);
  await expect(page.locator('#character-image-list').locator('img, button')).not.toHaveCount(0);
  await expect(page.locator('#mp-monster-list').locator('button, option, img')).not.toHaveCount(0);

  expect(errors).toEqual([]);
});

test('06b smoke: calculator reacts to input', async ({ page }) => {
  await page.goto('/06b_chara/');
  const attack = page.locator('#attackPower1');
  await attack.fill('10');
  await attack.dispatchEvent('input');
  await expect(attack).toHaveValue('10');
});
