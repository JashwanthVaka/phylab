/** Account-scoped browser study cache. Authentication and RLS remain in Supabase. */
let owner = null;
let identityPromise = null;
let authListenerBound = false;
let postLoadScheduled = false;
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

/** Reads only the account id from Supabase's persisted browser session. */
function persistedOwner(storage = globalThis.localStorage) {
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!/^sb-.+-auth-token$/.test(key || '')) continue;
      const session = JSON.parse(storage.getItem(key));
      if (session?.user?.id) return String(session.user.id);
    }
  } catch {
    // A malformed or unavailable browser store is treated as signed out.
  }
  return null;
}

function applyOwner(next) {
  const previous = owner;
  setLearningOwner(next);
  if (previous === owner) return;
  // If public content has already rendered against the isolated holding
  // scope, repaint once the real identity arrives. This keeps one learner's
  // browser cache away from another learner without making lessons wait for
  // a third-party authentication bundle.
  if (document.querySelector('#app')?.childElementCount) {
    document.querySelector('#app')?.replaceChildren();
    setTimeout(() => location.reload(), 0);
  }
}

async function resolveIdentity() {
  try {
    const { getSupabase } = await import('./supabaseClient.js');
    const db = await getSupabase();
    if (!db) {
      applyOwner(null);
      return;
    }
    const { data: { user } } = await db.auth.getUser();
    applyOwner(user?.id || null);
    if (!authListenerBound) {
      authListenerBound = true;
      db.auth.onAuthStateChange((_event, session) => {
        applyOwner(session?.user?.id || null);
      });
    }
  } catch {
    // Public lessons still work when authentication cannot be checked. Do
    // not fall back to somebody's guest history on a failed account lookup.
    applyOwner('unverified');
  }
}

/**
 * Resolve identity before reading study data, but never let a stalled auth
 * CDN hold the public course hostage. The unresolved state gets its own empty
 * storage scope; resolveIdentity keeps running and safely reloads if a real
 * account arrives later.
 */
export async function initialiseLearningStorage({ deadlineMs = 1200 } = {}) {
  const cached = persistedOwner();
  if (owner === null && cached) setLearningOwner(cached);

  // Dynamic imports started before window.load keep that event pending in
  // Chromium. Schedule the network-backed identity check just after load so
  // lessons and the loading overlay are never held hostage by the auth CDN.
  if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    if (!postLoadScheduled) {
      postLoadScheduled = true;
      window.addEventListener('load', () => {
        postLoadScheduled = false;
        void initialiseLearningStorage({ deadlineMs });
      }, { once: true });
    }
    return;
  }

  if (!identityPromise) identityPromise = resolveIdentity();
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => resolve('deadline'), deadlineMs);
  });
  const result = await Promise.race([identityPromise.then(() => 'identity'), deadline]);
  clearTimeout(timer);
  if (result === 'deadline' && owner === null) setLearningOwner('unverified');
}
