import { escapeHTML, orderLessons } from './utils.js';

/** Printable course map generated only from KINETIQ's original lesson index. */
export function revisionPackPage(index = {}) {
  const lessons = orderLessons(index.lessonIndex || []);
  const units = index.units || [];
  return `<section class="page revision-pack">
    <header class="revision-pack__head">
      <div><p class="eyebrow">PRINTABLE REVISION PACK</p><h1>Your complete course checklist.</h1>
      <p class="page-lead">A compact map of all ${lessons.length} KINETIQ lessons, their outcomes and core vocabulary. Use it to plan revision, then open the full lesson for worked examples and practice.</p></div>
      <div class="sheet-actions"><button class="btn btn-primary" type="button" onclick="window.print()">Print pack</button><a class="outline" href="/resources" data-route>Back to resources</a></div>
    </header>
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
