/**
 * Builds a static, server-free copy of KINETIQ into docs/ for GitHub Pages.
 *
 * Everything except the AI tutor works without the Node server, so the build
 * snapshots the content API to JSON files and patches the handful of places
 * that assume a server or root-relative routing. The Node app in the repo root
 * stays the source of truth — this only produces a deployable copy of it.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.env.KINETIQ_TARGET === 'netlify' ? 'netlify' : 'pages';
const OUT = path.join(ROOT, MODE === 'netlify' ? 'dist' : 'docs');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

const read = file => fs.readFile(path.join(ROOT, file), 'utf8');
const write = async (rel, body) => {
  const target = path.join(OUT, rel);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
};

/** Applies a required replacement, failing loudly if the source has moved on. */
function patch(source, find, replace, label) {
  if (!source.includes(find)) throw new Error(`build-static: could not find ${label}. Update tools/build-static.mjs.`);
  return source.split(find).join(replace);
}

async function withServer(work) {
  const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' }, stdio: 'ignore' });
  try {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { await fetch(`${BASE}/api/health`); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    return await work();
  } finally {
    server.kill();
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

// 1. Snapshot the content API through the real server so the build cannot drift from it.
const index = await withServer(async () => {
  const catalogue = await (await fetch(`${BASE}/api/content/index`)).json();
  await write('api/content/index.json', JSON.stringify(catalogue));
  for (const lesson of catalogue.lessonIndex) {
    const detail = await (await fetch(`${BASE}/api/content/lessons/${lesson.slug}`)).json();
    await write(`api/content/lessons/${lesson.slug}.json`, JSON.stringify(detail));
  }
  return catalogue;
});
// KINETIQ_APP_URL points the static copy at a deployment where the tutor actually runs,
// so the published page can send people somewhere useful instead of a dead end.
const appUrl = (process.env.KINETIQ_APP_URL || '').trim().replace(/\/$/, '');
await write('api/ai/providers.json', JSON.stringify({ active: null, static: true, appUrl, providers: [] }));
if (appUrl) console.log(`  tutor link points at ${appUrl}`);

// 2. Copy the stylesheet and the browser env shim unchanged.
await write('styles.css', await read('styles.css'));
await write('public-env.js', await read('public-env.js'));
await write('sw.js', await read('sw.js'));

// 3. index.html: assets become relative, because Pages serves the site from /<repo>/.
let html = await read('index.html');
if (MODE === 'pages') {
  html = patch(html, 'href="/styles.css"', 'href="./styles.css"', 'stylesheet link');
  html = patch(html, 'src="/public-env.js"', 'src="./public-env.js"', 'env script');
  html = patch(html, 'src="/app.js"', 'src="./app.js"', 'app script');
}
await write('index.html', html);

// 4. Router: Pages has no SPA rewrite, so the static build routes on the hash.
let router = await read('js/router.js');
if (MODE === 'pages') {
router = patch(router, "window.addEventListener('popstate', this.handle)", "window.addEventListener('hashchange', this.handle)", 'popstate listener');
router = patch(router, "history.pushState({}, '', path)", 'location.hash = path', 'pushState call');
router = patch(router, 'const path = location.pathname.replace(/\\/$/, \'\') || \'/\';', "const path = (location.hash.slice(1) || '/').replace(/\\/$/, '') || '/';", 'path read');
router = patch(router, "new URLSearchParams(location.search).get('q')", "new URLSearchParams((location.hash.split('?')[1] || '')).get('q')", 'query read');
}
await write('js/router.js', router);

// 5. Content loader: read the snapshot instead of the live API.
let loader = await read('js/contentLoader.js');
const prefix = MODE === 'pages' ? './' : '/';
loader = patch(loader, "this.request('/api/content/index')", `this.request('${prefix}api/content/index.json')`, 'index request');
loader = patch(loader, 'this.request(`/api/content/lessons/${encodeURIComponent(key)}`)', `this.request(\`${prefix}api/content/lessons/\${encodeURIComponent(key)}.json\`)`, 'lesson request');
await write('js/contentLoader.js', loader);

// 6. AI: no server means no tutor. Say so immediately rather than failing on send.
let workspace = await read('js/aiWorkspace.js');
workspace = patch(workspace, "await fetch('/api/ai/providers')", `await fetch('${prefix}api/ai/providers.json')`, 'provider probe');
await write('js/aiWorkspace.js', workspace);

let aiService = await read('js/services/aiService.js');
aiService = patch(
  aiService,
  "        const response = await fetch('/api/chat', {",
  "        if (window.KINETIQ_STATIC) throw new Error('KIT needs the KINETIQ Node server. This is the static build, so the tutor is switched off — every other part of KINETIQ works here.');\n        const response = await fetch('/api/chat', {",
  'chat request'
);
await write('js/services/aiService.js', aiService);

// 7. Quiz results navigate by hash in the static build.
let quiz = await read('js/quizSession.js');
if (MODE === 'pages') quiz = patch(quiz, 'window.location.assign(`/results/${complete.id}`)', 'window.location.hash = `/results/${complete.id}`', 'results navigation');
await write('js/quizSession.js', quiz);

// 8. Everything else copies across untouched.
const patched = new Set(['router.js', 'contentLoader.js', 'aiWorkspace.js', 'quizSession.js', 'services/aiService.js']);
const copyTree = async dir => {
  for (const entry of await fs.readdir(path.join(ROOT, 'js', dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { await copyTree(rel); continue; }
    if (!entry.name.endsWith('.js') || patched.has(rel)) continue;
    await write(`js/${rel}`, await read(`js/${rel}`));
  }
};
await copyTree('');

// 9. app.js keeps its dynamic imports; only the static flag is added.
let app = await read('app.js');
app = `window.KINETIQ_STATIC = true;\n${app}`;
await write('app.js', app);

// 10. Pages must not run Jekyll over the output.
if (MODE === 'netlify') await write('_redirects', '/*    /index.html   200\n');
else await write('.nojekyll', '');

const files = [];
const count = async dir => {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await count(full); else files.push(full);
  }
};
await count(OUT);
console.log(`static build written to ${MODE === 'netlify' ? 'dist' : 'docs'}/ — ${files.length} files, ${index.lessonIndex.length} lessons, ${index.cases.length} cases`);
