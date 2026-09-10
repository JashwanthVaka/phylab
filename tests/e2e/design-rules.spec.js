/**
 * The standing design rules in CLAUDE.md, measured on the rendered page.
 *
 * Rules written in a markdown file are remembered by whoever read it last.
 * Every primary button on the site was a 999px capsule while CLAUDE.md said
 * "No pill-shaped buttons", and nothing noticed, because nothing checked.
 * The two rules that can be measured are measured here.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/library', '/lesson/kinematics', '/simulations/projectile', '/cases',
  '/ask', '/ai', '/exam-prep', '/progress', '/revision', '/formulas', '/data', '/login', '/privacy'];

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**',
    route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

for (const route of ROUTES) {
  test(`no action on ${route} is pill-shaped`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('#app h1').first().waitFor({ timeout: 15000 });

    const pills = await page.evaluate(() => {
      // Actions are things you press to do something. Chips and tags are
      // filters and labels, and keep the capsule on purpose so they read as
      // different from actions.
      const actions = '.btn, .button, .outline, .oauth-button, .nav-signin, #tutorButton, #app button';
      const exempt = el => el.matches('.chip, .tag, .theme-toggle, .nav-burger, .text-button, [data-graph-action]')
        || el.closest('.chip, .tag');
      return [...document.querySelectorAll(actions)]
        .filter(el => el.offsetParent && !exempt(el))
        .filter(el => {
          const box = el.getBoundingClientRect();
          const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius);
          // A text button whose corners reach half its height is a capsule.
          return box.width > box.height * 1.4 && radius >= box.height / 2 - 1;
        })
        .map(el => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || el.id || '-'} "${el.textContent.trim().slice(0, 24)}"`)
        .slice(0, 6);
    });

    expect(pills, `pill-shaped actions on ${route}`).toEqual([]);
  });

  test(`no em dash in the copy on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('#app h1').first().waitFor({ timeout: 15000 });

    const dashes = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const hits = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        // Code and formulae are notation, not prose.
        if (!parent || parent.closest('code, pre, script, style, .formula-hero, [aria-hidden="true"]')) continue;
        if (!parent.offsetParent && parent.tagName !== 'BODY') continue;
        const text = node.textContent;
        const at = text.indexOf('—');
        if (at >= 0) hits.push(text.slice(Math.max(0, at - 24), at + 20).replace(/\s+/g, ' ').trim());
      }
      return [...new Set(hits)].slice(0, 6);
    });

    expect(dashes, `em dashes in visible copy on ${route}`).toEqual([]);
  });
}
