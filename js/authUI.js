/**
 * Sign in, register, and password reset.
 *
 * Email and password, which is what most students expect and what the owner
 * asked for. It matters practically too: email sign-in needs only an account
 * service, where "continue with Google" additionally needs an OAuth client
 * registered with Google. One thing to set up instead of two.
 *
 * The Google button is still offered, but only when the provider is actually
 * enabled. Showing a button that leads to a provider error is worse than not
 * showing it, because the learner cannot tell whose fault it is.
 *
 * Every failure here is reported in the app's own words. Supabase says things
 * like "Invalid login credentials", which is accurate and unhelpful; a student
 * needs to know whether to check the password, register first, or confirm
 * their email.
 */

import { escapeHTML } from './utils.js';
import { authService } from './services/authService.js';
import { getSupabase } from './services/supabaseClient.js';

const MODES = {
  login: {
    title: 'Welcome back.',
    lead: 'Sign in to pick up where you left off. Your progress follows you to any device.',
    submit: 'Login',
  },
  signup: {
    title: 'Create your account.',
    lead: 'One account keeps your lessons, flashcards and practice in step across every device you study on.',
    submit: 'Create account',
  },
  reset: {
    title: 'Reset your password.',
    lead: 'Enter the address you signed up with and we will email you a link to set a new password.',
    submit: 'Send reset link',
  },
};

const field = ({ id, label, type = 'text', autocomplete, hint = '', required = true }) => `
  <label for="${id}">${escapeHTML(label)}
    <input id="${id}" name="${id}" type="${type}"
           ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
           ${required ? 'required' : ''} spellcheck="false">
    ${hint ? `<small class="auth-hint">${hint}</small>` : ''}
  </label>`;

/** Whether the project has Google switched on, so the button is only offered when it works. */
async function googleAvailable() {
  try {
    const supabase = await getSupabase();
    if (!supabase) return false;
    const url = window.PHYLAB_ENV?.SUPABASE_URL;
    const key = window.PHYLAB_ENV?.SUPABASE_ANON_KEY;
    if (!url || !key) return false;
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!response.ok) return false;
    return Boolean((await response.json())?.external?.google);
  } catch {
    return false;
  }
}

export async function authPage(mode = 'login') {
  const config = MODES[mode] || MODES.login;
  const showGoogle = mode !== 'reset' && await googleAvailable();

  const fields = mode === 'reset'
    ? field({ id: 'email', label: 'Email address', type: 'email', autocomplete: 'email' })
    : mode === 'signup'
      ? [
          field({ id: 'display_name', label: 'Your name', autocomplete: 'name' }),
          field({ id: 'email', label: 'Email address', type: 'email', autocomplete: 'email' }),
          field({ id: 'password', label: 'Password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.' }),
        ].join('')
      : [
          field({ id: 'email', label: 'Email address', type: 'email', autocomplete: 'email' }),
          field({ id: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' }),
        ].join('');

  return `<section class="page auth-page" data-auth-mode="${escapeHTML(mode)}">
    <p class="eyebrow">KINETIQ ACCOUNT</p>
    <h1>${escapeHTML(config.title)}</h1>
    <p class="page-lead auth-lead">${escapeHTML(config.lead)}</p>

    <div class="auth-card">
      ${showGoogle ? `
        <button type="button" class="oauth-button" data-google>
          <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <p class="oauth-divider"><span>or with an email address</span></p>` : ''}

      <form id="authForm" novalidate>
        ${fields}
        <p id="authError" class="auth-error" role="alert"></p>
        <p id="authNotice" class="auth-notice" role="status"></p>

        <div class="auth-actions">
          ${mode === 'login'
            ? `<a href="/signup" data-route class="auth-link">Register here</a>
               <a href="/reset" data-route class="auth-link">Forgot password</a>`
            : `<a href="/login" data-route class="auth-link">Back to sign in</a>`}
          <button class="button auth-submit" type="submit">${escapeHTML(config.submit)}</button>
        </div>
      </form>
    </div>
  </section>`;
}

/**
 * Turns a provider error into something a learner can act on.
 *
 * Supabase reports "Invalid login credentials" for both a wrong password and
 * an address that was never registered, so the wording here has to cover both
 * possibilities rather than assert the wrong one.
 */
function explain(error, mode) {
  const message = String(error?.message || error || '').toLowerCase();
  if (/invalid login credentials/.test(message)) {
    return 'That email and password do not match an account. Check the password, or register if you have not made an account yet.';
  }
  if (/email not confirmed/.test(message)) {
    return 'Your email has not been confirmed yet. Open the link in the message we sent you, then sign in.';
  }
  if (/user already registered|already been registered/.test(message)) {
    return 'There is already an account with that address. Sign in instead, or reset the password if you have forgotten it.';
  }
  if (/password should be at least/.test(message)) {
    return 'That password is too short. Use at least 8 characters.';
  }
  if (/unable to validate email|invalid format/.test(message)) {
    return 'That does not look like an email address.';
  }
  if (/rate limit|too many/.test(message)) {
    return 'Too many attempts just now. Wait a minute and try again.';
  }
  if (/not configured/.test(message)) {
    return 'Accounts are not switched on for this site yet.';
  }
  return mode === 'signup'
    ? `We could not create that account: ${error?.message || 'unknown error'}.`
    : `We could not sign you in: ${error?.message || 'unknown error'}.`;
}

export function bindAuth(router) {
  const page = document.querySelector('.auth-page[data-auth-mode]');
  if (!page) return undefined;
  const controller = new AbortController();
  const mode = page.dataset.authMode;
  const form = page.querySelector('#authForm');
  const error = page.querySelector('#authError');
  const notice = page.querySelector('#authNotice');
  const submit = page.querySelector('.auth-submit');

  const clear = () => { error.textContent = ''; notice.textContent = ''; };
  const busy = state => {
    submit.disabled = state;
    submit.dataset.busy = state ? 'true' : '';
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    clear();
    const values = Object.fromEntries(new FormData(form));
    const email = String(values.email || '').trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      error.textContent = 'Enter a valid email address.';
      return;
    }
    if (mode !== 'reset' && String(values.password || '').length < 8) {
      error.textContent = 'Passwords are at least 8 characters.';
      return;
    }

    busy(true);
    try {
      if (mode === 'reset') {
        const { error: problem } = await authService.resetPasswordForEmail(email);
        if (problem) throw problem;
        // Never reveal whether an address is registered.
        notice.textContent = 'If that address has an account, a reset link is on its way. Check your inbox and spam folder.';
        form.reset();
        return;
      }

      if (mode === 'signup') {
        const { data, error: problem } = await authService.signUp(email, values.password, String(values.display_name || '').trim());
        if (problem) throw problem;
        // With email confirmation on, there is no session yet and saying
        // "welcome" would be wrong -- the account is not usable until they
        // click the link.
        if (!data?.session) {
          notice.textContent = 'Account created. Open the confirmation link we emailed you, then sign in.';
          form.reset();
          return;
        }
        router.go('/onboarding');
        return;
      }

      const { error: problem } = await authService.signIn(email, values.password);
      if (problem) throw problem;
      const { destinationFor } = await import('./authFlow.js');
      const user = await authService.user();
      router.go(destinationFor(user));
    } catch (problem) {
      error.textContent = explain(problem, mode);
    } finally {
      busy(false);
    }
  }, { signal: controller.signal });

  page.querySelector('[data-google]')?.addEventListener('click', async () => {
    clear();
    try {
      const { rememberReturnPath } = await import('./authFlow.js');
      rememberReturnPath('/progress');
      const { error: problem } = await authService.signInWithGoogle();
      if (problem) throw problem;
    } catch (problem) {
      error.textContent = explain(problem, mode);
    }
  }, { signal: controller.signal });

  return () => controller.abort();
}
