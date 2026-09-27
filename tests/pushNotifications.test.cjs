'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  validSubscription,
  digestPayload,
  cronHandler,
} = require('../server/pushNotifications.cjs');

const root = path.join(__dirname, '..');
const valid = {
  endpoint: 'https://push.example.test/subscriptions/one',
  keys: {
    p256dh: 'A'.repeat(65),
    auth: 'b'.repeat(22),
  },
};

assert.equal(validSubscription(valid), true, 'a complete HTTPS subscription should be accepted');
assert.equal(validSubscription({ ...valid, endpoint: 'http://push.example.test/one' }), false,
  'unencrypted push endpoints must be rejected');
assert.equal(validSubscription({ ...valid, keys: { ...valid.keys, auth: 'short' } }), false,
  'malformed browser encryption keys must be rejected');

const singular = digestPayload({ due_cards: 1, due_tasks: 1 });
assert.equal(singular.body, '1 flashcard and 1 revision task due. Open your capped daily session.');
assert.equal(singular.url, '/revision');
assert.ok(!JSON.stringify(singular).includes('example.test'), 'notification payloads must not expose endpoints');

const plural = digestPayload({ due_cards: 3, due_tasks: 0 });
assert.equal(plural.body, '3 flashcards due. Open your capped daily session.');

const previous = Object.fromEntries([
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SECRET_KEY',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'CRON_SECRET',
].map(key => [key, process.env[key]]));
Object.assign(process.env, {
  SUPABASE_URL: 'https://database.example.test',
  SUPABASE_ANON_KEY: 'anon-placeholder',
  SUPABASE_SECRET_KEY: 'secret-placeholder',
  VAPID_PUBLIC_KEY: 'public-placeholder',
  VAPID_PRIVATE_KEY: 'private-placeholder',
  CRON_SECRET: 'cron-placeholder',
});

let response;
const sendJSON = (_res, status, body) => { response = { status, body }; return response; };
cronHandler({ headers: { authorization: 'Bearer wrong-secret' } }, {}, sendJSON);
assert.deepEqual(response, { status: 401, body: { error: 'Unauthorized.' } },
  'the scheduled endpoint must reject callers without the cron secret');

for (const [key, value] of Object.entries(previous)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202609270001_push_notifications.sql'), 'utf8');
assert.match(migration, /alter table public\.push_subscriptions enable row level security/i);
assert.match(migration, /revoke all on public\.push_subscriptions from anon, authenticated/i);
assert.match(migration, /grant select, insert, update, delete on public\.push_subscriptions to service_role/i);
assert.match(migration, /for update skip locked/i, 'parallel cron runs must not claim the same device');
assert.match(migration, /last_notified_on is distinct from p_day/i, 'a device should receive at most one daily digest');

const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.match(worker, /addEventListener\('push'/);
assert.match(worker, /addEventListener\('notificationclick'/);

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.ok(vercel.crons?.some(job => job.path === '/api/cron/reminders' && job.schedule === '30 2 * * *'),
  'the production deployment must schedule the daily reminder sender');

console.log('push notification tests passed (private subscriptions, daily deduplication, worker delivery and cron auth)');
