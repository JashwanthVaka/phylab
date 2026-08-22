/** Guards progress export and import: what travels, what does not, what is refused. */
import assert from 'node:assert/strict';

// A localStorage stand-in, because this module is browser code.
const store = new Map();
globalThis.localStorage = {
  get length() { return store.size; },
  key: index => [...store.keys()][index] ?? null,
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(String(key), String(value)),
  removeItem: key => store.delete(key),
};

const { collectProgress, applyProgress, validate, describe, exportFilename } =
  await import('../js/progressTransfer.js');

const seed = () => {
  store.clear();
  store.set('phylab_progress_v2', JSON.stringify({ completedLessons: ['kinematics', 'forces'] }));
  store.set('phylab_flashcards_v1', JSON.stringify({ a: { interval: 3 } }));
  store.set('phylab_mistake_state_v1', JSON.stringify({ q1: { due: 1 } }));
  store.set('phylab_quiz_results:abc', JSON.stringify({ submitted: true, marksEarned: 7, maxMarks: 9 }));
  store.set('phylab_quiz_results:def', JSON.stringify({ submitted: true, marksEarned: 4, maxMarks: 9 }));
  store.set('phylab_ia_draft_v1', JSON.stringify({ research: 'draft text' }));
  // Not progress, and must never travel.
  store.set('phylab_guest_conversations', JSON.stringify([{ id: 'c1', messages: ['private'] }]));
  store.set('phylab_ai_context_memory', JSON.stringify({ topic: 'kinematics' }));
};

seed();
const payload = collectProgress();

// Practice attempts are stored one key per attempt, `phylab_quiz_results:<id>`.
// An export that only copied fixed key names would silently drop every one.
const attemptKeys = payload.keys.filter(key => key.startsWith('phylab_quiz_results:'));
assert.equal(attemptKeys.length, 2, 'both prefixed practice attempts must be exported');

// Conversations are chat logs, not progress, and a file shared with a teacher
// must not carry a tutoring transcript.
const serialised = JSON.stringify(payload);
assert.ok(!serialised.includes('private'), 'guest conversations must never be exported');
assert.ok(!serialised.includes('ai_context_memory'), 'AI context must never be exported');

assert.equal(payload.format, 'kinetiq.progress');
assert.equal(payload.version, 1);
assert.ok(payload.exportedAt, 'an export must record when it was made');
assert.match(exportFilename(), /^kinetiq-progress-\d{4}-\d{2}-\d{2}\.json$/);

// The description must count what is really there.
const summary = describe(payload);
assert.match(summary, /2 lessons completed/);
assert.match(summary, /2 practice attempts/);
assert.match(summary, /an IA draft/);

// ── Round trip ───────────────────────────────────────────────────────
const before = JSON.stringify(payload.data);
store.clear();
assert.equal(collectProgress().keys.length, 0, 'the wipe should leave nothing behind');
const restored = applyProgress(payload);
assert.equal(restored.length, 6, 'every exported key should be restored');
assert.equal(JSON.stringify(collectProgress().data), before, 'a round trip must be lossless');
assert.deepEqual(
  JSON.parse(store.get('phylab_progress_v2')).completedLessons,
  ['kinematics', 'forces'],
);

// ── Refusals ─────────────────────────────────────────────────────────
assert.match(validate('nonsense'), /not a KINETIQ progress export/);
assert.match(validate({ format: 'other.app', version: 1, data: {} }), /not exported from KINETIQ/);
assert.match(validate({ format: 'kinetiq.progress', version: 99, data: { phylab_progress_v2: {} } }), /newer version/);
assert.match(validate({ format: 'kinetiq.progress', version: 1, data: { unrelated: 1 } }), /nothing this version/);
assert.equal(validate(payload), null, 'a real export must validate');

// A refused file must not touch storage.
seed();
const untouched = JSON.stringify([...store.entries()]);
assert.throws(() => applyProgress({ format: 'other.app', version: 1, data: {} }));
assert.equal(JSON.stringify([...store.entries()]), untouched, 'a rejected import must change nothing');

// Keys the file does not mention are left alone; unknown keys are ignored.
seed();
applyProgress({
  format: 'kinetiq.progress',
  version: 1,
  data: { phylab_progress_v2: { completedLessons: ['energy'] }, evil_key: 'nope' },
});
assert.deepEqual(JSON.parse(store.get('phylab_progress_v2')).completedLessons, ['energy']);
assert.ok(store.has('phylab_flashcards_v1'), 'keys absent from the file must survive');
assert.ok(!store.has('evil_key'), 'an unknown key must never be written');

// An empty browser exports a valid, honest file rather than failing.
store.clear();
const empty = collectProgress();
assert.equal(empty.keys.length, 0);
assert.equal(describe(empty), 'no progress recorded yet');

console.log('progress transfer tests passed (round trip, exclusions, refusals)');
