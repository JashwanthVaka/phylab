/**
 * The learner's own account page.
 *
 * The previous version was three form fields with no context: it did not say
 * who you were signed in as, how you had signed in, or whether any of it was
 * actually syncing. A student switching devices could not tell whether their
 * work was safe, which is the one question an account page exists to answer.
 */

import { escapeHTML } from './utils.js';
import { authService } from './services/authService.js';
import { getSupabase } from './services/supabaseClient.js';

const PROVIDER_LABEL = { google: 'Google', email: 'Email and password', github: 'GitHub', apple: 'Apple' };

const shell = body => `<section class="page account-page">
  <p class="eyebrow">YOUR ACCOUNT</p>
  <h1>Your KINETIQ account.</h1>
  ${body}
</section>`;

/** How this session was actually established, rather than how it is stored. */
function providerOf(user) {
  const identity = (user?.identities || [])[0];
  return identity?.provider || user?.app_metadata?.provider || 'email';
}

const when = value => (value
  ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  : '—');

export async function accountPage(profile) {
  if (!authService.enabled()) {
    return shell(`<div class="empty-state">
      <h3>Accounts are not switched on yet</h3>
      <p>KINETIQ is running without its account service. Everything works without one, and your progress is saved in this browser.</p>
      <p><a class="button" href="/progress" data-route>Save a copy of your progress →</a></p>
    </div>`);
  }

  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return shell(`<div class="empty-state">
      <h3>You are not signed in</h3>
      <p>Sign in to sync your progress across devices. Everything on KINETIQ works without an account too — your work is simply kept in this browser.</p>
      <p><a class="button" href="/login" data-route>Sign in</a></p>
    </div>`);
  }

  const provider = providerOf(user);
  const name = user.user_metadata?.full_name || profile?.display_name || '';
  const verified = Boolean(user.email_confirmed_at || user.confirmed_at);

  return shell(`
    <div class="account-identity">
      <span class="account-identity__avatar" aria-hidden="true">${escapeHTML((name || user.email || '?').trim().charAt(0).toUpperCase())}</span>
      <div>
        <b>${escapeHTML(name || user.email)}</b>
        <span class="muted">${escapeHTML(user.email || '')}</span>
      </div>
    </div>

    <dl class="account-facts">
      <div><dt>Signed in with</dt><dd>${escapeHTML(PROVIDER_LABEL[provider] || provider)}</dd></div>
      <div><dt>Member since</dt><dd>${escapeHTML(when(user.created_at))}</dd></div>
      <div><dt>Email verified</dt><dd>${verified ? 'Yes' : 'Not yet'}</dd></div>
      <div><dt>Progress</dt><dd>Syncing to your account</dd></div>
    </dl>

    <form id="profileForm" class="account-form">
      <h2>Study settings</h2>
      <label for="display_name">Display name
        <input id="display_name" name="display_name" value="${escapeHTML(profile?.display_name || name)}" autocomplete="name">
      </label>
      <label for="preferred_level">Course level
        <select id="preferred_level" name="preferred_level">
          ${['SL', 'HL', 'SL and HL'].map(level =>
            `<option${profile?.preferred_level === level ? ' selected' : ''}>${level}</option>`).join('')}
        </select>
      </label>
      <label for="timezone">Timezone
        <input id="timezone" name="timezone" value="${escapeHTML(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')}">
      </label>
      <p id="profileStatus" class="muted account-status" role="status"></p>
      <div class="account-actions">
        <button class="button">Save settings</button>
        <a class="outline" href="/progress" data-route>Export my progress</a>
        <button type="button" data-logout class="text-button account-signout">Sign out</button>
      </div>
    </form>

    <p class="muted account-note">Your course level and timezone only change what KINETIQ suggests. They never change how anything is marked.</p>
  `);
}
