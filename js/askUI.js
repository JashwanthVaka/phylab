/**
 * Ask KINETIQ — question answering with no AI provider and no API key.
 *
 * This is not a chatbot and does not pretend to be one. It searches KINETIQ's
 * own lessons, formulas, worked examples, cases and command terms, and lays the
 * best passages out as an answer with the source beside each one. Because it
 * only ever returns text already written into a lesson, it cannot invent
 * physics, and the same question always produces the same answer.
 */

import { escapeHTML } from './utils.js';
import { saveAnswerForReview, isAnswerSaved } from './mistakeBank.js';

const HISTORY_KEY = 'kinetiq_ask_history_v1';

const readHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
};
const pushHistory = question => {
  const rows = readHistory().filter(row => row.q !== question);
  rows.unshift({ q: question, at: Date.now() });
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, 12))); } catch { /* blocked */ }
};
const clearHistory = () => {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* blocked */ }
};

const SUGGESTIONS = [
  'What is escape speed?',
  'Why does a closed pipe have no even harmonics?',
  'First law of thermodynamics sign convention',
  'What does the command term "deduce" mean?',
  'How do I find the gradient uncertainty?',
  'Explain terminal velocity',
];

const CONFIDENCE = {
  strong:  { label: 'Direct match', tone: 'ok' },
  partial: { label: 'Close match',  tone: 'warn' },
  weak:    { label: 'Loose match',  tone: 'warn' },
  none:    { label: 'No match',     tone: 'bad' },
};

const ago = timestamp => {
  const mins = Math.round((Date.now() - timestamp) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

export function askPage(query = '') {
  return `<section class="page ask-page">
    <p class="eyebrow">ASK KINETIQ</p>
    <h1>Ask a question.</h1>
    <p class="page-lead">Answers come from KINETIQ's own lessons, formulae, worked examples and cases — every passage carries the lesson it came from, so you can always check it. No account and no API key needed.</p>

    <form class="ask-form" data-ask-form>
      <label class="search large-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" id="askInput" name="q" autocomplete="off"
               placeholder="e.g. why is a satellite in a lower orbit faster?"
               value="${escapeHTML(query)}" aria-label="Your question">
      </label>
      <button class="btn btn-primary" type="submit">Answer</button>
    </form>

    <div class="ask-suggestions" aria-label="Example questions">
      ${SUGGESTIONS.map(s => `<button type="button" class="chip" data-ask-suggest="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join('')}
    </div>

    <div data-ask-result aria-live="polite"></div>
    <div data-ask-history></div>
  </section>`;
}

function relatedHTML(related) {
  if (!related?.length) return '';
  return `<div class="ask-related">
    <span>Next question</span>
    ${related.map(item => `<button type="button" class="chip" data-ask-suggest="${escapeHTML(item.title)}">${escapeHTML(item.title)}</button>`).join('')}
  </div>`;
}

function answerHTML(data, question) {
  if (!data.answered) {
    return `<div class="empty-state ask-empty">
      <h3>${escapeHTML(data.headline)}</h3>
      <p>${escapeHTML(data.note || '')}</p>
    </div>`;
  }

  const conf = CONFIDENCE[data.confidence] || CONFIDENCE.partial;
  const saved = isAnswerSaved(question);

  return `<article class="ask-answer">
    <header class="ask-answer__head">
      <h2>${escapeHTML(data.headline)}</h2>
      <div class="ask-answer__actions">
        <span class="ask-confidence is-${conf.tone}">${escapeHTML(conf.label)}</span>
        <button type="button" class="outline ask-save" data-ask-save ${saved ? 'disabled' : ''}>
          ${saved ? 'Saved for review ✓' : 'Save for review'}
        </button>
      </div>
    </header>
    ${data.note ? `<p class="ask-note">${escapeHTML(data.note)}</p>` : ''}
    <div class="ask-sections">
      ${data.sections.map(section => `
        <section class="ask-section">
          <p class="ask-section__label">${escapeHTML(section.label)}</p>
          <p class="ask-section__body">${escapeHTML(section.body)}</p>
          ${section.href ? `<a class="ask-section__src" href="${escapeHTML(section.href)}" data-route>${escapeHTML(section.topic || section.title || 'Open source')} →</a>` : ''}
        </section>`).join('')}
    </div>
    ${relatedHTML(data.related)}
    ${data.sources.length ? `<footer class="ask-sources">
      <span>Sources</span>
      ${data.sources.map(s => `<a href="${escapeHTML(s.href)}" data-route>${escapeHTML(s.title || s.href)}</a>`).join('')}
    </footer>` : ''}
  </article>`;
}

function historyHTML() {
  const rows = readHistory();
  if (!rows.length) return '';
  return `<section class="ask-history">
    <div class="ask-history__head">
      <p class="eyebrow">YOU ASKED BEFORE</p>
      <button type="button" class="text-button" data-ask-clear>Clear</button>
    </div>
    <ul>
      ${rows.map(row => `<li>
        <button type="button" data-ask-suggest="${escapeHTML(row.q)}">${escapeHTML(row.q)}</button>
        <span>${escapeHTML(ago(row.at))}</span>
      </li>`).join('')}
    </ul>
  </section>`;
}

export function bindAsk() {
  const form = document.querySelector('[data-ask-form]');
  const result = document.querySelector('[data-ask-result]');
  const historyBox = document.querySelector('[data-ask-history]');
  const input = document.getElementById('askInput');
  if (!form || !result || !input) return;

  let inFlight = null;
  let lastAnswer = null;
  let lastQuestion = '';

  const renderHistory = () => { if (historyBox) historyBox.innerHTML = historyHTML(); };

  async function ask(question) {
    const trimmed = String(question || '').trim();
    if (!trimmed) return;

    const url = `/ask?q=${encodeURIComponent(trimmed)}`;
    if (location.pathname + location.search !== url) history.replaceState({}, '', url);

    result.innerHTML = '<p class="muted ask-loading">Searching KINETIQ…</p>';
    inFlight?.abort?.();
    const controller = new AbortController();
    inFlight = controller;

    try {
      const response = await fetch(`/api/answer?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'That search could not be completed.');
      lastAnswer = data;
      lastQuestion = trimmed;
      result.innerHTML = answerHTML(data, trimmed);
      // Only a question that actually produced an answer is worth remembering.
      if (data.answered) { pushHistory(trimmed); renderHistory(); }
    } catch (error) {
      if (error.name === 'AbortError') return;
      result.innerHTML = `<div class="empty-state ask-empty">
        <h3>That search did not complete</h3>
        <p>${escapeHTML(error.message)}</p>
        <p class="muted">If you are offline, previously opened lessons still work from the course library.</p>
      </div>`;
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value);
  });

  // Suggestions, related-question chips and history entries all re-ask.
  document.addEventListener('click', event => {
    const suggest = event.target.closest('[data-ask-suggest]');
    if (suggest) {
      input.value = suggest.dataset.askSuggest;
      input.scrollIntoView({ block: 'nearest' });
      ask(input.value);
      return;
    }
    if (event.target.closest('[data-ask-clear]')) {
      clearHistory();
      renderHistory();
      return;
    }
    const save = event.target.closest('[data-ask-save]');
    if (save && lastAnswer?.answered) {
      const ok = saveAnswerForReview({
        question: lastQuestion,
        headline: lastAnswer.headline,
        body: lastAnswer.sections[0]?.body || '',
        href: lastAnswer.sources[0]?.href || '',
      });
      save.disabled = true;
      save.textContent = ok ? 'Saved for review ✓' : 'Already saved ✓';
    }
  });

  renderHistory();

  const initial = new URLSearchParams(location.search).get('q');
  if (initial) ask(initial);
  else input.focus();
}
