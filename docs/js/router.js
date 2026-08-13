/** Small History API router with deep-link and browser-navigation support. */
export class Router {
  constructor(routes) { this.routes = routes; this.handle = this.handle.bind(this); }
  start() { window.addEventListener('hashchange', this.handle); this.handle(); }
  go(path) { location.hash = path; this.handle(); }
  async handle() {
    const path = (location.hash.slice(1) || '/').replace(/\/$/, '') || '/';
    for (const [pattern, handler] of Object.entries(this.routes)) {
      if (pattern === '*') continue;
      const names = []; const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, name) => { names.push(name); return '([^/]+)'; })}/?$`);
      const match = path.match(regex);
      if (match) return handler({ ...Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])])), query: new URLSearchParams((location.hash.split('?')[1] || '')).get('q') });
    }
    return this.routes['*']();
  }
}
