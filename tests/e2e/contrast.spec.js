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

    // The badge test above was the only dark-mode contrast check, so the
    // primary button shipped at 2.61:1 on nineteen routes while this file
    // passed. --blue is both the link colour and the button fill: dark mode
    // lightens it so links read on a dark page, and white button text on that
    // lighter orange fails. Every control and text role is measured here.
    for (const route of ['/', '/library', '/lesson/kinematics', '/simulations/projectile',
      '/cases', '/ask', '/ai', '/exam-prep', '/progress', '/revision', '/formulas', '/login']) {
      test(`controls and text on ${route} clear AA`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.locator('#app h1').first().waitFor({ timeout: 15000 });

        const failures = await page.evaluate(fn => {
          const contrast = eval(fn);
          const roles = '.button, .btn-primary, .chip.is-active, a, p, li, h1, h2, h3, label, button, td, th, dt, dd';
          return [...document.querySelectorAll(`#app :is(${roles})`)]
            .filter(el => el.offsetParent && el.textContent.trim() && getComputedStyle(el).visibility !== 'hidden')
            // Measure the element that owns the text, not a wrapper around it.
            .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
            .map(el => {
              const cs = getComputedStyle(el);
              const size = parseFloat(cs.fontSize);
              const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
              return { el: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'}`,
                text: el.textContent.trim().slice(0, 28), ratio: contrast(el), need: large ? 3 : 4.5 };
            })
            .filter(row => row.ratio < row.need)
            .sort((a, b) => a.ratio - b.ratio)
            .slice(0, 6)
            .map(row => `${row.el} "${row.text}" ${row.ratio.toFixed(2)}:1 (needs ${row.need})`);
        }, CONTRAST);

        expect(failures, `text under AA on ${route} in ${theme}`).toEqual([]);
      });
    }
  });
}

/**
 * A standing rule for this site: dark blue is a text colour, never a surface.
 *
 * Every dark palette that existed here was navy -- #0A0F1A, #111827 -- in
 * three stacked blocks, each partly overriding the last. Rather than rely on
 * someone remembering the rule, the surfaces themselves are measured: a dark
 * theme surface may be warm, neutral or cool-grey, but not saturated blue.
 */
test('no dark-theme surface is dark blue', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kinetiq-theme', 'dark'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app h1').first().waitFor({ timeout: 15000 });

  const blue = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const hsl = hex => {
      const probe = document.createElement('div');
      probe.style.color = hex;
      document.body.append(probe);
      const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(v => v / 255);
      probe.remove();
      const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
      const l = (max + min) / 2;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h = 0;
      if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: Math.round(((h * 60) + 360) % 360), s, l };
    };
    return ['--bg', '--bg-alt', '--surface', '--surface-alt', '--surface-raised']
      .map(name => ({ name, value: root.getPropertyValue(name).trim() }))
      .filter(({ value }) => value)
      .map(token => ({ ...token, ...hsl(token.value) }))
      // Saturated and in the blue band. A near-neutral grey with a faint
      // cool cast is allowed; a navy is not.
      .filter(({ h, s }) => h >= 195 && h <= 250 && s > 0.18)
      .map(({ name, value, h, s }) => `${name} ${value} (hue ${h}, saturation ${(s * 100).toFixed(0)}%)`);
  });

  expect(blue, 'dark-theme surfaces must not be dark blue').toEqual([]);
});
