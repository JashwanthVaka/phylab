import assert from 'node:assert/strict';

const values = new Map();
const storage = {
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] ?? null; },
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

globalThis.localStorage = storage;
const { storageFor } = await import('../js/services/learningStorage.js');
const guest = storageFor(null, storage);
const learnerA = storageFor('learner-a', storage);
const learnerB = storageFor('learner-b', storage);

guest.setItem('progress', 'guest');
learnerA.setItem('progress', 'A');
learnerB.setItem('progress', 'B');

assert.equal(guest.getItem('progress'), 'guest');
assert.equal(learnerA.getItem('progress'), 'A');
assert.equal(learnerB.getItem('progress'), 'B');
assert.deepEqual([...Array(guest.length)].map((_, i) => guest.key(i)), ['progress']);
assert.deepEqual([...Array(learnerA.length)].map((_, i) => learnerA.key(i)), ['progress']);

learnerA.removeItem('progress');
assert.equal(learnerA.getItem('progress'), null);
assert.equal(learnerB.getItem('progress'), 'B', 'clearing one account must not touch another account');
assert.equal(guest.getItem('progress'), 'guest', 'account cleanup must not delete guest work');

console.log('learning storage tests passed (guest and account caches are isolated)');
