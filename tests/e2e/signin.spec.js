/**
 * Sign-in is two provider buttons and nothing else.
 *
 * No Supabase project is configured here, so these stand one up: the browser
 * is given the two public values before the app boots, the Supabase library
 * import is answered with a stub, and the settings endpoint is answered with
 * whichever providers a given test wants switched on. That is enough to prove
 * the rules that matter, above all that a provider which is not enabled is not
 * offered. A button that leads to a provider error is worse than no button,
 * because the learner cannot tell whose fault it is.
 */
import { test, expect } from '@playwright/test';

const PROJECT = 'https://stub-project.supabase.co';

/** Boots the app as though a Supabase project were configured. */
async function withProviders(page, external) {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());

  await page.addInitScript(values => {
    window.PHYLAB_ENV = { SUPABASE_URL: values.url, SUPABASE_ANON_KEY: 'anon-key-that-is-long-enough-to-pass' };
  }, { url: PROJECT });

  // The real client is fetched from a CDN the build container cannot reach,
  // and none of its behaviour is under test here: only whether a button is
  // drawn, and what happens when it is pressed.
  await page.route('https://esm.sh/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `export function createClient() {
      return {
        auth: {
          getUser: async () => ({ data: { user: null } }),
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signInWithOAuth: async ({ provider }) => {
            window.__lastProvider = provider;
            return { data: {}, error: null };
          }
        },
        from: () => ({
          select: async () => ({ data: [], error: null }),
          upsert: async () => ({ data: [], error: null })
        })
      };
    }`
  }));

  await page.route(`${PROJECT}/auth/v1/settings`, route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ external })
  }));
}

test.describe('signing in', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('offers Google and Apple when both are switched on', async ({ page }) => {
    await withProviders(page, { google: true, apple: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-provider="google"]')).toBeVisible();
    await expect(page.locator('[data-provider="apple"]')).toBeVisible();
    await expect(page.locator('[data-provider="google"]')).toContainText(/continue with google/i);
    await expect(page.locator('[data-provider="apple"]')).toContainText(/continue with apple/i);
  });

  test('hides Apple when it is not switched on, and still offers Google', async ({ page }) => {
    await withProviders(page, { google: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-provider="google"]')).toBeVisible();
    await expect(page.locator('[data-provider="apple"]')).toHaveCount(0);
  });

  test('asks for no password anywhere', async ({ page }) => {
    await withProviders(page, { google: true, apple: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('#authForm')).toHaveCount(0);
    await expect(page.getByText(/forgot password/i)).toHaveCount(0);
  });

  test('pressing Google starts a Google sign-in', async ({ page }) => {
    await withProviders(page, { google: true, apple: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.locator('[data-provider="google"]').click();
    await expect.poll(() => page.evaluate(() => window.__lastProvider)).toBe('google');
  });

  test('pressing Apple starts an Apple sign-in', async ({ page }) => {
    await withProviders(page, { google: true, apple: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.locator('[data-provider="apple"]').click();
    await expect.poll(() => page.evaluate(() => window.__lastProvider)).toBe('apple');
  });

  test('/signup and /reset lead to the same sign-in, not a dead end', async ({ page }) => {
    await withProviders(page, { google: true });
    for (const route of ['/signup', '/reset']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-provider="google"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
    }
  });

  test('says so plainly when no provider is switched on', async ({ page }) => {
    await withProviders(page, {});
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-provider]')).toHaveCount(0);
    await expect(page.locator('.auth-column')).toContainText(/not switched on yet/i);
  });

  test('makes clear that studying without an account still works', async ({ page }) => {
    await withProviders(page, { google: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.auth-guest')).toContainText(/guest/i);
  });
});

test.describe('the owner-facing setup page is gone', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('/setup is no longer a page', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.goto('/setup', { waitUntil: 'domcontentloaded' });
    await page.locator('#app h1').first().waitFor();

    // It used to publish the project's configuration steps to anyone who
    // asked. Those belong in SUPABASE_SETUP.md, not on the public site.
    await expect(page.locator('.setup-step, .setup-steps')).toHaveCount(0);
    await expect(page.locator('#app h1').first()).toContainText(/does not exist/i);
  });

  test('no page still links to it', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    for (const route of ['/', '/login', '/progress']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.locator('#app h1').first().waitFor();
      await expect(page.locator('a[href="/setup"]')).toHaveCount(0);
    }
  });
});

test.describe('the sign-in page with no account service', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
  });

  /**
   * This is what the live site and every preview actually show, because no
   * Supabase project is connected to them. /login used to divert to a
   * separate device-profile page here, which meant the sign-in page was never
   * seen at all: the buttons existed only in the code.
   */
  test('still renders as a sign-in page, and says why it cannot sign anyone in', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#app h1').first().waitFor();

    await expect(page.locator('#app h1').first()).toHaveText(/sign in/i);
    await expect(page.locator('.auth-unavailable')).toContainText(/not switched on yet/i);
    await expect(page.locator('[data-provider]')).toHaveCount(0);
  });

  test('offers the device profile underneath rather than a dead end', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#localProfileForm').waitFor();

    await page.locator('#lpName').fill('Test Learner');
    await page.locator('#localProfileForm button[type="submit"]').click();
    await expect(page).toHaveURL(/\/progress$/);
  });

  test('the section heading is not rendered at display size', async ({ page }) => {
    // `.page h2` in the legacy block outranks a bare class, which rendered
    // this label at 42px. The same specificity trap as the header nav.
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const size = await page.locator('.signin-meanwhile')
      .evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeLessThan(20);
  });
});
