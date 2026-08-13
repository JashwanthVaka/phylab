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
assert.equal(simulationSlugs.size, 10, 'expected ten simulations in simulationStudio.js');
const simulationCatalogue = read('simulations.json');
assert.deepEqual(
  simulationCatalogue.map(item => item.slug).sort(),
  [...simulationSlugs].sort(),
  'data/simulations.json has drifted from the simulations implemented in js/simulationStudio.js'
);
simulationCatalogue.forEach(item => assert.ok(item.name && item.topic && item.description && item.variables?.length, `simulation ${item.slug} is missing a field`));

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
