import { escapeHTML, orderLessons } from './utils.js';

/** Printable course map generated only from KINETIQ's original lesson index. */
export function revisionPackPage(index = {}, filters = {}) {
  const allLessons = orderLessons(index.lessonIndex || []);
  const allUnits = index.units || [];
  const unitFilter = allUnits.some(unit => unit.id === filters.unit) ? filters.unit : '';
  const levelFilter = ['SL', 'HL'].includes(filters.level) ? filters.level : '';
  const paperFilter = ['1A', '1B', '2'].includes(filters.paper) ? filters.paper : '';
  const difficultyFilter = ['easy', 'medium', 'hard'].includes(filters.difficulty) ? filters.difficulty : '';
  const lessons = allLessons.filter(lesson => (!unitFilter || lesson.unit === unitFilter)
    && (!levelFilter || levelFilter === 'HL' || !/^HL\b/i.test(lesson.level || '')));
  const units = allUnits.filter(unit => !unitFilter || unit.id === unitFilter);
  const questions = (index.questions || []).filter(question => (!levelFilter || levelFilter === 'HL' || question.level !== 'HL')
    && (!paperFilter || question.paper === paperFilter) && (!difficultyFilter || question.difficulty === difficultyFilter));
  const scope = [unitFilter && `Unit ${unitFilter}`, levelFilter && `${levelFilter} course`].filter(Boolean).join(', ') || 'All five units';
  return `<section class="page revision-pack">
    <header class="revision-pack__head">
      <div><p class="eyebrow">PRINTABLE REVISION PACK</p><h1>Your complete course checklist.</h1>
      <p class="page-lead">A compact map of ${lessons.length} KINETIQ lesson${lessons.length === 1 ? '' : 's'}, their outcomes and a selected set of original practice prompts. Scope: ${escapeHTML(scope)}.</p></div>
      <div class="sheet-actions"><button class="btn btn-primary" type="button" onclick="window.print()">Print pack</button><a class="outline" href="/resources" data-route>Back to resources</a></div>
    </header>
    <form class="revision-pack__filters" action="/revision/print" method="get">
      <label>Unit<select name="unit"><option value="">All units</option>${allUnits.map(unit => `<option value="${escapeHTML(unit.id)}" ${unit.id === unitFilter ? 'selected' : ''}>${escapeHTML(unit.id)}. ${escapeHTML(unit.title)}</option>`).join('')}</select></label>
      <label>Level<select name="level"><option value="">All levels</option><option value="SL" ${levelFilter === 'SL' ? 'selected' : ''}>SL core</option><option value="HL" ${levelFilter === 'HL' ? 'selected' : ''}>HL complete course</option></select></label>
      <label>Paper<select name="paper"><option value="">All papers</option>${['1A','1B','2'].map(value => `<option value="${value}" ${paperFilter === value ? 'selected' : ''}>Paper ${value}</option>`).join('')}</select></label>
      <label>Difficulty<select name="difficulty"><option value="">All difficulties</option>${['easy','medium','hard'].map(value => `<option value="${value}" ${difficultyFilter === value ? 'selected' : ''}>${value[0].toUpperCase()+value.slice(1)}</option>`).join('')}</select></label>
      <button class="outline" type="submit">Build pack</button>
    </form>
    ${units.map(unit => {
      const rows = lessons.filter(lesson => lesson.unit === unit.id);
      const topics = new Set(rows.map(lesson => lesson.topicLabel).filter(Boolean));
      const prompts = questions.filter(question => topics.has(question.topic)).slice(0, 10);
      return `<section class="revision-pack__unit" data-unit="${escapeHTML(unit.id)}">
        <h2><span>${escapeHTML(unit.id)}</span> ${escapeHTML(unit.title)}</h2>
        <p>${escapeHTML(unit.summary || '')}</p>
        <div class="revision-pack__lessons">${rows.map(lesson => `<article>
          <label><input type="checkbox" aria-label="Mark ${escapeHTML(lesson.title)} revised"> <b>${escapeHTML(lesson.title)}</b></label>
          <p>${escapeHTML(lesson.summary || '')}</p>
          ${(lesson.learning_objectives || []).length ? `<ul>${lesson.learning_objectives.slice(0, 4).map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}
          ${(lesson.tags || []).length ? `<small>${lesson.tags.map(escapeHTML).join(' · ')}</small>` : ''}
        </article>`).join('')}</div>
        ${prompts.length ? `<div class="revision-pack__practice">
          <h3>Original KINETIQ practice prompts</h3>
          <ol>${prompts.map(question => `<li><p><b>Paper ${escapeHTML(question.paper || '2')} · ${escapeHTML(question.topic)} · ${escapeHTML(question.level || 'SL')} · ${Number(question.marks) || 1} mark${Number(question.marks) === 1 ? '' : 's'}</b></p><p>${escapeHTML(question.question)}</p></li>`).join('')}</ol>
        </div>
        <div class="revision-pack__answers">
          <h3>Answers and checking points</h3>
          <ol>${prompts.map(question => `<li><b>${escapeHTML(question.correctAnswer || question.answer || 'Use the recorded solution.')}</b>${question.solution ? `<p>${escapeHTML(question.solution)}</p>` : ''}</li>`).join('')}</ol>
        </div>` : ''}
      </section>`;
    }).join('')}
    <footer class="revision-pack__foot">KINETIQ original study material. Study support, not official IB material.</footer>
  </section>`;
}
