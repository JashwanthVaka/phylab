import { getSupabase } from './supabaseClient.js';
import { learningStorage as localStorage, storageFor } from './learningStorage.js';

const KEY = 'phylab_flashcards_v1';
const readLocal = (storage = localStorage) => {
  try { return JSON.parse(storage.getItem(KEY) || '{}'); } catch { return {}; }
};

async function account() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export const flashcardService = {
  async list() {
    const current = await account();
    if (!current) return { guest: true, state: readLocal() };
    const { data, error } = await current.supabase.from('flashcard_progress')
      .select('card_key,due_at,interval_days,last_reviewed_at').eq('user_id', current.user.id);
    if (error) return { guest: false, state: {}, error: error.message };
    return {
      guest: false,
      state: Object.fromEntries((data || []).map(row => [row.card_key, {
        interval: row.interval_days,
        due: new Date(row.due_at).getTime(),
        reviewedAt: new Date(row.last_reviewed_at).getTime()
      }]))
    };
  },

  async saveRecord(cardKey, record) {
    const current = await account();
    if (!current) return { guest: true };
    const { error } = await current.supabase.from('flashcard_progress').upsert({
      user_id: current.user.id,
      card_key: cardKey,
      interval_days: Math.max(0, Math.round(record.interval || 0)),
      due_at: new Date(record.due).toISOString(),
      last_reviewed_at: new Date().toISOString(),
      repetitions: 1
    }, { onConflict: 'user_id,card_key' });
    return error ? { error: error.message } : { synced: true };
  },

  async migrateLocal() {
    const current = await account();
    const guest = storageFor(null);
    const state = readLocal(guest);
    const entries = Object.entries(state);
    if (!current) return { migrated: 0, cleared: false, reason: 'signed-out' };
    if (!entries.length) return { migrated: 0, cleared: true, reason: 'nothing-to-move' };
    const rows = entries.map(([cardKey, record]) => ({
      user_id: current.user.id,
      card_key: cardKey,
      interval_days: Math.max(0, Math.round(record.interval || 0)),
      due_at: new Date(record.due || Date.now()).toISOString(),
      last_reviewed_at: new Date().toISOString(),
      repetitions: 1
    }));
    const { error } = await current.supabase.from('flashcard_progress').upsert(rows, { onConflict: 'user_id,card_key' });
    if (error) return { migrated: 0, cleared: false, error: error.message };
    guest.removeItem(KEY);
    return { migrated: rows.length, cleared: true };
  },

  forgetDevice() { localStorage.removeItem(KEY); }
};
