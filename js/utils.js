/** Shared, dependency-free application helpers. */
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export const slugify = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const curriculumPosition = lesson => { const match = String(lesson?.title || '').match(/^\s*([A-Z])\.(\d+)\b/i); return match ? (match[1].toUpperCase().charCodeAt(0) - 65) * 1000 + Number(match[2]) : Number.MAX_SAFE_INTEGER; };
export const orderLessons = lessons => [...(lessons || [])].sort((left, right) => curriculumPosition(left) - curriculumPosition(right) || String(left.title || '').localeCompare(String(right.title || '')));
export const debounce = (fn, delay = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
export const unique = values => [...new Set(values.filter(Boolean))];
const PROGRESS_KEY = 'phylab_progress_v2';
export function getProgress() { try { return { completedLessons: [], attempts: [], ...JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') }; } catch { return { completedLessons: [], attempts: [] }; } }
export function saveProgress(progress) { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
export function recordAttempt(attempt) { const progress = getProgress(); progress.attempts = [...progress.attempts, { ...attempt, at: new Date().toISOString() }].slice(-500); saveProgress(progress); return progress; }
export function completeLesson(slug) { const progress = getProgress(); progress.completedLessons = unique([...progress.completedLessons, slug]); saveProgress(progress); return progress; }
