/** KINETIQ's single Node service: public assets, content catalogue, and KIT chat. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRetrievalEngine } = require('./server/retrievalEngine.cjs');
const { loadPrivateRecords, privateSummary } = require('./server/privateLibrary.cjs');

const ROOT = __dirname;

/** Loads .env for local development without a dependency. Hosted platforms inject real variables instead. */
function loadEnvFile() {
  try {
    const raw = require('node:fs').readFileSync(path.join(__dirname, '.env'), 'utf8');
    raw.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!match || line.trim().startsWith('#')) return;
      const value = match[2].trim().replace(/^(['"])(.*)\1$/s, '$2');
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    });
  } catch { /* No .env file is a normal production setup. */ }
}
loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const REQUESTS = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const TUTOR_CONTEXT = `You are KIT, the experienced IBDP Physics teacher inside KINETIQ. Treat KINETIQ retrieval as the primary source of truth. Use general physics knowledge only to explain or connect retrieved KINETIQ material, and clearly state when the requested detail is not in KINETIQ. Teach accurately at SL or HL as requested, use SI units, and avoid claiming official IB marking. Do not reproduce unsupplied copyrighted examination material.`;

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
const INDEX_FILES = ['topics.json', 'formulas.json', 'questions.json', 'glossary.json', 'simulations.json', 'examples.json', 'lessons.json', 'units.json', 'toolkit.json', 'cases.json', 'questionPatterns.json', 'resources.json'];
const INDEX_NAMES = ['topics', 'formulas', 'questions', 'glossary', 'simulations', 'examples', 'legacy lessons', 'units', 'toolkit', 'cases', 'question patterns', 'resources'];

async function contentIndex({ includeLessons = false } = {}) {
  const [topics, formulas, questions, glossary, simulations, examples, legacyLessons, units, toolkit, cases, questionPatterns, resources, files] = await Promise.all(INDEX_FILES.map(readData).concat(lessonFiles()));
  const records = await Promise.all(files.map(async file => normalizeLesson(await readLesson(file), file, files)));
  [topics, formulas, questions, glossary, simulations, examples, legacyLessons, units, toolkit, cases, questionPatterns, resources].forEach((value, index) => validateCollection(value, INDEX_NAMES[index]));
  cases.forEach(item => { if (!item.slug || !item.unit || !item.title) throw new Error('Each case needs a slug, unit and title.'); });
  questionPatterns.forEach(item => { if (!item.slug || !item.command) throw new Error('Each question pattern needs a slug and command term.'); });
  const allFormulas = [...formulas, ...records.flatMap(record => record.formulas.map(item => ({ ...item, topic: record.topicLabel })))];
  const searchIndex = records.flatMap(record => [
    ...record.definitions.map(item => ({ type: 'Definition', title: item.term, text: `${item.term} ${item.meaning || ''} ${record.title}`, href: `/lesson/${record.slug}` })),
    ...record.formulas.map(item => ({ type: 'Formula', title: item.name, text: `${item.name} ${item.formula} ${item.explanation || ''}`, href: `/lesson/${record.slug}` })),
    ...record.worked_examples.map(item => ({ type: 'Worked example', title: record.title, text: `${item.question} ${item.answer}`, href: `/lesson/${record.slug}` }))
  ]);
  return {
    topics, formulas: allFormulas, questions, glossary, simulations, examples, legacyLessons, units, toolkit, cases, questionPatterns, resources, searchIndex,
    lessonIndex: records.map(({ slug, title, topicLabel, level, summary, learning_objectives, estimatedStudyTime, difficulty, definitions, formulas: lessonFormulas }) => ({
      slug, title, topicLabel, level, summary, learning_objectives, estimatedStudyTime, difficulty,
      unit: (String(title).match(/^\s*([A-Z])\./) || [])[1] || '',
      tags: [...new Set([...(definitions || []).slice(0, 3).map(item => item.term), ...(lessonFormulas || []).slice(0, 2).map(item => item.name)])].filter(Boolean).slice(0, 4)
    })),
    ...(includeLessons ? { lessons: records } : {})
  };
}
const retrievalEngine = createRetrievalEngine(() => contentIndex({ includeLessons: true }), { getExtraRecords: loadPrivateRecords });
const MODES = new Set(['Physics Teacher', 'Numerical Solver', 'Formula Explainer', 'Derivation Tutor', 'IB Examiner', 'Revision Coach', 'Lab Assistant', 'Graph Analyzer', 'TOK Discussion', 'IA Mentor', 'Question Generator', 'Challenge Me', 'Concept Check', 'Explain', 'Teach', 'Step-by-step', 'Hint', 'Revision', 'Socratic Tutor', 'Quick Answer']);
const cleanText = (value, maximum = 6000) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maximum) : '';
const cleanContext = context => context && typeof context === 'object' ? Object.fromEntries(Object.entries(context).slice(0, 20).map(([key, value]) => [cleanText(key, 50), cleanText(typeof value === 'string' ? value : JSON.stringify(value), 500)])) : {};
const validImage = value => typeof value === 'string' && /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value) && value.length <= 2500000;
const sse = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

function tutorInstructions({ mode, context, sources }) {
  const retrieved = sources.map(source => `[${source.type}] ${source.title}\n${source.body}`).join('\n\n') || 'No direct KINETIQ match was found. Say this clearly, then give a careful general explanation.';
  return `${TUTOR_CONTEXT}\n\nTeaching mode: ${mode}.\nCurrent KINETIQ route and learner context: ${JSON.stringify(context)}\n\nRetrieved KINETIQ content (use this before other knowledge):\n${retrieved}\n\nRespond in concise Markdown. When relevant, use these headings: Explanation, Formula, Variables and units, Worked example, Common mistakes, IB tip, and Next in KINETIQ. In Numerical Solver mode always show Known values, Unknown, Equation, Substitution, Answer with units and significant figures, and Reasonableness check. In IB Examiner mode label feedback as KINETIQ practice marking, identify correct points, missing points, an estimated mark, a model answer, and improvement advice. For Question Generator mode, produce original questions only, identify SL/HL, marks, command term, answer, and mark points. For Revision Coach mode, recommend a realistic next study action from the retrieved topics. Never reveal hidden reasoning or claim an official IB mark. Passages labelled [Your source] come from a book the learner owns and has indexed privately: answer from them when they are relevant, cite them by title and page, and explain the physics in your own words rather than quoting long extracts.`;
}

/**
 * KINETIQ talks to several providers so a learner is never blocked by one vendor.
 * Every key is read from the server environment and never reaches the browser.
 */
const PROVIDERS = {
  openai: {
    label: 'OpenAI', envKey: 'OPENAI_API_KEY', modelKey: 'OPENAI_MODEL', defaultModel: 'gpt-5.6-sol',
    build: ({ model, instructions, history, message, image }) => ({
      url: 'https://api.openai.com/v1/responses',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: {
        model, instructions, stream: true, store: false, reasoning: { effort: 'high' }, text: { verbosity: 'medium' },
        input: [...history.map(item => ({ role: item.role, content: [{ type: item.role === 'assistant' ? 'output_text' : 'input_text', text: item.content }] })),
          { role: 'user', content: [{ type: 'input_text', text: message }, ...(image ? [{ type: 'input_image', image_url: image }] : [])] }]
      }
    }),
    parse: event => (event.type === 'response.output_text.delta' ? event.delta : '')
  },
  groq: {
    label: 'Groq', envKey: 'GROQ_API_KEY', modelKey: 'GROQ_MODEL', defaultModel: 'llama-3.3-70b-versatile',
    build: ({ model, instructions, history, message, image }) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: {
        model, stream: true,
        messages: [{ role: 'system', content: instructions }, ...history,
          { role: 'user', content: image ? [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: image } }] : message }]
      }
    }),
    parse: event => event.choices?.[0]?.delta?.content || ''
  },
  anthropic: {
    label: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', modelKey: 'ANTHROPIC_MODEL', defaultModel: 'claude-sonnet-5',
    build: ({ model, instructions, history, message, image }) => {
      const parts = [{ type: 'text', text: message }];
      const media = image && image.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
      if (media) parts.unshift({ type: 'image', source: { type: 'base64', media_type: media[1], data: media[2] } });
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: { model, system: instructions, max_tokens: 4096, stream: true, messages: [...history, { role: 'user', content: parts }] }
      };
    },
    parse: event => (event.type === 'content_block_delta' ? event.delta?.text || '' : '')
  },
  gemini: {
    label: 'Google Gemini', envKey: 'GEMINI_API_KEY', modelKey: 'GEMINI_MODEL', defaultModel: 'gemini-2.5-flash',
    build: ({ model, instructions, history, message, image }) => {
      const parts = [{ text: message }];
      const media = image && image.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
      if (media) parts.push({ inlineData: { mimeType: media[1], data: media[2] } });
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: {
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [...history.map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })), { role: 'user', parts }]
        }
      };
    },
    parse: event => (event.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('')
  }
};

const providerConfigured = id => Boolean(process.env[PROVIDERS[id].envKey]);
const availableProviders = () => Object.keys(PROVIDERS).filter(providerConfigured);
/** Honours an explicit request or AI_PROVIDER, then falls back to whichever key is present. */
function resolveProvider(requested) {
  const preferred = [requested, process.env.AI_PROVIDER].map(value => String(value || '').toLowerCase()).find(value => PROVIDERS[value] && providerConfigured(value));
  return preferred || availableProviders()[0] || null;
}

async function streamProvider(response, res, parse) {
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
        const delta = parse(event) || '';
        if (delta) sse(res, 'delta', { delta });
        if (event.type === 'response.completed') sse(res, 'meta', { usage: event.response?.usage || null });
        if (event.type === 'error' || event.error) sse(res, 'error', { error: 'KIT could not complete that request. Please retry.' });
      } catch { /* Ignore incomplete upstream SSE packets. */ }
    }
  }
}

async function tutor(req, res) {
  if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. Please wait a few minutes and try again.' });
  let providerId;
  try {
    const body = await readJSON(req);
    providerId = resolveProvider(body.provider);
    if (!providerId) return send(res, 503, { error: 'KIT is ready, but no AI key has been configured on the server. Add GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY to your environment.' });
    const provider = PROVIDERS[providerId];
    const message = cleanText(body.message);
    if (!message) return send(res, 400, { error: 'Please write a question for KIT.' });
    const mode = MODES.has(body.mode) ? body.mode : 'Physics Teacher';
    const context = cleanContext(body.context);
    const sources = await retrievalEngine.retrieve(message, context, 8);
    const history = Array.isArray(body.history) ? body.history.slice(-8).filter(item => item && ['user', 'assistant'].includes(item.role)).map(item => ({ role: item.role, content: cleanText(item.content, 3500) })).filter(item => item.content) : [];
    const image = validImage(body.image) ? body.image : null;
    const model = process.env[provider.modelKey] || provider.defaultModel;
    const request = provider.build({ model, instructions: tutorInstructions({ mode, context, sources }), history, message, image });
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    const response = await fetch(request.url, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Client-Request-Id': crypto.randomUUID(), ...request.headers },
      body: JSON.stringify(request.body)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = data?.error?.message || data?.error?.[0]?.message || data?.message;
      // An auth failure means the key is wrong, revoked, or from another account.
      // Say so plainly, because the generic upstream wording sends people hunting in the code.
      if (response.status === 401 || response.status === 403) {
        return send(res, response.status, {
          error: `${provider.label} rejected the API key. It is present but not valid — most often it was deleted or regenerated on the provider's dashboard, or only part of it was pasted. Create a fresh key, put it in ${provider.envKey}, and restart KINETIQ.`
        });
      }
      return send(res, response.status, { error: `${provider.label}: ${detail || 'KIT could not complete that request.'}` });
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    sse(res, 'sources', { sources: sources.map(({ type, title, href, metadata }) => ({ type, title, href, metadata })) });
    sse(res, 'meta', { provider: providerId, providerLabel: provider.label, model });
    await streamProvider(response, res, provider.parse);
    sse(res, 'done', {}); res.end();
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('KIT request failed:', error.message);
    if (!res.headersSent) send(res, 500, { error: 'KIT is temporarily unavailable. Please try again shortly.' });
    else { sse(res, 'error', { error: 'KIT is temporarily unavailable. Please retry.' }); res.end(); }
  }
}
async function serveAsset(res, pathname, headOnly) {
  // Markup, styles and scripts must revalidate: a design change served behind
  // a long max-age leaves returning visitors on the previous stylesheet for an
  // hour. Icons are content-stable and safe to cache hard.
  const cacheControlFor = file => {
    if (process.env.NODE_ENV !== 'production') return 'no-cache';
    if (/^icons\//.test(file)) return 'public, max-age=604800, immutable';
    return 'no-cache';
  };

  let target = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  // Any path without a file extension is a client route, so the SPA renders it (including its own 404 page).
  if (!/\.[a-z0-9]+$/i.test(target) && !target.startsWith('api/')) target = 'index.html';
  if (!(/^(index\.html|styles\.css|app\.js|public-env\.js|sw\.js|manifest\.json|js\/[a-zA-Z0-9_\/-]+\.js|icons\/[a-zA-Z0-9_-]+\.png)$/.test(target))) return send(res, 404, { error: 'Not found' });
  const file = path.resolve(ROOT, target); if (!file.startsWith(`${ROOT}${path.sep}`)) return send(res, 403, { error: 'Forbidden' });
  try { const data = await fs.readFile(file); res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': cacheControlFor(target), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' }); if (!headOnly) res.end(data); else res.end(); } catch { send(res, 404, { error: 'Not found' }); }
}
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const pathname = decodeURIComponent(url.pathname);
  if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { status: 'ok', tutorConfigured: availableProviders().length > 0, providers: availableProviders(), privateSources: privateSummary() });
  if (req.method === 'GET' && pathname === '/api/ai/providers') return send(res, 200, {
    active: resolveProvider(),
    providers: Object.entries(PROVIDERS).map(([id, provider]) => ({ id, label: provider.label, configured: providerConfigured(id), envKey: provider.envKey, model: providerConfigured(id) ? process.env[provider.modelKey] || provider.defaultModel : null }))
  });
  if (req.method === 'GET' && pathname === '/api/content/index') { try { return send(res, 200, await contentIndex(), { 'Cache-Control': 'public, max-age=300' }); } catch (error) { return send(res, 500, { error: `Content catalogue error: ${error.message}` }); } }
  const lessonMatch = pathname.match(/^\/api\/content\/lessons\/([a-z0-9-]+)$/); if (req.method === 'GET' && lessonMatch) { try { const files = await lessonFiles(); const file = files.find(candidate => slugify(path.basename(candidate, '.json')) === lessonMatch[1]); if (!file) return send(res, 404, { error: 'Lesson not found.' }); return send(res, 200, normalizeLesson(await readLesson(file), file, files), { 'Cache-Control': 'public, max-age=300' }); } catch (error) { return send(res, 500, { error: `Lesson error: ${error.message}` }); } }
  if (req.method === 'POST' && pathname === '/api/chat') return tutor(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
  return serveAsset(res, pathname, req.method === 'HEAD');
}

/**
 * Serverless platforms import this module and call the handler per request, while
 * `npm start` and the Docker image run it as a long-lived server. Only bind a port
 * when this file is the entry point, so both work from one codebase.
 */
if (require.main === module) {
  http.createServer(handleRequest).listen(PORT, HOST, () => console.log(`KINETIQ running at http://${HOST}:${PORT}`));
}

module.exports = handleRequest;
