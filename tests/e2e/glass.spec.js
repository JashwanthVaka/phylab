/**
 * Glass is for things that float, and it has to read as glass there.
 *
 * Every floating surface shares one primitive, .glass. These check that the
 * primitive is actually doing its job -- blur behind, a lit rim, a sheen that
 * sits under the text rather than over it -- on a desktop and on a phone, and
 * that the two floating surfaces which used to be opaque boxes now use it.
 */
import { test, expect } from '@playwright/test';

const readGlass = () => {
  const measure = el => {
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    const after = getComputedStyle(el, '::after');
    return {
      blur: /blur\(/.test(cs.backdropFilter || cs.webkitBackdropFilter || ''),
      rimLit: /gradient/.test(after.backgroundImage),
      sheenBehindText: /gradient/.test(before.backgroundImage) && before.zIndex === '-1',
    };
  };
  return [...document.querySelectorAll('.glass')]
    .filter(el => getComputedStyle(el).display !== 'none')
    .map(el => ({ surface: (el.className.split(' ').find(c => c !== 'glass') || el.id), ...measure(el) }));
};

for (const [label, width, height] of [['desktop', 1280, 900], ['phone', 375, 812]]) {
  test(`every floating surface is lit glass on ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await page.locator('#app h1').first().waitFor({ timeout: 15000 });
    if (width < 800) await page.locator('#navBurger').click();

    const surfaces = await page.evaluate(readGlass);
    expect(surfaces.length, 'there should be glass to measure').toBeGreaterThan(0);
    const flat = surfaces.filter(s => !(s.blur && s.rimLit && s.sheenBehindText));
    expect(flat, `glass surfaces missing blur, rim or sheen on ${label}`).toEqual([]);
  });
}

test('the loading card uses the glass material', async ({ page }) => {
  await page.route('**/api/content/index', async r => { await new Promise(res => setTimeout(res, 1200)); await r.continue(); });
  await page.goto('/library', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.phylab-loading-overlay__card.glass')).toBeVisible();
});

// Its own test, and so its own browser context: after a first load the
// service worker answers from cache, and Playwright does not intercept
// service-worker requests, so a failure staged on a second visit never lands.
test('a toast uses the glass material', async ({ page }) => {
  await page.route('**/api/content/**', r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('/progress', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.notification.glass').first()).toBeVisible({ timeout: 15000 });
});
