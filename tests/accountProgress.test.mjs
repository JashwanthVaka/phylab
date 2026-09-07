/**
 * Guards the rule that makes per-account progress work: progressService is the
 * only thing allowed to record lesson completion.
 *
 * The bug this replaces was quiet. The lesson page called completeLesson()
 * from utils directly, which writes to localStorage and nothing else, so a
 * signed-in learner marked a lesson done and their account never heard about
 * it. Nothing failed and nothing was logged; the work simply was not there on
 * their next device. A grep-level rule is the cheapest way to keep that from
 * coming back.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const jsFiles = [];
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) walk(full);
  else if (entry.name.endsWith('.js')) jsFiles.push(full);
});
walk(path.join(ROOT, 'js'));
jsFiles.push(path.join(ROOT, 'app.js'));

const OWNER = path.join(ROOT, 'js', 'services', 'progressService.js');
const UTILS = path.join(ROOT, 'js', 'utils.js');

// 1. Only progressService may call the device-local writer.
const callers = jsFiles.filter(file => {
  if (file === OWNER || file === UTILS) return false;
  const body = fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
    .join('\n');
  return /\bcompleteLesson\s*\(/.test(body);
});
assert.deepEqual(callers, [], `these modules write completion behind the account's back: ${callers.map(f => path.relative(ROOT, f))}`);

// 2. Every route that shows completion must read it from progressService,
//    otherwise a signed-in learner sees this device's answer instead of theirs.
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
for (const route of ["'/'", "'/lesson/:slug'", "'/revision'", "'/progress'"]) {
  const start = app.indexOf(`  ${route}:`);
  assert.ok(start > -1, `route ${route} is missing from app.js`);
  const block = app.slice(start, start + 700);
  assert.match(block, /progressService|dashboardContext/,
    `route ${route} does not read progress through progressService`);
}

// 3. progressService must scope every write to the signed-in user. Without
//    user_id the row would fail row-level security, or worse, land on nobody.
const service = fs.readFileSync(OWNER, 'utf8');
assert.match(service, /user_id:\s*user\.id/, 'progressService must stamp writes with the signed-in user id');
assert.match(service, /onConflict:\s*'user_id,lesson_slug'/, 'completion must upsert on (user_id, lesson_slug), matching the unique index');

// 4. The database must actually isolate one learner from another.
const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260808_phylab_foundation.sql'), 'utf8');
assert.match(sql, /alter table public\.lesson_progress enable row level security/, 'lesson_progress must have RLS enabled');
assert.match(sql, /unique\(user_id,\s*lesson_slug\)/, 'one completion row per learner per lesson');
assert.ok(/user_id=auth\.uid\(\)/.test(sql), 'the owner policy must key on auth.uid()');

console.log(`account progress tests passed (${jsFiles.length} modules checked, single writer, 4 routes account-aware, RLS present)`);
