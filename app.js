import { ContentLoader } from './js/contentLoader.js';
import { Router } from './js/router.js';
import {
  renderHome,
  renderFormulaLibrary,
  renderSearch,
  renderNotFound,
  renderLoading,
  bindUI,
  showTutor
} from './js/ui.js';
import { renderLesson } from './js/lessonEngine.js';
import { SearchIndex } from './js/search.js';
import { getProgress } from './js/utils.js';
import { authPage, accountPage, onboardingPage, bindAccount } from './js/accountUI.js';
import { profileService } from './js/services/profileService.js';
import { progressService } from './js/services/progressService.js';
import { bookmarkService } from './js/services/bookmarkService.js';
import { offlineSyncService } from './js/services/offlineSyncService.js';
import { dashboardService } from './js/services/dashboardService.js';
import { dashboardView, masteryView } from './js/learnerUI.js';

const app = document.querySelector('#app');
const loader = new ContentLoader();
const moduleCache = new Map();
const pageCleanups = new Set();
const globalListeners = new AbortController();
let searchIndex;
let routeVersion = 0;
let routerStarted = false;
let lastFocusedElement = null;

/** Lazily loads a page module and reuses the browser module cache thereafter. */
function loadPageModule(path) {
  if (!moduleCache.has(path)) moduleCache.set(path, import(path));
  return moduleCache.get(path);
}

/** Runs registered page clean-up callbacks before a new route mounts. */
function cleanupPage() {
  pageCleanups.forEach(cleanup => {
    try { cleanup(); } catch (error) { console.warn('KINETIQ page cleanup failed.', error); }
  });
  pageCleanups.clear();
}

/** Lets page initialisers opt into lifecycle cleanup without retaining global state. */
function registerPageCleanup(cleanup) {
  if (typeof cleanup === 'function') pageCleanups.add(cleanup);
}

function ensureOverlay() {
  let overlay = document.querySelector('#phylab-loading-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'phylab-loading-overlay';
  overlay.className = 'phylab-loading-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="phylab-loading-overlay__card"><span class="phylab-loading-overlay__spinner" aria-hidden="true"></span><span data-loading-message>Loading KINETIQ…</span></div>';
  document.body.append(overlay);
  return overlay;
}

function setLoading(isLoading, message = 'Loading KINETIQ…') {
  const overlay = ensureOverlay();
  overlay.querySelector('[data-loading-message]').textContent = message;
  overlay.hidden = !isLoading;
  overlay.setAttribute('aria-hidden', String(!isLoading));
  document.body.toggleAttribute('aria-busy', isLoading);
}

function ensureNotificationRegion() {
  let region = document.querySelector('#phylab-notifications');
  if (region) return region;
  region = document.createElement('div');
  region.id = 'phylab-notifications';
  region.className = 'phylab-notifications';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'false');
  document.body.append(region);
  return region;
}

/** Displays an accessible, dismissible application notification. */
function notify(message, type = 'information', options = {}) {
  const region = ensureNotificationRegion();
  const notice = document.createElement('div');
  const timeout = Number.isFinite(options.timeout) ? options.timeout : 5000;
  notice.className = `notification notification--${type}`;
  notice.setAttribute('role', type === 'error' ? 'alert' : 'status');
  notice.innerHTML = '<span class="notification__message"></span><button class="notification__dismiss" type="button" aria-label="Dismiss notification">×</button>';
  notice.querySelector('.notification__message').textContent = message;
  const dismiss = () => notice.remove();
  notice.querySelector('button').addEventListener('click', dismiss, { once: true });
  region.append(notice);
  if (timeout > 0) window.setTimeout(dismiss, timeout);
  return dismiss;
}

function render(view) {
  app.innerHTML = view;
  app.setAttribute('tabindex', '-1');
  app.focus({ preventScroll: true });
  bindUI({ loader, router, searchIndex, render });
  bindAccount(router);
}

function renderRouteError(error) {
  console.error('KINETIQ route failed to initialise.', error);
  render('<section class="page error-state" role="alert"><p class="eyebrow">SOMETHING WENT WRONG</p><h1>This page could not load.</h1><p>Please try again. Your saved learning data is safe.</p><button class="button" type="button" data-retry>Try again</button></section>');
  notify('We could not load that page. Please try again.', 'error');
}

/** Prevents stale asynchronous routes from rendering over newer navigation. */
async function transition(work, message = 'Loading page…') {
  const version = ++routeVersion;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  cleanupPage();
  setLoading(true, message);
  try {
    const page = await work();
    if (version !== routeVersion) return;
    render(page.view);
    const cleanup = await page.mount?.();
    if (version === routeVersion) registerPageCleanup(cleanup);
  } catch (error) {
    if (version === routeVersion) renderRouteError(error);
  } finally {
    if (version === routeVersion) setLoading(false);
  }
}

/** Gathers everything the progress dashboard needs so it never has to invent a metric. */
async function dashboardContext() {
  const [summary, index, state] = await Promise.all([dashboardService.summary(), loader.getIndex(), progressService.list()]);
  return [summary, { lessons: index.lessonIndex, units: index.units, completed: state.completed }];
}

function bookmarkPage(rows) {
  const cards = rows.map(row => `<article class="search-result"><span class="tag">${row.content_type}</span><h3>${row.content_key}</h3><p>${row.note || ''}</p></article>`).join('');
  return `<section class="page"><p class="eyebrow">BOOKMARKS</p><h1>Saved learning.</h1>${cards ? `<div class="search-results">${cards}</div>` : '<div class="empty-state"><h3>No bookmarks yet</h3><p>Save a lesson, formula, graph, or question to find it here.</p></div>'}</section>`;
}

const router = new Router({
  '/': () => transition(async () => ({ view: renderHome(await loader.getIndex(), getProgress()) }), 'Preparing your physics workspace…'),
  '/lesson/:slug': ({ slug }) => transition(async () => {
    const [lesson, index] = await Promise.all([loader.getLesson(slug), loader.getIndex()]);
    return { view: renderLesson(lesson, index) };
  }, 'Opening lesson…'),
  '/formulas': () => transition(async () => ({ view: renderFormulaLibrary((await loader.getIndex()).formulas) }), 'Loading formula centre…'),
  '/formulas/:slug': ({ slug }) => transition(async () => ({ view: renderFormulaLibrary((await loader.getIndex()).formulas, slug) }), 'Loading formula…'),
  '/quiz': () => transition(async () => {
    const [data, quiz] = await Promise.all([loader.getIndex(), loadPageModule('./js/quizSession.js')]);
    return { view: quiz.quizPage(data), mount: () => quiz.bindQuizSession(data) };
  }, 'Preparing quiz…'),
  '/quiz/topic/:slug': ({ slug }) => transition(async () => {
    const [data, quiz] = await Promise.all([loader.getIndex(), loadPageModule('./js/quizSession.js')]);
    return { view: quiz.quizPage(data), mount: () => quiz.bindQuizSession(data, { topic: slug }) };
  }, 'Preparing topic quiz…'),
  '/exam': () => transition(async () => {
    const [data, quiz] = await Promise.all([loader.getIndex(), loadPageModule('./js/quizSession.js')]);
    return { view: quiz.quizPage(data), mount: () => quiz.bindQuizSession(data, { mode: 'Exam Practice', durationSeconds: 1800 }) };
  }, 'Preparing exam practice…'),
  '/results/:id': ({ id }) => transition(async () => {
    const quiz = await loadPageModule('./js/quizSession.js');
    const report = quiz.result(id);
    const view = report
      ? quiz.resultView(report)
      : '<section class="page"><h1>Result unavailable</h1><p>This result may have been removed or is not available on this device.</p><a class="button" href="/quiz" data-route>Return to quizzes</a></section>';
    return { view };
  }, 'Loading results…'),
  '/simulations': () => transition(async () => {
    const studio = await loadPageModule('./js/simulationStudio.js');
    return { view: studio.catalogue() };
  }, 'Loading simulation studio…'),
  '/simulations/:slug': ({ slug }) => transition(async () => {
    const studio = await loadPageModule('./js/simulationStudio.js');
    return { view: studio.detail(slug), mount: () => studio.bindStudio() };
  }, 'Opening physics lab…'),
  '/library': () => transition(async () => {
    const [index, library, state] = await Promise.all([loader.getIndex(), loadPageModule('./js/libraryUI.js'), progressService.list()]);
    return { view: library.libraryPage(index, state), mount: () => library.bindLibrary() };
  }, 'Opening the course library…'),
  '/toolkit': () => transition(async () => {
    const [index, toolkit] = await Promise.all([loader.getIndex(), loadPageModule('./js/toolkitUI.js')]);
    return { view: toolkit.toolkitPage(index) };
  }, 'Opening the active toolkit…'),
  '/cases': () => transition(async () => {
    const [index, cases] = await Promise.all([loader.getIndex(), loadPageModule('./js/casesUI.js')]);
    return { view: cases.casesPage(index), mount: () => cases.bindCases() };
  }, 'Loading case practice…'),
  '/cases/:slug': ({ slug }) => transition(async () => {
    const [index, cases] = await Promise.all([loader.getIndex(), loadPageModule('./js/casesUI.js')]);
    return { view: cases.casePage(index, slug), mount: () => cases.bindCases() };
  }, 'Opening case…'),
  '/patterns': () => transition(async () => {
    const [index, patterns] = await Promise.all([loader.getIndex(), loadPageModule('./js/patternsUI.js')]);
    return { view: patterns.patternsPage(index), mount: () => patterns.bindPatterns() };
  }, 'Loading question patterns…'),
  '/exam-prep': () => transition(async () => {
    const [index, examPrep] = await Promise.all([loader.getIndex(), loadPageModule('./js/examPrepUI.js')]);
    return { view: examPrep.examPrepPage(index) };
  }, 'Opening exam preparation…'),
  '/mistakes': () => transition(async () => {
    const bank = await loadPageModule('./js/mistakeBank.js');
    return { view: bank.mistakesPage(), mount: () => bank.bindMistakes() };
  }, 'Opening your mistake bank…'),
  '/ia': () => transition(async () => {
    const ia = await loadPageModule('./js/iaWorkspace.js');
    return { view: ia.iaPage(), mount: () => ia.bindIA() };
  }, 'Opening the IA workspace…'),
  '/data': () => transition(async () => {
    const lab = await loadPageModule('./js/dataLabUI.js');
    return { view: lab.dataLabPage(), mount: () => lab.bindDataLab() };
  }, 'Opening the data lab…'),
  '/resources': () => transition(async () => {
    const [index, resources] = await Promise.all([loader.getIndex(), loadPageModule('./js/resourcesUI.js')]);
    return { view: resources.resourcesPage(index) };
  }, 'Loading the source library…'),
  '/progress': () => transition(async () => ({ view: dashboardView(...(await dashboardContext())) }), 'Loading progress…'),
  '/mastery': () => transition(async () => ({ view: masteryView(await dashboardService.summary()) }), 'Loading mastery…'),
  '/activity': () => transition(async () => ({ view: dashboardView(...(await dashboardContext())) }), 'Loading activity…'),
  '/login': () => transition(async () => ({ view: authPage('login') }), 'Opening sign in…'),
  '/signup': () => transition(async () => ({ view: authPage('signup') }), 'Opening sign up…'),
  '/onboarding': () => transition(async () => ({ view: onboardingPage() }), 'Preparing onboarding…'),
  '/account': () => transition(async () => ({ view: accountPage(await profileService.get()) }), 'Loading account…'),
  '/bookmarks': () => transition(async () => ({ view: bookmarkPage(await bookmarkService.list()) }), 'Loading bookmarks…'),
  '/revision': () => transition(async () => {
    const [index, planner] = await Promise.all([loader.getIndex(), loadPageModule('./js/revisionUI.js')]);
    const lessons = await Promise.all(index.lessonIndex.map(item => loader.getLesson(item.slug)));
    return { view: planner.revisionPage(index, lessons), mount: () => planner.bindRevision() };
  }, 'Building your revision plan…'),
  '/ai': () => transition(async () => {
    const workspace = await loadPageModule('./js/aiWorkspace.js');
    return { view: await workspace.aiWorkspace(), mount: () => workspace.bindAI() };
  }, 'Opening AI workspace…'),
  '/search': ({ query }) => transition(async () => ({ view: renderSearch(searchIndex.search(query || ''), query || '') }), 'Searching KINETIQ…'),
  '*': () => transition(async () => ({ view: renderNotFound() }), 'Finding page…')
});

async function boot() {
  setLoading(true, 'Preparing your physics workspace…');
  try {
    const index = await loader.getIndex();
    searchIndex = new SearchIndex(index);
    if (!routerStarted) {
      router.start();
      routerStarted = true;
    } else {
      await router.handle();
    }
  } catch (error) {
    console.error('KINETIQ failed to load its content index.', error);
    renderRouteError(error);
  } finally {
    setLoading(false);
  }
}

function handleRouteClick(event) {
  const link = event.target.closest('[data-route]');
  if (link && link.origin === location.origin && !event.defaultPrevented) {
    event.preventDefault();
    router.go(link.getAttribute('href'));
    return;
  }
  if (event.target.matches('[data-retry]')) {
    loader.clear();
    // Offline support. Registration failing is never fatal — the app stays online-only.
function enableOffline() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const source = document.querySelector('script[src$="app.js"]')?.getAttribute('src') || '/app.js';
  const scope = new URL(source.replace(/app\.js$/, ''), location.href);
  navigator.serviceWorker.register(new URL('sw.js', scope).href, { scope: scope.href })
    .catch(error => console.warn('KINETIQ could not enable offline support.', error));
}
// A module script can execute after load has already fired, in which case a
// load listener would never run and offline support would silently never start.
if (document.readyState === 'complete') enableOffline();
else window.addEventListener('load', enableOffline, { once: true, signal: globalListeners.signal });

boot();
  }
}

function handleKeyboardNavigation(event) {
  if (event.key !== 'Escape' || !lastFocusedElement?.isConnected) return;
  const activeDialog = document.querySelector('[role="dialog"][open], dialog[open]');
  if (!activeDialog) lastFocusedElement.focus({ preventScroll: true });
}

document.querySelector('#tutorButton')?.addEventListener('click', () => showTutor(), { signal: globalListeners.signal });
document.addEventListener('click', handleRouteClick, { signal: globalListeners.signal });
document.addEventListener('keydown', handleKeyboardNavigation, { signal: globalListeners.signal });
window.addEventListener('online', async () => {
  document.body.dataset.offline = 'false';
  notify('You are back online. Syncing saved learning…', 'success');
  try { await offlineSyncService.flush({ bookmark: bookmarkService.add }); } catch (error) { console.warn('KINETIQ offline sync could not finish.', error); }
}, { signal: globalListeners.signal });
window.addEventListener('offline', () => {
  document.body.dataset.offline = 'true';
  notify('You are offline. Changes will be saved on this device and synced later.', 'warning', { timeout: 7000 });
}, { signal: globalListeners.signal });
window.addEventListener('pagehide', cleanupPage, { signal: globalListeners.signal });

boot();
