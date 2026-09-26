import { getSupabase } from './supabaseClient.js';
import { learningStorage, storageFor } from './learningStorage.js';

const KEY = 'kinetiq_notebook_v1';
const TYPE = 'notebook';

const read = storage => {
  try { return JSON.parse(storage.getItem(KEY) || '[]'); } catch { return []; }
};

const write = (storage, rows) => storage.setItem(KEY, JSON.stringify(rows));
const payload = row => JSON.stringify({
  id: String(row.id),
  createdAt: row.createdAt || new Date().toISOString(),
  type: row.type || 'note',
  topic: row.topic || '',
  title: row.title || '',
  body: row.body || '',
  back: row.back || ''
});

export function decodeNotebookRow(row) {
  if (row?.content_type !== TYPE) return null;
  try {
    const item = JSON.parse(row.note || '{}');
    if (!item.id || !item.title) return null;
    return { ...item, id: String(item.id), createdAt: item.createdAt || row.created_at };
  } catch { return null; }
}

async function account() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

async function upsertRows(current, rows) {
  if (!rows.length) return { synced: 0 };
  const records = rows.map(row => ({
    user_id: current.user.id,
    content_type: TYPE,
    content_key: String(row.id),
    note: payload(row)
  }));
  const { error } = await current.supabase.from('bookmarks')
    .upsert(records, { onConflict: 'user_id,content_type,content_key' });
  return error ? { error: error.message, synced: 0 } : { synced: records.length };
}

/** Private notebook sync built on the existing owner-only bookmarks table. */
export const notebookService = {
  async restore() {
    const current = await account();
    if (!current) return { guest: true, rows: read(learningStorage) };
    const { data, error } = await current.supabase.from('bookmarks')
      .select('content_type,content_key,note,created_at')
      .eq('user_id', current.user.id)
      .eq('content_type', TYPE)
      .order('created_at', { ascending: false });
    if (error) return { guest: false, rows: read(learningStorage), error: error.message };
    const remote = (data || []).map(decodeNotebookRow).filter(Boolean);
    const local = read(learningStorage);
    const merged = [...new Map([...remote, ...local].map(row => [String(row.id), row])).values()]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    write(learningStorage, merged);
    return { guest: false, rows: merged };
  },

  async save(row) {
    const current = await account();
    if (!current) return { guest: true };
    return upsertRows(current, [row]);
  },

  async remove(id) {
    const current = await account();
    if (!current) return { guest: true };
    const { error } = await current.supabase.from('bookmarks').delete()
      .eq('user_id', current.user.id).eq('content_type', TYPE).eq('content_key', String(id));
    return error ? { error: error.message } : { removed: true };
  },

  async migrateLocal() {
    const current = await account();
    const guest = storageFor(null);
    const rows = read(guest);
    if (!current) return { migrated: 0, cleared: false, reason: 'signed-out' };
    if (!rows.length) return { migrated: 0, cleared: true, reason: 'nothing-to-move' };
    const result = await upsertRows(current, rows);
    if (result.error) return { migrated: 0, cleared: false, error: result.error };
    guest.removeItem(KEY);
    return { migrated: rows.length, cleared: true };
  },

  forgetDevice() { learningStorage.removeItem(KEY); }
};
