/**
 * Guards where a learner lands after signing in.
 *
 * Every Google sign-in used to go to /onboarding, so returning students were
 * asked to set up a plan they already had, and whatever page they were on when
 * they clicked "Sign in" was discarded.
 */
import assert from 'node:assert/strict';

const store = new Map();
globalThis.sessionStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(String(key), String(value)),
  removeItem: key => store.delete(key),
};
globalThis.location = { pathname: '/', search: '', origin: 'https://getkinetiq.vercel.app' };

const { rememberReturnPath, destinationFor, oauthRedirectTarget } =
  await import('../js/authFlow.js');

const minutesAgo = m => new Date(Date.now() - m * 60000).toISOString();

// ── A returning learner goes back where they were ────────────────────
store.clear();
rememberReturnPath('/lesson/kinematics');
const returning = {
  created_at: minutesAgo(60 * 24 * 30),
  last_sign_in_at: minutesAgo(1),
};
assert.equal(destinationFor(returning), '/lesson/kinematics',
  'a returning learner should land back where they clicked sign in');

// ── A brand-new account is onboarded ─────────────────────────────────
store.clear();
rememberReturnPath('/lesson/kinematics');
const now = new Date().toISOString();
assert.equal(destinationFor({ created_at: now, last_sign_in_at: now }), '/onboarding',
  'a first sign-in should go to onboarding');

// ── Auth pages are never a return destination ────────────────────────
['/login', '/signup', '/onboarding'].forEach(path => {
  store.clear();
  rememberReturnPath(path);
  assert.equal(destinationFor(returning), '/progress',
    `${path} must not be used as a return destination`);
});

// ── With nothing stored, a sensible default ──────────────────────────
store.clear();
assert.equal(destinationFor(returning), '/progress');

// ── A stored path is consumed, not reused ────────────────────────────
store.clear();
rememberReturnPath('/cases');
assert.equal(destinationFor(returning), '/cases');
assert.equal(destinationFor(returning), '/progress',
  'the return path must be cleared after use, not applied to every later sign-in');

// ── An absolute URL must never become an open redirect ───────────────
['https://evil.test/steal', '//evil.test/steal', 'http://evil.test'].forEach(hostile => {
  store.clear();
  // Simulate a tampered store rather than going through rememberReturnPath.
  store.set('kinetiq_auth_return', hostile);
  const target = destinationFor(returning);
  assert.equal(target, '/progress', `a stored "${hostile}" must not be redirected to`);
  assert.ok(!/^https?:|^\/\//.test(target), 'the destination must always be a same-site path');
});

// ── Query strings survive, fragments do not ──────────────────────────
store.clear();
rememberReturnPath('/quiz?topic=kinematics#section');
assert.equal(destinationFor(returning), '/quiz?topic=kinematics',
  'a query should be kept and a fragment dropped');

// ── One redirect URL to allow-list ───────────────────────────────────
assert.equal(oauthRedirectTarget(), 'https://getkinetiq.vercel.app/',
  'OAuth should return to the site root, so only one URL needs allow-listing');

// ── Missing or malformed users do not throw ──────────────────────────
store.clear();
assert.equal(typeof destinationFor(undefined), 'string');
assert.equal(typeof destinationFor({}), 'string');

console.log('auth flow tests passed (return path, onboarding, no open redirect)');
