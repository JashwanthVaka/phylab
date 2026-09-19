import { getSupabase } from './supabaseClient.js';

// The browser may update learning preferences. Identity and privilege are
// deliberately absent: only the server-side admin path may assign a role.
const PROFILE_FIELDS = new Set([
  'display_name', 'preferred_level', 'timezone', 'study_goals', 'onboarding_completed'
]);

const readableError = error => new Error(error?.message || 'Your changes could not be saved. Try again.');

async function signedInClient() {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Accounts are not switched on for this site yet.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in is required.');
  return { supabase, user };
}

function profileValues(values = {}) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => PROFILE_FIELDS.has(key)));
}

export const profileService = {
  async get() {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw readableError(error);
    return data;
  },

  async getSettings() {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_settings').select('settings').eq('user_id', user.id).single();
    if (error) throw readableError(error);
    return data?.settings || {};
  },

  async save(values) {
    const { supabase, user } = await signedInClient();
    const { data, error } = await supabase.from('profiles').upsert({ ...profileValues(values), id: user.id });
    if (error) throw readableError(error);
    return data;
  },

  async settings(values) {
    const { supabase, user } = await signedInClient();
    const { data, error } = await supabase.from('user_settings').upsert({ user_id: user.id, settings: values });
    if (error) throw readableError(error);
    return data;
  }
};
