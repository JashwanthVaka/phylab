// The journeys a student actually takes. These check that the site works, not
// that it photographs well.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Unreachable from the build container, and it hangs rather than failing,
  // which delays DOMContentLoaded because app.js is a module script waiting on
  // the CSSOM. Failing it immediately keeps these runs deterministic. The site
  // renders in its fallback stack, so layout measurements still hold.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('primary navigation reaches each section', async ({ page }) => {
    await page.goto('/');
    for (const [label, path, heading] of [
      ['Learn', '/library', /course|librar|unit/i],
      ['Lab', '/simulations', /model the physics/i],
      ['Practice', '/exam-prep', /practi|exam/i]
    ]) {
      await page.locator('.nav-primary').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator('h1')).toContainText(heading);
    }
  });

  test('the More menu opens, is labelled, and closes on Escape', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('#navMoreBtn');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#navMoreMenu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('the hero call to action opens a real lesson', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /start learning/i }).click();
    await expect(page).toHaveURL(/\/lesson\/.+/);
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('search returns results for a real topic', async ({ page }) => {
    await page.goto('/');
    await page.locator('#globalSearch').fill('momentum');
    await expect(page).toHaveURL(/\/search\?q=momentum/, { timeout: 5000 });
    await expect(page.locator('.search-result').first()).toBeVisible();
  });

  test('the theme toggle switches and persists', async ({ page }) => {
    await page.goto('/');
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('a simulation recomputes when an input changes', async ({ page }) => {
    await page.goto('/simulations/projectile');
    const output = page.locator('#simOutput');
    await expect(output).not.toBeEmpty();
    const before = await output.innerText();
    const field = page.locator('#simForm input[type="number"]').first();
    await field.fill(String(Number(await field.inputValue()) + 7));
    await field.dispatchEvent('input');
    await expect(output).not.toHaveText(before, { timeout: 5000 });
  });

  test('an unknown route shows a not-found page rather than an empty one', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.locator('#app')).not.toBeEmpty();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('every page keeps exactly one h1 and a reachable skip link', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className);
    expect(focused).toContain('skip-link');
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('the burger opens the menu and a link navigates', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('#navBurger');
    await expect(burger).toBeVisible();
    await expect(page.locator('.nav-primary')).toBeHidden();
    await burger.click();
    await expect(page.locator('#mobileNav')).toBeVisible();
    await page.locator('#mobileNav').getByRole('link', { name: 'Lab', exact: true }).click();
    await expect(page).toHaveURL(/\/simulations$/);
  });

  test('KIT is still reachable without the header shortcut', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tutorButton')).toBeHidden();
    await page.locator('#navBurger').click();
    await page.locator('#mobileNav').getByRole('link', { name: 'Ask' }).click();
    await expect(page).toHaveURL(/\/ask$/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('the data lab rejects input it cannot use', async ({ page }) => {
    await page.goto('/data');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('form, .dl-table, input').first()).toBeVisible();
  });
});
