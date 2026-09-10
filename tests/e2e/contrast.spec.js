/**
 * Text contrast in both themes, measured rather than judged.
 *
 * The five unit colours were each tuned to pass AA on white, and only on
 * white: there was no dark-mode override at all. In dark mode the same dark
 * hues sat on the #111827 card, and unit B's level pill measured 3.16:1, well
 * under AA for 10px text, on the badge carrying the unit's identity.
 *
 * A design token that is correct in one theme and never checked in the other
 * is the shape of defect this guards.
 */
import { test, expect } from '@playwright/test';

const CONTRAST = `(() => {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = rgb => {
    const [r, g, b] = rgb.match(/[\\d.]+/g).map(Number);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  // Walks up for the first ancestor that actually paints, because a
  // transparent background means the text sits on whatever is behind it.
  const behind = el => {
    for (let node = el; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      const alpha = bg.match(/[\\d.]+/g);
      if (bg && bg !== 'transparent' && (!alpha || alpha.length < 4 || Number(alpha[3]) > 0.9)) return bg;
    }
    return 'rgb(255, 255, 255)';
  };
  return (el) => {
    const a = lum(getComputedStyle(el).color);
    const b = lum(behind(el));
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  };
})()`;

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} theme contrast`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.route('https://fonts.googleapis.com/**',
        route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      await page.addInitScript(value => localStorage.setItem('kinetiq-theme', value), theme);
    });

    test('every unit level badge on /library clears AA', async ({ page }) => {
      await page.goto('/library', { waitUntil: 'domcontentloaded' });
      await page.locator('.library-card__level').first().waitFor({ timeout: 10000 });

      const worst = await page.evaluate(fn => {
        const contrast = eval(fn);
        const rows = [...document.querySelectorAll('.library-card__level')]
          .map(el => ({ unit: el.textContent.trim().slice(0, 12), ratio: contrast(el) }));
        return rows.sort((a, b) => a.ratio - b.ratio)[0];
      }, CONTRAST);

      expect(worst, 'there must be badges to measure').toBeTruthy();
      expect(worst.ratio, `worst unit badge (${worst.unit}) in ${theme}`).toBeGreaterThanOrEqual(4.5);
    });
  });
}
