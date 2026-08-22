import { escapeHTML } from './utils.js';

/** Question-pattern library: how to answer each IB command term. */
export function patternsPage(index) {
  const patterns = index.questionPatterns || [];
  if (!patterns.length) return '<section class="page"><p class="eyebrow">QUESTION PATTERNS</p><h1>Patterns unavailable.</h1><div class="empty-state"><h3>No patterns loaded</h3><p>The question-pattern content could not be read from the server.</p></div></section>';
  const groups = [...new Set(patterns.map(pattern => pattern.group || 'Other'))];
  return `<section class="page patterns-page">
    <p class="eyebrow">QUESTION PATTERNS</p>
    <h1>How to answer physics questions.</h1>
    <p class="page-lead">Every IB command term expects a particular shape of answer. Match the pattern and the marks follow. Mark guidance here is KINETIQ’s own study advice, not an official IB mark scheme.</p>

    <div class="patterns-controls">
      <label class="search library-search"><span>⌕</span><input id="patternSearch" type="search" autocomplete="off" placeholder="Search a command term…" aria-label="Filter command terms"></label>
      <div class="library-chips" role="group" aria-label="Filter by question group">
        <button type="button" class="chip is-active" data-filter-group="">All types</button>
        ${groups.map(group => `<button type="button" class="chip" data-filter-group="${escapeHTML(group)}">${escapeHTML(group)}</button>`).join('')}
      </div>
    </div>
    <p class="library-count" data-pattern-count aria-live="polite"></p>

    <div class="patterns-list">
      ${patterns.map(pattern => `<article class="pattern-card" id="${escapeHTML(pattern.slug)}" data-pattern data-group="${escapeHTML(pattern.group || 'Other')}" data-text="${escapeHTML(`${pattern.command} ${pattern.meaning} ${pattern.group || ''}`.toLowerCase())}">
        <header class="pattern-card__head">
          <h2>${escapeHTML(pattern.command)}</h2>
          <span class="pattern-card__marks">${escapeHTML(pattern.marks || '')} marks · ${escapeHTML(pattern.group || '')}</span>
        </header>
        <p class="pattern-card__meaning">${escapeHTML(pattern.meaning)}</p>
        <div class="pattern-card__body">
          <div>
            <h3>Response method</h3>
            <ol class="pattern-steps">${(pattern.method || []).map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ol>
          </div>
          <div>
            <h3>Common mistakes</h3>
            <ul class="pattern-mistakes">${(pattern.mistakes || []).map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
          </div>
        </div>
        <details class="pattern-example">
          <summary>Example question and model answer</summary>
          <p class="pattern-example__q"><b>Question.</b> ${escapeHTML(pattern.example || '')}</p>
          <p class="pattern-example__a"><b>Model answer.</b> ${escapeHTML(pattern.answer || '')}</p>
        </details>
        <footer class="pattern-card__foot">
          ${(pattern.lessons || []).map(slug => `<a class="chip" href="/lesson/${escapeHTML(slug)}" data-route>Lesson: ${escapeHTML(slug.replace(/-/g, ' '))}</a>`).join('')}
          <a class="chip" href="/quiz" data-route>Practise this →</a>
        </footer>
      </article>`).join('')}
    </div>
    <p class="library-empty" data-pattern-empty hidden>No command terms match your filters.</p>
  </section>`;
}

export function bindPatterns() {
  const page = document.querySelector('.patterns-page');
  if (!page) return undefined;
  const controller = new AbortController();
  const cards = [...page.querySelectorAll('[data-pattern]')];
  const count = page.querySelector('[data-pattern-count]');
  const empty = page.querySelector('[data-pattern-empty]');
  const filters = { group: '', text: '' };

  const apply = () => {
    let visible = 0;
    cards.forEach(card => {
      const show = (!filters.group || card.dataset.group === filters.group) && (!filters.text || card.dataset.text.includes(filters.text));
      card.hidden = !show;
      if (show) visible += 1;
    });
    empty.hidden = visible > 0;
    count.textContent = visible === cards.length ? `Showing all ${cards.length} command terms.` : `Showing ${visible} of ${cards.length} command terms.`;
  };

  page.querySelector('#patternSearch').addEventListener('input', event => { filters.text = event.target.value.trim().toLowerCase(); apply(); }, { signal: controller.signal });
  page.querySelectorAll('[data-filter-group]').forEach(button => button.addEventListener('click', () => {
    filters.group = button.dataset.filterGroup;
    page.querySelectorAll('[data-filter-group]').forEach(other => other.classList.toggle('is-active', other === button));
    apply();
  }, { signal: controller.signal }));

  apply();
  return () => controller.abort();
}
