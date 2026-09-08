import { ContentLoader } from './js/contentLoader.js';
import './js/theme.js';
import { indexContent } from './js/commandPalette.js';
import { askPage, bindAsk } from './js/askUI.js';
import { bindLessonAsk } from './js/lessonAsk.js';
import { formulaSheetPage } from './js/formulaSheet.js';
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
import { dashboardView, masteryView , bindProgressTransfer } from './js/learnerUI.js';

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

/**
 * Moving focus into main is right for a client-side route change: it tells a
 * screen reader the page changed, which no browser does for you when the URL
 * moves without a document load.
 *
 * It is wrong on the very first paint. The browser has already announced the
 * document, and focusing main there parks the caret past the header, so the
 * first Tab lands inside the page content and the skip link and the whole
 * navigation become unreachable going forwards. On load, focus is left on the
 * body where the browser put it.
 */
let hasRenderedOnce = false;

function render(view) {
  app.innerHTML = view;
  app.setAttribute('tabindex', '-1');
  if (hasRenderedOnce) app.focus({ preventScroll: true });
  hasRenderedOnce = true;
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
  // Answers from KINETIQ's own content, so it works with no AI key configured.
  '/ask': ({ query }) => transition(async () => ({ view: askPage(query || ''), mount: bindAsk }), 'Opening Ask KINETIQ…'),
  '/': () => transition(async () => {
    const [index, state] = await Promise.all([loader.getIndex(), progressService.list()]);
    return { view: renderHome(index, { completedLessons: state.completed }) };
  }, 'Preparing your physics workspace…'),
  '/lesson/:slug': ({ slug }) => transition(async () => {
    const [lesson, index, state] = await Promise.all([
      loader.getLesson(slug), loader.getIndex(), progressService.list()
    ]);
    return { view: renderLesson(lesson, index, state.completed), mount: bindLessonAsk };
  }, 'Opening lesson…'),
  // One page, every formula, grouped by unit — built for printing.
  '/formulas/print': () => transition(async () => ({ view: formulaSheetPage(await loader.getIndex()) }), 'Building the formula sheet…'),
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
  '/admin': () => transition(async () => {
    const admin = await loadPageModule('./js/adminUI.js');
    return { view: await admin.adminPage() };
  }, 'Loading admin…'),
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
  '/progress': () => transition(async () => ({ view: dashboardView(...(await dashboardContext())), mount: () => bindProgressTransfer() }), 'Loading progress…'),
  '/mastery': () => transition(async () => ({ view: masteryView(await dashboardService.summary()) }), 'Loading mastery…'),
  '/activity': () => transition(async () => ({ view: dashboardView(...(await dashboardContext())) }), 'Loading activity…'),
  // Sign in with Google or Apple. There is no separate registration: the
  // first time a provider returns a learner, the account is created. /signup
  // and /reset are kept as aliases so old links and bookmarks still land
  // somewhere useful rather than on a 404, and /reset has nothing to reset
  // because KINETIQ holds no password.
  ...["login", "signup", "reset"].reduce((routes, alias) => {
    routes["/" + alias] = () => transition(async () => {
      const { authService } = await import("./js/services/authService.js");
      if (authService.enabled()) {
        const auth = await loadPageModule("./js/authUI.js");
        return { view: await auth.authPage(), mount: () => auth.bindAuth() };
      }
      // No account service configured: a device-local profile, so the page is
      // never a dead end.
      const local = await loadPageModule("./js/localProfileUI.js");
      return { view: local.localProfilePage(), mount: () => local.bindLocalProfile(router) };
    }, "Opening sign-in…");
    return routes;
  }, {}),
  '/onboarding': () => transition(async () => ({ view: onboardingPage() }), 'Preparing onboarding…'),
  // Owner-facing: the only steps that cannot be done from inside the app,
  // with each value checked against the real project as it is pasted.
  '/setup': () => transition(async () => {
    const setup = await loadPageModule('./js/setupUI.js');
    return { view: setup.setupPage(), mount: () => setup.bindSetup() };
  }, 'Opening setup…'),
  '/account': () => transition(async () => {
    const [profile, account] = await Promise.all([profileService.get(), loadPageModule('./js/accountPage.js')]);
    return { view: await account.accountPage(profile), mount: () => bindAccount(router) };
  }, 'Loading account…'),
  '/bookmarks': () => transition(async () => ({ view: bookmarkPage(await bookmarkService.list()) }), 'Loading bookmarks…'),
  '/revision': () => transition(async () => {
    const [index, planner, state] = await Promise.all([
      loader.getIndex(), loadPageModule('./js/revisionUI.js'), progressService.list()
    ]);
    const lessons = await Promise.all(index.lessonIndex.map(item => loader.getLesson(item.slug)));
    return { view: planner.revisionPage(index, lessons, state.completed), mount: () => planner.bindRevision() };
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
    // Account settings are resolved before the first render, so pages that ask
    // "are accounts available?" while building their markup get a true answer
    // rather than assuming no and rendering a dead end. It runs alongside the
    // content load and never blocks it: if it fails, the app is simply in
    // guest mode, which is a valid state.
    const [index] = await Promise.all([
      loader.getIndex(),
      import('./js/services/supabaseClient.js')
        .then(m => m.getSupabaseSettings())
        .catch(() => null),
    ]);
    searchIndex = new SearchIndex(index);
    indexContent(index);
    if (!routerStarted) {
      router.start();
      // The account control reflects auth state, which can arrive after the
      // first paint via an OAuth redirect, so it initialises itself and then
      // listens rather than being rendered once here.
      import("./js/accountMenu.js").then(m => m.initAccountMenu()).catch(() => {});
      // Google returns to the site root, so the destination is decided here
      // once the session exists. Only a sign-in this tab actually started
      // leaves a stored return path, which is what keeps this from firing on
      // an ordinary page load that happens to restore a session.
      import("./js/services/authService.js").then(({ authService }) => {
        if (!authService.enabled()) return;
        authService.onChange(async (event, session) => {
          if (event !== "SIGNED_IN" || !session?.user) return;
          const { destinationFor } = await import("./js/authFlow.js");
          const target = destinationFor(session.user);
          if (target && target !== location.pathname) router.go(target);
        });
      }).catch(() => {});
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
