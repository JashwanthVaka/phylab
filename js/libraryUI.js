import { escapeHTML, orderLessons } from './utils.js';
import { progressService } from './services/progressService.js';

const STATUSES = [['', 'All lessons'], ['todo', 'Not started'], ['done', 'Completed']];

const unitOf = lesson => lesson.unit || (String(lesson.title).match(/^\s*([A-Z])\./) || [])[1] || '';
const lessonNumber = lesson => (String(lesson.title).match(/^\s*([A-Z]\.\d+)/) || [])[1] || '';
const lessonName = lesson => String(lesson.title).replace(/^\s*[A-Z]\.\d+\s*/, '') || lesson.title;

function lessonResources(lesson, index) {
  const questions = (index.questions || []).filter(question => question.topic === lesson.topicLabel).length;
  const simulation = (index.simulations || []).find(item => item.lesson === lesson.slug);
  return {
    questions,
    simulation,
    flashcards: Number(lesson.definitionCount || 0) + Number(lesson.formulaCount || 0),
  };
}

function lessonCard(lesson, completed, index) {
  const done = completed.includes(lesson.slug);
  const objectives = lesson.learning_objectives || [];
  const resources = lessonResources(lesson, index);
  const searchable = `${lesson.title} ${lesson.summary || ''} ${(lesson.tags || []).join(' ')} ${objectives.join(' ')}`;
  return `<article class="library-card ${done ? 'is-complete' : ''}" data-library-card data-slug="${escapeHTML(lesson.slug)}" data-unit="${escapeHTML(unitOf(lesson))}" data-level="${escapeHTML(lesson.level || '')}" data-status="${done ? 'done' : 'todo'}" data-text="${escapeHTML(searchable.toLowerCase())}">
    <header class="library-card__head">
      <span class="library-card__number">${escapeHTML(lessonNumber(lesson))}</span>
      <span class="library-card__level">${escapeHTML(lesson.level || 'SL + HL')}</span>
    </header>
    <h3><a href="/lesson/${escapeHTML(lesson.slug)}" data-route>${escapeHTML(lessonName(lesson))}</a></h3>
    <p class="library-card__summary">${escapeHTML(lesson.summary || 'Open this lesson to begin learning.')}</p>
    ${(lesson.tags || []).length ? `<ul class="library-tags">${lesson.tags.map(tag => `<li>${escapeHTML(tag)}</li>`).join('')}</ul>` : ''}
    <div class="library-card__resources" aria-label="Resources for ${escapeHTML(lessonName(lesson))}">
      <a href="/lesson/${escapeHTML(lesson.slug)}#concepts" data-route><b>${objectives.length}</b><span>outcomes</span></a>
      <a href="/lesson/${escapeHTML(lesson.slug)}#flashcards" data-route><b>${resources.flashcards}</b><span>recall cards</span></a>
      <a href="/quiz?mode=Topic%20Quiz&topic=${encodeURIComponent(lesson.topicLabel)}" data-route><b>${resources.questions}</b><span>questions</span></a>
      ${resources.simulation
        ? `<a href="/simulations/${escapeHTML(resources.simulation.slug)}" data-route><b aria-hidden="true">↗</b><span>interactive lab</span></a>`
        : '<span class="is-unavailable"><b aria-hidden="true">·</b><span>lesson model</span></span>'}
    </div>
    ${objectives.length ? `<details class="library-card__contents">
      <summary>What you will learn</summary>
      <ul>${objectives.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
    </details>` : ''}
    <footer class="library-card__foot">
      <span class="library-card__meta">${Number(lesson.estimatedStudyTime) || 30} min${done ? ' · Completed' : ''}</span>
      <span class="library-card__actions"><a href="/lesson/${escapeHTML(lesson.slug)}" data-route>Open lesson</a><button type="button" class="text-button" data-toggle-complete="${escapeHTML(lesson.slug)}" aria-pressed="${done}">${done ? 'Completed ✓' : 'Mark complete'}</button></span>
    </footer>
  </article>`;
}

function unitSection(unit, lessons, completed, index) {
  const done = lessons.filter(lesson => completed.includes(lesson.slug)).length;
  return `<section class="library-unit" id="unit-${escapeHTML(unit.id)}" data-unit-section="${escapeHTML(unit.id)}">
    <header class="library-unit__head">
      <div>
        <p class="eyebrow">UNIT ${escapeHTML(unit.id)}</p>
        <h2>${escapeHTML(unit.title)}</h2>
        <p class="library-unit__summary">${escapeHTML(unit.summary)}</p>
      </div>
      <div class="library-unit__progress" data-unit-progress="${escapeHTML(unit.id)}">
        <b>${done}/${lessons.length}</b>
        <span>lessons complete</span>
      </div>
    </header>
    ${(unit.skills || []).length ? `<ul class="library-tags library-tags--skills">${unit.skills.map(skill => `<li>${escapeHTML(skill)}</li>`).join('')}</ul>` : ''}
    <div class="library-grid">${lessons.map(lesson => lessonCard(lesson, completed, index)).join('')}</div>
    <p class="library-empty" data-unit-empty hidden>No lessons in this unit match your filters.</p>
  </section>`;
}

/** Course library: syllabus-ordered lessons grouped by unit, with filters and real completion state. */
export function libraryPage(index, state) {
  const lessons = orderLessons(index.lessonIndex);
  const units = index.units || [];
  const completed = state.completed;
  const percentage = lessons.length ? Math.round(completed.filter(slug => lessons.some(lesson => lesson.slug === slug)).length / lessons.length * 100) : 0;
  const next = lessons.find(lesson => !completed.includes(lesson.slug));
  const known = new Set(units.map(unit => unit.id));
  const ungrouped = lessons.filter(lesson => !known.has(unitOf(lesson)));
  const totalFlashcards = lessons.reduce((total, lesson) => total + Number(lesson.definitionCount || 0) + Number(lesson.formulaCount || 0), 0);

  return `<section class="page library-page">
    <p class="eyebrow">COURSE LIBRARY</p>
    <h1>Work through the whole course.</h1>
    <p class="page-lead">All ${lessons.length} lessons in syllabus order, grouped into the five course units. Your completion is ${state.guest ? 'saved on this device' : 'saved to your account'}.</p>

    <div class="library-summary">
      <div class="library-summary__ring" role="img" aria-label="${percentage} percent of lessons complete"><b>${percentage}%</b></div>
      <div>
        <p class="library-summary__count"><b>${completed.filter(slug => lessons.some(lesson => lesson.slug === slug)).length}</b> of <b>${lessons.length}</b> lessons complete</p>
        ${next
          ? `<a class="button" href="/lesson/${escapeHTML(next.slug)}" data-route>Continue with ${escapeHTML(next.title)} →</a>`
          : '<p class="library-summary__done">Every lesson is complete. Move on to case practice or exam preparation.</p>'}
      </div>
    </div>

    <nav class="library-resource-switcher" aria-label="Course resource types">
      ${[
        ['/library', 'Course notes', `${lessons.length} syllabus lessons`, 'notes'],
        ['/revision', 'Active recall', `${totalFlashcards} lesson flashcards`, 'recall'],
        ['/quiz?mode=Mixed%20Quiz', 'Topic practice', `${(index.questions || []).length} original questions`, 'practice'],
        ['/simulations', 'Interactive labs', `${(index.simulations || []).length} equation-driven models`, 'lab'],
      ].map(([href, title, detail, kind]) => `<a href="${href}" data-route>
        <span class="resource-folder resource-folder--${kind}" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><b>${title}</b><small>${detail}</small></span>
      </a>`).join('')}
    </nav>

    <div class="library-controls">
      <label class="search library-search"><span>⌕</span><input id="libraryFilterSearch" type="search" autocomplete="off" placeholder="Search lessons, concepts, tags…" aria-label="Filter lessons"></label>
      <div class="library-chips" role="group" aria-label="Filter by unit">
        <button type="button" class="chip is-active" data-filter-unit="">All units</button>
        ${units.map(unit => `<button type="button" class="chip" data-filter-unit="${escapeHTML(unit.id)}">${escapeHTML(unit.id)}. ${escapeHTML(unit.title)}</button>`).join('')}
      </div>
      <div class="library-selects">
        <label>Status <select data-filter-status>${STATUSES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
        <span class="library-note">Five lessons are Higher Level only. The rest cover both, each with its own HL extension section.</span>
      </div>
    </div>
    <p class="library-count" data-library-count aria-live="polite"></p>

    ${units.map(unit => unitSection(unit, lessons.filter(lesson => unitOf(lesson) === unit.id), completed, index)).join('')}
    ${ungrouped.length ? unitSection({ id: 'other', title: 'Further lessons', summary: 'Lessons that sit outside the five named units.' }, ungrouped, completed, index) : ''}
  </section>`;
}

/** Loads the completion state the page needs, from the cloud when signed in. */
export const libraryState = () => progressService.list();

export function bindLibrary() {
  const page = document.querySelector('.library-page');
  if (!page) return undefined;
  const cards = [...page.querySelectorAll('[data-library-card]')];
  const countLabel = page.querySelector('[data-library-count]');
  const search = page.querySelector('#libraryFilterSearch');
  const controller = new AbortController();
  const filters = { unit: '', status: '', text: '' };

  const applyFilters = () => {
    let visible = 0;
    cards.forEach(card => {
      const show = (!filters.unit || card.dataset.unit === filters.unit)
        && (!filters.status || card.dataset.status === filters.status)
        && (!filters.text || card.dataset.text.includes(filters.text));
      card.hidden = !show;
      if (show) visible += 1;
    });
    page.querySelectorAll('[data-unit-section]').forEach(unit => {
      const unitCards = [...unit.querySelectorAll('[data-library-card]')];
      const anyVisible = unitCards.some(card => !card.hidden);
      unit.hidden = Boolean(filters.unit) && unit.dataset.unitSection !== filters.unit;
      unit.querySelector('[data-unit-empty]').hidden = anyVisible || unit.hidden;
    });
    countLabel.textContent = visible === cards.length
      ? `Showing all ${cards.length} lessons.`
      : `Showing ${visible} of ${cards.length} lessons.`;
  };

  const refreshUnitTotals = () => {
    page.querySelectorAll('[data-unit-progress]').forEach(holder => {
      const unit = holder.dataset.unitProgress;
      const unitCards = [...page.querySelectorAll(`[data-library-card][data-unit="${unit}"]`)];
      holder.querySelector('b').textContent = `${unitCards.filter(card => card.dataset.status === 'done').length}/${unitCards.length}`;
    });
    const done = cards.filter(card => card.dataset.status === 'done').length;
    const ring = page.querySelector('.library-summary__ring');
    const percentage = cards.length ? Math.round(done / cards.length * 100) : 0;
    ring.querySelector('b').textContent = `${percentage}%`;
    ring.setAttribute('aria-label', `${percentage} percent of lessons complete`);
    page.querySelector('.library-summary__count').innerHTML = `<b>${done}</b> of <b>${cards.length}</b> lessons complete`;
  };

  search.addEventListener('input', () => { filters.text = search.value.trim().toLowerCase(); applyFilters(); }, { signal: controller.signal });
  page.querySelectorAll('[data-filter-unit]').forEach(button => button.addEventListener('click', () => {
    filters.unit = button.dataset.filterUnit;
    page.querySelectorAll('[data-filter-unit]').forEach(other => other.classList.toggle('is-active', other === button));
    applyFilters();
  }, { signal: controller.signal }));
  page.querySelector('[data-filter-status]').addEventListener('change', event => { filters.status = event.target.value; applyFilters(); }, { signal: controller.signal });

  page.addEventListener('click', async event => {
    const button = event.target.closest('[data-toggle-complete]');
    if (!button) return;
    const slug = button.dataset.toggleComplete;
    const card = page.querySelector(`[data-library-card][data-slug="${slug}"]`);
    const wasDone = card.dataset.status === 'done';
    button.disabled = true;
    try {
      const result = wasDone ? await progressService.clear(slug) : await progressService.complete(slug);
      const done = result.completed.includes(slug);
      card.dataset.status = done ? 'done' : 'todo';
      card.classList.toggle('is-complete', done);
      button.textContent = done ? 'Completed ✓' : 'Mark complete';
      button.setAttribute('aria-pressed', String(done));
      refreshUnitTotals();
      applyFilters();
    } catch (error) {
      console.warn('KINETIQ could not save that completion.', error);
      button.textContent = 'Could not save. Retry';
    } finally {
      button.disabled = false;
    }
  }, { signal: controller.signal });

  applyFilters();
  return () => controller.abort();
}
