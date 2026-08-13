import { escapeHTML, orderLessons } from './utils.js';
import { masteryService } from './services/masteryService.js';

const RESULTS_PREFIX = 'phylab_quiz_results:';

/** Reads finished practice attempts saved on this device. Returns [] when there are none. */
function localResults() {
  const rows = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(RESULTS_PREFIX)) continue;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value?.submitted) rows.push(value);
    } catch { /* Skip an unreadable saved result. */ }
  }
  return rows.sort((left, right) => (right.startedAt || 0) - (left.startedAt || 0));
}

const percentageOf = results => {
  const marks = results.reduce((total, item) => total + (item.marksEarned || 0), 0);
  const max = results.reduce((total, item) => total + (item.maxMarks || 0), 0);
  return max ? Math.round(marks / max * 100) : null;
};

function topicBreakdown(results) {
  const groups = new Map();
  results.forEach(result => (result.analytics?.topics || []).forEach(topic => {
    const current = groups.get(topic.label) || { label: topic.label, earned: 0, max: 0 };
    current.earned += topic.earned;
    current.max += topic.max;
    groups.set(topic.label, current);
  }));
  return [...groups.values()].map(item => ({ ...item, percentage: item.max ? Math.round(item.earned / item.max * 100) : 0 })).sort((left, right) => right.percentage - left.percentage);
}

const statCard = (label, value, note) => `<article class="content-card stat-card"><span class="tag">${escapeHTML(label)}</span><h2>${escapeHTML(String(value))}</h2>${note ? `<p class="muted">${escapeHTML(note)}</p>` : ''}</article>`;
const noData = text => `<div class="empty-state"><h3>Nothing recorded yet</h3><p>${escapeHTML(text)}</p></div>`;

/**
 * Progress dashboard built only from data KINETIQ has actually stored —
 * lesson completion, saved practice results and, when signed in, cloud mastery.
 */
export function dashboardView(summary, extra = {}) {
  const lessons = orderLessons(extra.lessons || []);
  const completedSlugs = extra.completed || [];
  const completed = completedSlugs.filter(slug => lessons.some(lesson => lesson.slug === slug)).length;
  const percentage = lessons.length ? Math.round(completed / lessons.length * 100) : 0;
  const results = localResults();
  const accuracy = summary.guest ? percentageOf(results) : summary.quizAccuracy;
  const topics = summary.guest ? topicBreakdown(results) : [];
  const strong = summary.guest ? topics.slice(0, 3) : summary.strongestTopics || [];
  const weak = summary.guest ? [...topics].reverse().slice(0, 3) : summary.weakestTopics || [];
  const next = lessons.find(lesson => !completedSlugs.includes(lesson.slug));
  const currentUnit = next ? (next.unit || String(next.title).charAt(0)) : null;
  const unitName = (extra.units || []).find(unit => unit.id === currentUnit)?.title;

  return `<section class="page progress-page">
    <p class="eyebrow">LEARNER DASHBOARD</p>
    <h1>${summary.guest ? 'Your learning on this device' : 'Your learning workspace'}</h1>
    <p class="page-lead">${summary.guest
      ? 'You are studying as a guest, so progress and practice results are stored in this browser only. Everything shown below comes from what you have actually done.'
      : 'Progress, mastery and practice results are synced to your KINETIQ account.'}</p>

    <div class="progress-hero">
      <div class="library-summary__ring" role="img" aria-label="${percentage} percent of lessons complete"><b>${percentage}%</b></div>
      <div>
        <p class="library-summary__count"><b>${completed}</b> of <b>${lessons.length}</b> lessons complete</p>
        ${currentUnit ? `<p class="progress-current">Current unit: <b>${escapeHTML(currentUnit)}. ${escapeHTML(unitName || '')}</b></p>` : '<p class="progress-current">Every lesson is complete.</p>'}
        ${next ? `<a class="button" href="/lesson/${escapeHTML(next.slug)}" data-route>Continue with ${escapeHTML(next.title)} →</a>` : '<a class="button" href="/exam-prep" data-route>Move on to exam preparation →</a>'}
      </div>
    </div>

    <div class="dash-grid">
      ${statCard('LESSONS COMPLETE', `${completed}/${lessons.length}`)}
      ${statCard('PRACTICE ATTEMPTS', results.length || summary.recentQuizScores?.length || 0, summary.guest ? 'Saved on this device' : 'From your account')}
      ${statCard('PRACTICE ACCURACY', accuracy === null || accuracy === undefined ? '—' : `${accuracy}%`, accuracy === null || accuracy === undefined ? 'Complete a quiz to measure this' : 'Marks earned over marks available')}
      ${summary.guest ? '' : statCard('AVERAGE MASTERY', `${summary.averageMastery || 0}%`)}
      ${summary.guest ? '' : statCard('FLASHCARDS DUE', summary.flashcardsDue || 0)}
      ${summary.guest ? '' : statCard('REVISION TASKS DUE', summary.revisionTasksDue || 0)}
      ${summary.guest ? '' : statCard('BOOKMARKS', summary.bookmarksCount || 0)}
    </div>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">WHERE YOU ARE STRONG</p><h2>Strong topics</h2></div>
      ${strong.length
        ? `<div class="card-grid">${strong.map(topic => `<article class="content-card"><h3>${escapeHTML(topic.label || topic.topic_slug || '')}</h3><div class="bar"><i style="width:${topic.percentage ?? topic.mastery_score ?? 0}%"></i></div><p>${topic.percentage ?? topic.mastery_score ?? 0}%</p></article>`).join('')}</div>`
        : noData('Submit a practice quiz and KINETIQ will show which topics you scored best on.')}
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">WHERE TO FOCUS</p><h2>Weak topics</h2></div>
      ${weak.length
        ? `<div class="card-grid">${weak.map(topic => `<article class="content-card"><h3>${escapeHTML(topic.label || topic.topic_slug || '')}</h3><div class="bar"><i style="width:${topic.percentage ?? topic.mastery_score ?? 0}%"></i></div><p>${topic.percentage ?? topic.mastery_score ?? 0}%</p><a class="text-button" href="/quiz" data-route>Practise this →</a></article>`).join('')}</div>`
        : noData('Once you have practice results, the topics needing another pass appear here.')}
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">RECENT ACTIVITY</p><h2>What you have done</h2></div>
      ${results.length
        ? `<div class="activity-list">${results.slice(0, 8).map(result => `<article class="activity-row"><span class="tag">${escapeHTML(result.mode || 'Practice')}</span><b>${result.marksEarned}/${result.maxMarks} marks</b><span class="muted">${new Date(result.startedAt || Date.now()).toLocaleString()}</span><a class="text-button" href="/results/${escapeHTML(result.id)}" data-route>View →</a></article>`).join('')}</div>`
        : noData('Completed practice sessions will be listed here with their marks.')}
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">SUGGESTED NEXT</p><h2>Keep moving</h2></div>
      <div class="card-grid">
        ${next ? `<article class="content-card"><h3>Next lesson</h3><p>${escapeHTML(next.title)}</p><a class="text-button" href="/lesson/${escapeHTML(next.slug)}" data-route>Open lesson →</a></article>` : ''}
        <article class="content-card"><h3>Recommended simulation</h3><p>${escapeHTML(recommendedSimulation(currentUnit).label)}</p><a class="text-button" href="/simulations/${escapeHTML(recommendedSimulation(currentUnit).slug)}" data-route>Open the lab →</a></article>
        <article class="content-card"><h3>Recommended practice</h3><p>${weak.length ? `Target ${escapeHTML(weak[0].label || weak[0].topic_slug || 'your weakest topic')}.` : 'Start with a short five-question set to establish a baseline.'}</p><a class="text-button" href="/quiz" data-route>Start a quiz →</a></article>
        <article class="content-card"><h3>Apply it</h3><p>Case practice puts the current unit into a real context.</p><a class="text-button" href="/cases" data-route>Open case practice →</a></article>
      </div>
    </section>
  </section>`;
}

const SIM_BY_UNIT = { A: { slug: 'projectile', label: 'Projectile motion — vary the launch angle and watch the trajectory and flight time change.' }, B: { slug: 'gas-law', label: 'Ideal gas law — sweep the volume and watch pressure follow the inverse relationship.' }, C: { slug: 'shm', label: 'Mass-spring SHM — see displacement, velocity and the energy exchange over two full periods.' }, D: { slug: 'radioactive-decay', label: 'Radioactive decay — watch the exponential fall across five half-lives.' } };
const recommendedSimulation = unit => SIM_BY_UNIT[unit] || SIM_BY_UNIT.A;

export const masteryView = summary => `<section class="page">
  <p class="eyebrow">MASTERY OVERVIEW</p><h1>Know what to strengthen.</h1>
  <div class="card-grid">${[...(summary.strongestTopics || []), ...(summary.weakestTopics || [])].map(topic => `<article class="content-card"><h3>${escapeHTML(topic.topic_slug)}</h3><div class="bar"><i style="width:${topic.mastery_score || 0}%"></i></div><p>${topic.mastery_score || 0}% · ${escapeHTML(masteryService.level(topic.mastery_score || 0))}</p><a class="text-button" href="/quiz" data-route>Practise →</a></article>`).join('')
    || '<div class="empty-state"><h3>No mastery data yet</h3><p>Mastery scores are recorded against a signed-in account as you complete questions and quizzes. Guest practice results appear on your progress page instead.</p><a class="button" href="/progress" data-route>Open progress</a></div>'}</div>
</section>`;
