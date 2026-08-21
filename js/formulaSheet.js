/**
 * The printable formula sheet.
 *
 * Every formula KINETIQ holds, grouped by unit, on one page. Built to be
 * printed: the print stylesheet already drops the navigation and glass, and
 * each entry is marked to avoid breaking across a page.
 */

import { escapeHTML } from './utils.js';

const UNIT_NAMES = {
  A: 'Space, Time and Motion',
  B: 'The Particulate Nature of Matter',
  C: 'Wave Behaviour',
  D: 'Fields',
  E: 'Nuclear and Quantum Physics',
};

export function formulaSheetPage(index = {}) {
  const formulas = index.formulas || [];
  const lessons = index.lessonIndex || [];

  // Formulas carry the lesson's topic label, not its unit, so the unit is
  // recovered by matching the label back to the lesson that owns it.
  const unitByTopic = new Map();
  lessons.forEach(lesson => {
    if (lesson.topicLabel) unitByTopic.set(lesson.topicLabel, lesson.unit || '');
  });

  const byUnit = new Map(['A', 'B', 'C', 'D', 'E'].map(id => [id, []]));
  const orphans = [];

  // The catalogue merges the standalone formula list with every lesson's own,
  // so the same equation can arrive twice. A sheet that lists v = u + at
  // twice is worse than useless, so identical expressions collapse.
  const seen = new Set();
  let total = 0;
  formulas.forEach(item => {
    if (!item?.formula && !item?.name) return;
    const key = `${String(item.formula || '').replace(/\s+/g, '')}|${String(item.name || '').toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    total += 1;
    const unit = unitByTopic.get(item.topic);
    if (unit && byUnit.has(unit)) byUnit.get(unit).push(item);
    else orphans.push(item);
  });

  const group = (id, list) => {
    if (!list.length) return '';
    // Keep each topic together so a lesson's formulas read as a set.
    const byTopic = new Map();
    list.forEach(item => {
      const key = item.topic || 'General';
      if (!byTopic.has(key)) byTopic.set(key, []);
      byTopic.get(key).push(item);
    });
    return `<section class="sheet-unit">
      <h2><span class="sheet-unit__id">${escapeHTML(id)}</span> ${escapeHTML(UNIT_NAMES[id] || '')}</h2>
      ${[...byTopic.entries()].map(([topic, rows]) => `
        <div class="sheet-topic">
          <h3>${escapeHTML(topic)}</h3>
          <dl class="sheet-list">
            ${rows.map(row => `
              <div class="sheet-item">
                <dt><code>${escapeHTML(row.formula || '')}</code></dt>
                <dd>
                  <b>${escapeHTML(row.name || '')}</b>
                  ${row.variables ? `<span class="sheet-vars">${Object.entries(row.variables)
                    .map(([symbol, meaning]) => `${escapeHTML(symbol)} = ${escapeHTML(String(meaning))}`)
                    .join(' · ')}</span>` : ''}
                </dd>
              </div>`).join('')}
          </dl>
        </div>`).join('')}
    </section>`;
  };

  return `<section class="page formula-sheet">
    <div class="sheet-head">
      <div>
        <p class="eyebrow">FORMULA SHEET</p>
        <h1>Every formula, one page.</h1>
        <p class="page-lead">All ${total} formulae KINETIQ holds, grouped by unit, with every symbol defined. Print it or keep it open beside your work.</p>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-primary" type="button" onclick="window.print()">Print</button>
        <a class="outline" href="/formulas" data-route>Back to formula centre</a>
      </div>
    </div>
    ${['A', 'B', 'C', 'D', 'E'].map(id => group(id, byUnit.get(id))).join('')}
    ${orphans.length ? group('', orphans).replace('<span class="sheet-unit__id"></span> ', 'General ') : ''}
    <p class="sheet-foot">KINETIQ · study support, not official IB material.</p>
  </section>`;
}
