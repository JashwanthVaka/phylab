/** Guards the cross-references between the content files and the lesson/simulation catalogues. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));
const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const lessonSlugs = new Set(fs.readdirSync(path.join(ROOT, 'data', 'lessons')).filter(file => file.endsWith('.json')).map(file => slugify(path.basename(file, '.json'))));
const simulationSlugs = new Set(
  fs.readFileSync(path.join(ROOT, 'js', 'simulationStudio.js'), 'utf8')
    .split('const presets')[0]
    .match(/^\s{2}'?([a-z-]+)'?:\s*\{\s*title:/gm)
    ?.map(line => line.trim().replace(/'/g, '').split(':')[0]) || []
);

// data/simulations.json is what the homepage counts, so it must match the studio exactly.
assert.equal(simulationSlugs.size, 26, 'expected one simulation per lesson in simulationStudio.js');

// Every lesson should have a lab. The studio covered ten of twenty-six, which
// left most of the course with nothing to model.
const studioSource = fs.readFileSync(path.join(ROOT, 'js', 'simulationStudio.js'), 'utf8');
const mappedLessons = new Set([...studioSource.matchAll(/lesson: .([a-z-]+)./g)].map(m => m[1]));
[...lessonSlugs].forEach(slug => assert.ok(mappedLessons.has(slug), `lesson ${slug} has no simulation`));
const simulationCatalogue = read('simulations.json');
assert.deepEqual(
  simulationCatalogue.map(item => item.slug).sort(),
  [...simulationSlugs].sort(),
  'data/simulations.json has drifted from the simulations implemented in js/simulationStudio.js'
);
simulationCatalogue.forEach(item => assert.ok(item.name && item.topic && item.description && item.variables?.length, `simulation ${item.slug} is missing a field`));

// The quiz modes advertise question counts, and the exam hub advertises a
// multiple-choice paper. Both must actually be deliverable from the bank.
const questions = read('questions.json');
const questionIds = new Set();
questions.forEach(item => {
  assert.ok(!questionIds.has(item.id), `duplicate question id ${item.id}`);
  questionIds.add(item.id);
  assert.ok(item.topic && item.question && item.solution, `question ${item.id} is missing a field`);
  assert.ok(item.answer || item.correctAnswer, `question ${item.id} has no answer`);
  assert.ok(['SL', 'HL'].includes(item.level), `question ${item.id} needs level SL or HL`);
  (item.lessonReferences || []).forEach(slug => assert.ok(lessonSlugs.has(slug), `question ${item.id} links to missing lesson ${slug}`));
  if (item.options) {
    assert.ok(item.options.length >= 3, `question ${item.id} needs at least three options`);
    assert.equal(new Set(item.options).size, item.options.length, `question ${item.id} has duplicate options`);
    assert.ok(item.options.includes(item.correctAnswer), `question ${item.id} correctAnswer is not one of its options`);
  }
});
// The longest mode (Exam Practice) asks for 12, and Paper 1 practice needs MCQs.
assert.ok(questions.length >= 12, 'the bank must cover the longest quiz mode');
assert.ok(questions.filter(item => item.options).length >= 5, 'Paper 1 practice needs multiple-choice questions');
assert.ok(questions.filter(item => item.level === 'HL').length >= 5, 'HL extension practice needs HL questions');

const units = read('units.json');
const unitIds = new Set(units.map(unit => unit.id));
assert.ok(units.length >= 4, 'expected at least four syllabus units');
units.forEach(unit => assert.ok(unit.id && unit.title && unit.summary, `unit ${unit.id} is missing a field`));

const toolkit = read('toolkit.json');
assert.ok(toolkit.length >= 5, 'expected at least five toolkit methods');
toolkit.forEach(method => {
  assert.ok(method.slug && method.title && method.purpose, `toolkit method ${method.slug} is missing a field`);
  assert.equal(method.steps.length, 5, `toolkit method ${method.slug} should have five steps`);
  method.steps.forEach(step => assert.ok(step.heading && step.detail, `a step in ${method.slug} is incomplete`));
});

const cases = read('cases.json');
const caseSlugs = new Set();
cases.forEach(item => {
  assert.ok(!caseSlugs.has(item.slug), `duplicate case slug ${item.slug}`);
  caseSlugs.add(item.slug);
  assert.ok(unitIds.has(item.unit), `case ${item.slug} references unknown unit ${item.unit}`);
  assert.ok(item.context && item.context.length > 80, `case ${item.slug} needs a substantive context`);
  assert.ok(item.concepts?.length, `case ${item.slug} needs concepts`);
  assert.ok(item.formulas?.length, `case ${item.slug} needs formulas`);
  assert.ok(item.questions?.length, `case ${item.slug} needs short questions`);
  assert.ok(item.mistakes?.length, `case ${item.slug} needs common mistakes`);
  item.questions.forEach(question => assert.ok(question.prompt && question.answer, `a question in ${item.slug} is incomplete`));
  assert.ok(item.examQuestion?.prompt && item.examQuestion?.markPoints?.length, `case ${item.slug} needs an exam question with mark points`);
  (item.lessons || []).forEach(slug => assert.ok(lessonSlugs.has(slug), `case ${item.slug} links to missing lesson ${slug}`));
  if (item.simulation) assert.ok(simulationSlugs.has(item.simulation), `case ${item.slug} links to missing simulation ${item.simulation}`);
});
assert.ok(cases.length >= 15, 'expected a substantial case library');
unitIds.forEach(id => assert.ok(cases.some(item => item.unit === id), `unit ${id} has no cases`));

const patterns = read('questionPatterns.json');
const patternSlugs = new Set();
patterns.forEach(pattern => {
  assert.ok(!patternSlugs.has(pattern.slug), `duplicate pattern slug ${pattern.slug}`);
  patternSlugs.add(pattern.slug);
  assert.ok(pattern.command && pattern.meaning && pattern.marks, `pattern ${pattern.slug} is missing a field`);
  assert.ok(pattern.method?.length, `pattern ${pattern.slug} needs a response method`);
  assert.ok(pattern.mistakes?.length, `pattern ${pattern.slug} needs common mistakes`);
  assert.ok(pattern.example && pattern.answer, `pattern ${pattern.slug} needs an example and model answer`);
  (pattern.lessons || []).forEach(slug => assert.ok(lessonSlugs.has(slug), `pattern ${pattern.slug} links to missing lesson ${slug}`));
});
assert.ok(patterns.length >= 12, 'expected the main IB command terms to be covered');

const resources = read('resources.json');
resources.forEach(group => {
  assert.ok(group.category && group.description, 'a resource group is missing a field');
  assert.ok(group.items?.length, `resource group ${group.category} has no items`);
  group.items.forEach(item => {
    assert.ok(item.title && item.detail, `an item in ${group.category} is incomplete`);
    if (item.url) assert.ok(/^https:\/\//.test(item.url), `${item.title} must use an https link`);
  });
});

// Every lesson must fall into one of the declared units so the library never silently drops one.
const lessons = fs.readdirSync(path.join(ROOT, 'data', 'lessons')).filter(file => file.endsWith('.json'));
lessons.forEach(file => {
  const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lessons', file), 'utf8'));
  const unit = (String(lesson.title).match(/^\s*([A-Z])\./) || [])[1];
  assert.ok(unitIds.has(unit), `lesson ${file} has title "${lesson.title}" which maps to no known unit`);
});

console.log(`content tests passed (${units.length} units, ${toolkit.length} methods, ${cases.length} cases, ${patterns.length} patterns, ${lessons.length} lessons)`);

// Vercel bundles only what includeFiles names, so a file can pass the server's
// static allowlist locally and still 404 in production. sw.js and the web app
// manifest were both live-404ing for exactly this reason.
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const included = vercel.builds?.[0]?.config?.includeFiles || [];
['sw.js', 'manifest.json', 'icons/**', 'index.html', 'styles.css', 'app.js', 'js/**'].forEach(entry => {
  assert.ok(included.includes(entry), `vercel.json includeFiles is missing ${entry}, so it will 404 in production`);
});
console.log(`deploy manifest checked (${included.length} include patterns)`);

// ── Public counters must not drift ───────────────────────────────────
// "Ten labs" sat on the source library while the studio grew to 26, and the
// PWA manifest advertised 10 simulations for just as long. A spelled-out
// number survives every numeric check, so prose that states a count is now
// either a {{token}} resolved at render time, or it is asserted here.
const numberWords = {
  ten: 10, nineteen: 19, twenty: 20, 'twenty-six': 26, 'twenty-five': 25,
};
const questionCount = read('questions.json').length;
// The formula centre shows legacy formulas.json plus every lesson's own, which
// is how the public counter reaches its total; count it the same way.
const lessonFormulaCount = fs.readdirSync(path.join(ROOT, 'data', 'lessons'))
  .filter(file => file.endsWith('.json'))
  .reduce((total, file) => total +
    (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lessons', file), 'utf8')).formulas || []).length, 0);
const formulaCount = read('formulas.json').length + lessonFormulaCount;
const actual = {
  lessons: lessonSlugs.size,
  simulations: simulationSlugs.size,
  formulas: formulaCount,
  questions: questionCount,
  cases: cases.length,
};

// Every {{token}} in shipped copy must name a real counter.
const resourceBlob = JSON.stringify(read('resources.json'));
[...resourceBlob.matchAll(/\{\{(\w+)\}\}/g)].forEach(([, key]) => {
  assert.ok(key in actual, `resources.json uses {{${key}}}, which resolves to nothing`);
});

// Prose in the manifest and README states counts literally; check them.
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const manifestSims = /(\d+) simulations/.exec(manifest.description || '');
assert.ok(manifestSims, 'manifest.json description should state a simulation count');
assert.equal(Number(manifestSims[1]), actual.simulations,
  `manifest.json says ${manifestSims[1]} simulations but there are ${actual.simulations}`);

const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const readmeQuestions = /\| Practice questions \| (\d+) original/.exec(readme);
assert.ok(readmeQuestions, 'README should state a question count');
assert.equal(Number(readmeQuestions[1]), actual.questions,
  `README says ${readmeQuestions[1]} questions but there are ${actual.questions}`);

// No spelled-out count may contradict reality in shipped copy.
const copy = resourceBlob + JSON.stringify(read('units.json'));
Object.entries(numberWords).forEach(([word, value]) => {
  const hit = new RegExp(`${word} labs`, 'i').exec(copy);
  assert.ok(!hit || value === actual.simulations,
    `copy says "${word} labs" but there are ${actual.simulations} simulations`);
});

// The 2023 syllabus (first assessment 2025) has no Paper 3.
const uiSource = fs.readdirSync(path.join(ROOT, 'js'))
  .filter(file => file.endsWith('.js'))
  .map(file => fs.readFileSync(path.join(ROOT, 'js', file), 'utf8')).join('\n');
assert.ok(!/Paper 3/.test(uiSource),
  'Paper 3 was removed in the 2023 syllabus; data analysis is Paper 1B');

// A question may not be labelled SL when its lesson is HL-only.
const lessonLevel = new Map(fs.readdirSync(path.join(ROOT, 'data', 'lessons'))
  .filter(file => file.endsWith('.json'))
  .map(file => {
    const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lessons', file), 'utf8'));
    return [slugify(path.basename(file, '.json')), lesson.level || ''];
  }));
read('questions.json').forEach(question => {
  (question.lessonReferences || []).forEach(ref => {
    if (/^HL/i.test(lessonLevel.get(ref) || '')) {
      assert.equal(question.level, 'HL',
        `question ${question.id} is ${question.level} but lesson ${ref} is HL-only`);
    }
  });
});

console.log(`counters verified (${actual.lessons} lessons, ${actual.simulations} sims, ${actual.questions} questions, ${actual.formulas} formulae)`);

// ── Formula metadata ─────────────────────────────────────────────────
// The formula centre printed "Not recorded" in every units cell, and read
// only `symbols` while lesson formulas store their table under `variables`,
// so 122 of 131 pages showed no metadata at all. Both are asserted here.
const { unitOf, dimensionOf, calculatorFits } = await import('../js/formulaMeta.js');
const everyFormula = [
  ...read('formulas.json'),
  ...fs.readdirSync(path.join(ROOT, 'data', 'lessons'))
    .filter(file => file.endsWith('.json'))
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lessons', file), 'utf8')).formulas || []),
];

let rowCount = 0;
everyFormula.forEach(item => {
  const table = item.symbols || item.variables || {};
  const entries = Object.entries(table);
  assert.ok(entries.length, `formula "${item.name}" has no variable table`);
  entries.forEach(([key, meaning]) => {
    rowCount += 1;
    const unit = unitOf(meaning);
    assert.ok(unit, `"${item.name}" variable ${key} ("${meaning}") has no parseable unit`);
    assert.ok(dimensionOf(unit), `"${item.name}" variable ${key} has unit "${unit}" with no dimension`);
  });
});

// The SUVAT calculator may only appear on SUVAT formulas. It used to render
// on all 131, which put a v = u + at solver underneath E = mc2.
const calculatorPages = everyFormula.filter(item =>
  calculatorFits({ ...item, symbols: item.symbols || item.variables || {} }));
assert.ok(calculatorPages.length > 0 && calculatorPages.length <= 8,
  `calculator shows on ${calculatorPages.length} formulas; it should be the SUVAT set only`);
calculatorPages.forEach(item => {
  const symbols = Object.keys(item.symbols || item.variables || {});
  symbols.forEach(symbol => assert.ok('vuats'.includes(symbol),
    `calculator offered on "${item.name}", which uses non-SUVAT symbol ${symbol}`));
});

console.log(`formula metadata verified (${everyFormula.length} formulas, ${rowCount} variables, calculator on ${calculatorPages.length})`);
