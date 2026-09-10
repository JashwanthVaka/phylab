/**
 * Every data-driven view has something to say when the data is not there.
 *
 * The happy path is what gets looked at. These tests take the data away --
 * the content API failing, a fresh browser with no progress -- and assert
 * that each view explains itself and offers a way on, instead of rendering
 * a blank page or a spinner that never stops.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**',
    route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

// ── Error: the content catalogue is unreachable ──────────────────────
for (const route of ['/library', '/exam-prep', '/progress', '/revision', '/formulas', '/lesson/kinematics']) {
  test(`${route} explains a failed load and offers a retry`, async ({ page }) => {
    await page.route('**/api/content/**', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"down"}' }));
    await page.goto(route, { waitUntil: 'domcontentloaded' });

    const app = page.locator('#app');
    await expect(app).not.toBeEmpty({ timeout: 15000 });
    // A heading that says something is wrong, and a way to try again.
    await expect(page.locator('#app h1').first()).toBeVisible();
    await expect(page.locator('#app [data-retry], #app button:has-text("Try again"), #app a:has-text("Try again")').first())
      .toBeVisible();
    // The loading overlay must not be left spinning over the error.
    await expect(page.locator('#phylab-loading-overlay')).toBeHidden();
  });
}

// ── Empty: a first visit with nothing recorded ───────────────────────
test('the progress dashboard is honest on a first visit', async ({ page }) => {
  await page.goto('/progress', { waitUntil: 'domcontentloaded' });
  await page.locator('#app h1').first().waitFor({ timeout: 15000 });
  // No invented numbers: empty sections say so, and there is a next step.
  await expect(page.locator('#app .empty-state').first()).toBeVisible();
  await expect(page.locator('#app a[href^="/lesson/"], #app a[href="/library"]').first()).toBeVisible();
});

test('the library says so when a search matches nothing', async ({ page }) => {
  await page.goto('/library', { waitUntil: 'domcontentloaded' });
  const search = page.locator('#app input[type="search"], #app .library-search input').first();
  await search.waitFor({ timeout: 15000 });
  await search.fill('zzzz no such physics topic');
  await expect(page.locator('#app').getByText(/no lessons|nothing matches|no match/i).first()).toBeVisible();
});

test('KIT says what it is for before anything is asked', async ({ page }) => {
  await page.goto('/ai', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#aiMessages .ai-empty')).toBeVisible({ timeout: 15000 });
});

// ── Loading: a slow catalogue shows progress, then content ───────────
test('a slow load shows a loading state, then the page', async ({ page }) => {
  await page.route('**/api/content/index', async r => { await new Promise(res => setTimeout(res, 1500)); await r.continue(); });
  await page.goto('/library', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#phylab-loading-overlay')).toBeVisible();
  await expect(page.locator('#app h1').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#phylab-loading-overlay')).toBeHidden();
});
