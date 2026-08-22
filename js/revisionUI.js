/**
 * The revision planner. Was a stub that told you to sign in and did nothing.
 *
 * Flashcards already recorded an interval and a due date whenever you rated a
 * card, but nothing ever read that back, so the scheduling was invisible and
 * the deck on a lesson page always showed every card regardless. This surfaces
 * what is actually due across the whole course, alongside the mistake bank.
 */
import { escapeHTML } from './utils.js';
import { lessonFlashcards } from './flashcards.js';
import { collectMistakes } from './mistakeBank.js';
import { buildWeeklyPlan } from './studyPlan.js';
import { getProgress } from './utils.js';

const CARD_KEY = 'phylab_flashcards_v1';
const DAY = 86400000;

const readCards = () => {
  try { return JSON.parse(localStorage.getItem(CARD_KEY) || '{}'); } catch { return {}; }
};
const writeCards = value => {
  try { localStorage.setItem(CARD_KEY, JSON.stringify(value)); } catch { /* storage blocked */ }
};

/** Builds every card in the course and tags it with its schedule state. */
export function scheduleFor(lessons) {
  const state = readCards();
  const now = Date.now();
  const cards = [];
  lessons.forEach(lesson => {
    lessonFlashcards(lesson).forEach(card => {
      const record = state[card.id];
      cards.push({
        ...card,
        lessonTitle: lesson.title,
        lessonSlug: lesson.slug,
        interval: record?.interval ?? null,
        due: record?.due ?? null,
        seen: Boolean(record),
        isDue: !record || record.due <= now
      });
    });
  });
  return cards;
}

/** Records a rating using the same intervals the lesson decks use. */
export function rateCard(id, rating) {
  const state = readCards();
  const previous = state[id] || { interval: 0 };
  const interval = rating === 'again' ? 0
    : rating === 'easy' ? Math.max(7, (previous.interval || 1) * 2)
      : Math.max(1, (previous.interval || 0) + 1);
  state[id] = { interval, due: Date.now() + interval * DAY };
  writeCards(state);
  return state[id];
}

const dueLabel = card => {
  if (!card.seen) return 'New';
  if (card.isDue) return 'Due';
  const days = Math.ceil((card.due - Date.now()) / DAY);
  return days <= 1 ? 'Due tomorrow' : `In ${days} days`;
};


/**
 * Renders the week ahead. Shown only when there is genuinely something to do,
 * because an empty plan padded with filler is worse than no plan.
 */
function weeklyPlanHTML(plan) {
  if (!plan.items.length) {
    return plan.exhausted
      ? `<section class="lesson-section"><div class="section-title"><p class="eyebrow">THIS WEEK</p><h2>Nothing outstanding</h2></div><p class="muted">Every lesson is complete and nothing is due for review. Practise a past topic, or come back when a card elapses.</p></section>`
      : "";
  }
  const hours = (plan.minutes / 60).toFixed(1).replace(/\.0$/, "");
  return `<section class="lesson-section plan-section">
    <div class="section-title">
      <p class="eyebrow">THIS WEEK</p>
      <h2>About ${hours} hour${plan.minutes === 60 ? "" : "s"} of work</h2>
    </div>
    <p class="page-lead">Ordered by what costs you most to leave: overdue review first, then the next lesson, then practice aimed at a measured weakness.</p>
    <ol class="plan-list">
      ${plan.items.map((item, position) => `<li class="plan-item">
        <span class="plan-item__num">${String(position + 1).padStart(2, "0")}</span>
        <div class="plan-item__body">
          <span class="plan-item__kind">${escapeHTML(item.kind)}</span>
          <a href="${escapeHTML(item.href)}" data-route><b>${escapeHTML(item.title)}</b></a>
          <span class="plan-item__detail">${escapeHTML(item.detail)}</span>
        </div>
        <span class="plan-item__time">${Math.round(item.minutes)} min</span>
      </li>`).join("")}
    </ol>
  </section>`;
}

export function revisionPage(index, lessons) {
  const cards = scheduleFor(lessons);
  const due = cards.filter(card => card.isDue);
  const scheduled = cards.filter(card => !card.isDue).sort((a, b) => a.due - b.due);
  const mistakes = collectMistakes();
  const mistakesDue = mistakes.filter(item => item.due).length;
  const completed = getProgress().completedLessons || [];
  const plan = buildWeeklyPlan({
    lessons: index.lessonIndex || [],
    completed,
    dueCards: due.length,
    dueMistakes: mistakesDue,
    weakTopics: [],
    weeklyMinutes: 180,
  });

  return `<section class="page revision-page">
    <p class="eyebrow">REVISION PLANNER</p>
    <h1>What to study today.</h1>
    <p class="page-lead">Built from what you have actually done on this device: flashcards whose interval has elapsed, and questions you have answered wrongly. Nothing here is invented — an empty planner means there is genuinely nothing due.</p>

    <div class="rev-summary">
      <article class="rev-stat ${due.length ? 'is-due' : ''}">
        <span class="tag">FLASHCARDS DUE</span><h2>${due.length}</h2>
        <p class="muted">of ${cards.length} across ${lessons.length} lessons</p>
      </article>
      <article class="rev-stat ${mistakesDue ? 'is-due' : ''}">
        <span class="tag">MISTAKES DUE</span><h2>${mistakesDue}</h2>
        <p class="muted">of ${mistakes.length} in your bank</p>
        ${mistakes.length ? '<a class="text-button" href="/mistakes" data-route>Open mistake bank →</a>' : ''}
      </article>
      <article class="rev-stat">
        <span class="tag">CARDS NEVER SEEN</span><h2>${cards.filter(card => !card.seen).length}</h2>
        <p class="muted">rate a card once and it enters the schedule</p>
      </article>
    </div>

    ${weeklyPlanHTML(plan)}

    ${due.length ? `<section class="lesson-section">
      <div class="section-title"><p class="eyebrow">START HERE</p><h2>Flashcards due now</h2></div>
      <p class="muted">Reveal the answer, then rate it. Again resets the interval, Good adds a day, Easy doubles it.</p>
      <div class="rev-deck">${due.slice(0, 30).map(card => `<article class="rev-card" data-rev-card="${escapeHTML(card.id)}">
        <header><span class="tag">${escapeHTML(card.lessonTitle)}</span><span class="rev-due">${escapeHTML(dueLabel(card))}</span></header>
        <h3>${escapeHTML(card.front)}</h3>
        <div class="rev-answer" hidden><p>${escapeHTML(card.back)}</p></div>
        <footer>
          <button type="button" class="outline" data-rev-reveal>Reveal answer</button>
          <span class="rev-ratings" hidden>
            <button type="button" class="outline" data-rev-rate="again">Again</button>
            <button type="button" class="outline" data-rev-rate="good">Good</button>
            <button type="button" class="button" data-rev-rate="easy">Easy</button>
          </span>
          <a class="chip" href="/lesson/${escapeHTML(card.lessonSlug)}" data-route>Open lesson →</a>
        </footer>
      </article>`).join('')}</div>
      ${due.length > 30 ? `<p class="muted">Showing the first 30 of ${due.length}. Work through these and reload for more.</p>` : ''}
    </section>` : `<section class="lesson-section">
      <div class="section-title"><p class="eyebrow">NOTHING DUE</p><h2>You are up to date</h2></div>
      <div class="empty-state"><h3>No cards due right now</h3><p>${cards.length ? 'Every card you have rated is still inside its interval. Come back when one elapses, or open a lesson to work through its deck.' : 'Open a lesson, reveal a flashcard and rate it. From then on it appears here when its interval elapses.'}</p></div>
      <a class="button" href="/library" data-route>Open the course library →</a>
    </section>`}

    ${scheduled.length ? `<section class="lesson-section">
      <div class="section-title"><p class="eyebrow">COMING UP</p><h2>Scheduled</h2></div>
      <div class="rev-upcoming">${scheduled.slice(0, 24).map(card => `<div class="rev-upcoming-row">
        <span>${escapeHTML(card.front)}</span>
        <span class="muted">${escapeHTML(card.lessonTitle)}</span>
        <span class="rev-due">${escapeHTML(dueLabel(card))}</span>
      </div>`).join('')}</div>
    </section>` : ''}
  </section>`;
}

export function bindRevision() {
  const page = document.querySelector('.revision-page');
  if (!page) return undefined;
  const controller = new AbortController();
  page.addEventListener('click', event => {
    const card = event.target.closest('[data-rev-card]');
    if (!card) return;
    if (event.target.matches('[data-rev-reveal]')) {
      card.querySelector('.rev-answer').hidden = false;
      card.querySelector('.rev-ratings').hidden = false;
      event.target.hidden = true;
      return;
    }
    const rate = event.target.closest('[data-rev-rate]');
    if (!rate) return;
    const record = rateCard(card.dataset.revCard, rate.dataset.revRate);
    card.classList.add('is-rated');
    const days = Math.round(record.interval);
    card.querySelector('.rev-due').textContent = days === 0 ? 'Back tomorrow' : `Next in ${days} day${days === 1 ? '' : 's'}`;
    card.querySelectorAll('button').forEach(button => { button.disabled = true; });
  }, { signal: controller.signal });
  return () => controller.abort();
}
