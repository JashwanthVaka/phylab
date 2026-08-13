import { escapeHTML, slugify } from './utils.js';
import { calculatorTools } from './calculatorEngine.js';

/** In-memory weighted search index for the current content catalogue. */
export class SearchIndex {
  constructor(index) {
    this.entries = [
      ...index.lessonIndex.map(item => ({ type: 'Lesson', title: item.title, text: `${item.title} ${item.topicLabel} ${item.summary || ''}`, href: `/lesson/${item.slug}`, weight: 8 })),
      ...index.formulas.map(item => ({ type: 'Formula', title: item.name, text: `${item.name} ${item.formula} ${item.topic}`, href: '/formulas', weight: 6 })),
      ...index.glossary.map(item => ({ type: 'Definition', title: item.term, text: `${item.term} ${item.definition} ${item.topic}`, href: `/search?q=${encodeURIComponent(item.term)}`, weight: 5 })),
      ...index.questions.map(item => ({ type: 'Question', title: item.topic, text: `${item.topic} ${item.question} ${item.type}`, href: '/quiz', weight: 4 })),
      ...index.simulations.map(item => ({ type: 'Simulation', title: item.name, text: `${item.name} ${item.description} ${item.topic}`, href: '/simulations', weight: 4 })),
      ...(index.examples || []).map(item => ({ type: 'Worked example', title: item.title, text: `${item.title} ${item.question} ${item.answer}`, href: `/search?q=${encodeURIComponent(item.topic)}`, weight: 4 })),
      ...(index.searchIndex || []).map(item => ({ ...item, weight: item.type === 'Formula' ? 6 : 5 })),
      ...calculatorTools().map(item => ({ type: 'Calculator', title: item.name, text: `${item.name} ${item.formula} calculator`, href: '/formulas', weight: 4 }))
    ];
  }
  search(query) {
    const terms = slugify(query).split('-').filter(Boolean); if (!terms.length) return [];
    return this.entries.map(entry => ({ ...entry, score: terms.reduce((score, term) => score + (entry.title.toLowerCase().includes(term) ? entry.weight * 3 : 0) + (entry.text.toLowerCase().includes(term) ? entry.weight : 0), 0) })).filter(entry => entry.score).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 30);
  }
}
export const searchResults = results => results.length ? `<div class="search-results">${results.map(result => `<a class="search-result" href="${result.href}" data-route><span class="tag">${escapeHTML(result.type)}</span><h3>${escapeHTML(result.title)}</h3></a>`).join('')}</div>` : '<div class="empty-state"><h3>No matches yet</h3><p>Try a topic, formula, definition, or skill.</p></div>';
