import { escapeHTML, slugify } from './utils.js';

const count = (rows, predicate) => rows.filter(predicate).length;
const cell = (value, minimum = 1) => `<td class="${value < minimum ? 'coverage-gap' : ''}">${value}</td>`;

export function coverageReport(questions = []) {
  const topics = [...new Set(questions.map(item => item.topic).filter(Boolean))].sort();
  const rows = topics.map(topic => {
    const items = questions.filter(item => item.topic === topic);
    return {
      topic,
      slug: slugify(topic),
      total: items.length,
      easy: count(items, item => item.difficulty === 'easy'),
      medium: count(items, item => item.difficulty === 'medium'),
      hard: count(items, item => item.difficulty === 'hard'),
      sl: count(items, item => item.level === 'SL'),
      hl: count(items, item => item.level === 'HL'),
      paper1A: count(items, item => item.paper === '1A'),
      paper1B: count(items, item => item.paper === '1B'),
      paper2: count(items, item => item.paper === '2'),
      reviewed: count(items, item => item.reviewStatus === 'reviewed' && item.reviewer && item.lastReviewed),
      skills: new Set(items.flatMap(item => item.skills || [])).size
    };
  });
  const gaps = rows.flatMap(row => [
    row.hard === 0 ? `${row.topic} has no hard questions.` : '',
    row.paper1B === 0 ? `${row.topic} has no Paper 1B data practice.` : '',
    row.paper2 === 0 ? `${row.topic} has no Paper 2 practice.` : '',
    row.reviewed !== row.total ? `${row.topic} has ${row.total - row.reviewed} records missing review metadata.` : ''
  ].filter(Boolean));
  return { rows, gaps };
}

export function coveragePage(index) {
  const questions = index.questions || [];
  const report = coverageReport(questions);
  const papers = ['1A', '1B', '2'].map(paper => ({ paper, total: count(questions, item => item.paper === paper) }));
  const reviewed = count(questions, item => item.reviewStatus === 'reviewed' && item.reviewer && item.lastReviewed);
  return `<section class="page coverage-page">
    <p class="eyebrow">CONTENT QUALITY</p>
    <h1>Question coverage, without guesswork.</h1>
    <p class="page-lead">A live audit of KINETIQ's original question bank. Counts come directly from shipped content, and gaps remain visible until they are fixed.</p>
    <div class="coverage-summary">
      <article><span class="tag">Original questions</span><b>${questions.length}</b><small>across ${report.rows.length} topics</small></article>
      ${papers.map(item => `<article><span class="tag">Paper ${item.paper}</span><b>${item.total}</b><small>KINETIQ practice items</small></article>`).join('')}
      <article><span class="tag">Reviewed metadata</span><b>${reviewed}</b><small>${Math.round(reviewed / Math.max(1, questions.length) * 100)}% traceable</small></article>
    </div>
    <div class="admin-panel">
      <div class="admin-panel__head"><h2>Coverage by topic</h2><span class="admin-panel__note">Red cells need attention</span></div>
      <div class="table-wrap"><table class="coverage-table">
        <thead><tr><th>Topic</th><th>Total</th><th>Easy</th><th>Medium</th><th>Hard</th><th>SL</th><th>HL</th><th>1A</th><th>1B</th><th>2</th><th>Skills</th><th>Reviewed</th></tr></thead>
        <tbody>${report.rows.map(row => `<tr><th><a href="/quiz?mode=Mixed%20Quiz&topic=${encodeURIComponent(row.topic)}" data-route>${escapeHTML(row.topic)}</a></th>${cell(row.total, 12)}${cell(row.easy, 3)}${cell(row.medium, 3)}${cell(row.hard)}${cell(row.sl)}${cell(row.hl)}${cell(row.paper1A)}${cell(row.paper1B)}${cell(row.paper2)}${cell(row.skills, 2)}${cell(row.reviewed, row.total)}</tr>`).join('')}</tbody>
      </table></div>
    </div>
    <section class="admin-panel" aria-labelledby="coverage-gaps"><div class="admin-panel__head"><h2 id="coverage-gaps">Open quality gaps</h2><span class="admin-panel__note">${report.gaps.length} detected</span></div>
      ${report.gaps.length ? `<ul class="coverage-gaps">${report.gaps.map(gap => `<li>${escapeHTML(gap)}</li>`).join('')}</ul>` : '<p class="feedback-success"><b>Coverage checks pass.</b> Every topic has all three paper types, difficulty depth and traceable review metadata.</p>'}
    </section>
    <p class="practice-note"><b>Provenance:</b> Every item is original KINETIQ material. Lesson-derived questions are generated from KINETIQ's reviewed course notes, not from paid revision sites or copyrighted past papers.</p>
  </section>`;
}
