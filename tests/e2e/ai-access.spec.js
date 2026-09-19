/**
 * The two ways into KIT must reach the same assistant, holding the same context.
 *
 * KINETIQ offers a page and a persistent trigger. The trigger used to open a
 * modal whose entire content was an advertisement for KIT with a link to it,
 * so the control named after the assistant did not open the assistant. The
 * lesson-page button, "Ask KIT about this lesson", did the same. Two entry
 * points, neither of them the assistant.
 */
import { test, expect } from '@playwright/test';

const settle = async page => {
  await page.locator('#app h1').first().waitFor({ timeout: 10000 });
};

test.describe('getting to KIT', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**',
      route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  });

  test('the header trigger opens the assistant itself, not a page about it', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await settle(page);

    await page.locator('#tutorButton').click();
    await expect(page).toHaveURL(/\/ask$/);
    // The workspace proper: a place to type, not a link to somewhere else.
    await expect(page.locator('#askInput')).toBeVisible();
  });

  test('the lesson button carries that lesson into the assistant', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const firstLesson = page.locator('a[href^="/lesson/"]').first();
    const href = await firstLesson.getAttribute('href');
    const slug = href.split('/lesson/')[1];

    await page.goto(href, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.locator('[data-open-tutor]').first().click();
    await expect(page).toHaveURL(/\/ask$/);

    // Arriving from a lesson must bring the lesson. Route memory is what makes
    // the trigger and the page one assistant rather than two.
    const remembered = await page.evaluate(() => {
      try { return JSON.parse(sessionStorage.getItem('phylab_ai_context_memory') || '{}'); }
      catch { return {}; }
    });
    expect(remembered.lesson_slug, 'KIT must know which lesson you came from').toBe(slug);
  });

  test('no entry point renders an advert for KIT instead of KIT', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.locator('#tutorButton').click();
    await expect(page).toHaveURL(/\/ask$/);
    // The tell-tale of the old behaviour is the modal itself: the trigger put
    // a dialog on screen whose only content was a link onward. Asserting on
    // links to /ai instead would be wrong, because the footer carries one
    // legitimately, and a test that fails on a correct page is worse than no
    // test.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator('#modalRoot')).toBeEmpty();
  });

  test('the conversation area says what KIT is for before you ask anything', async ({ page }) => {
    // renderMessages ran only after a conversation was opened, created,
    // deleted or replied to, so a first visit showed the largest panel on the
    // page as a blank rectangle, and the empty state written for it was
    // unreachable until you had already done something.
    await page.goto('/ask', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await expect(page.locator('.ask-page .page-lead')).toContainText(/lessons, formulae, worked examples and cases/i);
    await expect(page.locator('#askInput')).toBeVisible();
  });

  test('the sticky rails read as floating surfaces, and fall back when asked', async ({ page }) => {
    await page.goto('/ask', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const filter = await page.locator('.ask-form .search').evaluate(el => getComputedStyle(el).backdropFilter);
    expect(filter, 'the question control should use the glass layer').toContain('blur');
  });
});

// ── One assistant behind both "Ask" entry points ─────────────────────
// The primary nav said "Ask" and opened /ask, a cited-search page with no
// AI model behind it, while "Ask KIT" opened the tutor. Two different
// assistants behind the same verb is the drift this guards.
test('the nav "Ask" and the "Ask KIT" button open the same assistant', async ({ page }) => {
  await page.goto('/library', { waitUntil: 'domcontentloaded' });
  await page.locator('#app h1').first().waitFor();

  await page.locator('.nav-primary a', { hasText: /^Ask$/ }).click();
  await expect(page).toHaveURL(/\/ask$/);
  // Read the heading only once the assistant has drawn, not the page it left.
  await page.locator('#askInput').waitFor();
  const fromNav = await page.locator('#app h1').first().textContent();

  await page.goto('/library', { waitUntil: 'domcontentloaded' });
  await page.locator('#app h1').first().waitFor();
  await page.locator('#tutorButton').click();
  await expect(page).toHaveURL(/\/ask$/);
  await page.locator('#askInput').waitFor();
  await expect(page.locator('#app h1').first()).toHaveText(fromNav);
});

// ── The public assistant works without an external provider ──────────
test('a question receives a cited answer from KINETIQ lessons', async ({ page }) => {
  await page.goto('/ask', { waitUntil: 'domcontentloaded' });
  const input = page.locator('#askInput');
  await input.waitFor();
  await expect(input).toBeEnabled();
  await input.fill('What is momentum?');
  await page.getByRole('button', { name: 'Answer', exact: true }).click();

  const reply = page.locator('.ask-answer');
  await expect(reply).toBeVisible({ timeout: 15000 });
  await expect(reply).toContainText(/momentum/i);
  await expect(reply.locator('.ask-sources a').first()).toBeVisible();
});
