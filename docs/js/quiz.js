import { escapeHTML, recordAttempt } from './utils.js';

export function renderQuiz(index) {
  const questions = index.questions;
  return `<section class="page"><p class="eyebrow">EXAM PRACTICE</p><h1>Practise every kind of thinking.</h1><p class="page-lead">Choose a question, work it through, then reveal the method.</p><div class="quiz-toolbar"><label>Filter by topic <select id="quizTopic"><option value="">All topics</option>${[...new Set(questions.map(q => q.topic))].map(topic => `<option>${escapeHTML(topic)}</option>`).join('')}</select></label></div><div id="quizList" class="quiz-list">${questions.map(questionCard).join('')}</div></section>`;
}
const questionCard = (question, index = 0) => `<article class="quiz-card" data-topic="${escapeHTML(question.topic)}"><span class="tag">${escapeHTML(question.level || 'Practice')} · ${escapeHTML(question.type || 'Question')}</span><h2>${escapeHTML(question.topic)}</h2><p>${escapeHTML(question.question)}</p><details data-question-id="${question.id || index}"><summary>Reveal solution</summary><p><b>Answer:</b> ${escapeHTML(question.answer)}</p><p>${escapeHTML(question.solution)}</p></details></article>`;
export function bindQuiz() {
  document.querySelector('#quizTopic')?.addEventListener('change', event => document.querySelectorAll('.quiz-card').forEach(card => { card.hidden = event.target.value && card.dataset.topic !== event.target.value; }));
  document.querySelectorAll('[data-question-id]').forEach(details => details.addEventListener('toggle', () => { if (details.open && !details.dataset.recorded) { recordAttempt({ questionId: details.dataset.questionId, revealed: true }); details.dataset.recorded = 'true'; } }));
}
