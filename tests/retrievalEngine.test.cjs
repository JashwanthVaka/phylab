const assert = require('node:assert/strict');
const { createRetrievalEngine, buildRecords } = require('../server/retrievalEngine.cjs');

(async () => {
  const engine = createRetrievalEngine(async () => ({
    lessons: [{ slug: 'kinematics', title: 'Kinematics', topicLabel: 'Mechanics', level: 'SL', summary: 'Motion, velocity and acceleration.', definitions: [{ term: 'Velocity', meaning: 'Rate of displacement.' }], formulas: [{ name: 'SUVAT', formula: 'v = u + at', explanation: 'Constant acceleration.' }], worked_examples: [{ question: 'Find velocity.', answer: '20 m s−1' }], constants: [] }],
    formulas: [], examples: [], glossary: [{ term: 'Acceleration', meaning: 'Rate of change of velocity.' }], questions: [{ topic: 'Kinematics', question: 'A car accelerates.', answer: '20 m s−1' }], simulations: [{ name: 'Projectile Motion Simulator', topic: 'Mechanics', description: 'Explore projectile motion.' }]
  }));
  const velocity = await engine.retrieve('Explain velocity', { lesson_slug: 'kinematics' });
  assert.ok(velocity.some(item => item.type === 'Definition' && item.title === 'Velocity'));
  const projectile = await engine.retrieve('projectile motion graph');
  assert.ok(projectile.some(item => item.type === 'Simulation'));
  assert.ok(await engine.size() >= 6);
  console.log('retrieval engine tests passed');
})().catch(error => { console.error(error); process.exit(1); });

// ── Cited links must resolve to a real page ──────────────────────────
// Formulas carry no slug of their own, so `/formulas/${item.slug}` collapsed
// to `/formulas/` and every formula KIT cited linked to the index instead of
// to that formula. Nothing checked the hrefs, so it went unnoticed.
{
  const fsMod = require('node:fs');
  const pathMod = require('node:path');
  const root = pathMod.join(__dirname, '..');
  const readJSON = name => JSON.parse(fsMod.readFileSync(pathMod.join(root, 'data', name), 'utf8'));

  const lessonFiles = fsMod.readdirSync(pathMod.join(root, 'data', 'lessons')).filter(f => f.endsWith('.json'));
  const lessonSlugs = new Set(lessonFiles.map(f => pathMod.basename(f, '.json').replace(/_/g, '-')));
  const simulations = readJSON('simulations.json');
  const simSlugs = new Set(simulations.map(item => item.slug));

  // The formula centre derives a slug from the name; retrieval must match it.
  const centreSlug = name => String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const formulas = [
    ...readJSON('formulas.json'),
    ...lessonFiles.flatMap(f => JSON.parse(fsMod.readFileSync(pathMod.join(root, 'data', 'lessons', f), 'utf8')).formulas || []),
  ];
  const formulaSlugs = new Set(formulas.map(item => centreSlug(item.name)));

  const records = buildRecords({
    formulas: readJSON('formulas.json'),
    simulations,
    lessons: [], examples: [], glossary: [], questions: [],
  });

  const bad = [];
  records.forEach(item => {
    const href = item.href || '';
    if (/^\/formulas\/?$/.test(href) && item.type === 'Formula') {
      bad.push(`${item.title} links to the formula index, not to itself`);
      return;
    }
    const formula = /^\/formulas\/(.+)$/.exec(href);
    if (formula && !formulaSlugs.has(formula[1])) bad.push(`${item.title} -> ${href} matches no formula`);
    const sim = /^\/simulations\/(.+)$/.exec(href);
    if (sim && !simSlugs.has(sim[1])) bad.push(`${item.title} -> ${href} matches no simulation`);
    const lesson = /^\/lesson\/(.+)$/.exec(href);
    if (lesson && !lessonSlugs.has(lesson[1])) bad.push(`${item.title} -> ${href} matches no lesson`);
  });

  assert.deepEqual(bad, [], `retrieval cites links that do not resolve:\n  ${bad.join('\n  ')}`);

  const formulaRecords = records.filter(item => item.type === 'Formula');
  assert.ok(formulaRecords.length, 'expected formula records');
  assert.ok(formulaRecords.every(item => /^\/formulas\/.+/.test(item.href)),
    'every formula must deep-link to its own page');

  console.log(`cited links verified (${records.length} records, all hrefs resolve)`);
}
