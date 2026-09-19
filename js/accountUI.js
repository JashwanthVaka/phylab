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
    <label>Course level<select name="preferred_level"><option>SL</option><option>HL</option><option>SL and HL</option></select></label>
    <label>Target IB score <span class="muted">(optional)</span><input name="target_score" type="number" min="1" max="7" inputmode="numeric"></label>
    <label>Exam date <span class="muted">(optional)</span><input name="exam_date" type="date"></label>
    <label>Study hours per week <span class="muted">(optional)</span><input name="weekly_hours" type="number" min="0" max="60" step="0.5" inputmode="decimal"></label>
    <label>Topics you feel confident in <span class="muted">(optional)</span><input name="strong_topics" autocomplete="off"></label>
    <label>Topics to focus on <span class="muted">(optional)</span><input name="weak_topics" autocomplete="off"></label>
    <p id="onboardingStatus" class="account-status" role="status"></p>
    <button class="button">Finish setup</button>
  </form>
</section>`;

export function bindAccount(router) {
  document.querySelector('#profileForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.querySelector('#profileStatus');
    try {
      await profileService.save(Object.fromEntries(new FormData(event.target)));
      if (status) { status.textContent = 'Settings saved.'; status.dataset.tone = 'ok'; }
    } catch (error) {
      if (status) { status.textContent = error.message; status.dataset.tone = 'bad'; }
    }
  });

  document.querySelector('#onboardingForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    const status = document.querySelector('#onboardingStatus');
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const goals = [
        values.target_score && `Target score: ${values.target_score}`,
        values.exam_date && `Exam date: ${values.exam_date}`,
        values.weekly_hours && `Study time: ${values.weekly_hours} hours/week`
      ].filter(Boolean);
      await profileService.save({
        display_name: values.display_name,
        preferred_level: values.preferred_level,
        study_goals: goals,
        onboarding_completed: true
      });
      await profileService.settings({
        study_plan: {
          target_score: values.target_score || null,
          exam_date: values.exam_date || null,
          weekly_hours: values.weekly_hours || null,
          strong_topics: values.strong_topics || '',
          weak_topics: values.weak_topics || ''
        }
      });
      router.go('/progress');
    } catch (error) {
      if (status) { status.textContent = error.message; status.dataset.tone = 'bad'; }
      submit.disabled = false;
    }
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
