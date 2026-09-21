/** Owner-only account statistics through RLS-backed Supabase functions. */

const config = () => ({
  url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  anonKey: process.env.SUPABASE_ANON_KEY || '',
});

const isConfigured = () => {
  const { url, anonKey } = config();
  return Boolean(url && anonKey);
};

function missingPieces() {
  const { url, anonKey } = config();
  return [!url && 'SUPABASE_URL', !anonKey && 'SUPABASE_ANON_KEY'].filter(Boolean);
}

const bearer = req => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

async function rpc(name, token, body = {}) {
  const { url, anonKey } = config();
  if (!token) return { ok: false, status: 401, body: null };
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
}

function providerOf(user) { return user.provider || 'email'; }
const dayKey = value => (value ? new Date(value).toISOString().slice(0, 10) : null);

function summarise(users) {
  const now = Date.now();
  const day = 86400000;
  const byProvider = {};
  const signupsByDay = {};
  let confirmed = 0; let activeWeek = 0; let activeMonth = 0; let newWeek = 0;

  users.forEach(user => {
    const provider = providerOf(user);
    byProvider[provider] = (byProvider[provider] || 0) + 1;
    if (user.email_confirmed_at || user.confirmed_at) confirmed += 1;
    const created = user.created_at ? new Date(user.created_at).getTime() : null;
    if (created) {
      const key = dayKey(user.created_at);
      if (key) signupsByDay[key] = (signupsByDay[key] || 0) + 1;
      if (now - created <= 7 * day) newWeek += 1;
    }
    const seen = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : null;
    if (seen) {
      if (now - seen <= 7 * day) activeWeek += 1;
      if (now - seen <= 30 * day) activeMonth += 1;
    }
  });

  const trend = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const key = new Date(now - offset * day).toISOString().slice(0, 10);
    trend.push({ date: key, count: signupsByDay[key] || 0 });
  }
  const recent = [...users]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 50)
    .map(user => ({
      id: user.id, email: user.email || '(no email)', name: user.display_name || null,
      provider: providerOf(user), createdAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      confirmed: Boolean(user.email_confirmed_at || user.confirmed_at), role: user.role || 'student',
    }));

  return {
    totals: { users: users.length, confirmed, unconfirmed: users.length - confirmed, newThisWeek: newWeek, activeThisWeek: activeWeek, activeThisMonth: activeMonth },
    byProvider, trend, recent, generatedAt: new Date().toISOString(),
  };
}

async function adminStatsHandler(req, res, send) {
  if (!isConfigured()) return send(res, 503, { error: 'Accounts are not configured.', missing: missingPieces() });
  const token = bearer(req);
  if (!token) return send(res, 401, { error: 'Sign in to view this page.' });
  try {
    const result = await rpc('admin_user_rows', token);
    if ([401, 403].includes(result.status)) return send(res, result.status, { error: 'This account is not an administrator.' });
    if (!result.ok) throw new Error(`Supabase returned ${result.status}.`);
    return send(res, 200, summarise(Array.isArray(result.body) ? result.body : []), { 'Cache-Control': 'no-store' });
  } catch (error) {
    return send(res, 502, { error: `Could not read the user list: ${error.message}` });
  }
}

async function adminSetRoleHandler(req, res, send, userId, body = {}) {
  if (!isConfigured()) return send(res, 503, { error: 'Accounts are not configured.', missing: missingPieces() });
  const role = String(body.role || '').toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !['student', 'teacher'].includes(role)) {
    return send(res, 400, { error: 'Choose a valid student or teacher role.' });
  }
  try {
    const result = await rpc('admin_set_account_role', bearer(req), { target_user: userId, target_role: role });
    if ([401, 403].includes(result.status)) return send(res, result.status, { error: 'This account is not an administrator.' });
    if (!result.ok) throw new Error(`Supabase returned ${result.status}.`);
    return send(res, 200, { updated: true, userId, role });
  } catch (error) {
    return send(res, 502, { error: `Could not update the account role: ${error.message}` });
  }
}

async function adminWhoamiHandler(req, res, send) {
  if (!isConfigured()) return send(res, 200, { admin: false, configured: false });
  try {
    const result = await rpc('is_admin', bearer(req));
    return send(res, 200, { admin: Boolean(result.ok && result.body), configured: true }, { 'Cache-Control': 'no-store' });
  } catch {
    return send(res, 200, { admin: false, configured: true }, { 'Cache-Control': 'no-store' });
  }
}

module.exports = { adminStatsHandler, adminWhoamiHandler, adminSetRoleHandler, isConfigured, missingPieces, summarise, providerOf };
