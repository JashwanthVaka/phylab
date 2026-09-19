// Runs before the stylesheet so an explicit dark-mode choice never flashes light.
// No operating-system preference is inferred: KINETIQ is intentionally light-first.
try {
  if (localStorage.getItem('kinetiq-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch { /* Storage can be unavailable in private browsing. */ }
