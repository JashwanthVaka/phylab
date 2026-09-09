/**
 * Sign in with an account the learner already has.
 *
 * There is no email and password form, and no registration step. Signing in
 * and signing up are the same action: the first time a provider returns a
 * learner, Supabase creates the account and the database trigger gives it a
 * profile. That removes the password, the confirmation email, and the "have
 * you registered yet?" question that used to be the first thing a student hit.
 *
 * A provider button is only drawn when that provider is actually switched on
 * in the project. Showing a button that leads to a provider error is worse
 * than showing nothing, because the learner cannot tell whose fault it is.
 * Apple in particular needs a paid developer account, so it stays hidden until
 * someone has done that work.
 */

import { escapeHTML } from './utils.js';
import { authService, PROVIDERS } from './services/authService.js';
import { getSupabaseSettings } from './services/supabaseClient.js';
import { rememberReturnPath } from './authFlow.js';
import { localProfileSection, bindLocalProfile } from './localProfileUI.js';

const MARK = {
  google: `<svg viewBox="0 0 18 18" width="19" height="19" aria-hidden="true" fill="currentColor"><path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62zM9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18zM3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33zM9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`,
  apple: `<svg viewBox="0 0 16 20" width="16" height="19" aria-hidden="true" fill="currentColor"><path d="M13.2 10.6c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.1 0 1.9-1 2.6-2.1.8-1.2 1.1-2.4 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM11 4.1c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z"/></svg>`
};

/**
 * Which providers the project actually has enabled.
 *
 * Supabase publishes this on its settings endpoint, so the page asks rather
 * than guesses. A failure here means no working buttons, which is the safe
 * direction: the learner is told sign-in is unavailable instead of being sent
 * into a provider that will reject them.
 *
 * This deliberately does NOT build a Supabase client. It used to, only to
 * check the client was not null, and building one downloads the whole
 * Supabase library from a CDN. That put a third-party bundle plus two more
 * round trips in front of the first pixel of the sign-in page. The endpoint
 * needs the project URL and the anon key and nothing else, and the library is
 * only genuinely needed once somebody presses a button.
 */
const CACHE_KEY = 'kinetiq:auth-providers';

/** Reads a provider list resolved earlier this session, if there is one. */
function cachedProviderIds() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Private browsing can refuse storage outright. Asking again is correct.
    return null;
  }
}

function rememberProviderIds(ids) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(ids));
  } catch { /* Storage refused; the next visit simply asks again. */ }
}

export async function enabledProviders() {
  const remembered = cachedProviderIds();
  if (remembered) return PROVIDERS.filter(provider => remembered.includes(provider.id));

  try {
    const settings = await getSupabaseSettings();
    if (!settings) {
      // No project is configured at all. That answer will not change while
      // this tab is open, so the second visit to /login is instant.
      rememberProviderIds([]);
      return [];
    }
    const response = await fetch(`${settings.url}/auth/v1/settings`, { headers: { apikey: settings.anonKey } });
    // A failed request is not an answer, so it is not cached: a flaky network
    // must not switch sign-in off for the rest of the session.
    if (!response.ok) return [];
    const external = (await response.json())?.external || {};
    const ids = PROVIDERS.filter(provider => external[provider.id]).map(provider => provider.id);
    rememberProviderIds(ids);
    return PROVIDERS.filter(provider => ids.includes(provider.id));
  } catch {
    return [];
  }
}

const button = (provider, available) => `
  <button type="button" class="oauth-button" data-provider="${escapeHTML(provider.id)}"
          ${available ? '' : 'disabled data-unavailable="true" aria-describedby="authUnavailable"'}>
    ${MARK[provider.id] || ''}
    <span>${escapeHTML(provider.label)}</span>
  </button>`;

/**
 * The sign-in page.
 *
 * The two buttons lead, in every state. They used to be replaced by an
 * explanatory panel whenever no provider was switched on, which meant that on
 * the live site, where no project is connected, clicking "Sign in" landed on
 * a page with no sign-in on it. Pressing a disabled button is not an error a
 * learner has to diagnose, so the buttons stay and carry the reason instead.
 *
 * When at least one provider works, only the working ones are drawn: a
 * disabled Apple button next to a live Google one is noise. The disabled pair
 * exists only for the case where nothing works at all, so that the page still
 * reads as the place you sign in.
 */
export async function authPage() {
  const providers = await enabledProviders();
  const available = providers.length > 0;
  const shown = available ? providers : PROVIDERS;

  return `<section class="page auth-page" data-auth-mode="provider" data-auth-available="${available}">
    <div class="auth-column">
      <p class="eyebrow">KINETIQ ACCOUNT</p>
      <h1>Sign in</h1>
      <p class="auth-lead">${available
        ? 'Use an account you already have. KINETIQ never asks you for a new password, and your completed lessons follow you to any device you sign in on.'
        : 'Sign-in uses an account you already have, so there is no new password to remember.'}</p>

      <div class="auth-providers">${shown.map(provider => button(provider, available)).join('')}</div>

      ${available
        ? `<p id="authError" class="auth-error" role="alert"></p>
           <p class="auth-fineprint">Signing in for the first time creates your account. There is no separate registration step.</p>
           <p class="auth-guest">Not ready to sign in? <a href="/library" data-route>Carry on studying as a guest.</a> Nothing is locked behind an account.</p>`
        : `<p id="authUnavailable" class="auth-unavailable-note">
             <b>Not switched on yet.</b> This site has no account service connected, so there is nothing for these buttons to sign you in to. Everything else works, and your progress is saved in this browser.
           </p>
           ${localProfileSection()}`}
    </div>
  </section>`;
}

/**
 * Turns a provider failure into something a learner can act on.
 *
 * Supabase reports an unconfigured provider as "Unsupported provider", which
 * tells a student nothing about whether they did something wrong. They did
 * not, and the message should say so.
 */
function explain(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (/unsupported provider|provider is not enabled/.test(message)) {
    return 'That sign-in method is not switched on for this site yet. Try the other one.';
  }
  if (/popup|closed|cancel/.test(message)) {
    return 'Sign-in was cancelled before it finished. Try again when you are ready.';
  }
  if (/rate limit|too many/.test(message)) {
    return 'Too many attempts just now. Wait a minute and try again.';
  }
  if (/network|fetch/.test(message)) {
    return 'We could not reach the sign-in service. Check your connection and try again.';
  }
  if (/not switched on|not configured/.test(message)) {
    return 'Accounts are not switched on for this site yet.';
  }
  return `We could not sign you in: ${error?.message || 'unknown error'}.`;
}

export function bindAuth(router) {
  const page = document.querySelector('.auth-page[data-auth-mode]');
  if (!page) return undefined;
  const controller = new AbortController();
  const error = page.querySelector('#authError');

  // Present only while sign-in is unavailable; binding it here keeps one
  // binder for the page rather than two that have to agree on which is live.
  const releaseProfile = bindLocalProfile(router);

  // With no provider switched on the buttons are drawn disabled, purely so the
  // page still reads as a sign-in. There is nothing to bind them to.
  if (page.dataset.authAvailable !== 'true') {
    return () => { controller.abort(); releaseProfile?.(); };
  }

  page.querySelectorAll('[data-provider]').forEach(control => {
    control.addEventListener('click', async () => {
      const provider = control.dataset.provider;
      if (error) error.textContent = '';
      // Disable every button, not just this one. A second click during the
      // redirect starts a competing sign-in and the learner ends up back here.
      page.querySelectorAll('[data-provider]').forEach(other => { other.disabled = true; });
      control.dataset.busy = 'true';
      try {
        // Remember where they were, so signing in from a lesson returns there
        // rather than dropping them on the dashboard.
        const from = document.referrer && new URL(document.referrer, location.origin).origin === location.origin
          ? new URL(document.referrer).pathname
          : '/progress';
        rememberReturnPath(from);
        const result = await authService.signInWithProvider(provider);
        if (result?.error) throw result.error;
        // On success the browser leaves for the provider, so nothing after
        // this runs. Reaching here without an error means the redirect was
        // blocked, and the buttons must work again.
      } catch (problem) {
        if (error) error.textContent = explain(problem);
      } finally {
        page.querySelectorAll('[data-provider]').forEach(other => { other.disabled = false; });
        delete control.dataset.busy;
      }
    }, { signal: controller.signal });
  });

  return () => { controller.abort(); releaseProfile?.(); };
}
