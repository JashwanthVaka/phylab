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
const savedEnv = { ...process.env };
const realFetch = globalThis.fetch;
const configure = () => Object.assign(process.env, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon-key' });

delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY;
await admin.adminStatsHandler({ headers: {} }, {}, send);
assert.equal(responses[0].status, 503);
assert.deepEqual(responses[0].body.missing.sort(), ['SUPABASE_ANON_KEY', 'SUPABASE_URL']);

configure(); reset();
globalThis.fetch = async () => { throw new Error('no token must not reach Supabase'); };
await admin.adminStatsHandler({ headers: {} }, {}, send);
assert.equal(responses[0].status, 401);

// Database RPC is the authorization boundary. A refused caller sees nothing.
reset();
globalThis.fetch = async (url, options) => {
  assert.match(String(url), /\/rest\/v1\/rpc\/admin_user_rows$/);
  assert.equal(options.headers.apikey, 'anon-key');
  assert.equal(options.headers.Authorization, 'Bearer learner-token');
  return { ok: false, status: 403, json: async () => ({ message: 'Administrator access required' }) };
};
await admin.adminStatsHandler({ headers: { authorization: 'Bearer learner-token' } }, {}, send);
assert.equal(responses[0].status, 403);
assert.ok(!JSON.stringify(responses[0].body).includes('owner@'), 'a refusal must disclose no owner identity');

const now = new Date();
const iso = days => new Date(now.getTime() - days * 86400000).toISOString();
const rows = [
  { id: 'a', email: 'a@x.com', display_name: 'A', role: 'admin', provider: 'google', created_at: iso(1), last_sign_in_at: iso(0), email_confirmed_at: iso(1) },
  { id: 'b', email: 'b@x.com', role: 'student', provider: 'google', created_at: iso(3), last_sign_in_at: iso(2) },
  { id: 'c', email: 'c@x.com', role: 'teacher', provider: 'email', created_at: iso(40), last_sign_in_at: iso(35), email_confirmed_at: iso(40) },
];
const summary = admin.summarise(rows);
assert.equal(summary.totals.users, 3);
assert.equal(summary.totals.confirmed, 2);
assert.equal(summary.byProvider.google, 2);
assert.equal(summary.recent.find(row => row.id === 'c').role, 'teacher');
assert.equal(summary.trend.length, 30);

// Owner-approved role changes also go through a guarded RPC, never a service key.
reset();
globalThis.fetch = async (url, options) => {
  assert.match(String(url), /\/rest\/v1\/rpc\/admin_set_account_role$/);
  assert.deepEqual(JSON.parse(options.body), { target_user: '11111111-1111-1111-1111-111111111111', target_role: 'teacher' });
  assert.equal(options.headers.Authorization, 'Bearer owner-token');
  return { ok: true, status: 200, json: async () => null };
};
await admin.adminSetRoleHandler(
  { headers: { authorization: 'Bearer owner-token' } }, {}, send,
  '11111111-1111-1111-1111-111111111111', { role: 'teacher' }
);
assert.equal(responses[0].status, 200);

reset();
await admin.adminSetRoleHandler({ headers: {} }, {}, send, 'bad-id', { role: 'admin' });
assert.equal(responses[0].status, 400, 'admin and malformed role changes must be rejected before RPC');

globalThis.fetch = async (url, options) => {
  assert.match(String(url), /\/rest\/v1\/rpc\/is_admin$/);
  assert.equal(options.headers.Authorization, 'Bearer owner-token');
  return { ok: true, status: 200, json: async () => true };
};
reset();
await admin.adminWhoamiHandler({ headers: { authorization: 'Bearer owner-token' } }, {}, send);
assert.deepEqual(responses[0].body, { admin: true, configured: true });

// No service-role secret or owner email allowlist belongs in the app now.
for (const file of ['server/adminStats.cjs', 'js/adminUI.js', 'js/accountMenu.js', 'public-env.js', '.env.example']) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|ADMIN_EMAILS|service-role key/i, `${file} must not depend on a deployment-wide admin secret`);
}

const adminMigration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260921_admin_rpc.sql'), 'utf8');
assert.match(adminMigration, /Administrators can manage account roles and aggregate account metadata/i);
assert.doesNotMatch(adminMigration, /user_id\s*=\s*auth\.uid\(\)\s+or\s+public\.is_admin\(\)/i,
  'administrator access must not be added to private learner rows');

globalThis.fetch = realFetch;
Object.keys(process.env).forEach(key => { if (!(key in savedEnv)) delete process.env[key]; });
Object.assign(process.env, savedEnv);

console.log('admin tests passed (RLS-backed RPC, owner-only role approval, no service secret)');
