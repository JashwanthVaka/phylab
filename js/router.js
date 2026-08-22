import { markActiveRoute } from './navShell.js';
import { contextManager } from './services/contextManager.js';

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

/** Small History API router with deep-link and browser-navigation support. */
export class Router {
  constructor(routes) { this.routes = routes; this.handle = this.handle.bind(this); }
  start() { window.addEventListener('popstate', this.handle); this.handle(); }
  go(path) { history.pushState({}, '', path); this.handle(); }
  async handle() {
    const path = location.pathname.replace(/\/$/, '') || '/';
    markActiveRoute(path);
    rememberPlace(path);
    for (const [pattern, handler] of Object.entries(this.routes)) {
      if (pattern === '*') continue;
      const names = []; const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, name) => { names.push(name); return '([^/]+)'; })}/?$`);
      const match = path.match(regex);
      if (match) return handler({ ...Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])])), query: new URLSearchParams(location.search).get('q') });
    }
    return this.routes['*']();
  }
}
