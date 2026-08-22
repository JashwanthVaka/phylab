/**
 * Guards the owner-only endpoint.
 *
 * The failure that matters here is not a wrong number on a chart, it is the
 * user list reaching someone who should not have it. These tests assert the
 * refusals, not the happy path.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const admin = require(path.join(ROOT, 'server', 'adminStats.cjs'));

const responses = [];
const send = (res, status, body) => { responses.push({ status, body }); return body; };
const reset = () => { responses.length = 0; };
const withEnv = async (env, run) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try { await run(); } finally {
    Object.keys(env).forEach(key => { delete process.env[key]; });
    Object.assign(process.env, saved);
  }
};

// ── Unconfigured deployments must refuse, not improvise ──────────────
await withEnv({ SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', ADMIN_EMAILS: '' }, async () => {
  reset();
  await admin.adminStatsHandler({ headers: {} }, {}, send);
  assert.equal(responses[0].status, 503, 'an unconfigured deployment must say so rather than fail open');
  assert.ok(responses[0].body.missing.includes('SUPABASE_URL'));
});

const CONFIGURED = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  ADMIN_EMAILS: 'owner@example.com',
};

// ── No token, bad token, and a valid non-admin all get nothing ───────
await withEnv(CONFIGURED, async () => {
  const realFetch = globalThis.fetch;

  // No Authorization header at all.
  reset();
  globalThis.fetch = async () => { throw new Error('should not be called without a token'); };
  await admin.adminStatsHandler({ headers: {} }, {}, send);
  assert.equal(responses[0].status, 401, 'a request with no token must be rejected');

  // A token Supabase does not recognise.
  reset();
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  await admin.adminStatsHandler({ headers: { authorization: 'Bearer forged' } }, {}, send);
  assert.equal(responses[0].status, 401, 'a token Supabase rejects must not be trusted');

  // A real session belonging to someone who is not an admin.
  reset();
  globalThis.fetch = async url => {
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, status: 200, json: async () => ({ email: 'student@example.com', id: 'u1' }) };
    }
    throw new Error('the user list must not be fetched for a non-admin');
  };
  await admin.adminStatsHandler({ headers: { authorization: 'Bearer valid' } }, {}, send);
  assert.equal(responses[0].status, 403, 'a signed-in non-admin must be refused');
  assert.ok(!JSON.stringify(responses[0].body).includes('owner@example.com'),
    'the refusal must not disclose who the administrators are');

  // The allowlist is case-insensitive but exact: no substring or domain match.
  assert.ok(admin.isAdmin('OWNER@example.com'), 'the allowlist should ignore case');
  assert.ok(!admin.isAdmin('notowner@example.com'), 'a longer address must not match');
  assert.ok(!admin.isAdmin('owner@example.com.attacker.test'), 'a suffixed domain must not match');
  assert.ok(!admin.isAdmin(''), 'an empty email must never be an admin');
  assert.ok(!admin.isAdmin(null), 'a missing email must never be an admin');

  globalThis.fetch = realFetch;
});

// ── The service-role key must never be sent to a browser ─────────────
const clientFiles = ['js/adminUI.js', 'js/accountUI.js', 'js/services/authService.js', 'js/services/supabaseClient.js', 'public-env.js'];
clientFiles.forEach(file => {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert.ok(!/SERVICE_ROLE/.test(source.replace(/SUPABASE_SERVICE_ROLE_KEY<\/code>/g, '')),
    `${file} must not reference the service-role key outside setup instructions`);
});
const publicEnv = fs.readFileSync(path.join(ROOT, 'public-env.js'), 'utf8');
assert.ok(!/eyJ|service_role/i.test(publicEnv), 'public-env.js must not contain a real key');

// The admin page must not decide access for itself.
const adminUI = fs.readFileSync(path.join(ROOT, 'js', 'adminUI.js'), 'utf8');
assert.ok(!/ADMIN_EMAILS\s*=|const\s+ADMINS/.test(adminUI),
  'the admin page must not hold an allowlist; the server decides');

// ── Aggregation reports what it is given ─────────────────────────────
const now = new Date();
const iso = days => new Date(now.getTime() - days * 86400000).toISOString();
const summary = admin.summarise([
  { email: 'a@x.com', created_at: iso(1), last_sign_in_at: iso(0), email_confirmed_at: iso(1), identities: [{ provider: 'google' }] },
  { email: 'b@x.com', created_at: iso(3), last_sign_in_at: iso(2), identities: [{ provider: 'google' }] },
  { email: 'c@x.com', created_at: iso(40), last_sign_in_at: iso(35), email_confirmed_at: iso(40), app_metadata: { provider: 'email' } },
]);
assert.equal(summary.totals.users, 3);
assert.equal(summary.totals.confirmed, 2);
assert.equal(summary.totals.newThisWeek, 2, 'only the two recent sign-ups are new this week');
assert.equal(summary.totals.activeThisWeek, 2);
assert.equal(summary.totals.activeThisMonth, 2, 'the 35-day-old sign-in is outside the month');
assert.equal(summary.byProvider.google, 2);
assert.equal(summary.byProvider.email, 1);
assert.equal(summary.trend.length, 30, 'the trend must be a dense 30-day series');
assert.ok(summary.trend.every(day => Number.isInteger(day.count)), 'quiet days must read as zero, not gaps');
assert.equal(summary.recent[0].email, 'a@x.com', 'the newest account should lead');

// Nothing sensitive should survive into the response shape.
const serialised = JSON.stringify(summary);
assert.ok(!/encrypted_password|phone|banned_until|recovery_token/.test(serialised),
  'the summary must not carry raw Supabase user fields');

console.log(`admin tests passed (refusals, allowlist, key isolation, ${summary.totals.users}-user aggregation)`);
