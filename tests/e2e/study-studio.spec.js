import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

test.describe('Study Studio', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('reasoning and physics tools calculate and persist', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('h1')).toHaveText(/Think, test and organise/);

    const step = page.locator('[data-derivation-stage] span');
    await expect(step).toHaveText('Step 1 of 5');
    await page.locator('[data-derive-next]').click();
    await expect(step).toHaveText('Step 2 of 5');

    await page.locator('[data-shape="inverse-square"]').click();
    await expect(page.locator('[data-prediction-feedback]')).toContainText('Correct');

    await page.locator('[data-conversion-value]').fill('72');
    await page.locator('[data-conversion-answer]').fill('20');
    await page.locator('[data-check-conversion]').click();
    await expect(page.locator('[data-conversion-feedback]')).toContainText('Correct');

    const result = page.locator('[data-compare-results]');
    const before = await result.innerText();
    await page.locator('[data-compare-speed="0"]').fill('28');
    await expect(result).not.toHaveText(before);

    await page.locator('[data-scratchpad]').fill('F = ma, then check N = kg m s⁻²');
    await page.reload();
    await expect(page.locator('[data-scratchpad]')).toHaveValue('F = ma, then check N = kg m s⁻²');
  });

  test('reading preferences persist and reduced motion is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/studio');
    await page.locator('.reading-tools__trigger').click();
    await page.locator('[data-reading-size="large"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-reading-size', 'large');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-reading-size', 'large');
    const duration = await page.locator('.button').first().evaluate(el => getComputedStyle(el).transitionDuration);
    expect(duration).toMatch(/0\.01ms|0s/);
  });

  test('calendar reports only actual saved study evidence', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('[data-calendar]')).not.toContainText(/^Review$|^Study$/);
    await page.locator('[data-goal-form] input').fill('Complete a motion graph set');
    await page.locator('[data-goal-form] button').click();
    await expect(page.locator('[data-calendar] .is-today small')).toContainText('1 goal');
  });
});

test.describe('mobile study dock', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('appears only in learning journeys with usable targets', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.study-dock')).toBeHidden();
    await page.goto('/lesson/kinematics');
    const dock = page.locator('.study-dock');
    await expect(dock).toBeVisible();
    for (const link of await dock.locator('a').all()) {
      const box = await link.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
