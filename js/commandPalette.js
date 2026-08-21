/**
 * ⌘K command palette.
 *
 * With 26 lessons, 131 formulas, 19 cases and 26 simulations, hunting through
 * navigation is the slow path. This opens on ⌘K (Ctrl+K elsewhere) or "/" and
 * jumps straight to anything.
 *
 * The index is built once from the content API the app has already loaded, so
 * opening the palette costs nothing and typing never hits the network.
 */

import { escapeHTML } from './utils.js';

const PAGES = [
  ['Ask a question', '/ask', 'Page'],
  ['Course library', '/library', 'Page'],
  ['Simulation lab', '/simulations', 'Page'],
  ['Applied cases', '/cases', 'Page'],
  ['Active toolkit', '/toolkit', 'Page'],
  ['Data lab', '/data', 'Page'],
  ['IA workspace', '/ia', 'Page'],
  ['Exam preparation', '/exam-prep', 'Page'],
  ['Mistake bank', '/mistakes', 'Page'],
  ['Revision planner', '/revision', 'Page'],
  ['Formula centre', '/formulas', 'Page'],
  ['Question patterns', '/patterns', 'Page'],
  ['Source library', '/resources', 'Page'],
  ['Progress', '/progress', 'Page'],
  ['Ask KIT', '/ai', 'Page'],
];

let items = [];
let indexed = false;
let root = null;
let input = null;
let list = null;
let active = 0;
let results = [];

/** Builds the searchable index from content the app already has in memory. */
export function indexContent(content = {}) {
  items = PAGES.map(([title, href, kind]) => ({ title, href, kind, sub: '' }));

  (content.lessonIndex || []).forEach(lesson => {
    items.push({
      title: lesson.title,
      href: `/lesson/${lesson.slug}`,
      kind: 'Lesson',
      sub: lesson.level || '',
    });
  });

  (content.formulas || []).forEach(formula => {
    if (!formula?.name) return;
    items.push({
      title: formula.name,
      href: '/formulas',
      kind: 'Formula',
      sub: formula.formula || formula.expression || '',
    });
  });

  (content.cases || []).forEach(item => {
    items.push({ title: item.title, href: `/cases/${item.slug}`, kind: 'Case', sub: `Unit ${item.unit}` });
  });

  (content.simulations || []).forEach(sim => {
    const slug = sim.slug || sim.id;
    if (!slug) return;
    items.push({ title: sim.name || sim.title || slug, href: `/simulations/${slug}`, kind: 'Lab', sub: '' });
  });

  indexed = items.length > PAGES.length;
}

/** Subsequence match, so "curcir" still finds "Current and Circuits". */
function score(query, text) {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return 0;
  const direct = haystack.indexOf(needle);
  if (direct === 0) return 1000;
  if (direct > 0) return 600 - direct;
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i === needle.length) return 200;
  }
  return -1;
}

function search(query) {
  if (!query.trim()) {
    return items.filter(item => item.kind === 'Page').slice(0, 8);
  }
  return items
    .map(item => ({ item, s: Math.max(score(query, item.title), score(query, item.sub) - 100) }))
    .filter(entry => entry.s > -1)
    .sort((a, b) => b.s - a.s)
    .slice(0, 12)
    .map(entry => entry.item);
}

function render() {
  if (!list) return;
  list.innerHTML = results.length
    ? results.map((item, i) => `
        <li role="option" aria-selected="${i === active}" class="${i === active ? 'is-active' : ''}">
          <a href="${escapeHTML(item.href)}" data-route tabindex="-1">
            <span class="cmdk__kind">${escapeHTML(item.kind)}</span>
            <span class="cmdk__title">${escapeHTML(item.title)}</span>
            ${item.sub ? `<span class="cmdk__sub">${escapeHTML(item.sub)}</span>` : ''}
          </a>
        </li>`).join('')
    : '<li class="cmdk__empty">No match. Try a lesson name, a formula, or a unit.</li>';
}

function build() {
  root = document.createElement('div');
  root.className = 'cmdk';
  root.hidden = true;
  root.innerHTML = `
    <div class="cmdk__scrim" data-cmdk-close></div>
    <div class="cmdk__panel glass" role="dialog" aria-modal="true" aria-label="Search KINETIQ">
      <div class="cmdk__field">
        <span aria-hidden="true">⌕</span>
        <input type="text" id="cmdkInput" autocomplete="off" spellcheck="false"
               placeholder="Search lessons, formulae, cases, labs…" aria-controls="cmdkList">
        <kbd>esc</kbd>
      </div>
      <ul class="cmdk__list" id="cmdkList" role="listbox" aria-label="Results"></ul>
    </div>`;
  document.body.appendChild(root);
  input = root.querySelector('#cmdkInput');
  list = root.querySelector('#cmdkList');

  input.addEventListener('input', () => { results = search(input.value); active = 0; render(); });
  root.querySelector('[data-cmdk-close]').addEventListener('click', close);
  list.addEventListener('click', event => { if (event.target.closest('a')) close(); });
}

function open() {
  if (!root) build();
  root.hidden = false;
  document.body.style.overflow = 'hidden';
  input.value = '';
  results = search('');
  active = 0;
  render();
  requestAnimationFrame(() => input.focus());
}

function close() {
  if (!root) return;
  root.hidden = true;
  document.body.style.overflow = '';
}

function move(delta) {
  if (!results.length) return;
  active = (active + delta + results.length) % results.length;
  render();
  list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
}

document.addEventListener('keydown', event => {
  const open_ = root && !root.hidden;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    open_ ? close() : open();
    return;
  }
  // "/" is the second convention for search, but never while typing.
  if (event.key === '/' && !typing && !open_) {
    event.preventDefault();
    open();
    return;
  }
  if (!open_) return;

  if (event.key === 'Escape') { event.preventDefault(); close(); }
  else if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
  else if (event.key === 'Enter') {
    event.preventDefault();
    const link = list.querySelectorAll('a')[active];
    if (link) { close(); link.click(); }
  }
});

export const paletteReady = () => indexed;
