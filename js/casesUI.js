import { escapeHTML } from './utils.js';
import { renderGraph, bindGraphs, graphFor } from './graphEngine.js';

const unitTitle = (index, id) => (index.units || []).find(unit => unit.id === id)?.title || `Unit ${id}`;

/** Case catalogue grouped by unit. */
export function casesPage(index) {
  const cases = index.cases || [];
  if (!cases.length) return '<section class="page"><p class="eyebrow">CASE PRACTICE</p><h1>Cases unavailable.</h1><div class="empty-state"><h3>No cases loaded</h3><p>The case content could not be read from the server.</p></div></section>';
  const units = (index.units || []).filter(unit => cases.some(item => item.unit === unit.id));
  return `<section class="page cases-page">
    <p class="eyebrow">CASE PRACTICE</p>
    <h1>Physics where it actually happens.</h1>
    <p class="page-lead">${cases.length} real-world contexts organised by unit. Each one gives you the physics involved, the equations that matter, short questions to check yourself, and one exam-style prompt with the points a good answer would make.</p>

    <div class="cases-controls">
      <label class="search library-search"><span>⌕</span><input id="caseSearch" type="search" autocomplete="off" placeholder="Search cases, concepts, tags…" aria-label="Filter cases"></label>
      <div class="library-chips" role="group" aria-label="Filter by unit">
        <button type="button" class="chip is-active" data-filter-case-unit="">All units</button>
        ${units.map(unit => `<button type="button" class="chip" data-filter-case-unit="${escapeHTML(unit.id)}">${escapeHTML(unit.id)}. ${escapeHTML(unit.title)}</button>`).join('')}
      </div>
    </div>
    <p class="library-count" data-case-count aria-live="polite"></p>

    ${units.map(unit => `<section class="cases-unit" data-case-section="${escapeHTML(unit.id)}">
      <header class="library-unit__head"><div><p class="eyebrow">UNIT ${escapeHTML(unit.id)}</p><h2>${escapeHTML(unit.title)}</h2></div></header>
      <div class="library-grid">${cases.filter(item => item.unit === unit.id).map(item => `<article class="case-card" data-case-card data-unit="${escapeHTML(item.unit)}" data-text="${escapeHTML(`${item.title} ${item.context} ${(item.tags || []).join(' ')}`.toLowerCase())}">
        <span class="tag">UNIT ${escapeHTML(item.unit)}</span>
        <h3><a href="/cases/${escapeHTML(item.slug)}" data-route>${escapeHTML(item.title)}</a></h3>
        <p>${escapeHTML(String(item.context).slice(0, 150))}…</p>
        <ul class="library-tags">${(item.tags || []).map(tag => `<li>${escapeHTML(tag)}</li>`).join('')}</ul>
        <a class="open-module" href="/cases/${escapeHTML(item.slug)}" data-route>Open case →</a>
      </article>`).join('')}</div>
    </section>`).join('')}
    <p class="library-empty" data-case-empty hidden>No cases match your filters.</p>
  </section>`;
}

/** One case: context, physics, formulas, graph, questions, exam prompt, mistakes and links. */
export function casePage(index, slug) {
  const item = (index.cases || []).find(entry => entry.slug === slug);
  if (!item) return '<section class="page"><h1>Case not found</h1><p class="page-lead">That case is not in the PHYLAB library.</p><a class="button" href="/cases" data-route>Back to case practice</a></section>';
  const lessons = index.lessonIndex || [];
  const lessonTitle = itemSlug => lessons.find(lesson => lesson.slug === itemSlug)?.title || itemSlug.replace(/-/g, ' ');
  const graph = item.graph ? graphFor({ title: item.graph, topicLabel: item.graph }) : null;

  return `<section class="page case-page">
    <a class="back-link" href="/cases" data-route>← Case practice</a>
    <p class="eyebrow">UNIT ${escapeHTML(item.unit)} · ${escapeHTML(unitTitle(index, item.unit))}</p>
    <h1>${escapeHTML(item.title)}</h1>
    <ul class="library-tags">${(item.tags || []).map(tag => `<li>${escapeHTML(tag)}</li>`).join('')}</ul>

    <section class="lesson-section"><div class="section-title"><p class="eyebrow">CONTEXT</p><h2>What is going on</h2></div><p class="case-context">${escapeHTML(item.context)}</p></section>

    <section class="lesson-section"><div class="section-title"><p class="eyebrow">PHYSICS INVOLVED</p><h2>Concepts and equations</h2></div>
      <ul class="library-tags library-tags--skills">${(item.concepts || []).map(concept => `<li>${escapeHTML(concept)}</li>`).join('')}</ul>
      <div class="formula-grid">${(item.formulas || []).map(formula => `<article class="formula-block"><code>${escapeHTML(formula.formula)}</code><h3>${escapeHTML(formula.name)}</h3><p>${escapeHTML(formula.meaning)}</p></article>`).join('')}</div>
    </section>

    ${graph ? `<section class="lesson-section"><div class="section-title"><p class="eyebrow">VISUAL MODEL</p><h2>The shape of the relationship</h2></div>${renderGraph(graph)}</section>` : ''}

    <section class="lesson-section"><div class="section-title"><p class="eyebrow">CHECK YOURSELF</p><h2>Short questions</h2></div>
      <div class="case-questions">${(item.questions || []).map((question, position) => `<details class="case-question"><summary><span class="case-question__n">${position + 1}</span>${escapeHTML(question.prompt)}</summary><p>${escapeHTML(question.answer)}</p></details>`).join('')}</div>
    </section>

    ${item.examQuestion ? `<section class="lesson-section"><div class="section-title"><p class="eyebrow">EXAM-STYLE PRACTICE</p><h2>Longer question</h2></div>
      <article class="case-exam">
        <p class="case-exam__meta">${escapeHTML(item.examQuestion.command)} · ${item.examQuestion.marks} marks</p>
        <p class="case-exam__prompt">${escapeHTML(item.examQuestion.prompt)}</p>
        <details><summary>Show the points a good answer would make</summary>
          <ol class="case-exam__points">${(item.examQuestion.markPoints || []).map(point => `<li>${escapeHTML(point)}</li>`).join('')}</ol>
          <p class="practice-note"><b>PHYLAB practice guidance.</b> These are the points PHYLAB would expect. They are study support, not an official IB mark scheme.</p>
        </details>
      </article>
    </section>` : ''}

    <section class="lesson-section"><div class="section-title"><p class="eyebrow">AVOID LOSING MARKS</p><h2>Common mistakes</h2></div>
      <ul class="case-mistakes">${(item.mistakes || []).map(mistake => `<li>${escapeHTML(mistake)}</li>`).join('')}</ul>
    </section>

    <section class="lesson-section"><div class="section-title"><p class="eyebrow">CONTINUE</p><h2>Where to go next</h2></div>
      <div class="case-links">
        ${(item.lessons || []).map(lesson => `<a class="chip" href="/lesson/${escapeHTML(lesson)}" data-route>Lesson: ${escapeHTML(lessonTitle(lesson))}</a>`).join('')}
        ${item.simulation ? `<a class="chip" href="/simulations/${escapeHTML(item.simulation)}" data-route>Simulation: open the lab →</a>` : ''}
        <a class="chip" href="/patterns" data-route>How to answer this command term →</a>
      </div>
    </section>
  </section>`;
}

export function bindCases() {
  const page = document.querySelector('.cases-page');
  const cleanupGraphs = bindGraphs();
  if (!page) return () => cleanupGraphs?.();
  const controller = new AbortController();
  const cards = [...page.querySelectorAll('[data-case-card]')];
  const count = page.querySelector('[data-case-count]');
  const empty = page.querySelector('[data-case-empty]');
  const filters = { unit: '', text: '' };

  const apply = () => {
    let visible = 0;
    cards.forEach(card => {
      const show = (!filters.unit || card.dataset.unit === filters.unit) && (!filters.text || card.dataset.text.includes(filters.text));
      card.hidden = !show;
      if (show) visible += 1;
    });
    page.querySelectorAll('[data-case-section]').forEach(section => {
      section.hidden = [...section.querySelectorAll('[data-case-card]')].every(card => card.hidden);
    });
    empty.hidden = visible > 0;
    count.textContent = visible === cards.length ? `Showing all ${cards.length} cases.` : `Showing ${visible} of ${cards.length} cases.`;
  };

  page.querySelector('#caseSearch').addEventListener('input', event => { filters.text = event.target.value.trim().toLowerCase(); apply(); }, { signal: controller.signal });
  page.querySelectorAll('[data-filter-case-unit]').forEach(button => button.addEventListener('click', () => {
    filters.unit = button.dataset.filterCaseUnit;
    page.querySelectorAll('[data-filter-case-unit]').forEach(other => other.classList.toggle('is-active', other === button));
    apply();
  }, { signal: controller.signal }));

  apply();
  return () => { controller.abort(); cleanupGraphs?.(); };
}
