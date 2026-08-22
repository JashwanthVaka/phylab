/**
 * Where a learner goes before and after signing in.
 *
 * Two things were wrong with sending Google straight to /onboarding. Every
 * sign-in landed there, so a returning student was asked to set up a learning
 * plan they had already set up; and wherever they were when they clicked
 * "Sign in" was thrown away, so signing in from a lesson dropped them
 * somewhere else entirely.
 *
 * The OAuth redirect now returns to the site root, which is also the single
 * URL that has to be allow-listed in Supabase -- one entry instead of one per
 * page. Where to actually go is decided here once the session exists.
 */

const RETURN_KEY = 'kinetiq_auth_return';

/** Routes a learner should never be returned to after signing in. */
const NEVER_RETURN = new Set(['/login', '/signup', '/onboarding', '/logout']);

/** Remembers where to come back to. Called just before leaving for Google. */
export function rememberReturnPath(path = location.pathname + location.search) {
  const clean = String(path || '/').split('#')[0];
  try {
    sessionStorage.setItem(RETURN_KEY, NEVER_RETURN.has(clean.split('?')[0]) ? '/progress' : clean);
  } catch {
    // Private mode or a blocked store; the default destination still applies.
  }
}

function takeReturnPath() {
  try {
    const value = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    // Only ever a same-site path, never an absolute URL: a stored value that
    // began with a scheme or "//" would be an open redirect.
    if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  } catch { /* Nothing stored. */ }
  return null;
}

/**
 * Decides the destination once a session exists.
 *
 * A brand-new account goes to onboarding; anyone else goes back where they
 * were. "New" means the account was created in the last few minutes, because
 * that is knowable from the session alone, without waiting on a profile row
 * that a database trigger may not have written yet.
 */
export function destinationFor(user) {
  const saved = takeReturnPath();
  const created = user?.created_at ? new Date(user.created_at).getTime() : 0;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  // Supabase sets both on a first sign-in; treat a few seconds apart as new.
  const isNewAccount = created && (!lastSignIn || Math.abs(lastSignIn - created) < 10000);
  if (isNewAccount) return '/onboarding';
  return saved || '/progress';
}

/** The one URL that must be allow-listed in Supabase. */
export const oauthRedirectTarget = () => `${location.origin}/`;
