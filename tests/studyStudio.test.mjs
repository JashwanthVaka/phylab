import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const memory = new Map();
globalThis.localStorage = {
  get length() { return memory.size; },
  key: index => [...memory.keys()][index] ?? null,
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key),
};

const { CONVERSIONS, GRAPH_CHALLENGES, calendarHTML, convertUnit } = await import('../js/studyStudio.js');
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const studio = read('js/studyStudio.js');
const enhancements = read('js/studyEnhancements.js');
const diagrams = read('js/diagramEngine.js');
const app = read('app.js');
const css = read('styles.css');

assert.equal(convertUnit('km/h → m/s', 72), 20);
assert.equal(convertUnit('cm → m', 250), 2.5);
assert.ok(Math.abs(convertUnit('° → rad', 180) - Math.PI) < 1e-12);
assert.equal(convertUnit('unknown', 10), null);
assert.equal(Object.keys(CONVERSIONS).length, 7);
assert.deepEqual(new Set(GRAPH_CHALLENGES.map(item => item.answer)), new Set(['linear', 'quadratic', 'inverse-square', 'exponential']));

const calendar = calendarHTML({
  goals: [{ date: '2026-09-26' }],
  reflections: [{ at: '2026-09-26T08:00:00.000Z' }],
}, new Date('2026-09-26T06:00:00.000Z'));
assert.match(calendar, /1 goal/);
assert.match(calendar, /1 reflection/);
assert.match(calendar, /No planned item/);
assert.doesNotMatch(calendar, />Review</);
assert.doesNotMatch(calendar, />Study</);

const features = [
  ['derivation stepper', /data-derivation-stage/.test(studio)],
  ['graph prediction', /data-prediction/.test(studio) && /GRAPH_CHALLENGES/.test(studio)],
  ['simulation comparison', /data-compare/.test(studio) && /physics\.projectile/.test(studio)],
  ['misconception finder', /common_mistakes/.test(studio)],
  ['scratchpad', /data-scratchpad/.test(studio) && /state\.scratchpad/.test(studio)],
  ['symbol keyboard', /data-symbol/.test(studio)],
  ['unit conversion trainer', /data-check-conversion/.test(studio)],
  ['graph annotation', /data-annotation-layer/.test(studio)],
  ['practical design builder', /data-build-practical/.test(studio)],
  ['explain it yourself', /data-save-explanation/.test(studio) && /MediaRecorder/.test(studio)],
  ['study timer', /data-timer-toggle/.test(studio)],
  ['session goals', /data-goal-form/.test(studio)],
  ['study calendar', /calendarHTML\(state/.test(studio)],
  ['honest notifications', /Background scheduling is not enabled/.test(studio)],
  ['custom collections', /data-collection-form/.test(studio)],
  ['reading controls', /data-reading-size/.test(enhancements)],
  ['read aloud', /SpeechSynthesisUtterance/.test(enhancements)],
  ['progress report', /\/progress\?print=1/.test(studio) && /window\.print/.test(enhancements)],
  ['shared page transition', /startViewTransition/.test(app) && /view-transition-new/.test(css)],
  ['equation entrance', /formula-hero code/.test(enhancements)],
  ['guided 3D camera', /undistorted teaching view/.test(diagrams)],
  ['learning path motion', /adaptive-path li/.test(enhancements)],
  ['physics loading motion', /loading-wave/.test(css)],
  ['button feedback', /button:active/.test(css)],
  ['mobile study dock', /study-dock/.test(enhancements) && /dock\.hidden/.test(enhancements)],
];

features.forEach(([name, connected]) => assert.ok(connected, `${name} is not connected`));
assert.equal(features.length, 25);
console.log('study studio tests passed (25/25 additional upgrades connected)');
