/**
 * The sign-in page when there is no account service.
 *
 * It used to state that accounts were switched off and stop there. That is
 * true but useless: a learner arriving at it can do nothing except leave.
 *
 * It now offers a profile kept on this device. The wording is deliberately
 * plain about what that is and is not, because calling a local name "signing
 * in" would be a lie a student only discovers when they open the site on
 * their phone and find nothing there.
 */

import { escapeHTML } from './utils.js';
import { getLocalProfile, saveLocalProfile, clearLocalProfile } from './localProfile.js';

const LEVELS = ['SL', 'HL', 'SL and HL'];

/** Exam sessions are May and November; offer the next few. */
function examOptions(selected) {
  const now = new Date();
  const options = [];
  for (let year = now.getUTCFullYear(); year <= now.getUTCFullYear() + 2; year += 1) {
    [['05', 'May'], ['11', 'November']].forEach(([month, label]) => {
      const value = `${year}-${month}`;
      if (new Date(Date.UTC(year, Number(month) - 1, 1)) < now) return;
      options.push(`<option value="${value}"${selected === value ? ' selected' : ''}>${label} ${year}</option>`);
    });
  }
  return options.join('');
}

export function localProfilePage() {
  const profile = getLocalProfile();

  return `<section class="page auth-page local-profile-page">
    <p class="eyebrow">KINETIQ ACCOUNT</p>
    <h1>${profile ? `Welcome back, ${escapeHTML(profile.name.split(/\s+/)[0])}.` : 'Sign in.'}</h1>

    <div class="signin-pending">
      <span class="signin-pending__mark" aria-hidden="true">
        <svg viewBox="0 0 18 18" width="20" height="20"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
      </span>
      <div>
        <b>Sign in with Google is built and ready.</b>
        <p>It needs a project of its own before Google will sign anyone in, which takes about two minutes and is done once. After that everyone gets their own account, their own progress, and it follows them across devices.</p>
        <a class="button" href="/setup" data-route>Turn on real accounts →</a>
      </div>
    </div>

    <h2 class="signin-meanwhile">In the meantime</h2>
    <p class="page-lead">${profile
      ? 'This is your profile on this device. Change it whenever you like.'
      : 'Set a name and KINETIQ will greet you and tailor what it suggests. It needs no password — and no account, because there is not one yet.'}</p>

    <form id="localProfileForm" class="account-form local-profile-form">
      <label for="lpName">Your name
        <input id="lpName" name="name" autocomplete="given-name" maxlength="40"
               value="${escapeHTML(profile?.name || '')}" placeholder="e.g. Jashwanth" required>
      </label>

      <label for="lpLevel">Course level
        <select id="lpLevel" name="level">
          ${LEVELS.map(level => `<option${profile?.level === level ? ' selected' : ''}>${level}</option>`).join('')}
        </select>
      </label>

      <label for="lpExam">Exam session <span class="muted">(optional)</span>
        <select id="lpExam" name="examDate">
          <option value="">Not sure yet</option>
          ${examOptions(profile?.examDate)}
        </select>
      </label>

      <p id="lpError" role="alert" class="lp-error"></p>

      <button class="button" type="submit">${profile ? 'Save changes' : 'Start studying'}</button>
      ${profile ? '<button type="button" class="text-button lp-clear" data-clear-profile>Remove this profile</button>' : ''}
    </form>

    <div class="lp-note">
      <h2>What this is</h2>
      <p>Your name and level are stored <b>in this browser only</b>. There is no password and nothing is sent anywhere, so this is not a login and it protects nothing.</p>
      <p>It also means it does not follow you to another device. To move your work, save a copy from <a href="/progress" data-route>your progress page</a> and restore it on the other device.</p>
      <p class="muted">Real accounts, with sign-in and automatic sync across devices, need an account service configured for this site. When one is, this page becomes a proper sign-in and your existing progress carries over.</p>
    </div>
  </section>`;
}

export function bindLocalProfile(router) {
  const form = document.querySelector('#localProfileForm');
  if (!form) return undefined;
  const controller = new AbortController();
  const error = form.querySelector('#lpError');

  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      saveLocalProfile(values);
      error.textContent = '';
      router.go('/progress');
    } catch (problem) {
      error.textContent = problem.message;
    }
  }, { signal: controller.signal });

  form.querySelector('[data-clear-profile]')?.addEventListener('click', () => {
    // Removing a profile must not touch study progress, which is separate.
    if (!window.confirm('Remove your name and level from this device?\n\nYour lessons, flashcards and practice results are kept.')) return;
    clearLocalProfile();
    router.go('/');
  }, { signal: controller.signal });

  return () => controller.abort();
}
