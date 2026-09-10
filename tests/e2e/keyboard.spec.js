/**
 * The site by keyboard alone.
 *
 * Programmatic el.focus() is not a substitute for this: it does not reliably
 * put an element into :focus-visible, which is what the focus styles key off.
 * A sweep written that way reported zero problems on nine routes and missed
 * the one that was real, so these press Tab.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/library', '/ai', '/ask', '/progress', '/exam-prep', '/login'];

test.describe('keyboard traversal', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**',
      route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  });

  for (const route of ROUTES) {
    test(`${route} keeps a visible focus ring on every stop`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.locator('#app h1').first().waitFor({ timeout: 10000 });

      const unmarked = [];
      for (let step = 0; step < 25; step += 1) {
        await page.keyboard.press('Tab');
        // Focus rings transition in over ~160ms. Reading the computed style
        // straight after Tab catches the interpolation, not the result: it
        // reports a hairline at a few percent alpha and looks exactly like a
        // missing ring. That artifact sent me chasing a defect on /login that
        // did not exist, so this waits for the transition to land.
        await page.waitForTimeout(220);
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          // An outline is one way to indicate focus; a ring drawn with
          // box-shadow is another, and both are legitimate. What is not
          // legitimate is a hairline at a few percent alpha, which measures as
          // present and reads as nothing, so the shadow has to be thick enough
          // to see.
          const ring = style => {
            if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) return true;
            const shadow = style.boxShadow;
            if (!shadow || shadow === 'none') return false;
            const widths = [...shadow.matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]));
            return widths.some(w => w >= 2);
          };
          // A borderless field may carry its ring on the wrapper it sits in,
          // so the whole control lights up rather than the bare input.
          const wrapper = el.closest('.search, .glass-menu');
          const ok = ring(getComputedStyle(el)) || (wrapper && ring(getComputedStyle(wrapper)));
          const cls = typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '';
          return { ok, what: `${el.tagName.toLowerCase()}.${cls}` };
        });
        if (stop && !stop.ok) unmarked.push(stop.what);
      }

      expect([...new Set(unmarked)], `focus ring missing on ${route}`).toEqual([]);
    });
  }

  test('the first stop is the skip link, wherever nothing claims focus', async ({ page }) => {
    // /ask is excluded on purpose. It focuses its question field on arrival,
    // which is a deliberate choice for a page whose whole job is typing a
    // question, and it costs something real: a reader arrives inside the field
    // rather than at the heading. Shift+Tab still reaches everything above.
    // Recording the trade-off rather than quietly reversing someone's decision.
    for (const route of ROUTES.filter(r => r !== '/ask')) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.locator('#app h1').first().waitFor({ timeout: 10000 });
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => (document.activeElement?.textContent || '').trim());
      expect(first, `first tab stop on ${route}`).toMatch(/skip to content/i);
    }
  });
});
