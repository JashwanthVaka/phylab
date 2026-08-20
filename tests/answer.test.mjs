/**
 * The answer engine must stay useful without an AI provider, and must never
 * reach for the learner's private library, since /api/answer is public.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildRecords } = require(path.join(ROOT, 'server', 'retrievalEngine.cjs'));
const { composeAnswer } = require(path.join(ROOT, 'server', 'answerEngine.cjs'));

const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const lessons = fs.readdirSync(path.join(ROOT, 'data', 'lessons'))
  .filter(file => file.endsWith('.json'))
  .map(file => {
    const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lessons', file), 'utf8'));
    lesson.slug = slugify(path.basename(file, '.json'));
    lesson.topicLabel = lesson.title.replace(/^[A-E]\.\d+\s*/, '');
    return lesson;
  });

const catalogue = {
  lessons,
  formulas: read('formulas.json'),
  examples: read('examples.json'),
  glossary: read('glossary.json'),
  questions: read('questions.json'),
  simulations: read('simulations.json'),
  toolkit: read('toolkit.json'),
  cases: read('cases.json'),
  questionPatterns: read('questionPatterns.json'),
};

const records = buildRecords(catalogue);
assert.ok(records.length > 900, `expected a substantial index, got ${records.length}`);

// The explanatory body of a lesson has to be reachable, not just its summary.
['Concept', 'Common mistake', 'Exam tip', 'HL extension', 'Method', 'Applied case', 'Command term']
  .forEach(type => assert.ok(records.some(r => r.type === type), `no ${type} records were indexed`));

/* Exercise the real retrieval engine rather than a stand-in, so the test
   fails when the shipped scorer regresses — not when a test copy does. An
   earlier stand-in matched substrings and ranked "Terminal Potential
   Difference" above "Deduce", which the real tokenising scorer never does. */
const { createRetrievalEngine } = require(path.join(ROOT, 'server', 'retrievalEngine.cjs'));
const engine = createRetrievalEngine(async () => catalogue);
const rank = query => engine.retrieve(query, {}, 12);

// Questions a student would actually ask must land on the right topic.
const expectations = [
  ['escape speed', /escape/i],
  ['closed pipe harmonics', /closed pipe|standing wave/i],
  ['photoelectric effect', /photoelectric|quantum|photon/i],
  ['half life decay constant', /half|decay/i],
  ['deduce command term', /deduce/i],
];

for (const [question, expected] of expectations) {
  const answer = composeAnswer(question, await rank(question));
  assert.ok(answer.answered, `"${question}" produced no answer`);
  assert.ok(answer.sections.length > 0, `"${question}" produced no sections`);
  assert.match(answer.headline, expected, `"${question}" led with "${answer.headline}"`);
  // The strongest match must actually appear in the body, not just the heading.
  assert.ok(answer.sections[0].body.length > 10, `"${question}" had an empty leading section`);
}

// An unanswerable question must say so rather than bluff.
const blank = composeAnswer('zzzz qqqq', []);
assert.equal(blank.answered, false);
assert.ok(blank.note.length > 10, 'an unanswerable question should explain what to try instead');

// /api/answer is public, so the endpoint must not be wired to the private library.
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const publicEngine = server.match(/const publicRetrieval = createRetrievalEngine\([^;]*/)?.[0] || '';
assert.ok(publicEngine, 'expected a dedicated public retrieval engine');
assert.ok(!/getExtraRecords/.test(publicEngine),
  '/api/answer must never draw on the private library — it is a public endpoint');

console.log(`answer engine tests passed (${records.length} records, ${expectations.length} questions answered)`);
