/**
 * Theme control.
 *
 * The full dark palette already existed in the stylesheet but nothing ever
 * switched it on, so a Mac running dark system-wide got a bright white page.
 *
 * Three states, deliberately: no stored choice means follow the system and
 * keep following it as the Mac flips at sunset. Pressing the toggle stores an
 * explicit choice that then wins over the system until it is cleared. The
 * initial value is applied by an inline script in the document head so the
 * page never paints the wrong theme first.
 */

const KEY = 'kinetiq-theme';
const query = window.matchMedia('(prefers-color-scheme: dark)');

const stored = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

function apply(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const button = document.getElementById('themeToggle');
  if (button) {
    button.setAttribute('aria-pressed', String(dark));
    button.title = dark ? 'Switch to light' : 'Switch to dark';
  }
  // Keep the Safari toolbar tint in step with the page.
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = dark ? '#0A0F1A' : '#F7F7F5';
  document.head.appendChild(meta);
}

// Follow the system for as long as the learner has not chosen for themselves.
query.addEventListener('change', event => {
  if (stored()) return;
  apply(event.matches);
});

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next = !isDark();
  try { localStorage.setItem(KEY, next ? 'dark' : 'light'); } catch { /* private mode */ }
  apply(next);
});

// Sync the button with whatever the head script already decided.
apply(isDark() || (!stored() && query.matches));

export { apply as applyTheme };
