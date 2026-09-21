/**
 * Compact reading progress for long lessons.
 *
 * The control is rendered with the lesson, but all state is derived from the
 * document that is actually on screen. It does not invent completion data and
 * it removes its window listener when the router leaves the page.
 */
export function bindLessonProgress() {
  const nav = document.querySelector('[data-lesson-progress]');
  const lesson = document.querySelector('.lesson-page');
  if (!nav || !lesson) return undefined;

  const links = [...nav.querySelectorAll('.lesson-nav__links a[href^="#"]')]
    .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(item => item.section);
  if (!links.length) return undefined;

  const label = nav.querySelector('[data-lesson-progress-label]');
  const value = nav.querySelector('[data-lesson-progress-value]');
  const fill = nav.querySelector('[data-lesson-progress-fill]');
  let frame = 0;

  const sync = () => {
    frame = 0;
    const rect = lesson.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const travelled = Math.max(0, -rect.top + 120);
    const range = Math.max(1, rect.height - viewport * 0.55);
    const percentage = Math.max(0, Math.min(100, Math.round(travelled / range * 100)));
    fill.style.width = `${percentage}%`;
    value.textContent = `${percentage}%`;
    nav.setAttribute('aria-label', `Lesson sections, ${percentage}% read`);

    const anchor = Math.min(viewport * 0.35, 220);
    const current = [...links].reverse().find(item => item.section.getBoundingClientRect().top <= anchor) || links[0];
    links.forEach(item => item.link.toggleAttribute('aria-current', item === current));
    label.textContent = current.link.textContent.trim();
  };

  const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  sync();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
