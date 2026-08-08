import { slugify } from './utils.js';

/** Cached content gateway. The server discovers and validates lesson files. */
export class ContentLoader {
  constructor() { this.indexPromise = null; this.lessonCache = new Map(); }
  async request(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  getIndex() { this.indexPromise ||= this.request('/api/content/index'); return this.indexPromise; }
  async getLesson(slug) {
    const key = slugify(slug); if (!this.lessonCache.has(key)) this.lessonCache.set(key, this.request(`/api/content/lessons/${encodeURIComponent(key)}`));
    return this.lessonCache.get(key);
  }
  clear() { this.indexPromise = null; this.lessonCache.clear(); }
}
