import { escapeHTML } from './utils.js';
import { learningStorage as localStorage } from './services/learningStorage.js';

const KEY = 'kinetiq_notebook_v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = rows => localStorage.setItem(KEY, JSON.stringify(rows));
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export function saveNotebookItem(item) {
  const rows = read();
  rows.unshift({ id: id(), createdAt: new Date().toISOString(), type: 'note', topic: '', title: '', body: '', back: '', ...item });
  write(rows);
  return rows[0];
}

export function notebookPage() {
  const rows = read();
  return `<section class="page notebook-page">
    <p class="eyebrow">PERSONAL NOTEBOOK</p><h1>Keep the physics you want to remember.</h1>
    <p class="page-lead">Notes, lesson highlights and your own flashcards stay inside your personal KINETIQ workspace. They are never visible to teachers or other learners.</p>
    <form class="content-card notebook-form" data-notebook-form>
      <label>Type<select name="type"><option value="note">Note</option><option value="highlight">Highlight</option><option value="flashcard">Personal flashcard</option></select></label>
      <label>Topic<input name="topic" maxlength="100" placeholder="For example: Kinematics"></label>
      <label>Title or front of card<input name="title" required maxlength="180" placeholder="What do you want to remember?"></label>
      <label>Note or highlighted text<textarea name="body" rows="5" required maxlength="4000"></textarea></label>
      <label data-card-back>Back of flashcard (optional)<textarea name="back" rows="3" maxlength="2000"></textarea></label>
      <button class="button" type="submit">Save to notebook</button><p class="muted" role="status" data-notebook-status></p>
    </form>
    <section class="lesson-section"><div class="section-title"><p class="eyebrow">SAVED</p><h2>${rows.length} item${rows.length === 1 ? '' : 's'}</h2></div>
      <div class="notebook-grid" data-notebook-list>${rows.length ? rows.map(row => `<article class="content-card notebook-item" data-note="${escapeHTML(row.id)}"><span class="tag">${escapeHTML(row.type)}${row.topic ? ` · ${escapeHTML(row.topic)}` : ''}</span><h3>${escapeHTML(row.title)}</h3><p>${escapeHTML(row.body)}</p>${row.back ? `<details><summary>Reveal answer</summary><p>${escapeHTML(row.back)}</p></details>` : ''}<footer><small>${new Date(row.createdAt).toLocaleDateString()}</small><button class="text-button" type="button" data-delete-note>Delete</button></footer></article>`).join('') : '<div class="empty-state"><h3>Your notebook is empty</h3><p>Create a note here, or select text inside a lesson and save it as a highlight.</p></div>'}</div>
    </section>
  </section>`;
}

export function bindNotebook() {
  const page = document.querySelector('.notebook-page');
  if (!page) return;
  page.querySelector('[data-notebook-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    saveNotebookItem(data);
    page.querySelector('[data-notebook-status]').textContent = 'Saved in your personal notebook.';
    setTimeout(() => location.reload(), 350);
  });
  page.addEventListener('click', event => {
    const button = event.target.closest('[data-delete-note]');
    if (!button) return;
    const note = button.closest('[data-note]');
    write(read().filter(row => row.id !== note.dataset.note));
    note.remove();
  });
}

export function bindLessonHighlights() {
  const lesson = document.querySelector('.lesson-page');
  if (!lesson) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'selection-save glass'; button.textContent = 'Save highlight'; button.hidden = true;
  document.body.append(button);
  let selected = '';
  const controller = new AbortController();
  lesson.addEventListener('mouseup', () => {
    selected = String(getSelection()?.toString() || '').trim().slice(0, 1200);
    if (selected.length < 8) { button.hidden = true; return; }
    const range = getSelection().getRangeAt(0).getBoundingClientRect();
    button.style.left = `${Math.min(innerWidth - 150, Math.max(12, range.left))}px`;
    button.style.top = `${Math.max(80, range.top - 52)}px`; button.hidden = false;
  }, { signal: controller.signal });
  button.addEventListener('click', () => {
    saveNotebookItem({ type: 'highlight', topic: lesson.querySelector('.lesson-hero h1')?.textContent || '', title: 'Lesson highlight', body: selected });
    button.textContent = 'Saved ✓'; setTimeout(() => { button.hidden = true; button.textContent = 'Save highlight'; }, 900);
  }, { signal: controller.signal });
  return () => { controller.abort(); button.remove(); };
}
