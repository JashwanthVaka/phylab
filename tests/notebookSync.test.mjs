import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const { decodeNotebookRow } = await import('../js/services/notebookService.js');

const note = {
  id: 'note-1', createdAt: '2026-09-26T00:00:00.000Z', type: 'flashcard',
  topic: 'Kinematics', title: 'What is acceleration?', body: '', back: 'Rate of change of velocity.'
};
const decoded = decodeNotebookRow({
  content_type: 'notebook', content_key: 'note-1', note: JSON.stringify(note), created_at: note.createdAt
});
assert.deepEqual(decoded, note, 'a private notebook bookmark must round-trip without losing flashcard fields');
assert.equal(decodeNotebookRow({ content_type: 'lesson', note: JSON.stringify(note) }), null,
  'ordinary bookmarks must never enter the notebook');
assert.equal(decodeNotebookRow({ content_type: 'notebook', note: 'not json' }), null,
  'an unreadable remote row must not break the notebook');

const service = fs.readFileSync(path.join(root, 'js/services/notebookService.js'), 'utf8');
assert.match(service, /\.eq\('user_id', current\.user\.id\)/,
  'notebook reads and deletes must be explicitly scoped to the signed-in account in addition to RLS');
assert.match(service, /content_type: TYPE/);
assert.match(service, /storageFor\(null\)/, 'guest notes need a deliberate sign-in migration');

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert.match(app, /notebookService\.migrateLocal\(\)/,
  'the OAuth completion flow must move the guest notebook into the new account');
assert.match(app, /notebookService\.restore\(\)/,
  'notebook and personal flashcards must restore before their pages render');

const bookmarkService = fs.readFileSync(path.join(root, 'js/services/bookmarkService.js'), 'utf8');
assert.match(bookmarkService, /content_type!==['"]notebook['"]/,
  'private notebook transport rows must not appear as ordinary bookmarks');

console.log('notebook sync tests passed (account scope, migration, restore and bookmark separation)');
