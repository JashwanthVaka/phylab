/**
 * A profile that works without any account service.
 *
 * Real sign-in needs an authentication provider, and Google will not
 * authenticate users for an app that is not registered with it. Until that
 * exists, the sign-in page was a dead end: a heading, a grey box, and nothing
 * to do.
 *
 * This is not authentication and does not pretend to be. There is no password,
 * nothing is verified, and it protects nothing. It is a name and a study level
 * kept on this device, so the site can greet a learner and shape what it
 * suggests -- and so the page offers a way forward instead of an apology.
 *
 * Everything it holds is included in the progress export, so moving to another
 * device is a file rather than a login.
 */

const KEY = 'phylab_local_profile_v1';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
};

/** The stored profile, or null when nobody has set one up on this device. */
export const getLocalProfile = () => {
  const profile = read();
  return profile && profile.name ? profile : null;
};

export const hasLocalProfile = () => Boolean(getLocalProfile());

/** Saves a profile. Only the fields the app actually uses are kept. */
export function saveLocalProfile({ name, level = 'SL and HL', examDate = '' } = {}) {
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) throw new Error('Enter a name to continue.');
  const profile = {
    name: clean,
    level: ['SL', 'HL', 'SL and HL'].includes(level) ? level : 'SL and HL',
    examDate: /^\d{4}-\d{2}$/.test(examDate) ? examDate : '',
    createdAt: read()?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  announce();
  return profile;
}

export function clearLocalProfile() {
  try { localStorage.removeItem(KEY); } catch { /* Nothing to clear. */ }
  announce();
}

/**
 * Tells the rest of the app the profile changed.
 *
 * The navigation repaints on auth events, and saving a local profile is not
 * one, so without this the header kept saying "Sign in" to somebody who had
 * just given their name.
 */
function announce() {
  try { window.dispatchEvent(new CustomEvent("kinetiq:profile-changed")); } catch { /* No window. */ }
}

/** First name, for greetings. */
export const firstName = () => (getLocalProfile()?.name || '').split(/\s+/)[0] || '';

/** The initial shown in the navigation, matching the signed-in avatar. */
export const initial = () => (getLocalProfile()?.name || '?').trim().charAt(0).toUpperCase();

/**
 * How many days until the exam month, or null when none is set.
 * Counts to the first of that month, which is the honest reading of a
 * month-only date.
 */
export function daysToExam() {
  const value = getLocalProfile()?.examDate;
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, 1));
  const days = Math.ceil((target.getTime() - Date.now()) / 86400000);
  return days > 0 ? days : null;
}
