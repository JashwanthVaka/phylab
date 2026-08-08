/** Small History API router with deep-link and browser-navigation support. */
export class Router {
  constructor(routes) { this.routes = routes; this.handle = this.handle.bind(this); }
  start() { window.addEventListener('popstate', this.handle); this.handle(); }
  go(path) { history.pushState({}, '', path); this.handle(); }
  async handle() {
    const path = location.pathname.replace(/\/$/, '') || '/';
    for (const [pattern, handler] of Object.entries(this.routes)) {
      if (pattern === '*') continue;
      const names = []; const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, name) => { names.push(name); return '([^/]+)'; })}/?$`);
      const match = path.match(regex);
      if (match) return handler({ ...Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])])), query: new URLSearchParams(location.search).get('q') });
    }
    return this.routes['*']();
  }
}
