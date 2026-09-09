/**
 * Runs the account path for real, against a stand-in for Supabase.
 *
 * The browser tests exercise the guest path, because no Supabase project is
 * configured in CI. That left the more important half unproven: that a
 * signed-in learner's completions are written under their own user id, read
 * back as theirs, and never mixed with anyone else's.
 *
 * The stand-in below enforces the same rule the database does. Every table is
 * keyed by user_id, and a select only ever returns rows belonging to whoever
 * is currently signed in, which is what the `user_id = auth.uid()` policy in
 * 20260808_phylab_foundation.sql does in production. If progressService ever
 * forgets to scope a write or a read, these assertions fail.
 *
 * Run with: node --experimental-test-module-mocks tests/accountIsolation.test.mjs
 */
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.join(import.meta.dirname, '..');
const clientUrl = pathToFileURL(path.join(ROOT, 'js/services/supabaseClient.js')).href;

// Minimal localStorage, so the guest fallbacks in utils.js behave as they do
// in a browser rather than throwing.
const store = new Map();
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear()
};

/** A Supabase stand-in that enforces per-user isolation, as RLS does. */
function makeFakeSupabase() {
  const rows = [];              // every row ever written, across all users
  let currentUser = null;
  let writesFail = false;       // stands in for a dropped connection

  const api = {
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
    from(table) {
      return {
        async upsert(record, options = {}) {
          if (writesFail) return { data: null, error: { message: 'network unreachable' } };
          // The unique index is (user_id, lesson_slug); honour it.
          const keys = (options.onConflict || 'id').split(',').map(k => k.trim());
          const match = rows.find(row =>
            row.__table === table && keys.every(key => row[key] === record[key]));
          if (match) Object.assign(match, record);
          else rows.push({ __table: table, ...record });
          return { data: [record], error: null };
        },
        async select() {
          // This is the RLS rule: you see your own rows and nobody else's.
          const mine = rows.filter(row =>
            row.__table === table && row.user_id === currentUser?.id);
          return { data: mine, error: null };
        }
      };
    }
  };

  return {
    api,
    signIn: id => { currentUser = { id }; },
    signOut: () => { currentUser = null; },
    failWrites: value => { writesFail = value; },
    allRows: () => rows
  };
}

const fake = makeFakeSupabase();
mock.module(clientUrl, {
  namedExports: {
    getSupabase: async () => fake.api,
    getSupabaseSettings: async () => ({ url: 'https://example.test', anonKey: 'anon' }),
    isCloudEnabled: () => true,
    cloudReady: async () => true
  }
});

const { progressService } = await import('../js/services/progressService.js');
const { getProgress, saveProgress } = await import('../js/utils.js');

const guestProgress = () => getProgress().completedLessons;
const saveGuestProgress = slugs => saveProgress({ completedLessons: slugs, attempts: [] });

test('a signed-in learner writes completions under their own user id', async () => {
  fake.signIn('user-alpha');
  await progressService.complete('kinematics');

  const written = fake.allRows().filter(row => row.__table === 'lesson_progress');
  assert.equal(written.length, 1);
  assert.equal(written[0].user_id, 'user-alpha', 'the row must carry the signed-in user id');
  assert.equal(written[0].lesson_slug, 'kinematics');
  assert.equal(written[0].completion_percentage, 100);
  assert.ok(written[0].completed_at, 'a completion records when it happened');
});

test('the learner reads their own completion back', async () => {
  fake.signIn('user-alpha');
  const state = await progressService.list();
  assert.equal(state.guest, false, 'a signed-in learner is not in guest mode');
  assert.deepEqual(state.completed, ['kinematics']);
});

test('a second learner sees their own work, never the first learner\'s', async () => {
  fake.signIn('user-beta');
  let state = await progressService.list();
  assert.deepEqual(state.completed, [], 'a new account starts empty, not with someone else\'s progress');

  await progressService.complete('wave-properties');
  state = await progressService.list();
  assert.deepEqual(state.completed, ['wave-properties']);

  // And the first learner is untouched by any of that.
  fake.signIn('user-alpha');
  state = await progressService.list();
  assert.deepEqual(state.completed, ['kinematics'], 'one learner\'s work must not leak into another\'s');
});

test('completing the same lesson twice updates one row rather than adding another', async () => {
  fake.signIn('user-alpha');
  await progressService.complete('kinematics');
  const mine = fake.allRows().filter(row =>
    row.__table === 'lesson_progress' && row.user_id === 'user-alpha');
  assert.equal(mine.length, 1, 'the (user_id, lesson_slug) unique index must be respected');
});

test('clearing a completion removes it from that learner only', async () => {
  fake.signIn('user-alpha');
  const result = await progressService.clear('kinematics');
  assert.equal(result.guest, false);
  assert.deepEqual(result.completed, []);
  assert.deepEqual((await progressService.list()).completed, []);

  fake.signIn('user-beta');
  assert.deepEqual((await progressService.list()).completed, ['wave-properties'],
    'clearing one account must not touch another');
});

test('signed out, the service answers from the device instead of failing', async () => {
  fake.signOut();
  const state = await progressService.list();
  assert.equal(state.guest, true, 'no user means guest mode, not an error');
  assert.deepEqual(state.completed, []);
});

test('work done as a guest is carried into the account on first sign-in', async () => {
  fake.signOut();
  await progressService.complete('energy');
  assert.deepEqual((await progressService.list()).completed, ['energy'], 'guest work is kept on the device');

  fake.signIn('user-gamma');
  assert.deepEqual((await progressService.list()).completed, [], 'the new account is empty before migrating');

  await progressService.migrateLocal();
  const state = await progressService.list();
  assert.deepEqual(state.completed, ['energy'], 'the guest lesson must survive signing in');
  const gamma = fake.allRows().filter(row =>
    row.__table === 'lesson_progress' && row.user_id === 'user-gamma');
  assert.equal(gamma.length, 1);
  assert.equal(gamma[0].user_id, 'user-gamma');
});

/**
 * The shared-laptop case, which is the ordinary one for a class.
 *
 * migrateLocal existed but nothing in the app called it, so guest work never
 * reached the account it belonged to; and because the device copy was never
 * removed, it sat in the browser waiting to be adopted by whoever signed in
 * next. The two faults together meant one student's lessons could end up in
 * another student's account.
 */
test('work done as a guest moves into the account and leaves the device', async () => {
  fake.signOut();
  store.clear();
  saveGuestProgress(['thermal-physics', 'gas-laws']);

  fake.signIn('user-theta');
  const result = await progressService.migrateLocal();

  assert.equal(result.migrated, 2);
  assert.equal(result.cleared, true, 'the device copy is removed once the rows are written');
  assert.deepEqual(guestProgress(), [], 'nothing is left on the device to leak');

  const state = await progressService.list();
  assert.deepEqual(state.completed.sort(), ['gas-laws', 'thermal-physics']);
});

test('the next person on the same browser does not inherit that work', async () => {
  // Straight after the migration above: a different student signs in on the
  // same machine. Before the device was cleared, this account would have
  // adopted the previous student's lessons on their first sign-in.
  fake.signIn('user-delta');
  const result = await progressService.migrateLocal();

  assert.equal(result.migrated, 0, 'there is nothing on the device to carry over');
  const state = await progressService.list();
  assert.deepEqual(state.completed, [], 'a second account on the same browser starts empty');
});

test('a failed migration keeps the work rather than destroying it', async () => {
  fake.signOut();
  store.clear();
  saveGuestProgress(['circular-motion']);

  fake.signIn('user-epsilon');
  fake.failWrites(true);
  const result = await progressService.migrateLocal();
  fake.failWrites(false);

  assert.equal(result.cleared, false, 'a failed write must not clear the device');
  assert.deepEqual(result.failed, ['circular-motion']);
  assert.deepEqual(guestProgress(), ['circular-motion'],
    'the only copy of the work is still there to try again with');
});

test('signing out leaves no study progress behind on the device', async () => {
  fake.signIn('user-zeta');
  saveGuestProgress(['nuclear-fission']);

  progressService.forgetDevice();

  assert.deepEqual(guestProgress(), [],
    'a signed-out browser must not still hold the last person\'s lessons');
});
