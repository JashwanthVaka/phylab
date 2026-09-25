import { escapeHTML } from './utils.js';

/**
 * Counts in prose drift. "Ten labs" sat on this page while the studio grew to
 * 26, because a spelled-out number survives every numeric check.
 *
 * So resource copy writes {{simulations}} instead of a number, and the count is
 * resolved here from the same index the rest of the app renders from. There is
 * one source of truth, and tests/content.test.mjs fails if any token has no
 * matching value.
 */
const countTokens = index => ({
  lessons: (index.lessonIndex || []).length,
  simulations: (index.simulations || []).length,
  formulas: (index.formulas || []).length,
  questions: (index.questions || []).length,
  cases: (index.cases || []).length,
});

export const fillCounts = (text, index) =>
  String(text ?? '').replace(/\{\{(\w+)\}\}/g, (whole, key) => {
    const value = countTokens(index)[key];
    return value === undefined ? whole : String(value);
  });

const linkFor = item => {
  if (item.route) return `<a class="text-button" href="${escapeHTML(item.route)}" data-route>Open →</a>`;
  if (item.url) return `<a class="text-button" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Visit site ↗</a>`;
  return '<span class="resource-note">Obtain through your school</span>';
};

const provenance = item => ({
  internal: 'Original KINETIQ material',
  external: 'External reference',
  note: 'Licensed source required'
})[item.kind] || 'Resource information';

/** Source library. Links and KINETIQ-generated material only — no copyrighted files are hosted. */
export function resourcesPage(index) {
  const groups = index.resources || [];
  if (!groups.length) return '<section class="page"><p class="eyebrow">SOURCE LIBRARY</p><h1>Resources unavailable.</h1><div class="empty-state"><h3>No resources loaded</h3><p>The resource content could not be read from the server.</p></div></section>';
  const lessons = index.lessonIndex || [];
  const questions = index.questions || [];
  const units = index.units || [];
  const coverage = units.map(unit => {
    const unitLessons = lessons.filter(lesson => lesson.unit === unit.id);
    const topicNames = new Set(unitLessons.map(lesson => lesson.topicLabel));
    return { ...unit, lessons: unitLessons.length, questions: questions.filter(question => topicNames.has(question.topic)).length };
  });
  return `<section class="page resources-page">
    <p class="eyebrow">SOURCE LIBRARY</p>
    <h1>Everything you can study from.</h1>
    <p class="page-lead">KINETIQ’s own reference material and tools, plus links to freely published external sources.</p>
    <p class="practice-note"><b>On copyright.</b> KINETIQ does not host or redistribute the IB data booklet, past papers, mark schemes or coursebooks. Those are copyrighted. Use the licensed copies your school provides.</p>

    <div class="resource-stats" aria-label="KINETIQ resource totals">
      <article><b>${lessons.length}</b><span>lesson notes</span></article>
      <article><b>${(index.simulations || []).length}</b><span>interactive labs</span></article>
      <article><b>${questions.length}</b><span>original questions</span></article>
      <article><b>${(index.formulas || []).length}</b><span>formula records</span></article>
    </div>

    <section class="lesson-section resource-cycle">
      <div class="section-title"><p class="eyebrow">HOW TO USE KINETIQ</p><h2>One connected study cycle.</h2></div>
      <p class="muted">Reading is only the first step. Move through the four stages, then let your scored evidence choose the next topic.</p>
      <ol class="resource-cycle__steps">
        <li><span>01</span><div><b>Understand</b><p>Read the topic notes, examples and formula meanings.</p><a href="/library" data-route>Course library →</a></div></li>
        <li><span>02</span><div><b>Recall</b><p>Use the capped daily flashcard session for active recall.</p><a href="/revision" data-route>Revision queue →</a></div></li>
        <li><span>03</span><div><b>Apply</b><p>Build a target test by topic, difficulty, level and time.</p><a href="/quiz?mode=Mixed%20Quiz" data-route>Target-test builder →</a></div></li>
        <li><span>04</span><div><b>Improve</b><p>Use missed criteria, strengths and weaknesses to choose the next action.</p><a href="/progress" data-route>Learning workspace →</a></div></li>
      </ol>
    </section>

    <section class="lesson-section resource-coverage">
      <div class="section-title"><p class="eyebrow">SPECIFICATION COVERAGE</p><h2>Resources by unit</h2></div>
      <div class="resource-coverage__grid">${coverage.map(unit => `<a href="/library#unit-${escapeHTML(unit.id)}" data-route data-unit="${escapeHTML(unit.id)}">
        <span>Unit ${escapeHTML(unit.id)}</span><b>${escapeHTML(unit.title)}</b><small>${unit.lessons} lessons · ${unit.questions} questions</small>
      </a>`).join('')}</div>
      <div class="offline-packs">
        <div><h3>Offline lesson packs</h3><p class="muted">Save one unit’s original KINETIQ lessons to this browser. Account data and KIT answers are never placed in the shared offline cache.</p></div>
        <div class="offline-packs__actions">${units.map(unit => `<button class="outline" type="button" data-offline-pack="${escapeHTML(unit.id)}" data-offline-lessons="${lessons.filter(lesson => lesson.unit === unit.id).map(lesson => escapeHTML(lesson.slug)).join(',')}">Save Unit ${escapeHTML(unit.id)}</button>`).join('')}</div>
        <p class="muted" role="status" data-offline-status></p>
      </div>
    </section>

    <div class="resource-filters" role="group" aria-label="Filter resources by source">
      <button class="chip is-active" type="button" data-resource-filter="" aria-pressed="true">All resources</button>
      <button class="chip" type="button" data-resource-filter="internal" aria-pressed="false">Original KINETIQ</button>
      <button class="chip" type="button" data-resource-filter="external" aria-pressed="false">Official and external</button>
      <button class="chip" type="button" data-resource-filter="note" aria-pressed="false">Licensed source required</button>
    </div>
    <p class="muted resource-filter-status" data-resource-filter-status aria-live="polite"></p>

    ${groups.map(group => `<section class="lesson-section">
      <div class="section-title"><p class="eyebrow">${escapeHTML(String(group.category).toUpperCase())}</p><h2>${escapeHTML(group.category)}</h2></div>
      <p class="resources-intro">${escapeHTML(fillCounts(group.description, index))}</p>
      <div class="card-grid">
        ${(group.items || []).map(item => `<article class="content-card resource-card resource-card--${escapeHTML(item.kind || 'internal')}" data-resource-card data-resource-kind="${escapeHTML(item.kind || 'internal')}">
          <p class="resource-card__provenance">${escapeHTML(provenance(item))}</p>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(fillCounts(item.detail, index))}</p>
          ${linkFor(item)}
        </article>`).join('')}
      </div>
    </section>`).join('')}
  </section>`;
}

export function bindResources() {
  const page = document.querySelector('.resources-page');
  if (!page) return undefined;
  const cards = [...page.querySelectorAll('[data-resource-card]')];
  const status = page.querySelector('[data-resource-filter-status]');
  const controller = new AbortController();
  const offlineStatus = page.querySelector('[data-offline-status]');
  const onWorkerMessage = event => {
    if (event.data?.type !== 'KINETIQ_CACHE_COMPLETE' || !offlineStatus) return;
    offlineStatus.textContent = event.data.saved === event.data.requested
      ? 'Offline pack saved on this device.'
      : `Saved ${event.data.saved} of ${event.data.requested} pack files. Reconnect and try again to finish.`;
  };
  navigator.serviceWorker?.addEventListener('message', onWorkerMessage, { signal: controller.signal });
  page.querySelectorAll('[data-offline-pack]').forEach(button => button.addEventListener('click', async () => {
    if (!('serviceWorker' in navigator)) {
      if (offlineStatus) offlineStatus.textContent = 'Offline packs are not supported by this browser.';
      return;
    }
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const worker = navigator.serviceWorker.controller || registration?.active;
    if (!worker) {
      if (offlineStatus) offlineStatus.textContent = 'Offline support is still starting. Try again in a moment.';
      return;
    }
    button.disabled = true;
    if (offlineStatus) offlineStatus.textContent = `Saving Unit ${button.dataset.offlinePack}…`;
    worker.postMessage({ type: 'KINETIQ_CACHE_LESSONS', slugs: button.dataset.offlineLessons.split(',').filter(Boolean) });
    window.setTimeout(() => { button.disabled = false; }, 1600);
  }, { signal: controller.signal }));
  page.querySelectorAll('[data-resource-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.resourceFilter;
    page.querySelectorAll('[data-resource-filter]').forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let visible = 0;
    cards.forEach(card => {
      const show = !filter || card.dataset.resourceKind === filter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    page.querySelectorAll('.lesson-section').forEach(section => {
      const sectionCards = [...section.querySelectorAll('[data-resource-card]')];
      if (sectionCards.length) section.hidden = !sectionCards.some(card => !card.hidden);
    });
    if (status) status.textContent = `Showing ${visible} of ${cards.length} resources.`;
  }, { signal: controller.signal }));
  if (status) status.textContent = `Showing all ${cards.length} resources.`;
  return () => controller.abort();
}
