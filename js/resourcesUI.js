import { escapeHTML } from './utils.js';

const linkFor = item => {
  if (item.route) return `<a class="text-button" href="${escapeHTML(item.route)}" data-route>Open →</a>`;
  if (item.url) return `<a class="text-button" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Visit site ↗</a>`;
  return '<span class="resource-note">Obtain through your school</span>';
};

/** Source library. Links and PHYLAB-generated material only — no copyrighted files are hosted. */
export function resourcesPage(index) {
  const groups = index.resources || [];
  if (!groups.length) return '<section class="page"><p class="eyebrow">SOURCE LIBRARY</p><h1>Resources unavailable.</h1><div class="empty-state"><h3>No resources loaded</h3><p>The resource content could not be read from the server.</p></div></section>';
  return `<section class="page resources-page">
    <p class="eyebrow">SOURCE LIBRARY</p>
    <h1>Everything you can study from.</h1>
    <p class="page-lead">PHYLAB’s own reference material and tools, plus links to freely published external sources.</p>
    <p class="practice-note"><b>On copyright.</b> PHYLAB does not host or redistribute the IB data booklet, past papers, mark schemes or coursebooks. Those are copyrighted. Use the licensed copies your school provides.</p>

    ${groups.map(group => `<section class="lesson-section">
      <div class="section-title"><p class="eyebrow">${escapeHTML(String(group.category).toUpperCase())}</p><h2>${escapeHTML(group.category)}</h2></div>
      <p class="resources-intro">${escapeHTML(group.description)}</p>
      <div class="card-grid">
        ${(group.items || []).map(item => `<article class="content-card resource-card resource-card--${escapeHTML(item.kind || 'internal')}">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.detail)}</p>
          ${linkFor(item)}
        </article>`).join('')}
      </div>
    </section>`).join('')}
  </section>`;
}
