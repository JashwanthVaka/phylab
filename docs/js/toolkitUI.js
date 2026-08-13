import { escapeHTML } from './utils.js';

/** Reusable study methods: one numbered procedure per question type. */
export function toolkitPage(index) {
  const methods = index.toolkit || [];
  if (!methods.length) return '<section class="page"><p class="eyebrow">ACTIVE TOOLKIT</p><h1>Methods unavailable.</h1><div class="empty-state"><h3>No methods loaded</h3><p>The toolkit content could not be read from the server.</p></div></section>';
  return `<section class="page toolkit-page">
    <p class="eyebrow">ACTIVE TOOLKIT</p>
    <h1>Don’t just read it.<br><em>Work with it.</em></h1>
    <p class="page-lead">Five procedures that turn a physics question into a sequence of decisions. Pick the one that matches what the question is asking you to do.</p>
    <nav class="toolkit-jump" aria-label="Jump to a method">${methods.map(method => `<a href="#${escapeHTML(method.slug)}">${escapeHTML(method.title)}</a>`).join('')}</nav>
    <div class="toolkit-list">
      ${methods.map((method, index2) => `<article class="toolkit-method" id="${escapeHTML(method.slug)}">
        <header class="toolkit-method__head">
          <span class="toolkit-method__index">${String(index2 + 1).padStart(2, '0')}</span>
          <div><h2>${escapeHTML(method.title)}</h2><p class="toolkit-method__purpose">${escapeHTML(method.purpose)}</p></div>
        </header>
        <ol class="toolkit-steps">${(method.steps || []).map(step => `<li><b>${escapeHTML(step.heading)}</b><span>${escapeHTML(step.detail)}</span></li>`).join('')}</ol>
        ${method.example ? `<p class="toolkit-example"><b>In practice:</b> ${escapeHTML(method.example)}</p>` : ''}
      </article>`).join('')}
    </div>
    <section class="lesson-section">
      <h2>Put a method to work</h2>
      <div class="card-grid">
        <article class="content-card"><h3>Case practice</h3><p>Apply these methods to real-world physics contexts organised by unit.</p><a class="text-button" href="/cases" data-route>Open case practice →</a></article>
        <article class="content-card"><h3>Question patterns</h3><p>See how each command term expects the method to be presented.</p><a class="text-button" href="/patterns" data-route>Open question patterns →</a></article>
      </div>
    </section>
  </section>`;
}
