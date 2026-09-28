import assert from 'node:assert/strict';
import test from 'node:test';
import { studyRhythm } from '../js/learnerUI.js';

test('study rhythm counts unique active days and preserves rest days', () => {
  const now = new Date('2026-09-28T12:00:00Z').getTime();
  const rhythm = studyRhythm([
    { at: '2026-09-28T08:00:00Z' },
    { at: '2026-09-28T10:00:00Z' },
    { at: '2026-09-26T18:00:00Z' },
    { at: '2026-09-20T18:00:00Z' },
    { at: 'not-a-date' },
  ], now);
  assert.deepEqual(rhythm, { activeDays: 2, restDays: 5 });
});

test('study rhythm is empty without recorded activity', () => {
  assert.deepEqual(studyRhythm([], new Date('2026-09-28T12:00:00Z').getTime()), { activeDays: 0, restDays: 7 });
});
