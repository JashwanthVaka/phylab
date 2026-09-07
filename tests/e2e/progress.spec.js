/**
 * Completing a lesson and seeing it recorded.
 *
 * Supabase is not configured in this environment, so these run the guest path.
 * That is still the path that was broken: the lesson page wrote to a store
 * nothing else read. What is verified here is that one action is reflected
 * everywhere the learner looks, which is the property the account path needs
 * too, since both go through progressService.
 */
import { test, expect } from '@playwright/test';

/**
 * Playwright's default waitUntil is 'load', which waits on every subresource.
 * The Google Fonts stylesheet is unreachable from the build container, so that
 * event never fires and the navigation times out on a page that has in fact
 * rendered. Waiting for the app to paint is both faster and closer to what a
 * reader actually waits for.
 */
test.beforeEach(async ({ page }) => {
  // The font stylesheet is unreachable from the build container and the
  // request hangs rather than failing. app.js is a module script, so it waits
  // on the CSSOM, and DOMContentLoaded waits on it: the page renders many
  // seconds late for a reason that has nothing to do with what is under test.
  // Failing the request immediately keeps these deterministic. The site still
  // renders, in its fallback stack.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

async function open(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.locator('#app h1').first().waitFor({ state: 'visible' });
}

test.describe('recording what a learner has completed', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('marking a lesson complete shows up on the progress page and the homepage', async ({ page }) => {
    await open(page, '/');
    // Start from a clean slate so the assertions mean something.
    await page.evaluate(() => localStorage.clear());

    await open(page, '/progress');
    const firstRow = page.locator('.completion-row').first();
    await expect(firstRow).toBeVisible();
    const lessonName = (await firstRow.locator('a').innerText()).trim();
    await expect(firstRow.locator('.completion-status')).toHaveText('Not started');

    // Complete it from the lesson page, which is the path that used to lose it.
    await firstRow.locator('a').click();
    await expect(page).toHaveURL(/\/lesson\/.+/);
    const button = page.locator('[data-complete-lesson]');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveText(/completed/i);

    // The progress page must now agree.
    await open(page, '/progress');
    const row = page.locator('.completion-row', { hasText: lessonName }).first();
    await expect(row).toHaveClass(/is-done/);
    await expect(row.locator('.completion-status')).toHaveText('Completed');

    // And so must the homepage ring, which reads the same source.
    await open(page, '/');
    await expect(page.locator('.progress-card p:not(.eyebrow)')).toContainText('1 of');
  });

  test('a completed lesson still reads as completed when the page is reopened', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => localStorage.clear());
    await open(page, '/progress');
    const href = await page.locator('.completion-row a').first().getAttribute('href');

    await open(page, href);
    await page.locator('[data-complete-lesson]').click();
    await expect(page.locator('[data-complete-lesson]')).toHaveAttribute('aria-pressed', 'true');

    // Reload: the button must not offer to complete an already-completed lesson.
    await page.reload();
    await expect(page.locator('[data-complete-lesson]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-complete-lesson]')).toHaveText(/completed/i);
  });

  test('completion can be undone', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => localStorage.clear());
    await open(page, '/progress');
    const href = await page.locator('.completion-row a').first().getAttribute('href');

    await open(page, href);
    const button = page.locator('[data-complete-lesson]');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveText(/mark lesson complete/i);
  });

  test('the progress page states where the record is kept', async ({ page }) => {
    await open(page, '/progress');
    await expect(page.locator('.completion-note')).toBeVisible();
    await expect(page.locator('.completion-note')).toContainText(/this browser|your KINETIQ account/i);
  });

  test('signed out, the sign-in route is reachable and explains itself', async ({ page }) => {
    await open(page, '/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#app')).not.toBeEmpty();
  });
});
