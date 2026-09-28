/**
 * Reveals meaningful page regions when they enter the viewport.
 *
 * Motion is deliberately attached to sections and learning cards rather than
 * every label or control. That keeps the interface calm, avoids animating
 * content before a learner can see it, and leaves reading order untouched.
 */
const TARGETS = [
  '.lesson-section',
  '.home-unit',
  '.module-card',
  '.content-card',
  '.library-card',
  '.case-card',
  '.simulation-card',
  '.resource-card',
  '.exam-card',
  '.today-item',
  '.rev-card',
  '.graph-card',
  '.diagram',
  '.admin-panel',
  '.adaptive-path > li',
  '.practice-path__steps > a',
].join(',');

export function bindMotion(root = document) {
  const targets = [...root.querySelectorAll(TARGETS)]
    .filter(element => !element.hidden && !element.closest('[hidden]'));
  if (!targets.length) return undefined;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const unsupported = !('IntersectionObserver' in window);

  targets.forEach((element, index) => {
    element.classList.add('motion-reveal');
    element.style.setProperty('--motion-order', String(index % 5));
    if (reduced || unsupported) element.classList.add('is-revealed');
  });

  if (reduced || unsupported) {
    return () => targets.forEach(element => element.style.removeProperty('--motion-order'));
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });

  targets.forEach(element => observer.observe(element));
  return () => {
    observer.disconnect();
    targets.forEach(element => element.style.removeProperty('--motion-order'));
  };
}
