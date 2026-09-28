import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const server = read('server/accountControls.cjs');
const client = read('js/services/accountDataService.js');
const page = read('js/accountPage.js');
const feedback = read('supabase/migrations/202609280001_content_feedback.sql');
const feedbackService = read('js/services/feedbackService.js');
const adminPage = read('js/adminUI.js');

assert.match(server, /\/auth\/v1\/user/, 'account requests must validate the learner token');
assert.match(server, /SUPABASE_SECRET_KEY/, 'destructive account work must use a server-only key');
assert.doesNotMatch(client, /SUPABASE_SECRET|service_role/i, 'browser account controls must never contain the server key');
assert.match(server, /confirmation !== 'DELETE'/, 'account deletion needs an explicit confirmation value');
assert.match(server, /\/auth\/v1\/admin\/users\//, 'deletion must remove the Auth user so profile cascades run');
assert.match(server, /\['teacher_classes', 'teacher_id'\]/, 'a teacher archive must include their classes');
assert.match(server, /quiz_attempt_id=in\.\(/, 'a learner archive must include answers belonging to their quiz attempts');
assert.match(page, /data-account-export/);
assert.match(page, /data-account-signout-all/);
assert.match(page, /data-account-delete-confirm/);
assert.match(client, /scope: 'global'/, 'the learner must be able to revoke other device sessions');
assert.match(feedback, /enable row level security/i);
assert.match(feedback, /user_id = auth\.uid\(\)/i);
assert.match(feedback, /public\.is_admin\(\)/i);
assert.match(feedbackService, /\.eq\('user_id', user\.id\)/, 'learners may list only their own submitted reports');
assert.match(adminPage, /data-admin-feedback/, 'the owner dashboard must expose the report review workflow');

console.log('account control tests passed (private export, global revocation, confirmed deletion and RLS feedback)');
