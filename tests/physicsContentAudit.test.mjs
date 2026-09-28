import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const lesson = name => JSON.parse(fs.readFileSync(path.join(root, 'data/lessons', name), 'utf8'));
const allLessonText = fs.readdirSync(path.join(root, 'data/lessons')).filter(file => file.endsWith('.json'))
  .map(file => fs.readFileSync(path.join(root, 'data/lessons', file), 'utf8')).join('\n');

const formula = (file, name) => lesson(file).formulas.find(item => item.name === name)?.formula;
assert.equal(formula('energy.json', 'Work Done'), 'W = Fs cosθ');
assert.equal(formula('thermodynamics.json', 'First Law of Thermodynamics'), 'ΔU = Q - W');
assert.equal(formula('wave_phenomena.json', 'Double-Slit Fringe Spacing'), 's = λD / d');
assert.equal(formula('standing_waves_and_resonance.json', 'Closed Pipe Harmonics'), 'fₙ = nv / 4L');
assert.equal(formula('nuclear_physics.json', 'Half-Life and Decay Constant'), 'T½ = ln2 / λ');

const doubleSlit = lesson('wave_phenomena.json').worked_examples[0];
assert.match(doubleSlit.solution.join(' '), /s = λD\/d/);
assert.doesNotMatch(doubleSlit.solution.join(' '), /λ = sx\/D|x = λD\/s/,
  'the worked solution must use the same symbols as the displayed equation');

assert.doesNotMatch(allLessonText, /ΔU\s*=\s*Q\s*\+\s*W/,
  'KINETIQ uses work done by the system, so the first-law sign must remain Q - W');
assert.doesNotMatch(allLessonText, /Paper 3/, 'the first-assessment-2025 course has Papers 1A, 1B and 2');
assert.match(allLessonText, /6\.63 × 10⁻³⁴ J s/, 'course material should carry the rounded IB Planck constant');
assert.match(allLessonText, /3\.00 × 10⁸ m/, 'course material should carry the rounded exact speed of light');

const physicsEngine = fs.readFileSync(path.join(root, 'js/physicsEngine.js'), 'utf8');
const lessonGraphs = fs.readFileSync(path.join(root, 'js/lessonGraphs.js'), 'utf8');
for (const source of [physicsEngine, lessonGraphs]) {
  assert.match(source, /299792458/, 'calculations must use the exact speed of light in vacuum');
  assert.match(source, /6\.62607015e-34/, 'calculations must use the exact Planck constant');
}
assert.match(physicsEngine, /1\.602176634e-19/, 'calculations must use the exact elementary charge');
assert.match(physicsEngine, /6\.6743e-11/, 'gravity calculations must use the 2022 CODATA gravitational constant');

const questions = JSON.parse(fs.readFileSync(path.join(root, 'data/questions.json'), 'utf8'));
questions.forEach(question => {
  assert.ok(question.solution.length >= 20, `${question.id} needs an explanatory solution`);
  assert.ok(question.criteria?.length, `${question.id} needs criterion-level marking`);
  assert.equal(question.sourceType, 'original-kinetiq', `${question.id} is not original KINETIQ content`);
});

console.log(`physics content audit passed (26 lessons, ${questions.length} original questions, key equations and conventions checked)`);
