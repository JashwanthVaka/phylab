import assert from 'node:assert/strict';
import { accountRows } from '../js/services/accountRows.js';

const records = Array.from({ length: 1250 }, (_, index) => ({
  id: String(index).padStart(4, '0'), user_id: index % 2 ? 'learner-a' : 'learner-b',
  created_at: new Date(1_700_000_000_000 + index).toISOString()
}));

const db = {
  from() {
    const query = {
      selected: '*', user: null,
      select(columns) { this.selected = columns; return this; },
      eq(_column, value) { this.user = value; return this; },
      order() { return this; },
      range(from, to) {
        const data = records.filter(row => row.user_id === this.user).slice(from, to + 1);
        return Promise.resolve({ data, error: null });
      }
    };
    return query;
  }
};

const rows = await accountRows(db, 'question_attempts', 'learner-a');
assert.equal(rows.length, 625, 'pagination must load beyond a single 500-row page');
assert.ok(rows.every(row => row.user_id === 'learner-a'), 'every page must remain scoped to one learner');
assert.equal(new Set(rows.map(row => row.id)).size, rows.length);

console.log('account row tests passed (pagination and user scoping)');
