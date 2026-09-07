// Baseline design and accessibility audit. Read-only: it measures the site as
// built and reports, so a fix can be judged against real numbers.
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/library', '/simulations', '/exam-prep', '/ask', '/data', '/login', '/formulas'];
// hasTouch matters: the touch-target rules are written against
// `@media (pointer: coarse)`, so without it the browser reports a fine pointer
// and the very rules under test never apply.
const SIZES = [
  { name: 'mobile', width: 375, height: 812, touch: true },
  { name: 'tablet', width: 834, height: 1112, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false }
];

// A tap target smaller than this is hard to hit reliably on a touch screen.
const MIN_TAP = 44;

for (const size of SIZES) {
  test.describe(`${size.name} ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch });

    for (const route of ROUTES) {
      test(`audit ${route}`, async ({ page }) => {
        const consoleErrors = [];
        page.on('console', message => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', error => consoleErrors.push(`pageerror: ${error.message}`));

        await page.goto(route, { waitUntil: 'networkidle' });

        // Horizontal overflow: the body must never scroll sideways.
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);

        // Undersized tap targets among visible interactive elements.
        const smallTargets = size.name === 'mobile' ? await page.evaluate(min => {
          const out = [];
          for (const el of document.querySelectorAll('a[href], button, input, select, [role="menuitem"]')) {
            const box = el.getBoundingClientRect();
            if (!box.width || !box.height) continue;
            if (getComputedStyle(el).visibility === 'hidden') continue;
            // WCAG 2.5.5 exempts a link sitting inline inside a sentence:
            // it cannot be padded out without breaking the line it lives in.
            const parent = el.parentElement;
            const inlineInProse = el.tagName === 'A' && parent &&
              ['P', 'LI', 'SPAN', 'TD', 'DD', 'SMALL'].includes(parent.tagName) &&
              (parent.textContent || '').trim().length > (el.textContent || '').trim().length + 12;
            if (inlineInProse) continue;
            if (box.height < min || box.width < min) {
              out.push(`${el.tagName.toLowerCase()}.${el.className || ''} ${Math.round(box.width)}x${Math.round(box.height)} "${(el.textContent || '').trim().slice(0, 30)}"`);
            }
          }
          return out;
        }, MIN_TAP) : [];

        // Heading order: an h1 must exist and levels must not skip.
        const headings = await page.evaluate(() =>
          [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => Number(h.tagName[1])));

        console.log(JSON.stringify({
          route, viewport: size.name, overflow,
          consoleErrors: consoleErrors.slice(0, 5),
          smallTargets: smallTargets.slice(0, 12),
          smallTargetCount: smallTargets.length,
          h1Count: headings.filter(l => l === 1).length,
          skips: headings.filter((l, i) => i && l - headings[i - 1] > 1).length
        }));

        await page.screenshot({ path: `test-results/shots/${size.name}${route.replace(/\//g, '_')}.png`, fullPage: false });
        expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
      });
    }
  });
}
