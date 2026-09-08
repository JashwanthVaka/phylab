/**
 * Sign-in, through an identity provider only.
 *
 * KINETIQ has no password of its own. A learner signs in with an account they
 * already have and already protect, which means there is no password for this
 * site to store, leak, or ask anyone to reset. It also removes the whole
 * email-confirmation round trip, which was the slowest part of starting.
 *
 * Google and Apple are the two offered. Both are provider calls of the same
 * shape, so adding a third later is one more line rather than a new flow.
 */
import { getSupabase, isCloudEnabled } from './supabaseClient.js';

/** The providers KINETIQ offers, in the order they are shown. */
export const PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'apple', label: 'Continue with Apple' }
];

async function client() {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Accounts are not switched on for this site yet.');
  return supabase;
}

export const authService = {
  enabled: isCloudEnabled,

  async user() {
    const supabase = await getSupabase();
    return supabase ? (await supabase.auth.getUser()).data.user : null;
  },

  /**
   * Starts a provider sign-in.
   *
   * The redirect goes to the site root rather than to wherever the learner
   * was. That is the single URL Supabase and the provider have to allow, so
   * there is one entry to configure instead of one per page. Where they
   * actually land is decided by authFlow once the session exists.
   */
  async signInWithProvider(provider) {
    const supabase = await client();
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/`,
        // Google remembers the last account and signs straight back in, which
        // is wrong on a shared or school machine. Asking which account to use
        // costs one click and prevents signing in as somebody else.
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined
      }
    });
  },

  signInWithGoogle() { return this.signInWithProvider('google'); },
  signInWithApple() { return this.signInWithProvider('apple'); },

  async signOut() {
    const supabase = await getSupabase();
    return supabase?.auth.signOut();
  },

  async onChange(listener) {
    const supabase = await getSupabase();
    return supabase?.auth.onAuthStateChange((event, session) => listener(event, session));
  }
};
