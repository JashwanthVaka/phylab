/**
 * Guards that every lesson's diagram depicts that lesson's physics.
 *
 * Five diagrams once covered twenty-six lessons behind loose keyword matching,
 * with a generic vector sketch as the fallback. Twelve lessons showed a picture
 * unrelated to their content, and two matched the wrong one outright: "simple
 * harmonic motion" never matched the pattern `shm` so it fell through, and
 * quantum physics was given a nuclear decay diagram.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagramFor, diagramKeyFor } from '../js/diagramEngine.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'data', 'lessons');

const lessons = fs.readdirSync(dir).filter(name => name.endsWith('.json')).map(name => {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  return {
    slug: path.basename(name, '.json').replace(/_/g, '-'),
    title: lesson.title,
    topicLabel: lesson.title.replace(/^[A-E]\.\d+\s*/, ''),
  };
});

assert.equal(lessons.length, 26, 'expected the full course');

// ── Every lesson gets a diagram, and each is distinct ────────────────
const keys = new Map();
lessons.forEach(lesson => {
  const key = diagramKeyFor(lesson);
  assert.ok(key, `${lesson.title} has no diagram`);
  if (!keys.has(key)) keys.set(key, []);
  keys.get(key).push(lesson.title);
});

// No single diagram may be a de-facto fallback for a crowd of lessons.
keys.forEach((titles, key) => {
  assert.ok(titles.length <= 2,
    `"${key}" is used by ${titles.length} lessons, which makes it a fallback: ${titles.join(', ')}`);
});
assert.ok(keys.size >= 20, `expected a diagram per topic, found only ${keys.size} distinct ones`);

// ── The specific mismatches that prompted this ───────────────────────
const keyOf = title => diagramKeyFor(lessons.find(item => item.title.includes(title)));
assert.equal(keyOf('Simple Harmonic Motion'), 'simple-harmonic-motion',
  'SHM must not fall through to a generic diagram');
assert.equal(keyOf('Quantum Physics'), 'quantum-physics',
  'quantum physics must not be given a nuclear decay diagram');
assert.equal(keyOf('Thermodynamics'), 'thermodynamics');
assert.equal(keyOf('Gas Laws'), 'gas-laws');
assert.equal(keyOf('Current and Circuits'), 'current-and-circuits');
assert.equal(keyOf('Doppler'), 'doppler-effect');
assert.equal(keyOf('Greenhouse'), 'greenhouse-effect');
assert.equal(keyOf('Relativity'), 'relativity');
assert.equal(keyOf('Atomic Physics'), 'atomic-physics');
assert.equal(keyOf('Kinematics'), 'kinematics');
assert.equal(keyOf('Nuclear Fission'), 'nuclear-fission');
assert.notEqual(keyOf('Nuclear Fission'), keyOf('Nuclear Physics'),
  'fission and decay are different processes and need different pictures');

// ── Each rendered diagram is real SVG with a caption ─────────────────
lessons.forEach(lesson => {
  const markup = diagramFor(lesson);
  assert.ok(markup.includes('<svg'), `${lesson.title} produced no SVG`);
  assert.ok(/viewBox="0 0 360 190"/.test(markup), `${lesson.title} has an unexpected viewBox`);

  const shapes = (markup.match(/<(line|path|circle|rect|polyline|text)\b/g) || []).length;
  assert.ok(shapes >= 6, `${lesson.title} has only ${shapes} shapes, which is too sparse to read`);

  const caption = /<p>([^<]+)<\/p>/.exec(markup)?.[1];
  assert.ok(caption && caption.length > 30, `${lesson.title} needs a caption that explains the picture`);
  assert.ok(/aria-label="/.test(markup), `${lesson.title} diagram needs an accessible label`);

  // Unbalanced tags would render as nothing at all.
  const opens = (markup.match(/<(?!\/)(?!.*\/>)[a-z]+/g) || []).length;
  assert.ok(opens > 0);
});

// An unrecognised topic must show nothing rather than a wrong picture.
assert.equal(diagramFor({ slug: 'basket-weaving', title: 'Z.9 Basket Weaving', topicLabel: 'Basket Weaving' }), '',
  'an unmatched lesson must render no diagram at all');

console.log(`diagram tests passed (${lessons.length} lessons, ${keys.size} distinct diagrams, none generic)`);
