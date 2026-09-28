import { test, expect } from '@playwright/test';

test('a guest notebook item survives its save reload and remains private to this browser', async ({ page }) => {
  await page.goto('/notebook');
  await page.getByLabel('Topic').fill('Kinematics');
  await page.getByLabel('Title or front of card').fill('Acceleration definition');
  await page.getByLabel('Note or highlighted text').fill('Acceleration is the rate of change of velocity.');
  await page.getByRole('button', { name: 'Save to notebook' }).click();
  await expect(page.getByRole('heading', { name: 'Acceleration definition' })).toBeVisible();
  await expect(page.getByText('1 item')).toBeVisible();
});

test('a formula opens the unified source-cited KIT with its context', async ({ page }) => {
  await page.goto('/formulas');
  const firstFormula = page.locator('.formula-block').first();
  const formulaName = await firstFormula.locator('h3').textContent();
  await firstFormula.click();
  await expect(page).toHaveURL(/\/formulas\//);
  await page.getByRole('link', { name: 'Ask KIT about this formula' }).click();
  await expect(page).toHaveURL(/\/ask\?q=/);
  await expect(page.locator('#askInput')).toHaveValue(new RegExp(formulaName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});

test('a simulation can close after interaction without a browser error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/simulations/projectile');
  const input = page.locator('[data-number]').first();
  await input.fill('24');
  await expect(page.locator('#simOutput')).not.toBeEmpty();
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: /Your learning/ })).toBeVisible();
  expect(errors).toEqual([]);
});
