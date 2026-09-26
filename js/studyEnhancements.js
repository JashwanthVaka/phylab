const PREF_KEY = 'kinetiq_reading_preferences_v1';
let started = false;

const readPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
};
const savePrefs = value => localStorage.setItem(PREF_KEY, JSON.stringify(value));

function applyPrefs(prefs) {
  const root = document.documentElement;
  root.dataset.readingSize = prefs.size || 'standard';
  root.dataset.readingSpacing = prefs.spacing || 'standard';
  root.dataset.readingWidth = prefs.width || 'standard';
  root.dataset.readingContrast = prefs.contrast ? 'high' : 'standard';
}

function readingControls() {
  const wrapper = document.createElement('div');
  wrapper.className = 'reading-tools';
  wrapper.innerHTML = `<button class="reading-tools__trigger glass" type="button" aria-expanded="false" aria-controls="readingPanel">Aa<span class="visually-hidden">Reading controls</span></button>
    <div class="reading-tools__panel glass" id="readingPanel" hidden>
      <h2>Reading controls</h2>
      <div class="reading-tools__group" role="group" aria-label="Text size"><button type="button" data-reading-size="standard">Standard</button><button type="button" data-reading-size="large">Large</button><button type="button" data-reading-size="largest">Largest</button></div>
      <label><input type="checkbox" data-reading-spacing> More line spacing</label>
      <label><input type="checkbox" data-reading-width> Narrow reading width</label>
      <label><input type="checkbox" data-reading-contrast> Higher contrast</label>
      <button class="outline" type="button" data-read-page>Read this page aloud</button>
      <p class="muted" role="status" data-reading-status></p>
    </div>`;
  document.body.append(wrapper);
  const trigger = wrapper.querySelector('.reading-tools__trigger');
  const panel = wrapper.querySelector('.reading-tools__panel');
  const prefs = readPrefs();
  applyPrefs(prefs);
  wrapper.querySelector('[data-reading-spacing]').checked = prefs.spacing === 'wide';
  wrapper.querySelector('[data-reading-width]').checked = prefs.width === 'narrow';
  wrapper.querySelector('[data-reading-contrast]').checked = Boolean(prefs.contrast);
  trigger.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('button')?.focus();
  });
  wrapper.addEventListener('click', event => {
    const size = event.target.closest('[data-reading-size]')?.dataset.readingSize;
    if (size) prefs.size = size;
    if (event.target.matches('[data-reading-spacing]')) prefs.spacing = event.target.checked ? 'wide' : 'standard';
    if (event.target.matches('[data-reading-width]')) prefs.width = event.target.checked ? 'narrow' : 'standard';
    if (event.target.matches('[data-reading-contrast]')) prefs.contrast = event.target.checked;
    if (size || event.target.matches('[data-reading-spacing],[data-reading-width],[data-reading-contrast]')) { savePrefs(prefs); applyPrefs(prefs); }
    if (event.target.closest('[data-read-page]')) {
      const status = wrapper.querySelector('[data-reading-status]');
      if (!('speechSynthesis' in window)) { status.textContent = 'Read aloud is not supported by this browser.'; return; }
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); status.textContent = 'Reading stopped.'; return; }
      const text = document.querySelector('#app')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 12000) || '';
      if (!text) { status.textContent = 'There is no page text to read.'; return; }
      const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 0.95;
      utterance.onend = () => { status.textContent = 'Finished reading.'; };
      speechSynthesis.speak(utterance); status.textContent = 'Reading this page. Press again to stop.';
    }
  });
  document.addEventListener('click', event => {
    if (!panel.hidden && !wrapper.contains(event.target)) { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
  });
}

function mobileDock() {
  const dock = document.createElement('nav');
  dock.className = 'study-dock glass';
  dock.setAttribute('aria-label', 'Study tools');
  dock.innerHTML = `<a href="/notebook" data-route><span aria-hidden="true">N</span>Notes</a><a href="/ask" data-route data-dock-ask><span aria-hidden="true">K</span>Ask</a><a href="/formulas" data-route><span aria-hidden="true">ƒ</span>Formulae</a><a href="/quiz" data-route data-dock-practice><span aria-hidden="true">Q</span>Practice</a><a href="/studio" data-route><span aria-hidden="true">S</span>Studio</a>`;
  document.body.append(dock);
  const update = () => {
    const lesson = location.pathname.match(/^\/lesson\/([^/]+)/)?.[1];
    const simulation = location.pathname.match(/^\/simulations\/([^/]+)/)?.[1];
    const context = lesson ? `Explain the ${lesson.replaceAll('-', ' ')} lesson` : simulation ? `Explain the ${simulation.replaceAll('-', ' ')} simulation` : '';
    dock.querySelector('[data-dock-ask]').href = context ? `/ask?q=${encodeURIComponent(context)}` : '/ask';
    dock.querySelector('[data-dock-practice]').href = lesson ? `/quiz?mode=Topic%20Quiz&topic=${encodeURIComponent(lesson.replaceAll('-', ' '))}` : '/quiz';
    const isLearningRoute = Boolean(
      lesson || simulation ||
      /^\/(formulas|quiz|exam|results|revision|mistakes|notebook|ask|studio|data)(\/|$)/.test(location.pathname)
    );
    dock.hidden = !isLearningRoute;
    dock.toggleAttribute('data-contextual', Boolean(lesson || simulation || location.pathname.startsWith('/formulas')));
  };
  window.addEventListener('kinetiq:route', update);
  update();
}

function animateNewPage() {
  if (location.pathname === '/progress' && new URLSearchParams(location.search).get('print') === '1') {
    setTimeout(() => window.print(), 350);
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const formula = document.querySelector('.formula-hero code');
  formula?.animate([
    { opacity: 0, transform: 'translateY(8px)', letterSpacing: '.08em' },
    { opacity: 1, transform: 'translateY(0)', letterSpacing: 'normal' }
  ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  document.querySelectorAll('.adaptive-path li').forEach((item, index) => item.animate([
    { opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'translateX(0)' }
  ], { duration: 280, delay: index * 55, fill: 'both', easing: 'cubic-bezier(.2,.8,.2,1)' }));
}

export function initStudyEnhancements() {
  if (started) return;
  started = true;
  readingControls();
  mobileDock();
  window.addEventListener('kinetiq:route', animateNewPage);
}
