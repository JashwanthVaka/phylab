/**
 * The mistake bank. Every submitted quiz already stores a full review array,
 * but nothing read it back, so a wrong answer was seen once and forgotten.
 *
 * This collects wrong answers across all attempts on this device, groups them
 * by question, and schedules them for another look using the same spacing
 * intervals as the flashcard scheduler.
 */
import { escapeHTML } from './utils.js';

const RESULTS_PREFIX = 'phylab_quiz_results:';
const STATE_KEY = 'phylab_mistake_state_v1';
// Answers saved from Ask KINETIQ. A thing you had to look up is a thing you did
// not know, so it earns the same spaced review as a wrongly answered question.
const SAVED_KEY = 'phylab_saved_answers_v1';
// Days until a mistake is due again, by how many times it has since been answered correctly.
const INTERVALS = [0, 1, 3, 7, 16, 35];
const DAY = 86400000;

const readState = () => {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch { return {}; }
};
const writeState = state => {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
};

/** Every submitted attempt saved on this device, newest first. */
function allResults() {
  const rows = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(RESULTS_PREFIX)) continue;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value?.submitted && Array.isArray(value.review)) rows.push(value);
    } catch { /* skip unreadable entries */ }
  }
  return rows.sort((left, right) => (right.startedAt || 0) - (left.startedAt || 0));
}

const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; }
};

/** Saves a looked-up answer for spaced review. Returns false if already saved. */
export function saveAnswerForReview({ question, headline, body, href }) {
  const rows = readSaved();
  const id = `ask:${String(question).trim().toLowerCase()}`;
  if (rows.some(row => row.id === id)) return false;
  rows.push({
    id,
    question: String(question).trim(),
    headline: String(headline || '').trim(),
    body: String(body || '').trim().slice(0, 600),
    href: href || '',
    savedAt: Date.now(),
  });
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(rows.slice(-200))); } catch { return false; }
  return true;
}

export function isAnswerSaved(question) {
  const id = `ask:${String(question).trim().toLowerCase()}`;
  return readSaved().some(row => row.id === id);
}

export function removeSavedAnswer(id) {
  const rows = readSaved().filter(row => row.id !== id);
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(rows)); } catch { /* blocked */ }
}

/**
 * Collects every question answered wrongly at least once, keeping the most
 * recent wrong response and counting how often it has been missed.
 */
export function collectMistakes() {
  const state = readState();
  const byQuestion = new Map();
  allResults().forEach(result => {
    result.review.forEach(item => {
      const correct = item.r?.correct;
      const id = String(item.q?.id ?? '');
      if (!id) return;
      const existing = byQuestion.get(id) || {
        id, question: item.q, timesWrong: 0, timesRight: 0,
        lastAnswer: '', lastReason: '', lastAt: 0
      };
      if (correct) existing.timesRight += 1; else existing.timesWrong += 1;
      // Results are newest first, so only the first pass sets the latest answer.
      if (!existing.lastAt) {
        existing.lastAt = result.startedAt || 0;
        existing.lastAnswer = item.a || '';
        existing.lastReason = item.r?.reason || '';
        existing.lastCorrect = Boolean(correct);
      }
      byQuestion.set(id, existing);
    });
  });

  // Saved lookups join the same queue and are scheduled identically.
  readSaved().forEach(row => {
    byQuestion.set(row.id, {
      id: row.id,
      question: { id: row.id, question: row.question, topic: row.headline, level: '' },
      timesWrong: 1,
      timesRight: 0,
      lastAnswer: '',
      lastReason: row.body,
      lastAt: row.savedAt,
      lastCorrect: false,
      fromAsk: true,
      href: row.href,
    });
  });

  const now = Date.now();
  return [...byQuestion.values()]
    .filter(entry => entry.timesWrong > 0)
    .map(entry => {
      const streak = state[entry.id]?.streak || 0;
      const reviewedAt = state[entry.id]?.reviewedAt || entry.lastAt;
      const interval = INTERVALS[Math.min(streak, INTERVALS.length - 1)] * DAY;
      const dueAt = reviewedAt + interval;
      return { ...entry, streak, reviewedAt, dueAt, due: now >= dueAt, retired: streak >= INTERVALS.length - 1 };
    })
    .sort((left, right) => (right.due - left.due) || (right.timesWrong - left.timesWrong) || (left.dueAt - right.dueAt));
}

/** Records that a mistake was revisited. Getting it right advances the interval; wrong resets it. */
export function recordReview(id, gotItRight) {
  const state = readState();
  const streak = gotItRight ? Math.min((state[id]?.streak || 0) + 1, INTERVALS.length - 1) : 0;
  state[id] = { streak, reviewedAt: Date.now() };
  writeState(state);
  return streak;
}

const dueLabel = entry => {
  if (entry.due) return 'Due now';
  const days = Math.ceil((entry.dueAt - Date.now()) / DAY);
  return days <= 1 ? 'Due tomorrow' : `Due in ${days} days`;
};

function mistakeCard(entry) {
  const question = entry.question || {};
  return `<article class="mistake-card ${entry.due ? 'is-due' : ''}" data-mistake="${escapeHTML(entry.id)}">
    <header class="mistake-card__head">
      <span class="tag">${escapeHTML(question.topic || 'Practice')} · missed ${entry.timesWrong}×${entry.timesRight ? ` · correct ${entry.timesRight}×` : ''}</span>
      <span class="mistake-card__due">${escapeHTML(dueLabel(entry))}</span>
    </header>
    <h3>${escapeHTML(question.question || 'Question unavailable')}</h3>
    <div class="mistake-card__answers">
      <p><b>You answered:</b> <span class="mistake-wrong">${escapeHTML(entry.lastAnswer || 'no answer')}</span></p>
      <p><b>Correct answer:</b> <span class="mistake-right">${escapeHTML(question.correct_answer || '—')}</span></p>
      ${entry.lastReason ? `<p class="muted">${escapeHTML(entry.lastReason)}</p>` : ''}
    </div>
    ${question.solution ? `<details><summary>Worked solution</summary><p>${escapeHTML(question.solution)}</p></details>` : ''}
    <footer class="mistake-card__foot">
      <button type="button" class="button" data-review="right" data-id="${escapeHTML(entry.id)}">I understand it now</button>
      <button type="button" class="outline" data-review="wrong" data-id="${escapeHTML(entry.id)}">Still unsure</button>
      ${(question.lessonReferences || [])[0] ? `<a class="chip" href="/lesson/${escapeHTML(question.lessonReferences[0])}" data-route>Revise the lesson →</a>` : ''}
    </footer>
  </article>`;
}

export function mistakesPage() {
  const mistakes = collectMistakes();
  const due = mistakes.filter(entry => entry.due);
  const later = mistakes.filter(entry => !entry.due);

  if (!mistakes.length) {
    return `<section class="page mistakes-page">
      <p class="eyebrow">MISTAKE BANK</p>
      <h1>Every question you got wrong, in one place.</h1>
      <div class="empty-state">
        <h3>Nothing here yet</h3>
        <p>Submit a practice quiz. Anything you answer incorrectly is collected here automatically and brought back at widening intervals until it sticks.</p>
      </div>
      <a class="button" href="/quiz" data-route>Start a practice quiz →</a>
    </section>`;
  }

  return `<section class="page mistakes-page">
    <p class="eyebrow">MISTAKE BANK</p>
    <h1>Every question you got wrong, in one place.</h1>
    <p class="page-lead">Collected automatically from your submitted quizzes, plus anything you saved from Ask KINETIQ. Mark one as understood and it comes back later; miss it again and it returns sooner. Intervals run 1, 3, 7, 16 and 35 days.</p>

    <div class="library-summary">
      <div class="library-summary__ring" role="img" aria-label="${due.length} mistakes due"><b>${due.length}</b></div>
      <div>
        <p class="library-summary__count"><b>${mistakes.length}</b> question${mistakes.length === 1 ? '' : 's'} in your bank · <b>${due.length}</b> due now</p>
        ${due.length ? '<p class="muted">Work through the due ones below. Each is shown with what you answered and why it was marked wrong.</p>' : '<p class="library-summary__done">Nothing due right now. Come back when the next interval elapses.</p>'}
      </div>
    </div>

    ${due.length ? `<section class="lesson-section"><div class="section-title"><p class="eyebrow">DUE NOW</p><h2>Work through these</h2></div><div class="mistake-list">${due.map(mistakeCard).join('')}</div></section>` : ''}
    ${later.length ? `<section class="lesson-section"><div class="section-title"><p class="eyebrow">SCHEDULED</p><h2>Coming back later</h2></div><div class="mistake-list">${later.map(mistakeCard).join('')}</div></section>` : ''}
  </section>`;
}

export function bindMistakes() {
  const page = document.querySelector('.mistakes-page');
  if (!page) return undefined;
  const controller = new AbortController();
  page.addEventListener('click', event => {
    const button = event.target.closest('[data-review]');
    if (!button) return;
    recordReview(button.dataset.id, button.dataset.review === 'right');
    const card = button.closest('[data-mistake]');
    card.classList.add('is-reviewed');
    card.querySelector('.mistake-card__due').textContent = button.dataset.review === 'right' ? 'Scheduled for later' : 'Back tomorrow';
    button.closest('.mistake-card__foot').querySelectorAll('button').forEach(other => { other.disabled = true; });
  }, { signal: controller.signal });
  return () => controller.abort();
}
