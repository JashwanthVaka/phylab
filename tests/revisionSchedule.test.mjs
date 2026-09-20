import assert from 'node:assert/strict';
import { scheduleFor, dailyQueue } from '../js/revisionUI.js';

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

const dueCards = Array.from({ length: 24 }, (_, index) => ({
  id: `due-${index}`, isDue: true, due: index, seen: true, lessonSlug: 'kinematics'
}));
const newCards = Array.from({ length: 8 }, (_, index) => ({
  id: `new-${index}`, isDue: false, due: null, seen: false, lessonSlug: 'kinematics'
}));
const firstDay = dailyQueue([...newCards, ...dueCards], ['kinematics'], {}, '2026-09-20');
assert.equal(firstDay.ids.length, 20, 'daily revision must be capped at 20 cards');
assert.deepEqual(firstDay.ids, dueCards.slice(0, 20).map(card => card.id), 'overdue cards must be scheduled before new cards');
firstDay.rated = ['due-0'];
assert.deepEqual(dailyQueue([...newCards, ...dueCards], ['kinematics'], firstDay, '2026-09-20'), firstDay,
  'the same day must keep a stable queue and its reviewed state');
const nextDay = dailyQueue([...newCards, ...dueCards], ['kinematics'], firstDay, '2026-09-21');
assert.equal(nextDay.rated.length, 0, 'a new day starts a fresh rating session');

console.log('revision schedule tests passed (new, due and scheduled remain distinct; daily queue capped and stable)');
