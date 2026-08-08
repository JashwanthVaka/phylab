/** PHYLAB's single Node service: public assets, content catalogue, and PHY chat. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRetrievalEngine } = require('./server/retrievalEngine.cjs');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const REQUESTS = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const TUTOR_CONTEXT = `You are PHY, the experienced IBDP Physics teacher inside PHYLAB. Treat PHYLAB retrieval as the primary source of truth. Use general physics knowledge only to explain or connect retrieved PHYLAB material, and clearly state when the requested detail is not in PHYLAB. Teach accurately at SL or HL as requested, use SI units, and avoid claiming official IB marking. Do not reproduce unsupplied copyrighted examination material.`;

const send = (res, status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(body)); };
const readJSON = req => new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 3000000) { reject(new Error('Request is too large.')); req.destroy(); } }); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON request body.')); } }); req.on('error', reject); });
const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function rateLimited(req) { const key = req.socket.remoteAddress || 'unknown'; const now = Date.now(); const list = (REQUESTS.get(key) || []).filter(time => now - time < 600000); list.push(now); REQUESTS.set(key, list); return list.length > 30; }
async function readData(name) { return JSON.parse(await fs.readFile(path.join(ROOT, 'data', name), 'utf8')); }
function validateCollection(value, name) { if (!Array.isArray(value)) throw new Error(`${name} must contain a JSON array.`); return value; }
function validateLesson(raw, file) {
  if (!raw || typeof raw !== 'object' || !raw.title || !Array.isArray(raw.definitions) || !Array.isArray(raw.core_concepts)) throw new Error(`${file} is missing required lesson fields.`);
  return raw;
}
function curriculumPosition(title = '') {
  const match = String(title).match(/^\s*([A-Z])\.(\d+)\b/i);
  return match ? [(match[1].toUpperCase().charCodeAt(0) - 65) * 1000 + Number(match[2]), String(title)] : [Number.MAX_SAFE_INTEGER, String(title)];
}
async function lessonFiles() {
  const files = (await fs.readdir(path.join(ROOT, 'data', 'lessons'))).filter(file => file.endsWith('.json'));
  const ordered = await Promise.all(files.map(async file => ({ file, lesson: await readLesson(file) })));
  return ordered.sort((left, right) => {
    const [leftOrder, leftTitle] = curriculumPosition(left.lesson.title);
    const [rightOrder, rightTitle] = curriculumPosition(right.lesson.title);
    return leftOrder - rightOrder || leftTitle.localeCompare(rightTitle);
  }).map(item => item.file);
}
async function readLesson(file) { return validateLesson(JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'lessons', file), 'utf8')), file); }
function normalizeLesson(raw, file, all) {
  const slug = slugify(path.basename(file, '.json'));
  const topicLabel = raw.title.replace(/^[A-E]\.\d+\s*/, '');
  const studyMinutes = raw.estimatedStudyTime || Math.max(20, Math.min(75, 12 + (raw.definitions?.length || 0) * 3 + (raw.worked_examples?.length || 0) * 8));
  return { ...raw, slug, topicLabel, difficulty: raw.difficulty || (String(raw.level).includes('HL') ? 'SL + HL' : 'SL'), estimatedStudyTime: studyMinutes, prerequisites: raw.prerequisites || [], constants: raw.constants || [], derivations: raw.derivations || [], practical_experiment: raw.practical_experiment || '', ia_connection: raw.ia_connection || '', tok_connection: raw.tok_connection || '', relatedTopics: raw.relatedTopics || all.filter(item => item !== file).slice(0, 3).map(item => ({ slug: slugify(path.basename(item, '.json')), title: path.basename(item, '.json').replace(/_/g, ' ') })), formulas: raw.formulas || [], summary: raw.summary || '' };
}
async function contentIndex({ includeLessons = false } = {}) {
  const [topics, formulas, questions, glossary, simulations, examples, legacyLessons, files] = await Promise.all(['topics.json', 'formulas.json', 'questions.json', 'glossary.json', 'simulations.json', 'examples.json', 'lessons.json'].map(readData).concat(lessonFiles()));
  const records = await Promise.all(files.map(async file => normalizeLesson(await readLesson(file), file, files)));
  [topics, formulas, questions, glossary, simulations, examples, legacyLessons].forEach((value, index) => validateCollection(value, ['topics', 'formulas', 'questions', 'glossary', 'simulations', 'examples', 'legacy lessons'][index]));
  const allFormulas = [...formulas, ...records.flatMap(record => record.formulas.map(item => ({ ...item, topic: record.topicLabel })))];
  const searchIndex = records.flatMap(record => [
    ...record.definitions.map(item => ({ type: 'Definition', title: item.term, text: `${item.term} ${item.meaning || ''} ${record.title}`, href: `/lesson/${record.slug}` })),
    ...record.formulas.map(item => ({ type: 'Formula', title: item.name, text: `${item.name} ${item.formula} ${item.explanation || ''}`, href: `/lesson/${record.slug}` })),
    ...record.worked_examples.map(item => ({ type: 'Worked example', title: record.title, text: `${item.question} ${item.answer}`, href: `/lesson/${record.slug}` }))
  ]);
  return { topics, formulas: allFormulas, questions, glossary, simulations, examples, legacyLessons, searchIndex, lessonIndex: records.map(({ slug, title, topicLabel, level, summary, learning_objectives }) => ({ slug, title, topicLabel, level, summary, learning_objectives })), ...(includeLessons ? { lessons: records } : {}) };
}
const retrievalEngine = createRetrievalEngine(() => contentIndex({ includeLessons: true }));
const MODES = new Set(['Physics Teacher', 'Numerical Solver', 'Formula Explainer', 'Derivation Tutor', 'IB Examiner', 'Revision Coach', 'Lab Assistant', 'Graph Analyzer', 'TOK Discussion', 'IA Mentor', 'Question Generator', 'Challenge Me', 'Concept Check', 'Explain', 'Teach', 'Step-by-step', 'Hint', 'Revision', 'Socratic Tutor', 'Quick Answer']);
const cleanText = (value, maximum = 6000) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maximum) : '';
const cleanContext = context => context && typeof context === 'object' ? Object.fromEntries(Object.entries(context).slice(0, 20).map(([key, value]) => [cleanText(key, 50), cleanText(typeof value === 'string' ? value : JSON.stringify(value), 500)])) : {};
const validImage = value => typeof value === 'string' && /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value) && value.length <= 2500000;
const sse = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

function tutorInstructions({ mode, context, sources }) {
  const retrieved = sources.map(source => `[${source.type}] ${source.title}\n${source.body}`).join('\n\n') || 'No direct PHYLAB match was found. Say this clearly, then give a careful general explanation.';
  return `${TUTOR_CONTEXT}\n\nTeaching mode: ${mode}.\nCurrent PHYLAB route and learner context: ${JSON.stringify(context)}\n\nRetrieved PHYLAB content (use this before other knowledge):\n${retrieved}\n\nRespond in concise Markdown. When relevant, use these headings: Explanation, Formula, Variables and units, Worked example, Common mistakes, IB tip, and Next in PHYLAB. In Numerical Solver mode always show Known values, Unknown, Equation, Substitution, Answer with units and significant figures, and Reasonableness check. In IB Examiner mode label feedback as PHYLAB practice marking, identify correct points, missing points, an estimated mark, a model answer, and improvement advice. For Question Generator mode, produce original questions only, identify SL/HL, marks, command term, answer, and mark points. For Revision Coach mode, recommend a realistic next study action from the retrieved topics. Never reveal hidden reasoning or claim an official IB mark.`;
}

async function streamOpenAI(response, res) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The AI response did not include a stream.');
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/); buffer = events.pop();
    for (const packet of events) {
      const payload = packet.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('');
      if (!payload || payload === '[DONE]') continue;
      try {
        const event = JSON.parse(payload);
        if (event.type === 'response.output_text.delta' && event.delta) sse(res, 'delta', { delta: event.delta });
        if (event.type === 'response.completed') sse(res, 'meta', { requestId: response.headers.get('x-request-id'), usage: event.response?.usage || null });
        if (event.type === 'error') sse(res, 'error', { error: 'PHY could not complete that request. Please retry.' });
      } catch { /* Ignore incomplete upstream SSE packets. */ }
    }
  }
}

async function tutor(req, res) {
  if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. Please wait a few minutes and try again.' });
  if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'PHY is ready, but OPENAI_API_KEY has not been configured.' });
  try {
    const body = await readJSON(req);
    const message = cleanText(body.message);
    if (!message) return send(res, 400, { error: 'Please write a question for PHY.' });
    const mode = MODES.has(body.mode) ? body.mode : 'Physics Teacher';
    const context = cleanContext(body.context);
    const sources = await retrievalEngine.retrieve(message, context, 8);
    const history = Array.isArray(body.history) ? body.history.slice(-8).filter(item => item && ['user', 'assistant'].includes(item.role)).map(item => ({ role: item.role, content: cleanText(item.content, 3500) })).filter(item => item.content) : [];
    const image = validImage(body.image) ? body.image : null;
    const userContent = [{ type: 'input_text', text: message }];
    if (image) userContent.push({ type: 'input_image', image_url: image });
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'X-Client-Request-Id': crypto.randomUUID() },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.6-sol', instructions: tutorInstructions({ mode, context, sources }), input: [...history, { role: 'user', content: userContent }], reasoning: { effort: 'high' }, text: { verbosity: 'medium' }, stream: true, store: false, safety_identifier: `phylab-${crypto.createHash('sha256').update(req.socket.remoteAddress || 'anonymous').digest('hex').slice(0, 24)}` })
    });
    if (!response.ok) { const data = await response.json().catch(() => ({})); return send(res, response.status, { error: data?.error?.message || 'PHY could not complete that request.' }); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    sse(res, 'sources', { sources: sources.map(({ type, title, href, metadata }) => ({ type, title, href, metadata })) });
    await streamOpenAI(response, res);
    sse(res, 'done', {}); res.end();
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('PHY request failed:', error.message);
    if (!res.headersSent) send(res, 500, { error: 'PHY is temporarily unavailable. Please try again shortly.' });
    else { sse(res, 'error', { error: 'PHY is temporarily unavailable. Please retry.' }); res.end(); }
  }
}
async function serveAsset(res, pathname, headOnly) {
  let target = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const appRoute = /^\/(lesson\/[^/]+|formulas(?:\/[^/]+)?|quiz(?:\/topic\/[^/]+)?|exam|results\/[^/]+|simulations(?:\/[^/]+)?|progress|mastery|activity|bookmarks|revision|ai|account|login|signup|onboarding|search)$/.test(pathname);
  if (appRoute) target = 'index.html';
  if (!(/^(index\.html|styles\.css|app\.js|public-env\.js|js\/[a-zA-Z0-9_\/-]+\.js)$/.test(target))) return send(res, 404, { error: 'Not found' });
  const file = path.resolve(ROOT, target); if (!file.startsWith(`${ROOT}${path.sep}`)) return send(res, 403, { error: 'Forbidden' });
  try { const data = await fs.readFile(file); res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': target.includes('.') && target !== 'index.html' ? 'public, max-age=3600' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' }); if (!headOnly) res.end(data); else res.end(); } catch { send(res, 404, { error: 'Not found' }); }
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const pathname = decodeURIComponent(url.pathname);
  if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { status: 'ok', tutorConfigured: Boolean(process.env.OPENAI_API_KEY) });
  if (req.method === 'GET' && pathname === '/api/content/index') { try { return send(res, 200, await contentIndex(), { 'Cache-Control': 'public, max-age=300' }); } catch (error) { return send(res, 500, { error: `Content catalogue error: ${error.message}` }); } }
  const lessonMatch = pathname.match(/^\/api\/content\/lessons\/([a-z0-9-]+)$/); if (req.method === 'GET' && lessonMatch) { try { const files = await lessonFiles(); const file = files.find(candidate => slugify(path.basename(candidate, '.json')) === lessonMatch[1]); if (!file) return send(res, 404, { error: 'Lesson not found.' }); return send(res, 200, normalizeLesson(await readLesson(file), file, files), { 'Cache-Control': 'public, max-age=300' }); } catch (error) { return send(res, 500, { error: `Lesson error: ${error.message}` }); } }
  if (req.method === 'POST' && pathname === '/api/chat') return tutor(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
  return serveAsset(res, pathname, req.method === 'HEAD');
}).listen(PORT, HOST, () => console.log(`PHYLAB running at http://${HOST}:${PORT}`));
