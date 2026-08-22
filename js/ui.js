import { card, emptyState, formula, skeleton } from './renderer.js';
import { searchResults } from './search.js';
import { bindQuiz } from './quiz.js';
import { completeLesson, debounce, escapeHTML, getProgress, orderLessons } from './utils.js';
import { bindCalculator, renderCalculator } from './calculatorEngine.js';
import { bindFlashcards } from './flashcards.js';
import { bindGraphs, graphFor, renderGraph } from './graphEngine.js';
import { bindLessonGraph } from './lessonGraphs.js';
import { bindHeroScene, heroScene } from './heroScene.js';
import { calculatorFits, dimensionOf, graphFits, meaningOf, unitOf } from './formulaMeta.js';

export const renderLoading = message => `<section class="page"><p class="eyebrow">KINETIQ</p><h1>${escapeHTML(message)}</h1>${skeleton(6)}</section>`;
export const renderNotFound = () => `<section class="page error-state"><p class="eyebrow">404</p><h1>That learning path does not exist.</h1><a class="button" href="/" data-route>Back to KINETIQ</a></section>`;

export function renderHome(index, progress) {
  const lessons = orderLessons(index.lessonIndex);
  const completed = progress.completedLessons.filter(slug => lessons.some(lesson => lesson.slug === slug)).length;
  const percentage = Math.round(completed / Math.max(lessons.length, 1) * 100);
  const next = lessons.find(lesson => !progress.completedLessons.includes(lesson.slug)) || lessons[0];
  const units = index.units || [];
  const firstMethod = (index.toolkit || [])[0];

  return `<section class="hero page-hero">
    <div class="hero-copy">
      <p class="eyebrow">THE PHYSICS STUDIO FOR IB</p>
      <h1>Master IBDP Physics.<br><em>See every law move.</em></h1>
      <p class="lead">Lessons in syllabus order, a formula centre that explains every symbol, graphs and simulations driven by the real equations, practice with transparent marking, and question answering that draws on KINETIQ’s own lessons.</p>
      <div class="actions">
        <a href="/lesson/${escapeHTML(next?.slug || '')}" class="button" data-route>Start learning <b>→</b></a>
        <a href="/exam-prep" class="outline" data-route>Test your knowledge</a>
      </div>
      <p class="hero-note">Every part of KINETIQ works with no account. Asking a question needs no API key either — only the generative tutor does.</p>
    </div>
    ${heroScene()}
  </section>
  <section class="stats">
    <div><strong>${lessons.length}</strong><span>syllabus<br>lessons</span></div>
    <div><strong>${(index.formulas || []).length}</strong><span>formulae<br>explained</span></div>
    <div><strong>${(index.simulations || []).length}</strong><span>interactive<br>simulations</span></div>
    <div><strong>${(index.questions || []).length}</strong><span>practice<br>questions</span></div>
    <div><strong>${(index.cases || []).length}</strong><span>applied<br>cases</span></div>
  </section>

  <section class="page section intro"><div><p class="eyebrow">YOUR LEARNING JOURNEY</p><h2>Everything you need to think like a physicist.</h2></div><p>Work through the course, apply it to real contexts, learn the shape each exam answer should take, then practise under time.</p></section>

  <section class="page journey">
    <ol class="journey-grid">
      <li><span class="journey-num">01</span><h3>Learn the course</h3><p>All ${lessons.length} lessons grouped into the five course units, with progress you can track.</p><a class="text-button" href="/library" data-route>Course library →</a></li>
      <li><span class="journey-num">02</span><h3>Model it</h3><p>${(index.simulations || []).length} simulations and every lesson graph run from real equations, not stored curves.</p><a class="text-button" href="/simulations" data-route>Simulation studio →</a></li>
      <li><span class="journey-num">03</span><h3>Apply it</h3><p>${(index.cases || []).length} real-world cases from car safety to carbon dating.</p><a class="text-button" href="/cases" data-route>Case practice →</a></li>
      <li><span class="journey-num">04</span><h3>Learn the method</h3><p>Five study procedures and every IB command term explained.</p><a class="text-button" href="/toolkit" data-route>Active toolkit →</a></li>
      <li><span class="journey-num">05</span><h3>Practise</h3><p>Eight practice formats with time, marks and level shown up front.</p><a class="text-button" href="/exam-prep" data-route>Exam preparation →</a></li>
    </ol>
  </section>

  <section class="page course-library">
    <div class="section-head"><div><p class="eyebrow">SYLLABUS LIBRARY</p><h2>Navigate the course.</h2></div><label class="search"><span>⌕</span><input id="globalSearch" autocomplete="off" placeholder="Search topics, formulae, definitions…"></label></div>
    ${units.map(unit => {
      const unitLessons = lessons.filter(lesson => (lesson.unit || String(lesson.title).charAt(0)) === unit.id);
      if (!unitLessons.length) return '';
      const unitDone = unitLessons.filter(lesson => progress.completedLessons.includes(lesson.slug)).length;
      return `<div class="home-unit">
        <div class="home-unit__head"><h3><span>${escapeHTML(unit.id)}</span> ${escapeHTML(unit.title)}</h3><span class="home-unit__count">${unitDone}/${unitLessons.length} complete</span></div>
        <div class="module-grid">${unitLessons.map(lesson => `<a class="module-card ${progress.completedLessons.includes(lesson.slug) ? 'is-complete' : ''}" data-unit="${escapeHTML(unit.id)}" href="/lesson/${escapeHTML(lesson.slug)}" data-route><span class="module-num">${escapeHTML(lesson.level || 'SL + HL')}</span><span class="unit">${escapeHTML(lesson.topicLabel)}</span><h3>${escapeHTML(lesson.title)}</h3><p>${escapeHTML(lesson.summary || 'Open this lesson to begin learning.')}</p><span class="module-meta">${Number(lesson.estimatedStudyTime) || 30} min</span><span class="open-module">${progress.completedLessons.includes(lesson.slug) ? 'Revisit lesson' : 'Open lesson'} <b>→</b></span></a>`).join('')}</div>
      </div>`;
    }).join('')}
    <p class="home-library-more"><a class="button" href="/library" data-route>Open the full library with filters →</a></p>
  </section>

  <section class="page toolkit">
    <div><p class="eyebrow">ACTIVE TOOLKIT</p><h2>Don’t just read it.<br><em>Work with it.</em></h2></div>
    <div class="method-card">
      <h3>${escapeHTML(firstMethod?.title || 'Five-step numerical problem method')}</h3>
      <ol>${(firstMethod?.steps || []).map((step, position) => `<li><b>0${position + 1}</b> ${escapeHTML(step.heading)}.</li>`).join('') || '<li><b>01</b> Define the system.</li>'}</ol>
      <a class="text-button" href="/toolkit" data-route>All five methods →</a>
    </div>
    <div class="progress-card">
      <p class="eyebrow">YOUR PROGRESS</p>
      <div class="progress-ring"><b>${percentage}%</b></div>
      <p>${completed} of ${lessons.length} lessons completed</p>
      <a class="text-button" href="/progress" data-route>View progress →</a>
    </div>
  </section>`;
}

/**
 * One formula, in full.
 *
 * Two bugs lived here. Lesson formulas store their variable table under
 * `variables` while the legacy file uses `symbols`, and this page only read
 * `symbols` — so 122 of the 131 formulas showed "no metadata recorded" while
 * their data sat one key away. The units and dimension columns were also
 * literal "Not recorded" strings for every row.
 *
 * The calculator and graph used to render unconditionally, which put a SUVAT
 * solver and a position-time curve under E = mc². A tool unrelated to the
 * equation above it teaches a wrong association, so each is now shown only
 * when it genuinely models this formula, and omitted otherwise.
 */
function renderFormulaPage(selected) {
  const table = selected.symbols || selected.variables || {};
  const rows = Object.entries(table);
  const graph = graphFor({ title: selected.topic || selected.name, topicLabel: selected.topic || '' });
  const showGraph = graphFits(graph, selected);
  const showCalculator = calculatorFits({ ...selected, symbols: table });

  const variableCard = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Variable</th><th>Meaning</th><th>SI unit</th><th>Dimension</th></tr></thead><tbody>${rows.map(([key, value]) => {
        const unit = unitOf(value);
        const dimension = dimensionOf(unit);
        return `<tr><td><code>${escapeHTML(key)}</code></td><td>${escapeHTML(meaningOf(value))}</td><td>${unit ? escapeHTML(unit === 'dimensionless' ? '—' : unit) : '—'}</td><td>${dimension ? escapeHTML(dimension) : '—'}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '<p>Variable metadata has not yet been recorded for this formula.</p>';

  return `<section class="page formula-center">
    <a class="back-link" href="/formulas" data-route>← Formula centre</a>
    <p class="eyebrow">PHYSICS FORMULA ENGINE</p>
    <h1>${escapeHTML(selected.name)}</h1>
    <div class="formula-hero"><code>${escapeHTML(selected.formula)}</code><p>${escapeHTML(selected.explanation || selected.topic || 'Use the variable table to interpret this relationship.')}</p></div>
    <div class="formula-center-grid">
      ${card('Variables, units and dimensions', variableCard)}
      ${card('Physical meaning', `<p>${escapeHTML(selected.derivation || selected.explanation || 'Open the source lesson to connect this expression to its governing principle.')}</p>${selected.topic ? `<p class="muted">From <b>${escapeHTML(selected.topic)}</b>.</p>` : ''}`)}
    </div>
    ${showGraph ? renderGraph(graph) : ''}
    ${showCalculator ? renderCalculator() : ''}
    <section class="lesson-section">
      <p class="eyebrow">EXAM TECHNIQUE</p>
      <div class="card-grid">
        ${card('Before you substitute', '<p>Check that the model applies, convert every quantity to SI units, and fix a sign convention for direction before putting numbers in.</p>')}
        ${card('When you answer', '<p>State the equation, substitute with units shown, and give the result to a sensible number of significant figures with its unit.</p>')}
      </div>
    </section>
  </section>`;
}

export const renderFormulaLibrary = (formulas, selectedSlug) => {
  const selected = formulas.find(item => item.name && item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === selectedSlug);
  if (selected) return renderFormulaPage(selected);
  return `<section class="page"><p class="eyebrow">FORMULA CENTRE</p><h1>Know what every symbol means.</h1><p class="page-lead">Select a formula to see its variables, physical meaning, calculator, graph, and exam guidance.</p><p class="formula-sheet-link"><a class="btn btn-primary" href="/formulas/print" data-route>Open the printable formula sheet →</a></p><div class="formula-grid">${formulas.map(item => `<a class="formula-block" href="/formulas/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}" data-route><code>${escapeHTML(item.formula)}</code><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.topic || '')}</p></a>`).join('')}</div></section>`;
};
export const renderProgress = (index, progress) => `<section class="page"><p class="eyebrow">YOUR WORKSPACE</p><h1>Progress with purpose.</h1><div class="dash-grid"><article class="current"><span class="tag">LESSONS COMPLETE</span><h2>${progress.completedLessons.length} / ${index.lessonIndex.length}</h2><p>Your lesson completion is stored privately in this browser until account sync is introduced.</p></article>${card('Practice activity', `<p>${progress.attempts.length} solution${progress.attempts.length === 1 ? '' : 's'} revealed.</p>`)}${card('Next step', `<a class="button" href="/lesson/${index.lessonIndex.find(item => !progress.completedLessons.includes(item.slug))?.slug || index.lessonIndex[0]?.slug || ''}" data-route>Continue learning →</a>`)}</div></section>`;
export const renderSearch = (results, query) => `<section class="page"><p class="eyebrow">GLOBAL SEARCH</p><h1>Search KINETIQ.</h1><label class="search large-search"><span>⌕</span><input id="searchPageInput" value="${escapeHTML(query)}" autofocus placeholder="Search lessons, definitions, formulae, questions…"></label><p class="page-lead">${query ? `${results.length} result${results.length === 1 ? '' : 's'} for “${escapeHTML(query)}”` : 'Start typing to search the entire learning catalogue.'}</p>${query ? searchResults(results) : emptyState('What are you looking for?', 'Try “momentum”, “Coulomb”, or “interference”.')}</section>`;

export function showTutor() {
  const root = document.querySelector('#modalRoot');
  root.innerHTML = `<div class="modal show" role="dialog" aria-modal="true" aria-labelledby="tutorTitle"><div class="modal-card"><button class="modal-close" data-close-modal aria-label="Close KIT tutor">×</button><p class="eyebrow">KIT, YOUR AI STUDY PARTNER</p><h2 id="tutorTitle">Ask a better physics question.</h2><p>Open the dedicated KIT workspace for teaching modes, source-aware answers, saved conversations, images, and streamed explanations.</p><a class="button" href="/ai" data-route>Open KIT workspace →</a></div></div>`;
  document.querySelector('.modal-close')?.focus();
}

export function bindUI({ loader, router, searchIndex, render }) {
  const search = document.querySelector('#globalSearch');
  search?.addEventListener('input', debounce(event => router.go(`/search?q=${encodeURIComponent(event.target.value)}`), 220));
  document.querySelector('#searchPageInput')?.addEventListener('input', debounce(event => router.go(`/search?q=${encodeURIComponent(event.target.value)}`), 180));
  document.querySelectorAll('[data-complete-lesson]').forEach(button => button.addEventListener('click', () => { completeLesson(button.dataset.completeLesson); button.textContent = 'Lesson completed ✓'; button.disabled = true; }));
  document.querySelectorAll('[data-open-tutor]').forEach(button => button.addEventListener('click', () => showTutor()));
  document.querySelectorAll('button[data-quiz-topic]').forEach(button => button.addEventListener('click', () => router.go('/quiz')));
  document.querySelector('[data-close-modal]')?.addEventListener('click', () => { document.querySelector('#modalRoot').innerHTML = ''; document.querySelector('#tutorButton').focus(); });
  bindQuiz();
  bindGraphs();
  bindLessonGraph();
  bindFlashcards();
  bindHeroScene();
  const bindCalculatorView = () => bindCalculator(value => { const holder = document.querySelector('.calculator-card'); if (holder) { holder.outerHTML = renderCalculator(value); bindCalculatorView(); } });
  bindCalculatorView();
}
