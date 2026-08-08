const assert = require('node:assert/strict');
const { createRetrievalEngine } = require('../server/retrievalEngine.cjs');

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
