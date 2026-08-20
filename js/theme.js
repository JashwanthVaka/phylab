/**
 * Theme control.
 *
 * KINETIQ is a light product: light is the default for everyone, and the
 * operating system's dark setting is deliberately NOT followed. Dark is
 * available, but only when the learner asks for it with the toggle, and that
 * choice then persists. The initial value is applied by an inline script in
 * the document head so the page never paints the wrong theme first.
 */

const KEY = 'kinetiq-theme';
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

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next = !isDark();
  try { localStorage.setItem(KEY, next ? 'dark' : 'light'); } catch { /* private mode */ }
  apply(next);
});

// Sync the button with whatever the head script already decided.
apply(stored() === 'dark');

export { apply as applyTheme };
