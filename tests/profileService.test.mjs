/**
 * Profile updates are a user-input boundary. This test ensures the browser
 * can save learning preferences, but cannot smuggle a role or a made-up
 * database column into the write that backs onboarding and account settings.
 */
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.join(import.meta.dirname, '..');
const clientUrl = pathToFileURL(path.join(ROOT, 'js/services/supabaseClient.js')).href;

let currentUser = { id: 'learner-1' };
let writeFailure = null;
const writes = [];

const fakeSupabase = {
  auth: { getUser: async () => ({ data: { user: currentUser } }) },
  from(table) {
    return {
      async upsert(record) {
        writes.push({ table, record });
        return writeFailure
          ? { data: null, error: { message: writeFailure } }
          : { data: record, error: null };
      },
      select() {
        return { eq: () => ({ single: async () => ({ data: null, error: null }) }) };
      }
    };
  }
};

mock.module(clientUrl, {
  namedExports: { getSupabase: async () => fakeSupabase }
});

const { profileService } = await import('../js/services/profileService.js');

test('profile updates keep only real learner preference fields', async () => {
  writes.length = 0;
  await profileService.save({
    display_name: 'Ada',
    preferred_level: 'HL',
    timezone: 'Asia/Kolkata',
    study_goals: ['Target score: 7'],
    onboarding_completed: true,
    role: 'admin',
    id: 'someone-else',
    invented_column: 'must not be written'
  });

  assert.deepEqual(writes, [{
    table: 'profiles',
    record: {
      id: 'learner-1',
      display_name: 'Ada',
      preferred_level: 'HL',
      timezone: 'Asia/Kolkata',
      study_goals: ['Target score: 7'],
      onboarding_completed: true
    }
  }]);
});

test('onboarding settings are written to the settings record', async () => {
  writes.length = 0;
  await profileService.settings({ study_plan: { target_score: '6' } });
  assert.deepEqual(writes, [{
    table: 'user_settings',
    record: { user_id: 'learner-1', settings: { study_plan: { target_score: '6' } } }
  }]);
});

test('a database write failure is shown to the learner', async () => {
  writes.length = 0;
  writeFailure = 'row-level security policy rejected this update';
  await assert.rejects(
    profileService.save({ display_name: 'Ada' }),
    /row-level security policy rejected this update/
  );
  writeFailure = null;
});

test('a signed-out browser cannot save a profile', async () => {
  currentUser = null;
  await assert.rejects(profileService.save({ display_name: 'Ada' }), /Sign in is required/);
  currentUser = { id: 'learner-1' };
});

console.log('profile service tests passed (safe fields, settings, failures, sign-out)');
