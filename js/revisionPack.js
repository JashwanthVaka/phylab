import { escapeHTML, orderLessons } from './utils.js';

/** Printable course map generated only from KINETIQ's original lesson index. */
export function revisionPackPage(index = {}, filters = {}) {
  const allLessons = orderLessons(index.lessonIndex || []);
  const allUnits = index.units || [];
  const unitFilter = allUnits.some(unit => unit.id === filters.unit) ? filters.unit : '';
  const levelFilter = ['SL', 'HL'].includes(filters.level) ? filters.level : '';
  const lessons = allLessons.filter(lesson => (!unitFilter || lesson.unit === unitFilter)
    && (!levelFilter || levelFilter === 'HL' || !/^HL\b/i.test(lesson.level || '')));
  const units = allUnits.filter(unit => !unitFilter || unit.id === unitFilter);
  const scope = [unitFilter && `Unit ${unitFilter}`, levelFilter && `${levelFilter} course`].filter(Boolean).join(', ') || 'All five units';
  return `<section class="page revision-pack">
    <header class="revision-pack__head">
      <div><p class="eyebrow">PRINTABLE REVISION PACK</p><h1>Your complete course checklist.</h1>
      <p class="page-lead">A compact map of ${lessons.length} KINETIQ lesson${lessons.length === 1 ? '' : 's'}, their outcomes and core vocabulary. Scope: ${escapeHTML(scope)}.</p></div>
      <div class="sheet-actions"><button class="btn btn-primary" type="button" onclick="window.print()">Print pack</button><a class="outline" href="/resources" data-route>Back to resources</a></div>
    </header>
    <form class="revision-pack__filters" action="/revision/print" method="get">
      <label>Unit<select name="unit"><option value="">All units</option>${allUnits.map(unit => `<option value="${escapeHTML(unit.id)}" ${unit.id === unitFilter ? 'selected' : ''}>${escapeHTML(unit.id)}. ${escapeHTML(unit.title)}</option>`).join('')}</select></label>
      <label>Level<select name="level"><option value="">All levels</option><option value="SL" ${levelFilter === 'SL' ? 'selected' : ''}>SL core</option><option value="HL" ${levelFilter === 'HL' ? 'selected' : ''}>HL complete course</option></select></label>
      <button class="outline" type="submit">Build pack</button>
    </form>
    ${units.map(unit => {
      const rows = lessons.filter(lesson => lesson.unit === unit.id);
      return `<section class="revision-pack__unit" data-unit="${escapeHTML(unit.id)}">
        <h2><span>${escapeHTML(unit.id)}</span> ${escapeHTML(unit.title)}</h2>
        <p>${escapeHTML(unit.summary || '')}</p>
        <div class="revision-pack__lessons">${rows.map(lesson => `<article>
          <label><input type="checkbox" aria-label="Mark ${escapeHTML(lesson.title)} revised"> <b>${escapeHTML(lesson.title)}</b></label>
          <p>${escapeHTML(lesson.summary || '')}</p>
          ${(lesson.learning_objectives || []).length ? `<ul>${lesson.learning_objectives.slice(0, 4).map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}
          ${(lesson.tags || []).length ? `<small>${lesson.tags.map(escapeHTML).join(' · ')}</small>` : ''}
        </article>`).join('')}</div>
      </section>`;
    }).join('')}
    <footer class="revision-pack__foot">KINETIQ original study material. Study support, not official IB material.</footer>
  </section>`;
}
