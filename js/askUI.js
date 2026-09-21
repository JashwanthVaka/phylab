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
import { learningStorage as localStorage } from './services/learningStorage.js';
import { aiService } from './services/aiService.js';
import { contextManager } from './services/contextManager.js';
import { markdownService } from './services/markdownService.js';

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

const statusOrb = () => `<div class="kit-status" data-kit-status data-state="ready">
  <span class="kit-orb" aria-hidden="true">${Array.from({ length: 49 }, (_, index) => {
    const opacity = (0.18 + (index % 5) * 0.08).toFixed(2);
    const delay = -((index % 7) * 70);
    return `<i style="--dot-opacity:${opacity};--dot-delay:${delay}ms"></i>`;
  }).join('')}</span>
  <span><b>KIT is ready</b><small data-kit-status-label>Searching original KINETIQ material</small></span>
</div>`;

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
    <div class="ask-hero">
      <div><p class="eyebrow">ASK KINETIQ</p><h1>Ask a question.</h1>
      <p class="page-lead">Start with a source-cited answer from KINETIQ's lessons, formulae, worked examples and cases. When an AI provider is available, KIT can also turn those sources into a tailored explanation.</p></div>
      ${statusOrb()}
    </div>

    <div class="ask-engine" role="group" aria-label="Answer style">
      <button type="button" class="is-active" data-ask-engine="sources" aria-pressed="true">
        <b>Source answer</b><span>Fast, cited, no API key</span>
      </button>
      <button type="button" data-ask-engine="ai" aria-pressed="false" disabled>
        <b>AI tutor</b><span data-ai-engine-label>Checking availability…</span>
      </button>
    </div>

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

function aiAnswerHTML(content, sources = [], provider = '', complete = false, question = '') {
  const saved = complete && isAnswerSaved(question);
  return `<article class="ask-answer ask-answer--ai">
    <header class="ask-answer__head">
      <div><p class="eyebrow">AI TUTOR${provider ? ` · ${escapeHTML(provider)}` : ''}</p><h2>${complete ? 'KIT’s explanation' : 'KIT is writing…'}</h2></div>
      ${complete ? `<button type="button" class="outline ask-save" data-ask-save ${saved ? 'disabled' : ''}>${saved ? 'Saved for review ✓' : 'Save for review'}</button>` : ''}
    </header>
    <div class="ask-ai-copy">${content ? markdownService.render(content) : '<p class="muted">Connecting the question to KINETIQ’s course sources…</p>'}</div>
    ${sources.length ? `<footer class="ask-sources"><span>Sources used</span>${sources.map(source => `<a href="${escapeHTML(source.href || '/library')}" data-route>${escapeHTML(source.title || source.type || 'KINETIQ source')}</a>`).join('')}</footer>` : ''}
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
  const status = document.querySelector('[data-kit-status]');
  if (!form || !result || !input) return;

  let inFlight = null;
  let lastAnswer = null;
  let lastQuestion = '';
  let engine = 'sources';

  const renderHistory = () => { if (historyBox) historyBox.innerHTML = historyHTML(); };
  const setStatus = (state, heading, detail) => {
    if (!status) return;
    status.dataset.state = state;
    status.querySelector('b').textContent = heading;
    status.querySelector('[data-kit-status-label]').textContent = detail;
  };

  async function sourceAnswer(trimmed, fallback = '') {
    result.innerHTML = '<p class="muted ask-loading">Searching KINETIQ…</p>';
    setStatus('thinking', 'KIT is searching', 'Lessons, formulae, cases and worked examples');
    inFlight?.abort?.();
    const controller = new AbortController();
    inFlight = controller;

    try {
      const response = await fetch(`/api/answer?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'That search could not be completed.');
      lastAnswer = data;
      lastQuestion = trimmed;
      result.innerHTML = `${fallback ? `<p class="ai-fallback-note" role="status">${escapeHTML(fallback)} The source-cited answer is shown instead.</p>` : ''}${answerHTML(data, trimmed)}`;
      setStatus(data.answered ? 'found' : 'ready', data.answered ? 'Source found' : 'Try another question', data.answered ? 'Answer assembled with its KINETIQ source' : 'Use a topic name or a more specific relationship');
      // Only a question that actually produced an answer is worth remembering.
      if (data.answered) { pushHistory(trimmed); renderHistory(); }
    } catch (error) {
      if (error.name === 'AbortError') return;
      result.innerHTML = `<div class="empty-state ask-empty">
        <h3>That search did not complete</h3>
        <p>${escapeHTML(error.message)}</p>
        <p class="muted">If you are offline, previously opened lessons still work from the course library.</p>
      </div>`;
      setStatus('error', 'Search interrupted', 'Your saved learning data is unaffected');
    }
  }

  async function aiAnswer(trimmed) {
    inFlight?.abort?.();
    let content = '';
    let sources = [];
    let provider = '';
    let streamError = '';
    setStatus('thinking', 'KIT is explaining', 'Connecting your question to KINETIQ sources');
    result.innerHTML = aiAnswerHTML('', [], '', false, trimmed);

    const stream = aiService.stream(trimmed, {
      mode: 'Physics Teacher',
      context: contextManager.fromRoute(),
      onDelta: delta => {
        content += delta;
        result.innerHTML = aiAnswerHTML(content, sources, provider, false, trimmed);
      },
      onSources: rows => {
        sources = rows;
        result.innerHTML = aiAnswerHTML(content, sources, provider, false, trimmed);
      },
      onMeta: meta => {
        if (meta.providerLabel) provider = meta.providerLabel;
        result.innerHTML = aiAnswerHTML(content, sources, provider, false, trimmed);
      },
      onError: message => { streamError = message; },
    });
    inFlight = stream;
    await stream.done;
    inFlight = null;

    if (streamError || !content.trim()) {
      await sourceAnswer(trimmed, streamError || 'The AI provider returned no text.');
      return;
    }

    lastQuestion = trimmed;
    lastAnswer = {
      answered: true,
      headline: 'KIT AI explanation',
      sections: [{ body: content }],
      sources,
    };
    result.innerHTML = aiAnswerHTML(content, sources, provider, true, trimmed);
    setStatus('found', 'Explanation ready', `${provider || 'AI tutor'} used KINETIQ course sources`);
    pushHistory(trimmed);
    renderHistory();
  }

  async function ask(question) {
    const trimmed = String(question || '').trim();
    if (!trimmed) return;
    const url = `/ask?q=${encodeURIComponent(trimmed)}`;
    if (location.pathname + location.search !== url) history.replaceState({}, '', url);
    if (engine === 'ai') await aiAnswer(trimmed);
    else await sourceAnswer(trimmed);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value);
  });

  // Suggestions, related-question chips and history entries all re-ask.
  form.closest('.ask-page')?.addEventListener('click', event => {
    const engineButton = event.target.closest('[data-ask-engine]');
    if (engineButton && !engineButton.disabled) {
      engine = engineButton.dataset.askEngine;
      document.querySelectorAll('[data-ask-engine]').forEach(button => {
        const active = button === engineButton;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      setStatus('ready', engine === 'ai' ? 'AI tutor selected' : 'Source answer selected', engine === 'ai' ? 'Generated explanation with automatic source fallback' : 'Fast answer from original KINETIQ material');
      return;
    }
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

  // A configured key is never exposed here. The browser receives only the
  // provider name and whether the server has its environment variable.
  fetch('/api/ai/providers').then(response => response.ok ? response.json() : null).then(data => {
    const ready = data?.providers?.filter(provider => provider.configured) || [];
    const button = document.querySelector('[data-ask-engine="ai"]');
    const label = document.querySelector('[data-ai-engine-label]');
    if (!button || !label) return;
    if (ready.length) {
      button.disabled = false;
      label.textContent = `${ready.map(provider => provider.label).join(' or ')} with source fallback`;
    } else {
      label.textContent = 'Source mode remains available';
    }
  }).catch(() => {});

  const initial = new URLSearchParams(location.search).get('q');
  if (initial) ask(initial);
  else input.focus();
}
