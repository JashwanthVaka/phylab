/** Account-scoped browser study cache. Authentication and RLS remain in Supabase. */
let owner = null;
export const learningOwner = () => owner;
export function setLearningOwner(id) { owner = id || null; }

export function storageFor(id, storage = globalThis.localStorage) {
  const prefix = id ? `kinetiq:user:${encodeURIComponent(id)}:` : '';
  const keys = () => Array.from({ length: storage.length }, (_, i) => storage.key(i))
    .filter(key => key && (prefix ? key.startsWith(prefix) : !key.startsWith('kinetiq:user:')))
    .map(key => prefix ? key.slice(prefix.length) : key);
  return {
    get length() { return keys().length; },
    key: index => keys()[index] ?? null,
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  };
}

export const learningStorage = {
  get length() { return storageFor(owner).length; },
  key: index => storageFor(owner).key(index),
  getItem: key => storageFor(owner).getItem(key),
  setItem: (key, value) => storageFor(owner).setItem(key, value),
  removeItem: key => storageFor(owner).removeItem(key),
};

/** Resolve the account before rendering study data. Re-render on account changes. */
export async function initialiseLearningStorage() {
  try {
  const { getSupabase } = await import('./supabaseClient.js');
  const db = await getSupabase();
  if (!db) return;
  const { data: { user } } = await db.auth.getUser();
  setLearningOwner(user?.id);
  db.auth.onAuthStateChange((_event, session) => {
    const next = session?.user?.id || null;
    if (next === owner) return;
    setLearningOwner(next);
    // Never leave another person's rendered answers visible after a switch.
    document.querySelector('#app')?.replaceChildren();
    setTimeout(() => location.reload(), 0);
  });
  } catch {
    // Public lessons still work when authentication cannot be checked. Do
    // not fall back to somebody's guest history on a failed account lookup.
    setLearningOwner('unverified');
  }
}
