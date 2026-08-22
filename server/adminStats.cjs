/**
 * Owner-only user statistics.
 *
 * Two rules shape this file.
 *
 * First, the service-role key never leaves the server. It can read and modify
 * every user in the project, so it lives only in the server environment and is
 * used only here. The browser never sees it and never needs to.
 *
 * Second, authorisation is decided here, not in the page. A client-side check
 * ("hide the admin link unless the email matches") hides nothing: the bundle
 * is public and anyone can call the endpoint directly. So every request is
 * re-verified against Supabase and re-checked against the allowlist, and the
 * page is only ever a renderer for what this endpoint agrees to return.
 */

const ADMIN_LIST_KEY = 'ADMIN_EMAILS';

const config = () => ({
  url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  admins: (process.env[ADMIN_LIST_KEY] || '')
    .split(',').map(entry => entry.trim().toLowerCase()).filter(Boolean),
});

const isConfigured = () => {
  const { url, serviceKey, admins } = config();
  return Boolean(url && serviceKey && admins.length);
};

/** What the deployment is still missing, so the page can say so precisely. */
function missingPieces() {
  const { url, anonKey, serviceKey, admins } = config();
  const missing = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!admins.length) missing.push(ADMIN_LIST_KEY);
  return missing;
}

/**
 * Confirms the bearer token belongs to a real, current session.
 *
 * The token is checked with Supabase rather than decoded locally: a JWT can be
 * read by anyone and forged by anyone who does not verify the signature, so
 * the only safe question is whether Supabase still recognises it.
 */
async function identify(token) {
  const { url, anonKey } = config();
  if (!token || !url || !anonKey) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.email ? user : null;
  } catch {
    return null;
  }
}

const isAdmin = email => {
  const { admins } = config();
  return Boolean(email) && admins.includes(String(email).toLowerCase());
};

/** Pages through the admin user list. Supabase caps a page at 1000. */
async function allUsers() {
  const { url, serviceKey } = config();
  const collected = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status} listing users.`);
    const body = await response.json();
    const users = Array.isArray(body) ? body : body.users || [];
    collected.push(...users);
    if (users.length < 1000) break;
  }
  return collected;
}

/** Which provider a user actually signed in with, rather than how they are stored. */
function providerOf(user) {
  const identities = user.identities || [];
  if (identities.length) return identities[0].provider || 'email';
  return user.app_metadata?.provider || 'email';
}

const dayKey = value => (value ? new Date(value).toISOString().slice(0, 10) : null);

function summarise(users) {
  const now = Date.now();
  const day = 86400000;
  const byProvider = {};
  const signupsByDay = {};
  let confirmed = 0;
  let activeWeek = 0;
  let activeMonth = 0;
  let newWeek = 0;

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

  // A dense 30-day series, so a quiet day reads as zero rather than vanishing.
  const trend = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const key = new Date(now - offset * day).toISOString().slice(0, 10);
    trend.push({ date: key, count: signupsByDay[key] || 0 });
  }

  const recent = [...users]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 50)
    .map(user => ({
      email: user.email || '(no email)',
      name: user.user_metadata?.full_name || user.user_metadata?.display_name || null,
      provider: providerOf(user),
      createdAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      confirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
    }));

  return {
    totals: {
      users: users.length,
      confirmed,
      unconfirmed: users.length - confirmed,
      newThisWeek: newWeek,
      activeThisWeek: activeWeek,
      activeThisMonth: activeMonth,
    },
    byProvider,
    trend,
    recent,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Handles GET /api/admin/stats.
 *
 * Returns 503 when the deployment has no Supabase configured, 401 without a
 * valid session, and 403 for a valid session that is not on the allowlist.
 * The 403 is deliberately indistinguishable in content from a signed-in
 * non-admin's view: it reveals nothing about who the admins are.
 */
async function adminStatsHandler(req, res, send) {
  if (!isConfigured()) {
    return send(res, 503, {
      error: 'Admin statistics are not configured on this deployment.',
      missing: missingPieces(),
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const user = await identify(token);
  if (!user) return send(res, 401, { error: 'Sign in to view this page.' });
  if (!isAdmin(user.email)) return send(res, 403, { error: 'This account is not an administrator.' });

  try {
    const users = await allUsers();
    return send(res, 200, summarise(users), { 'Cache-Control': 'no-store' });
  } catch (error) {
    return send(res, 502, { error: `Could not read the user list: ${error.message}` });
  }
}

module.exports = { adminStatsHandler, isConfigured, missingPieces, summarise, providerOf, isAdmin };
