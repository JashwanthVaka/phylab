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
import { learningStorage as localStorage } from './services/learningStorage.js';
import { personalFlashcards } from './notebookUI.js';

const CARD_KEY = 'phylab_flashcards_v1';
const DAY = 86400000;
const DAILY_KEY = 'kinetiq_daily_revision_v1';
const dayKey = () => new Date().toLocaleDateString('en-CA');

export function dailyQueue(cards, completed, previous = {}, day = dayKey()) {
  const today = previous.day === day ? previous : { day, ids: [], rated: [] };
  if (!today.ids.length) {
    today.ids = [...cards.filter(card => card.isDue).sort((a, b) => a.due - b.due),
      ...cards.filter(card => !card.seen && (card.personal || completed.includes(card.lessonSlug)))].slice(0, 20).map(card => card.id);
  }
  return today;
}

function readDaily() {
  try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch { return {}; }
}

const readCards = () => {
  try { return JSON.parse(localStorage.getItem(CARD_KEY) || '{}'); } catch { return {}; }
};
const writeCards = value => {
  try { localStorage.setItem(CARD_KEY, JSON.stringify(value)); } catch { /* storage blocked */ }
};

/** Builds every card in the course and tags it with its schedule state. */
export function scheduleFor(lessons, state = readCards(), now = Date.now()) {
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
        // A card the learner has never opened is new, not overdue. Treating
        // the whole course as late on day one produced an alarming 278-item
        // queue and made the planner less truthful, not more useful.
        isDue: Boolean(record && record.due <= now)
      });
    });
  });
  personalFlashcards().forEach(card => {
    const record = state[card.id];
    cards.push({
      ...card,
      interval: record?.interval ?? null,
      due: record?.due ?? null,
      seen: Boolean(record),
      isDue: Boolean(record && record.due <= now),
    });
  });
  return cards;
}

/** Records a rating using the same intervals the lesson decks use. */
export function rateCard(id, rating, supplied = null) {
  const state = readCards();
  const previous = supplied || state[id] || { interval: 0 };
  const interval = rating === 'again' ? 0
    : rating === 'easy' ? Math.max(7, (previous.interval || 1) * 2)
      : Math.max(1, (previous.interval || 0) + 1);
  state[id] = { interval, due: Date.now() + interval * DAY, reviewedAt: Date.now() };
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

export function revisionPage(index, lessons, completedSlugs = null, settings = null, cardState = null, weakTopics = []) {
  const cards = scheduleFor(lessons, cardState || readCards());
  const due = cards.filter(card => card.isDue);
  const unseen = cards.filter(card => !card.seen);
  const scheduled = cards.filter(card => card.seen && !card.isDue).sort((a, b) => a.due - b.due);
  const mistakes = collectMistakes();
  const mistakesDue = mistakes.filter(item => item.due).length;
  const completed = completedSlugs || getProgress().completedLessons || [];
  const weeklyHours = Number(settings?.study_plan?.weekly_hours);
  const availableNew = unseen.filter(card => card.personal || completed.includes(card.lessonSlug));
  const daily = dailyQueue(cards, completed, readDaily());
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(daily)); } catch { /* In-memory session remains available. */ }
  const reviewQueue = daily.ids.filter(id => !daily.rated.includes(id)).map(id => cards.find(card => card.id === id)).filter(Boolean);
  const plan = buildWeeklyPlan({
    lessons: index.lessonIndex || [],
    completed,
    dueCards: due.length,
    dueMistakes: mistakesDue,
    weakTopics,
    weeklyMinutes: Number.isFinite(weeklyHours) && weeklyHours > 0 ? Math.round(weeklyHours * 60) : 180,
  });

  return `<section class="page revision-page">
    <p class="eyebrow">REVISION PLANNER</p>
    <h1>What to study today.</h1>
    <p class="page-lead">Built from what you have actually done: lessons you have completed, flashcards whose interval has elapsed, and questions you have answered wrongly. Nothing here is invented. An empty planner means there is genuinely nothing due.</p>

    <div class="rev-summary">
      <article class="rev-stat ${due.length ? 'is-due' : ''}">
        <span class="tag">FLASHCARDS DUE</span><h2>${due.length}</h2>
        <p class="muted">review intervals elapsed</p>
      </article>
      <article class="rev-stat ${mistakesDue ? 'is-due' : ''}">
        <span class="tag">MISTAKES DUE</span><h2>${mistakesDue}</h2>
        <p class="muted">of ${mistakes.length} in your bank</p>
        ${mistakes.length ? '<a class="text-button" href="/mistakes" data-route>Open mistake bank →</a>' : ''}
      </article>
      <article class="rev-stat">
        <span class="tag">NEW CARDS</span><h2>${unseen.length}</h2>
        <p class="muted">${availableNew.length} available from completed lessons</p>
      </article>
    </div>

    ${weeklyPlanHTML(plan)}
    <p class="revision-session-status" role="status" data-session-status>${daily.rated.length} of ${daily.ids.length} cards reviewed today. Your daily session is capped at 20.</p>

    ${reviewQueue.length ? `<section class="lesson-section">
      <div class="section-title"><p class="eyebrow">START HERE</p><h2>Today’s flashcard queue</h2></div>
      <p class="muted">A maximum of 20 cards: overdue reviews first, then new cards from lessons you have completed. Reveal the answer and rate it honestly.</p>
      <div class="rev-deck">${reviewQueue.map(card => `<article class="rev-card" data-rev-card="${escapeHTML(card.id)}" data-rev-interval="${Number(card.interval) || 0}">
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
          ${card.personal ? '<a class="chip" href="/notebook" data-route>Open notebook →</a>' : `<a class="chip" href="/lesson/${escapeHTML(card.lessonSlug)}" data-route>Open lesson →</a>`}
        </footer>
      </article>`).join('')}</div>
      ${due.length > 20 ? `<p class="muted">The remaining due cards stay in your queue for another day.</p>` : ''}
    </section>` : `<section class="lesson-section">
      <div class="section-title"><h2>${daily.rated.length ? 'Daily session complete' : 'No session ready'}</h2></div>
      <div class="empty-state"><h3>${daily.rated.length ? 'You finished today’s cards' : 'No cards due right now'}</h3><p>${daily.rated.length ? 'Your next daily session will prioritise anything due, then add new cards from completed lessons up to the 20-card limit.' : completed.length ? 'Every rated card is still inside its interval. Complete another lesson to unlock its new cards, or come back when a review elapses.' : 'Complete your first lesson to unlock a small set of new cards. Unseen cards are never counted as overdue.'}</p></div>
      <a class="button" href="${daily.rated.length ? '/revision/print' : '/library'}" data-route>${daily.rated.length ? 'Build a printable revision pack' : 'Open the course library →'}</a>
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
    const record = rateCard(card.dataset.revCard, rate.dataset.revRate, { interval: Number(card.dataset.revInterval) || 0 });
    const daily = readDaily();
    if (daily.day === dayKey()) {
      daily.rated = [...new Set([...daily.rated, card.dataset.revCard])];
      try { localStorage.setItem(DAILY_KEY, JSON.stringify(daily)); } catch { /* Session still works. */ }
      page.querySelector('[data-session-status]').textContent = `${daily.rated.length} of ${daily.ids.length} cards reviewed today.${daily.rated.length === daily.ids.length ? ' Daily session complete.' : ''}`;
    }
    import('./services/flashcardService.js').then(async ({ flashcardService }) => {
      const result = await flashcardService.saveRecord(card.dataset.revCard, record);
      if (result?.error) page.querySelector('[data-session-status]').textContent += ' Saved on this device. Cloud sync needs a retry.';
    }).catch(() => {});
    card.classList.add('is-rated');
    const days = Math.round(record.interval);
    card.querySelector('.rev-due').textContent = days === 0 ? 'Needs review in your next daily session' : `Next in ${days} day${days === 1 ? '' : 's'}`;
    card.querySelectorAll('button').forEach(button => { button.disabled = true; });
  }, { signal: controller.signal });
  return () => controller.abort();
}
