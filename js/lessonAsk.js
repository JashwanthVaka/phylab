/**
 * The ask box that sits inside a lesson.
 *
 * Same answer engine as /ask, but scoped to the lesson you are reading and
 * answered in place, so looking something up does not cost you your position
 * on the page.
 */

import { escapeHTML } from './utils.js';
import { saveAnswerForReview, isAnswerSaved } from './mistakeBank.js';

export function bindLessonAsk() {
  const panel = document.querySelector('[data-lesson-ask]');
  if (!panel) return;

  const form = panel.querySelector('form');
  const input = panel.querySelector('input[name="q"]');
  const result = panel.querySelector('.lesson-ask__result');
  const topic = panel.dataset.topic || '';
  let current = null;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    result.innerHTML = '<p class="muted">Searching KINETIQ…</p>';
    try {
      // The lesson name is appended so the retrieval engine favours this topic,
      // which is the whole point of asking from inside the lesson.
      const scoped = topic ? `${question} ${topic}` : question;
      const response = await fetch(`/api/answer?q=${encodeURIComponent(scoped)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'That search could not be completed.');

      if (!data.answered) {
        result.innerHTML = `<p class="muted">${escapeHTML(data.note || 'Nothing in KINETIQ matches that yet.')}</p>`;
        return;
      }

      current = { data, question };
      const saved = isAnswerSaved(question);
      result.innerHTML = `
        <div class="lesson-ask__answer">
          <h4>${escapeHTML(data.headline)}</h4>
          ${data.sections.slice(0, 3).map(section => `
            <p class="lesson-ask__label">${escapeHTML(section.label)}</p>
            <p>${escapeHTML(section.body)}</p>`).join('')}
          <div class="lesson-ask__foot">
            <button type="button" class="outline" data-lesson-ask-save ${saved ? 'disabled' : ''}>
              ${saved ? 'Saved for review ✓' : 'Save for review'}
            </button>
            <a class="text-button" href="/ask?q=${encodeURIComponent(question)}" data-route>Open in Ask →</a>
          </div>
        </div>`;
    } catch (error) {
      result.innerHTML = `<p class="muted">${escapeHTML(error.message)}</p>`;
    }
  });

  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-lesson-ask-save]');
    if (!button || !current) return;
    const ok = saveAnswerForReview({
      question: current.question,
      headline: current.data.headline,
      body: current.data.sections[0]?.body || '',
      href: current.data.sources[0]?.href || '',
    });
    button.disabled = true;
    button.textContent = ok ? 'Saved for review ✓' : 'Already saved ✓';
  });
}
