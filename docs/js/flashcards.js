import { escapeHTML, slugify } from './utils.js';
const KEY = 'phylab_flashcards_v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = value => localStorage.setItem(KEY, JSON.stringify(value));
export function lessonFlashcards(lesson) {
  return [
    ...lesson.definitions.map((item, index) => ({ id: `${lesson.slug}:definition:${index}`, front: item.term, back: item.meaning })),
    ...lesson.formulas.map((item, index) => ({ id: `${lesson.slug}:formula:${index}`, front: item.name, back: `${item.formula}${item.explanation ? ` — ${item.explanation}` : ''}` }))
  ];
}
export function renderFlashcards(cards) {
  if (!cards.length) return '<div class="empty-state"><h3>No flashcards yet</h3><p>Add definitions or formulae to this lesson to generate revision cards.</p></div>';
  return `<div class="flashcard-deck">${cards.map(card => `<article class="flashcard" tabindex="0" data-card-id="${escapeHTML(card.id)}"><div class="flashcard-inner"><div class="flashcard-face"><span class="tag">QUESTION</span><h3>${escapeHTML(card.front)}</h3><small>Click or press Enter to reveal</small></div><div class="flashcard-face flashcard-back"><span class="tag">ANSWER</span><p>${escapeHTML(card.back)}</p><div class="review-actions"><button data-review="again">Again</button><button data-review="good">Good</button><button data-review="easy">Easy</button></div></div></div></article>`).join('')}</div>`;
}
export function bindFlashcards() {
  document.querySelectorAll('.flashcard').forEach(card => {
    const flip = () => card.classList.toggle('is-flipped');
    card.addEventListener('click', event => { if (!event.target.closest('[data-review]')) flip(); });
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } });
    card.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); const state = read(); const rating = button.dataset.review; const previous = state[card.dataset.cardId] || { interval: 0 }; const interval = rating === 'again' ? 0 : rating === 'easy' ? Math.max(7, previous.interval * 2) : Math.max(1, previous.interval + 1); state[card.dataset.cardId] = { interval, due: Date.now() + interval * 86400000 }; write(state); card.classList.remove('is-flipped'); card.classList.add('is-reviewed'); }));
  });
}
export function dueCount() { return Object.values(read()).filter(item => item.due <= Date.now()).length; }
