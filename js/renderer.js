import { escapeHTML } from './utils.js';

export const emptyState = (title, text) => `<div class="empty-state"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p></div>`;
export const card = (title, body, className = '') => `<article class="content-card ${className}"><h3>${escapeHTML(title)}</h3>${body}</article>`;
export const section = (title, body, options = {}) => `<section class="lesson-section" id="${options.id || ''}"><div class="section-title"><p class="eyebrow">${escapeHTML(options.eyebrow || 'PHYLAB')}</p><h2>${escapeHTML(title)}</h2></div>${body}</section>`;
export const definition = item => card(item.term, `<p>${escapeHTML(item.meaning || item.definition)}</p>`, 'definition-card');
export const formula = item => `<article class="formula-block"><code>${escapeHTML(item.formula)}</code><h3>${escapeHTML(item.name || 'Formula')}</h3><p>${escapeHTML(item.explanation || item.topic || '')}</p></article>`;
export const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(header => `<th scope="col">${escapeHTML(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const list = items => `<ul class="content-list">${items.map(item => `<li>${escapeHTML(typeof item === 'string' ? item : item.explanation || item.heading || item.topic || '')}</li>`).join('')}</ul>`;
export const example = item => `<article class="example-block"><span class="tag">WORKED EXAMPLE</span><h3>${escapeHTML(item.question)}</h3>${item.solution ? `<ol>${item.solution.map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ol>` : ''}<p class="answer"><b>Answer:</b> ${escapeHTML(item.answer)}</p></article>`;
export const skeleton = count => `<div class="skeleton-grid">${Array.from({ length: count }, () => '<div class="skeleton"></div>').join('')}</div>`;
