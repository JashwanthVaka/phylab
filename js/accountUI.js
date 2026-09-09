/**
 * Account settings and onboarding.
 *
 * Sign-in itself lives in js/authUI.js and goes through a provider, so there
 * is no email or password form here any more. This file used to carry a second
 * copy of that form and a second submit handler, which ran alongside the real
 * one and made every request twice.
 */
import { escapeHTML } from './utils.js';
import { authService } from './services/authService.js';
import { profileService } from './services/profileService.js';

const field = (id, label, type = 'text') =>
  `<label for="${id}">${label}<input id="${id}" name="${id}" type="${type}" required></label>`;

/** Kept so any stale import resolves to the real sign-in page rather than a form. */
export { authPage } from './authUI.js';

export const accountPage = profile => `<section class="page">
  <p class="eyebrow">ACCOUNT SETTINGS</p>
  <h1>Your KINETIQ profile.</h1>
  <form id="profileForm" class="account-form">
    <label for="display_name">Display name<input id="display_name" name="display_name" value="${escapeHTML(profile?.display_name || '')}"></label>
    <label for="preferred_level">Course level<select id="preferred_level" name="preferred_level"><option>SL</option><option>HL</option><option>SL and HL</option></select></label>
    <label for="timezone">Timezone<input id="timezone" name="timezone" value="${escapeHTML(profile?.timezone || 'UTC')}"></label>
    <button class="button">Save settings</button>
    <button type="button" data-logout class="outline">Sign out</button>
  </form>
</section>`;

export const onboardingPage = () => `<section class="page">
  <p class="eyebrow">START YOUR PATH</p>
  <h1>Set up your learning plan.</h1>
  <form id="onboardingForm" class="account-form">
    ${field('display_name', 'Display name')}
    <label>Role<select name="role"><option value="student">Student</option><option value="teacher">Teacher</option></select></label>
    <label>Level<select name="preferred_level"><option>SL</option><option>HL</option></select></label>
    ${field('target_score', 'Target IB score', 'number')}
    ${field('exam_date', 'Exam date', 'date')}
    ${field('weekly_hours', 'Study hours per week', 'number')}
    <label>Strong topics<input name="strong_topics"></label>
    <label>Weak topics<input name="weak_topics"></label>
    <button class="button">Finish setup</button>
  </form>
</section>`;

export function bindAccount(router) {
  document.querySelector('#profileForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    await profileService.save(Object.fromEntries(new FormData(event.target)));
  });

  document.querySelector('#onboardingForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    await profileService.save({
      ...values,
      onboarding_completed: true,
      study_goals: [values.target_score, values.exam_date, values.weekly_hours]
    });
    router.go('/progress');
  });

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    // Same order as the header control: get the work into the account, then
    // hand the machine over clean. See accountMenu.js for why.
    const { progressService } = await import('./services/progressService.js');
    try { await progressService.migrateLocal(); } catch { /* Kept on the device. */ }
    await authService.signOut();
    const { clearLocalProfile } = await import('./localProfile.js');
    clearLocalProfile();
    router.go('/');
  });
}
