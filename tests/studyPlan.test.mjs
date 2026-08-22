/** Guards the weekly plan: it must never invent work, and must respect the budget. */
import assert from 'node:assert/strict';
import { buildWeeklyPlan } from '../js/studyPlan.js';

const lessons = [
  { slug: 'kinematics', title: 'A.1 Kinematics', estimatedStudyTime: 30 },
  { slug: 'forces', title: 'A.2 Forces', estimatedStudyTime: 35 },
  { slug: 'energy', title: 'A.3 Energy', estimatedStudyTime: 30 },
];

// ── A brand-new learner gets lessons, not imaginary review ───────────
const fresh = buildWeeklyPlan({ lessons, completed: [], dueCards: 0, dueMistakes: 0, weeklyMinutes: 180 });
assert.ok(fresh.items.length, 'a new learner should still get a plan');
assert.ok(!fresh.items.some(item => item.kind === 'Review'),
  'nothing is due yet, so the plan must not invent review work');
assert.equal(fresh.items[0].kind, 'Learn', 'the first lesson should lead');
assert.equal(fresh.items[0].href, '/lesson/kinematics');

// ── Overdue review outranks new material ─────────────────────────────
const behind = buildWeeklyPlan({ lessons, completed: [], dueCards: 20, dueMistakes: 4, weeklyMinutes: 180 });
assert.equal(behind.items[0].kind, 'Review', 'overdue work must come first');
assert.ok(/mistake/i.test(behind.items[0].title), 'banked mistakes should lead the review');
assert.ok(behind.items.some(item => item.kind === 'Learn'), 'a lesson should still appear');

// ── The budget is respected ──────────────────────────────────────────
const tight = buildWeeklyPlan({ lessons, completed: [], dueCards: 40, dueMistakes: 10, weeklyMinutes: 25 });
assert.ok(tight.minutes <= 25 || tight.items.length === 1,
  'the plan must fit the budget, or contain exactly one unavoidable item');
assert.ok(tight.items.length >= 1, 'a tiny budget should still produce something');

const roomy = buildWeeklyPlan({ lessons, completed: [], dueCards: 10, dueMistakes: 2, weeklyMinutes: 600 });
assert.ok(roomy.minutes <= 600);
assert.ok(roomy.items.length > tight.items.length, 'more time should mean more work');

// ── Practice targets a measured weakness, never a guess ──────────────
const withWeak = buildWeeklyPlan({
  lessons, completed: [], dueCards: 0, dueMistakes: 0, weeklyMinutes: 300,
  weakTopics: [{ label: 'Wave Phenomena', percentage: 41 }],
});
const practice = withWeak.items.find(item => item.kind === 'Practise');
assert.ok(practice, 'practice should be planned');
assert.match(practice.title, /Wave Phenomena/, 'practice should name the measured weakness');
assert.match(practice.detail, /41%/, 'the plan should say why that topic was chosen');

// With no scored practice it must say so rather than name a topic at random.
const noData = buildWeeklyPlan({ lessons, completed: [], dueCards: 0, dueMistakes: 0, weeklyMinutes: 300 });
const baseline = noData.items.find(item => item.kind === 'Practise');
assert.match(baseline.detail, /no scored practice/i, 'it must admit it has no measurement yet');

// A topic with no real percentage must never be presented as a weakness.
const unscored = buildWeeklyPlan({
  lessons, completed: [], dueCards: 0, dueMistakes: 0, weeklyMinutes: 300,
  weakTopics: [{ label: 'Relativity', percentage: null }],
});
assert.ok(!unscored.items.some(item => /Relativity/.test(item.title)),
  'an unscored topic must not be presented as a measured weakness');

// ── Finished and nothing due is a real answer ────────────────────────
const done = buildWeeklyPlan({
  lessons, completed: ['kinematics', 'forces', 'energy'],
  dueCards: 0, dueMistakes: 0, weeklyMinutes: 180,
});
assert.equal(done.exhausted, true, 'a finished course with nothing due should report as such');
assert.ok(!done.items.some(item => item.kind === 'Learn'), 'there are no lessons left to plan');

// ── No completed lesson is ever planned again ────────────────────────
const partial = buildWeeklyPlan({ lessons, completed: ['kinematics'], dueCards: 0, dueMistakes: 0, weeklyMinutes: 300 });
assert.ok(!partial.items.some(item => item.href === '/lesson/kinematics'),
  'a completed lesson must not be planned again');

// ── Empty input does not throw ───────────────────────────────────────
const nothing = buildWeeklyPlan();
assert.ok(Array.isArray(nothing.items), 'an empty call must still return a plan shape');

console.log('study plan tests passed (no invented work, budget respected, measured weakness only)');
