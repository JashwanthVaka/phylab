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
import { getSupabase } from './services/supabaseClient.js';
import { rememberReturnPath } from './authFlow.js';

const MARK = {
  google: `<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`,
  apple: `<svg viewBox="0 0 16 20" width="16" height="19" aria-hidden="true" fill="currentColor"><path d="M13.2 10.6c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.1 0 1.9-1 2.6-2.1.8-1.2 1.1-2.4 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM11 4.1c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z"/></svg>`
};

/**
 * Which providers the project actually has enabled.
 *
 * Supabase publishes this on its settings endpoint, so the page asks rather
 * than guesses. A failure here means no buttons, which is the safe direction:
 * the learner is told accounts are unavailable instead of being sent into a
 * provider that will reject them.
 */
export async function enabledProviders() {
  try {
    const supabase = await getSupabase();
    if (!supabase) return [];
    const url = window.PHYLAB_ENV?.SUPABASE_URL;
    const key = window.PHYLAB_ENV?.SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!response.ok) return [];
    const external = (await response.json())?.external || {};
    return PROVIDERS.filter(provider => external[provider.id]);
  } catch {
    return [];
  }
}

const button = provider => `
  <button type="button" class="oauth-button" data-provider="${escapeHTML(provider.id)}">
    ${MARK[provider.id] || ''}
    <span>${escapeHTML(provider.label)}</span>
  </button>`;

export async function authPage() {
  const providers = await enabledProviders();

  return `<section class="page auth-page" data-auth-mode="provider">
    <p class="eyebrow">KINETIQ ACCOUNT</p>
    <h1>Sign in to keep your work.</h1>
    <p class="page-lead auth-lead">Use an account you already have. KINETIQ never asks you for a new password, and your completed lessons follow you to any device you sign in on.</p>

    <div class="auth-card">
      ${providers.length
        ? `<div class="auth-providers">${providers.map(button).join('')}</div>
           <p id="authError" class="auth-error" role="alert"></p>
           <p class="auth-fineprint">Signing in for the first time creates your account. There is no separate registration step.</p>`
        : `<div class="empty-state">
             <h3>Accounts are not switched on yet</h3>
             <p>KINETIQ is running without its account service, so signing in is unavailable. Everything else works, and your progress is saved in this browser. You can carry it to another device from <a href="/progress" data-route>your progress page</a>.</p>
           </div>`}
    </div>

    <p class="auth-guest">Not ready to sign in? <a href="/library" data-route>Carry on studying as a guest.</a> Nothing is locked behind an account.</p>
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

export function bindAuth() {
  const page = document.querySelector('.auth-page[data-auth-mode]');
  if (!page) return undefined;
  const controller = new AbortController();
  const error = page.querySelector('#authError');

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

  return () => controller.abort();
}
