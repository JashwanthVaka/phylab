import assert from 'node:assert/strict';
import { scheduleFor } from '../js/revisionUI.js';

const lessons = [{
  slug: 'kinematics',
  title: 'A.1 Kinematics',
  definitions: [{ term: 'Velocity', meaning: 'Rate of change of displacement.' }],
  formulas: [{ name: 'Acceleration', formula: 'a = Δv/Δt' }]
}];

const now = 1_800_000_000_000;
const fresh = scheduleFor(lessons, {}, now);
assert.equal(fresh.length, 2);
assert.ok(fresh.every(card => !card.seen));
assert.ok(fresh.every(card => !card.isDue), 'unseen cards must not be reported as overdue');

const state = {
  [fresh[0].id]: { interval: 1, due: now - 1 },
  [fresh[1].id]: { interval: 7, due: now + 10_000 }
};
const scheduled = scheduleFor(lessons, state, now);
assert.equal(scheduled[0].isDue, true);
assert.equal(scheduled[1].isDue, false);
assert.ok(scheduled.every(card => card.seen));

console.log('revision schedule tests passed (new, due and scheduled remain distinct)');
