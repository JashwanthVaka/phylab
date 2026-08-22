import { markActiveRoute } from './navShell.js';
import { contextManager } from './services/contextManager.js';
import { applyRouteMeta } from './pageMeta.js';

/**
 * Records where the learner has been, so KIT can answer in context.
 *
 * contextManager.remember() was only ever called from inside the AI page, so
 * lesson_slug and recent_formulas were permanently null and the tutor never
 * knew what you were studying. Recording it here, once, at the single point
 * every navigation passes through, is what makes that context real.
 */
function rememberPlace(path) {
  const [kind, slug] = path.split('/').filter(Boolean);
  if (!slug) return;
  try {
    if (kind === 'lesson') contextManager.remember({ lesson_slug: slug });
    else if (kind === 'formulas') {
      const seen = contextManager.fromRoute().recent_formulas || [];
      contextManager.remember({ formula_slug: slug, recent_formulas: [...seen, slug] });
    } else if (kind === 'simulations') {
      const seen = contextManager.fromRoute().recent_simulations || [];
      contextManager.remember({ simulation_slug: slug, recent_simulations: [...seen, slug] });
    }
  } catch {
    // Context is a convenience; never let storage failure block navigation.
  }
}

/**
 * Scrolls to a #fragment once the route has rendered.
 *
 * The browser resolves a fragment at load, long before this app has painted
 * anything, so a link like /patterns#define would land at the top of an empty
 * page. Deep links into a list -- one command term among fifteen -- only work
 * if the scroll happens after the content exists.
 */
function revealHash() {
  const id = location.hash.slice(1);
  if (!id) return;
  // Not requestAnimationFrame: it is paused while the tab is hidden, so a
  // link opened in a background tab would never scroll. The route has already
  // been awaited, so the element exists; a task turn is enough to let layout
  // settle.
  setTimeout(() => {
    const target = document.getElementById(id);
    if (!target) return;
    // No explicit behavior: the stylesheet sets scroll-behavior and already
    // switches it to auto under prefers-reduced-motion. Passing 'smooth' here
    // would override that and scroll a user who asked for no motion.
    target.scrollIntoView({ block: 'start' });
    // Announce it, so the reason the page jumped is not purely visual.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, 0);
}

/** Small History API router with deep-link and browser-navigation support. */
export class Router {
  constructor(routes) { this.routes = routes; this.handle = this.handle.bind(this); }
  start() { window.addEventListener('popstate', this.handle); this.handle(); }
  go(path) { history.pushState({}, '', path); this.handle(); }
  async handle() {
    const path = location.pathname.replace(/\/$/, '') || '/';
    markActiveRoute(path);
    rememberPlace(path);
    applyRouteMeta(path);
    for (const [pattern, handler] of Object.entries(this.routes)) {
      if (pattern === '*') continue;
      const names = []; const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, name) => { names.push(name); return '([^/]+)'; })}/?$`);
      const match = path.match(regex);
      if (match) {
        const result = await handler({ ...Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])])), query: new URLSearchParams(location.search).get('q') });
        revealHash();
        return result;
      }
    }
    return this.routes['*']();
  }
}
