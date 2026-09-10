/**
 * Does a deploy actually reach a returning visitor?
 *
 * The service worker cached every same-origin GET and answered from that cache
 * first, refreshing in the background. For content that is the right trade. For
 * KINETIQ's own code it was not: the app is thirty-odd ES modules loaded on
 * demand, each cached and refreshed independently, so after a deploy a
 * returning visitor ran whichever mixture their browser happened to hold. A
 * shipped fix could look unshipped, and a new stylesheet could be paired with
 * an older module, which is a different app from the one that was tested.
 *
 * These run against the dev server, which serves the same files the build
 * copies, so the worker under test is the shipped one.
 */
import { test, expect } from '@playwright/test';

test.describe('a returning visitor gets the deployed code', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // Fulfilled rather than aborted: an aborted stylesheet means `load` never
  // fires, and the worker is registered on `load`. Aborting here would leave
  // every assertion below testing a page with no worker at all.
  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**',
      route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  });

  test('an ordinary visit registers the worker', async ({ page }) => {
    // enableOffline(), its load listener and a stray boot() had all ended up
    // nested inside the [data-retry] branch of handleRouteClick, so offline
    // support only ever started if someone clicked "Try again" on an error
    // page. Registrations were zero on a normal visit.
    await page.goto('/login', { waitUntil: 'load' });
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 15000 });
    const count = await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).length);
    expect(count, 'a normal visit must register the service worker').toBeGreaterThan(0);
  });

  // There is deliberately no browser test asserting that a second visit
  // re-fetches a module. Requests a service worker makes are not visible to
  // Playwright's request interception, so such a test passes whether the
  // worker is network-first or cache-first, which is worse than no test: it
  // reads as a guarantee and is not one. The strategy is asserted at the
  // source instead, below, where a regression does fail.

  test('the worker asks the network first for its own code', async ({ page }) => {
    const sw = await page.request.get('/sw.js');
    const source = await sw.text();

    // The strategy is the guarantee, and it is small enough to assert directly:
    // a regression here is silent in the browser and only shows up as "the fix
    // did not ship", days later and on somebody else's machine.
    expect(source, 'app code must be matched for network-first handling')
      .toMatch(/isAppCode/);
    expect(source, 'the cache must remain the offline fallback, not the first answer')
      .toMatch(/\.catch\(\(\) => caches\.match\(request\)\)/);
  });

  test('the cache name carries a build stamp so a deploy retires the old one', async ({ page }) => {
    const sw = await page.request.get('/sw.js');
    const source = await sw.text();
    // Served straight from the repository the token is still literal; the
    // build replaces it. Either way it must not be a constant like v1, which
    // is what let one cache outlive every deploy.
    expect(source).toMatch(/const VERSION = 'kinetiq-(?:__BUILD__|[0-9a-f]{6,})'/);
  });
});

// ── An open tab picks up a deploy ────────────────────────────────────
// The worker fetched code fresh, but a page that was already running when a
// new worker took over kept the code the old one gave it. In a single-page
// app a tab can stay open for hours, so a student could keep seeing the old
// site well after a deploy. A new worker taking control must reload the page.
test('an open tab reloads onto a newly deployed worker', async ({ page }) => {
  // The first visit installs the worker; the second is the one a returning
  // student makes, already controlled by a worker from an earlier deploy.
  await page.goto('/library', { waitUntil: 'load' });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  await page.reload({ waitUntil: 'load' });
  await page.locator('#app h1').first().waitFor();
  await page.evaluate(() => { window.__beforeDeploy = true; });

  // A deploy is delivered to an open page as controllerchange. Playwright
  // cannot intercept the browser's own fetch of the worker script, so the
  // test delivers that event directly rather than staging a new script.
  const reloaded = page.waitForEvent('load', { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
  await reloaded;

  expect(await page.evaluate(() => window.__beforeDeploy), 'the page should have reloaded onto the new code').toBeUndefined();
  await expect(page.locator('#app h1').first()).toBeVisible();
});

test('a first visit is never reloaded when its own worker takes control', async ({ page }) => {
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await page.goto('/library', { waitUntil: 'load' });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
  await page.waitForTimeout(1500);
  expect(loads, 'a new visitor must not see the page reload').toBe(1);
});
