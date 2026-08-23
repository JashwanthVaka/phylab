/**
 * The Supabase client, and where its settings come from.
 *
 * Settings used to be read only from public-env.js, a committed file. That
 * meant configuring the app in two places -- that file for the browser, and
 * the host environment for the server -- and it gave the service-role key a
 * committed file to be pasted into by mistake.
 *
 * public-env.js still wins when it has values, so an existing setup keeps
 * working and a static export can carry its own settings. Otherwise the
 * settings come from /api/config, which reads the host environment. Setting
 * the variables in one place therefore configures everything.
 *
 * Only the URL and the anon key ever reach the browser. Both are designed to
 * be public: the anon key grants exactly what row-level security allows and
 * nothing more.
 */

let clientPromise;
let settingsPromise;

const fromWindow = () => {
  const url = window.PHYLAB_ENV?.SUPABASE_URL;
  const anonKey = window.PHYLAB_ENV?.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
};

/** Resolves settings once, preferring public-env.js, then the server. */
export function getSupabaseSettings() {
  if (settingsPromise) return settingsPromise;
  const local = fromWindow();
  if (local) {
    settingsPromise = Promise.resolve(local);
    return settingsPromise;
  }
  settingsPromise = fetch('/api/config', { headers: { Accept: 'application/json' } })
    .then(response => (response.ok ? response.json() : null))
    .then(body => {
      const url = body?.supabaseUrl;
      const anonKey = body?.supabaseAnonKey;
      if (!url || !anonKey) return null;
      // Cache on window so synchronous callers see it after the first resolve.
      window.PHYLAB_ENV = { ...(window.PHYLAB_ENV || {}), SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey };
      return { url, anonKey };
    })
    .catch(() => null);
  return settingsPromise;
}

export async function getSupabase() {
  if (clientPromise) return clientPromise;
  const settings = await getSupabaseSettings();
  if (!settings) return null;
  clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
    .then(({ createClient }) => createClient(settings.url, settings.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }));
  return clientPromise;
}

/**
 * Whether accounts are available.
 *
 * Synchronous, because callers use it while rendering. It is accurate once
 * settings have resolved; `cloudReady()` is the awaitable form for anything
 * that must not guess before then.
 */
export const isCloudEnabled = () => Boolean(fromWindow());

/** Resolves to whether accounts are available, waiting for the server if needed. */
export const cloudReady = () => getSupabaseSettings().then(Boolean);
