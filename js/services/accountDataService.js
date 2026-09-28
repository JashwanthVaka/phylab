import { getSupabase } from './supabaseClient.js';

async function sessionContext() {
  const database = await getSupabase();
  if (!database) throw new Error('Accounts are unavailable right now.');
  const { data: { session } } = await database.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to manage your account data.');
  return { database, token: session.access_token };
}

async function api(path, options = {}) {
  const { token } = await sessionContext();
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The account request could not be completed.');
  return result;
}

const download = (value, filename) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

function clearDeviceStudyData() {
  const prefixes = ['phylab_', 'kinetiq_'];
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && prefixes.some(prefix => key.startsWith(prefix))) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
}

export const accountDataService = {
  async export() {
    const archive = await api('/api/account/export');
    download(archive, `kinetiq-account-${new Date().toISOString().slice(0, 10)}.json`);
    return archive;
  },

  async signOutEverywhere() {
    const { database } = await sessionContext();
    const { error } = await database.auth.signOut({ scope: 'global' });
    if (error) throw new Error(error.message || 'Could not sign out the other devices.');
  },

  async deleteAccount() {
    const result = await api('/api/account/delete', {
      method: 'POST', body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    const database = await getSupabase();
    try { await database?.auth.signOut({ scope: 'local' }); } catch { /* The deleted session is already invalid. */ }
    clearDeviceStudyData();
    return result;
  },
};
