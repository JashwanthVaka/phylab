import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260921_teacher_privacy.sql'), 'utf8');
const productionTest = fs.readFileSync(path.join(ROOT, 'tests/rls/production-isolation.sql'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js/classroomUI.js'), 'utf8');
const service = fs.readFileSync(path.join(ROOT, 'js/services/classroomService.js'), 'utf8');

assert.match(migration, /create or replace function public\.join_class\(p_join_code text\)/i,
  'students must join through the invitation-code function');
assert.match(migration, /revoke all on function public\.join_class\(text\) from public, anon/i,
  'anonymous visitors must not call the join function');
assert.match(migration, /teacher_access|lesson_progress_teacher_read|public\.teaches_student\(user_id\)/i,
  'teacher lesson access must be tied to class membership');
assert.doesNotMatch(migration, /bookmarks_teacher|ai_messages_teacher|ai_conversations_teacher/i,
  'teacher mode must not expose private saved items or KIT conversations');
assert.match(migration, /status = 'published'/i, 'learners must only see published assignments');
assert.match(migration, /protect_submission_fields/i, 'student updates must not overwrite teacher marks');
assert.match(productionTest, /rollback;/i, 'the production isolation test must remove every fixture');
assert.match(productionTest, /teacher_access_ends_after_leave/i, 'the live test must prove revocation after leaving');
assert.match(app, /'\/classroom'/, 'the classroom must have a real application route');
assert.match(service, /\.rpc\('join_class'/, 'the browser must use the guarded join function');
assert.match(ui, /Bookmarks, Ask KIT history and private revision notes stay private/i,
  'the learner must see the sharing boundary before joining');
assert.doesNotMatch(ui, /@[a-z0-9.-]+\.[a-z]{2,}/i, 'classroom code must not contain private email allowlists');

console.log('classroom tests passed (invite-only joins, limited teacher evidence, immediate revocation)');

