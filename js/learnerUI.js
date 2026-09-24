import { escapeHTML, orderLessons } from './utils.js';
import { masteryService } from './services/masteryService.js';
import { dueCount } from './flashcards.js';
import { collectMistakes } from './mistakeBank.js';
import { learningStorage as localStorage } from './services/learningStorage.js';

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
    const current = groups.get(topic.label) || { label: topic.label, earned: 0, max: 0, attempted: 0 };
    current.earned += topic.earned;
    current.max += topic.max;
    current.attempted += topic.attempted || 0;
    groups.set(topic.label, current);
  }));
  return [...groups.values()].map(item => ({ ...item, percentage: item.max ? Math.round(item.earned / item.max * 100) : 0 })).sort((left, right) => right.percentage - left.percentage);
}

function skillBreakdown(results) {
  const groups = new Map();
  results.forEach(result => (result.analytics?.skills || []).forEach(skill => {
    const current = groups.get(skill.label) || { label: skill.label, earned: 0, max: 0, attempted: 0 };
    current.earned += skill.earned || 0;
    current.max += skill.max || 0;
    current.attempted += skill.attempted || 0;
    groups.set(skill.label, current);
  }));
  return [...groups.values()]
    .map(item => ({ ...item, percentage: item.max ? Math.round(item.earned / item.max * 100) : 0 }))
    .sort((left, right) => right.attempted - left.attempted || right.percentage - left.percentage);
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
  const skills = skillBreakdown(results);
  const measured = summary.guest ? topics.filter(topic => topic.attempted >= 10) : [];
  const developing = summary.guest ? topics.filter(topic => topic.attempted < 10) : [];
  const strong = summary.guest ? measured.filter(topic => topic.percentage >= 75).slice(0, 3) : summary.strongestTopics || [];
  const weak = summary.guest ? [...measured].reverse().filter(topic => topic.percentage < 60).slice(0, 3) : summary.weakestTopics || [];
  const next = lessons.find(lesson => !completedSlugs.includes(lesson.slug));
  const currentUnit = next ? (next.unit || String(next.title).charAt(0)) : null;
  const unitName = (extra.units || []).find(unit => unit.id === currentUnit)?.title;
  const studyPlan = extra.settings?.study_plan || {};
  const examTime = studyPlan.exam_date ? new Date(`${studyPlan.exam_date}T00:00:00`).getTime() : null;
  const daysToExam = Number.isFinite(examTime) ? Math.max(0, Math.ceil((examTime - Date.now()) / 86400000)) : null;
  const dueCards = summary.guest ? dueCount() : summary.flashcardsDue || 0;
  const dueMistakes = summary.guest ? collectMistakes().filter(item => item.due).length : summary.revisionTasksDue || 0;
  const weakName = weak[0]?.label || weak[0]?.topic_slug || '';
  const simulations = extra.simulations || [];
  const currentSimulation = (next && simulations.find(item => item.lesson === next.slug))
    || simulations.find(item => item.lesson && lessons.find(lesson => lesson.slug === item.lesson && (lesson.unit || String(lesson.title).charAt(0)) === currentUnit))
    || simulations[0];
  const practiceHref = weakName
    ? `/quiz?mode=Weak%20Topic%20Quiz&topic=${encodeURIComponent(weakName)}&count=5`
    : '/quiz?mode=Quick%205&count=5';
  const adaptivePath = [
    {
      number: '01', kind: 'Learn', title: next ? next.title : 'Course lessons complete',
      detail: next ? 'Build the model from the lesson notes and worked examples.' : 'Keep the course secure with targeted practice.',
      href: next ? `/lesson/${next.slug}` : '/library', state: next ? 'Next' : 'Complete'
    },
    {
      number: '02', kind: 'Model', title: currentSimulation?.name || 'Simulation studio',
      detail: 'Change a variable and connect the equation to visible behaviour.',
      href: currentSimulation ? `/simulations/${currentSimulation.slug}` : '/simulations', state: currentSimulation ? 'Ready' : 'Browse'
    },
    {
      number: '03', kind: 'Practise', title: weakName ? `Target ${weakName}` : 'Create your baseline',
      detail: weakName ? 'Selected from reliable scored evidence.' : 'Complete a short set so KINETIQ can measure a real starting point.',
      href: practiceHref, state: weakName ? 'Measured' : 'Start'
    },
    {
      number: '04', kind: 'Retain', title: dueCards + dueMistakes ? `${dueCards + dueMistakes} reviews due` : 'Review schedule clear',
      detail: dueCards + dueMistakes ? 'Flashcards and missed questions are ready at their next interval.' : 'Nothing is overdue. Your next reviews will appear automatically.',
      href: '/revision', state: dueCards + dueMistakes ? 'Due' : 'Scheduled'
    }
  ];
  const today = [
    (dueCards || dueMistakes) && {
      kind: 'Review', title: `${dueCards + dueMistakes} item${dueCards + dueMistakes === 1 ? '' : 's'} due`,
      detail: `${dueCards} flashcard${dueCards === 1 ? '' : 's'} and ${dueMistakes} mistake${dueMistakes === 1 ? '' : 's'}.`, href: '/revision'
    },
    next && { kind: 'Learn', title: next.title, detail: 'Your next lesson in syllabus order.', href: `/lesson/${next.slug}` },
    { kind: 'Practise', title: weakName ? `Target ${weakName}` : 'Establish a practice baseline', detail: weakName ? 'Based on at least ten scored questions.' : 'A short set will create your first reliable evidence.', href: weakName ? `/quiz?mode=Topic%20Quiz&topic=${encodeURIComponent(weakName)}` : '/quiz?mode=Quick%205&count=5' }
  ].filter(Boolean).slice(0, 3);

  return `<section class="page progress-page">
    <p class="eyebrow">LEARNER DASHBOARD</p>
    <h1>${summary.guest ? 'Your learning on this device' : 'Your learning workspace'}</h1>
    <p class="page-lead">${summary.guest
      ? 'You are studying as a guest, so progress and practice results are stored in this browser only. Everything shown below comes from what you have actually done.'
      : 'Progress, mastery and practice results are synced to your KINETIQ account.'}</p>

    ${!summary.guest && (studyPlan.target_score || studyPlan.exam_date || studyPlan.weekly_hours) ? `<div class="study-context">
      ${studyPlan.target_score ? `<span><b>${escapeHTML(studyPlan.target_score)}</b> target score</span>` : ''}
      ${daysToExam !== null ? `<span><b>${daysToExam}</b> days to exam</span>` : ''}
      ${studyPlan.weekly_hours ? `<span><b>${escapeHTML(studyPlan.weekly_hours)}</b> hours per week</span>` : ''}
      <a href="/account" data-route>Update plan</a>
    </div>` : ''}

    <div class="progress-hero">
      <div class="library-summary__ring" role="img" aria-label="${percentage} percent of lessons complete"><b>${percentage}%</b></div>
      <div>
        <p class="library-summary__count"><b>${completed}</b> of <b>${lessons.length}</b> lessons complete</p>
        ${currentUnit ? `<p class="progress-current">Current unit: <b>${escapeHTML(currentUnit)}. ${escapeHTML(unitName || '')}</b></p>` : '<p class="progress-current">Every lesson is complete.</p>'}
        ${next ? `<a class="button" href="/lesson/${escapeHTML(next.slug)}" data-route>Continue with ${escapeHTML(next.title)} →</a>` : '<a class="button" href="/exam-prep" data-route>Move on to exam preparation →</a>'}
      </div>
    </div>

    <section class="lesson-section today-workspace">
      <div class="section-title"><p class="eyebrow">TODAY</p><h2>Your next three actions</h2></div>
      <p class="muted">Built only from due reviews, completed work and measured practice. KINETIQ never invents progress.</p>
      <ol class="today-list">${today.map((item, index) => `<li class="today-item">
        <span class="today-item__num">${String(index + 1).padStart(2, '0')}</span>
        <div><span class="tag">${escapeHTML(item.kind)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></div>
        <a class="outline" href="${escapeHTML(item.href)}" data-route>Open</a>
      </li>`).join('')}</ol>
    </section>

    <section class="lesson-section adaptive-workspace">
      <div class="section-title"><p class="eyebrow">YOUR LEARNING PATH</p><h2>Learn, model, practise, retain.</h2></div>
      <p class="muted">Each step opens the correct KINETIQ tool with your next topic or measured weakness already selected.</p>
      <ol class="adaptive-path">${adaptivePath.map(item => `<li>
        <a href="${escapeHTML(item.href)}" data-route>
          <span class="adaptive-path__number">${item.number}</span>
          <div><span class="tag">${escapeHTML(item.kind)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></div>
          <span class="adaptive-path__state">${escapeHTML(item.state)}</span>
        </a>
      </li>`).join('')}</ol>
    </section>

    <div class="dash-grid">
      ${statCard('LESSONS COMPLETE', `${completed}/${lessons.length}`)}
      ${statCard('PRACTICE ATTEMPTS', summary.guest ? results.length : summary.quizCount || 0, summary.guest ? 'Saved on this device' : 'From your account')}
      ${statCard('PRACTICE ACCURACY', accuracy === null || accuracy === undefined ? 'n/a' : `${accuracy}%`, accuracy === null || accuracy === undefined ? 'Complete a quiz to measure this' : 'Marks earned over marks available')}
      ${summary.guest ? '' : statCard('AVERAGE MASTERY', `${summary.averageMastery || 0}%`)}
      ${summary.guest ? '' : statCard('FLASHCARDS DUE', summary.flashcardsDue || 0)}
      ${summary.guest ? '' : statCard('REVISION TASKS DUE', summary.revisionTasksDue || 0)}
      ${summary.guest ? '' : statCard('BOOKMARKS', summary.bookmarksCount || 0)}
    </div>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">SKILL MASTERY</p><h2>How you are solving, not only what.</h2></div>
      <p class="muted">Each score comes from marks on questions tagged with that skill. A skill stays developing until at least five attempts exist.</p>
      ${skills.length ? `<div class="card-grid">${skills.slice(0,8).map(skill => `<article class="content-card"><h3>${escapeHTML(skill.label.replaceAll('-', ' '))}</h3><div class="bar"><i style="width:${skill.percentage}%"></i></div><p>${skill.percentage}% · ${skill.attempted} attempt${skill.attempted === 1 ? '' : 's'} · ${skill.attempted >= 5 ? 'measured' : 'developing'}</p></article>`).join('')}</div>` : noData('Complete practice with the expanded question bank to begin measuring formula choice, data analysis, units and written reasoning.')}
    </section>

    <section class="lesson-section">
      <div class="section-title">
        <p class="eyebrow">LESSON BY LESSON</p>
        <h2>Everything you have completed</h2>
      </div>
      <p class="muted completion-note">${summary.guest
        ? 'Stored in this browser. Sign in to keep this across your devices.'
        : 'Stored on your KINETIQ account, so it follows you to any device you sign in on.'}</p>
      ${(extra.units || []).map(unit => {
        const unitLessons = lessons.filter(lesson => (lesson.unit || String(lesson.title).charAt(0)) === unit.id);
        if (!unitLessons.length) return '';
        const doneHere = unitLessons.filter(lesson => completedSlugs.includes(lesson.slug)).length;
        return `<div class="completion-unit">
          <div class="completion-unit__head">
            <h3><span>${escapeHTML(unit.id)}</span> ${escapeHTML(unit.title)}</h3>
            <span class="completion-unit__count">${doneHere} of ${unitLessons.length} complete</span>
          </div>
          <ul class="completion-list">
            ${unitLessons.map(lesson => {
              const done = completedSlugs.includes(lesson.slug);
              return `<li class="completion-row ${done ? 'is-done' : ''}">
                <span class="completion-mark" aria-hidden="true">${done ? '✓' : ''}</span>
                <a href="/lesson/${escapeHTML(lesson.slug)}" data-route>${escapeHTML(lesson.title)}</a>
                <span class="completion-status">${done ? 'Completed' : 'Not started'}</span>
              </li>`;
            }).join('')}
          </ul>
        </div>`;
      }).join('')}
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">WHERE YOU ARE STRONG</p><h2>Strong topics</h2></div>
      <p class="muted">At least 10 scored answers and 75% of marks. Review targets are below 60%; scores between these are developing.</p>
      ${strong.length
        ? `<div class="card-grid">${strong.map(topic => `<article class="content-card"><h3>${escapeHTML(topic.label || topic.topic_slug || '')}</h3><div class="bar"><i style="width:${topic.percentage ?? topic.mastery_score ?? 0}%"></i></div><p>${topic.percentage ?? topic.mastery_score ?? 0}% · ${topic.attempted ?? topic.attempt_count ?? 0} questions</p></article>`).join('')}</div>`
        : noData(developing.length ? 'Keep practising. KINETIQ waits for ten answers in a topic before calling it a reliable strength.' : 'Submit a practice quiz and KINETIQ will begin gathering evidence.')}
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">WHERE TO FOCUS</p><h2>Weak topics</h2></div>
      ${weak.length
        ? `<div class="card-grid">${weak.map(topic => { const label = topic.label || topic.topic_slug || ''; return `<article class="content-card"><h3>${escapeHTML(label)}</h3><div class="bar"><i style="width:${topic.percentage ?? topic.mastery_score ?? 0}%"></i></div><p>${topic.percentage ?? topic.mastery_score ?? 0}% · ${topic.attempted ?? topic.attempt_count ?? 0} questions</p><a class="text-button" href="/quiz?mode=Topic%20Quiz&topic=${encodeURIComponent(label)}" data-route>Practise this topic →</a></article>`; }).join('')}</div>`
        : noData(developing.length ? `${developing.length} topic${developing.length === 1 ? ' has' : 's have'} early results, but not enough evidence yet. Reach ten answers in a topic to unlock a strength score.` : 'Once you have enough practice results, the topics needing another pass appear here.')}
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
        <article class="content-card"><h3>Recommended practice</h3><p>${weak.length ? `Target ${escapeHTML(weakName)}.` : 'Start with a short five-question set to establish a baseline.'}</p><a class="text-button" href="${practiceHref}" data-route>Start the right quiz →</a></article>
        <article class="content-card"><h3>Apply it</h3><p>Case practice puts the current unit into a real context.</p><a class="text-button" href="/cases" data-route>Open case practice →</a></article>
      </div>
    </section>

    <section class="lesson-section" data-progress-transfer>
      <div class="section-title"><p class="eyebrow">YOUR DATA</p><h2>Move your progress</h2></div>
      <p class="page-lead">${summary.guest
        ? 'Guest progress is stored in this browser, so a new device or a cleared cache would lose it. Save a file and you keep it yourself.'
        : 'Lesson, practice and flashcard records sync with your KINETIQ account. A personal export also protects device-only work such as your IA draft.'}</p>
      <div class="transfer-row">
        <button type="button" class="button" data-export-progress>Save my progress</button>
        <label class="outline transfer-import">
          Restore from a file
          <input type="file" accept="application/json,.json" data-import-progress hidden>
        </label>
      </div>
      <p class="muted transfer-status" role="status" data-transfer-status></p>
      <p class="muted transfer-note">The file holds lessons completed, flashcard and mistake schedules, saved answers, past attempts and your IA draft. It does not include your KIT conversations or account credentials.</p>
    </section>
  </section>`;
}

const SIM_BY_UNIT = { A: { slug: 'projectile', label: 'Projectile motion. Vary the launch angle and watch the trajectory and flight time change.' }, B: { slug: 'gas-law', label: 'Ideal gas law. Sweep the volume and watch pressure follow the inverse relationship.' }, C: { slug: 'shm', label: 'Mass-spring SHM. See displacement, velocity and the energy exchange over two full periods.' }, D: { slug: 'radioactive-decay', label: 'Radioactive decay. Watch the exponential fall across five half-lives.' } };
const recommendedSimulation = unit => SIM_BY_UNIT[unit] || SIM_BY_UNIT.A;

export const masteryView = summary => `<section class="page">
  <p class="eyebrow">MASTERY OVERVIEW</p><h1>Know what to strengthen.</h1>
  <div class="card-grid">${[...(summary.strongestTopics || []), ...(summary.weakestTopics || [])].map(topic => `<article class="content-card"><h3>${escapeHTML(topic.topic_slug)}</h3><div class="bar"><i style="width:${topic.mastery_score || 0}%"></i></div><p>${topic.mastery_score || 0}% · ${escapeHTML(masteryService.level(topic.mastery_score || 0))}</p><a class="text-button" href="/quiz" data-route>Practise →</a></article>`).join('')
    || '<div class="empty-state"><h3>No mastery data yet</h3><p>Mastery scores are recorded against a signed-in account as you complete questions and quizzes. Guest practice results appear on your progress page instead.</p><a class="button" href="/progress" data-route>Open progress</a></div>'}</div>
</section>`;

/**
 * Wires saving and restoring progress.
 *
 * Import replaces rather than merges: two half-merged review schedules would
 * be worse than either one alone, and a student restoring a backup expects
 * the backup. It is confirmed first, because it overwrites real work.
 */
export function bindProgressTransfer() {
  const section = document.querySelector('[data-progress-transfer]');
  if (!section) return undefined;
  const controller = new AbortController();
  const status = section.querySelector('[data-transfer-status]');
  const say = (message, tone = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  section.querySelector('[data-export-progress]')?.addEventListener('click', async () => {
    const { collectProgress, describe, exportFilename } = await import('./progressTransfer.js');
    const payload = collectProgress();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoked on the next turn so the download has certainly started.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    say(`Saved ${exportFilename()}: ${describe(payload)}.`, 'ok');
  }, { signal: controller.signal });

  section.querySelector('[data-import-progress]')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const { applyProgress, describe, validate } = await import('./progressTransfer.js');
    try {
      const payload = JSON.parse(await file.text());
      const problem = validate(payload);
      if (problem) throw new Error(problem);
      const saved = payload.exportedAt ? new Date(payload.exportedAt).toLocaleDateString() : 'an unknown date';
      const proceed = window.confirm(
        `Restore progress saved on ${saved}?\n\nIt contains ${describe(payload)}.\n\nThis replaces the progress currently in this browser.`
      );
      if (!proceed) { say('Nothing was changed.'); event.target.value = ''; return; }
      const restored = applyProgress(payload);
      say(`Restored ${restored.length} item${restored.length === 1 ? '' : 's'}. Reloading…`, 'ok');
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      say(error.message || 'That file could not be read.', 'bad');
    } finally {
      event.target.value = '';
    }
  }, { signal: controller.signal });

  return () => controller.abort();
}
