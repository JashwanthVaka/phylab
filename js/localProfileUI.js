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
    <h1>${profile ? `Welcome back, ${escapeHTML(profile.name.split(/\s+/)[0])}.` : 'Welcome back.'}</h1>
    <p class="page-lead">${profile
      ? 'This is your profile on this device. Change it whenever you like.'
      : 'Set up a profile and KINETIQ will greet you and tailor what it suggests. It takes a second and needs no password.'}</p>

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
