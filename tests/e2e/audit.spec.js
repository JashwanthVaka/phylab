// Design and accessibility audit across every route a student can reach.
//
// This began read-only: it measured and reported so a fix could be judged
// against real numbers. That was right for a baseline and wrong to keep,
// because the only assertion was on overflow. It printed 37 undersized tap
// targets and a heading skip and reported a pass, so the 103 targets fixed
// earlier had nothing holding them fixed. It asserts now.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Unreachable from the build container, and it hangs rather than failing,
  // which delays DOMContentLoaded because app.js is a module script waiting on
  // the CSSOM. Failing it immediately keeps these runs deterministic. The site
  // renders in its fallback stack, so layout measurements still hold.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

// Every destination a student can reach from the header, plus the shell
// routes. It used to be eight, which is how 33 undersized tap targets on
// /cases and /toolkit survived a suite that reported zero: a page nobody
// measures is a page with no defects.
const ROUTES = [
  '/', '/library', '/simulations', '/cases', '/ask', '/exam-prep', '/progress',
  '/ai', '/toolkit', '/data', '/ia', '/mistakes', '/revision', '/formulas',
  '/patterns', '/resources', '/login'
];
// hasTouch matters: the touch-target rules are written against
// `@media (pointer: coarse)`, so without it the browser reports a fine pointer
// and the very rules under test never apply.
// KINETIQ is used mainly on a Mac or a laptop, so the desktop range is
// covered at several real widths rather than one. 1512 is a 14-inch MacBook
// Pro, 1440 a 15-inch Air, 1280 a smaller laptop or a MacBook at its default
// scaled resolution, and 1024 a browser window at half screen. That last one
// matters: the header overflow this suite caught lived between 761 and 1080,
// which is exactly a side-by-side window, not only a tablet.
const SIZES = [
  { name: 'mobile', width: 375, height: 812, touch: true },
  { name: 'tablet', width: 834, height: 1112, touch: true },
  { name: 'laptop-half', width: 1024, height: 900, touch: false },
  { name: 'laptop', width: 1280, height: 800, touch: false },
  { name: 'macbook-air', width: 1440, height: 900, touch: false },
  { name: 'macbook-pro', width: 1512, height: 982, touch: false }
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
            // A stretched link: the element paints a ::after over its whole
            // card, so the card is the real target and the anchor's own box
            // says nothing about how easy it is to hit.
            const after = getComputedStyle(el, '::after');
            if (after.position === 'absolute' && after.content !== 'none') {
              const host = el.closest('[class*="card"]') || el.parentElement;
              const hostBox = host ? host.getBoundingClientRect() : null;
              if (hostBox && hostBox.height >= min && hostBox.width >= min) continue;
            }

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

        expect(smallTargets, `tap targets under ${MIN_TAP}px on ${route}`).toEqual([]);

        expect(headings.filter(l => l === 1).length, `exactly one h1 on ${route}`).toBe(1);
        expect(headings.filter((level, i) => i && level - headings[i - 1] > 1).length,
          `heading levels skip on ${route}`).toBe(0);

        // This suite aborts the Google Fonts request itself, which the browser
        // reports as a failed resource. Counting it would mean every route
        // carried a permanent error and a real one could never be noticed.
        const realErrors = consoleErrors.filter(text => !/fonts\.googleapis\.com|Failed to load resource/.test(text));
        expect(realErrors, `console errors on ${route}`).toEqual([]);
      });
    }
  });
}
