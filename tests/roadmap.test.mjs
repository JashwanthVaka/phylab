import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageReport } from '../js/coverageUI.js';
import { normalize, optionsFromSearch, selectQuestions } from '../js/quizSession.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/questions.json'), 'utf8'));
assert.ok(questions.length >= 500, `expected at least 500 original questions, found ${questions.length}`);
questions.forEach(question => {
  assert.equal(question.sourceType, 'original-kinetiq', `${question.id} has untrusted provenance`);
  assert.ok(question.author && question.reviewer && question.lastReviewed, `${question.id} lacks author/reviewer metadata`);
  assert.ok(['1A', '1B', '2'].includes(question.paper), `${question.id} has no current paper mapping`);
  assert.ok(question.skills?.length && question.criteria?.length, `${question.id} has no skill/criterion metadata`);
});

const coverage = coverageReport(questions);
assert.ok(coverage.rows.length >= 26, 'coverage dashboard should include every assessed topic');
assert.equal(coverage.rows.reduce((sum, row) => sum + row.total, 0), questions.length);
const referencedLessons = new Set(questions.flatMap(question => question.lessonReferences || []));
assert.equal(referencedLessons.size, 26, 'every lesson needs question coverage');
assert.ok(questions.filter(question => question.paper === '1B').length >= 30, 'Paper 1B needs a usable data bank');

for (const paper of ['1A', '1B', '2']) {
  const options = optionsFromSearch(new URLSearchParams(`paper=${paper}&count=20&mode=Exam%20Practice`));
  assert.equal(options.paper, paper);
  const selected = selectQuestions(questions, options);
  assert.equal(selected.questions.length, 20, `Paper ${paper} cannot build a 20-question mock`);
  assert.ok(selected.questions.every(item => normalize(item).paper === paper));
}

const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.match(app, /\/admin\/coverage/);
assert.match(app, /\/notebook/);
assert.match(index, /href="\/notebook"/);

const subscriptionSql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260922_subscription_foundation.sql'), 'utf8');
assert.match(subscriptionSql, /enable row level security/i);
assert.match(subscriptionSql, /user_id = auth\.uid\(\)/);
assert.match(subscriptionSql, /revoke insert, update, delete/i);
console.log(`roadmap tests passed (${questions.length} questions, ${coverage.rows.length} topics, all paper builders ready)`);
