import { escapeHTML } from './utils.js';
import { authService } from './services/authService.js';
import { feedbackService } from './services/feedbackService.js';

export async function feedbackPage(search = new URLSearchParams()) {
  const user = await authService.user().catch(() => null);
  const reports = user ? await feedbackService.list().catch(() => []) : [];
  const page = String(search.get('page') || '/').slice(0, 500);
  const reference = String(search.get('ref') || '').slice(0, 200);
  return `<section class="page feedback-page">
    <p class="eyebrow">HELP IMPROVE KINETIQ</p>
    <h1>Report something specific.</h1>
    <p class="page-lead">Corrections are reviewed before content changes. Include the lesson, question or diagram and explain what appears wrong. Do not include personal information.</p>
    ${user ? `<form class="surface-form feedback-form" data-feedback-form>
      <label>Type of report<select name="category">
        <option value="content">Physics content correction</option>
        <option value="question">Question or solution problem</option>
        <option value="visual">Diagram, graph or simulation</option>
        <option value="accessibility">Accessibility problem</option>
        <option value="idea">Product suggestion</option>
        <option value="other">Other</option>
      </select></label>
      <label>Page<input name="page_path" value="${escapeHTML(page)}" maxlength="500" required></label>
      <label>Lesson, question or item <span class="muted">(optional)</span><input name="content_ref" value="${escapeHTML(reference)}" maxlength="200" placeholder="For example: C.4 double-slit example"></label>
      <label class="feedback-form__wide">What should be checked?<textarea name="message" rows="7" minlength="10" maxlength="2000" required></textarea></label>
      <button class="button" type="submit">Send report</button>
      <p role="status" data-feedback-status></p>
    </form>
    <section class="feedback-history" aria-labelledby="feedback-history-title">
      <h2 id="feedback-history-title">Your reports</h2>
      ${reports.length ? `<div class="feedback-list">${reports.map(report => `<article>
        <div><span class="tag">${escapeHTML(report.category)}</span><span class="feedback-status-badge" data-status="${escapeHTML(report.status)}">${escapeHTML(report.status)}</span></div>
        <h3>${escapeHTML(report.content_ref || report.page_path)}</h3>
        <p>${escapeHTML(report.message)}</p>
        <small>Sent ${escapeHTML(new Date(report.created_at).toLocaleDateString())}</small>
      </article>`).join('')}</div>` : '<div class="empty-state"><h3>No reports yet</h3><p>When you send a correction or suggestion, its review status will appear here.</p></div>'}
    </section>` : `<div class="empty-state"><h2>Sign in to send a private report</h2><p>Your account lets KINETIQ show you the status without publishing your email or report.</p><a class="button" href="/login?returnTo=${encodeURIComponent(`/feedback?page=${page}`)}" data-route>Sign in</a></div>`}
    <p class="muted">For urgent security problems, use the project contact route described on the privacy page and do not post credentials or personal data.</p>
  </section>`;
}

export function bindFeedback() {
  const form = document.querySelector('[data-feedback-form]');
  if (!form) return undefined;
  const controller = new AbortController();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-feedback-status]');
    button.disabled = true;
    status.textContent = 'Sending your report…';
    try {
      await feedbackService.submit(Object.fromEntries(new FormData(form)));
      status.textContent = 'Report received. Its review status is now in Your reports.';
      status.dataset.tone = 'ok';
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      status.textContent = error.message;
      status.dataset.tone = 'bad';
    } finally { button.disabled = false; }
  }, { signal: controller.signal });
  return () => controller.abort();
}
