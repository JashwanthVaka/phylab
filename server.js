/** PHYLAB's single Node service: public assets, content catalogue, and PHY chat. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const REQUESTS = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const TUTOR_CONTEXT = `You are PHY, the thoughtful AI study partner inside PHYLAB, an IBDP Physics learning platform. Teach IBDP Physics SL and HL accurately, with SI units and concise reasoning. For calculations: identify knowns, choose a principle, show working, state units, and check the answer. Do not invent IB markschemes or reproduce unsupplied copyrighted past-paper questions. Be cautious with safety-sensitive requests.`;

const send = (res, status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(body)); };
const readJSON = req => new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 150000) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON request body.')); } }); req.on('error', reject); });
const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function rateLimited(req) { const key = req.socket.remoteAddress || 'unknown'; const now = Date.now(); const list = (REQUESTS.get(key) || []).filter(time => now - time < 600000); list.push(now); REQUESTS.set(key, list); return list.length > 30; }
async function readData(name) { return JSON.parse(await fs.readFile(path.join(ROOT, 'data', name), 'utf8')); }
function validateCollection(value, name) { if (!Array.isArray(value)) throw new Error(`${name} must contain a JSON array.`); return value; }
function validateLesson(raw, file) {
  if (!raw || typeof raw !== 'object' || !raw.title || !Array.isArray(raw.definitions) || !Array.isArray(raw.core_concepts)) throw new Error(`${file} is missing required lesson fields.`);
  return raw;
}
async function lessonFiles() { return (await fs.readdir(path.join(ROOT, 'data', 'lessons'))).filter(file => file.endsWith('.json')).sort(); }
async function readLesson(file) { return validateLesson(JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'lessons', file), 'utf8')), file); }
function normalizeLesson(raw, file, all) {
  const slug = slugify(path.basename(file, '.json'));
  const topicLabel = raw.title.replace(/^[A-E]\.\d+\s*/, '');
  const studyMinutes = raw.estimatedStudyTime || Math.max(20, Math.min(75, 12 + (raw.definitions?.length || 0) * 3 + (raw.worked_examples?.length || 0) * 8));
  return { ...raw, slug, topicLabel, difficulty: raw.difficulty || (String(raw.level).includes('HL') ? 'SL + HL' : 'SL'), estimatedStudyTime: studyMinutes, prerequisites: raw.prerequisites || [], constants: raw.constants || [], derivations: raw.derivations || [], practical_experiment: raw.practical_experiment || '', ia_connection: raw.ia_connection || '', tok_connection: raw.tok_connection || '', relatedTopics: raw.relatedTopics || all.filter(item => item !== file).slice(0, 3).map(item => ({ slug: slugify(path.basename(item, '.json')), title: path.basename(item, '.json').replace(/_/g, ' ') })), formulas: raw.formulas || [], summary: raw.summary || '' };
}
async function contentIndex() {
  const [topics, formulas, questions, glossary, simulations, examples, legacyLessons, files] = await Promise.all(['topics.json', 'formulas.json', 'questions.json', 'glossary.json', 'simulations.json', 'examples.json', 'lessons.json'].map(readData).concat(lessonFiles()));
  const records = await Promise.all(files.map(async file => normalizeLesson(await readLesson(file), file, files)));
  [topics, formulas, questions, glossary, simulations, examples, legacyLessons].forEach((value, index) => validateCollection(value, ['topics', 'formulas', 'questions', 'glossary', 'simulations', 'examples', 'legacy lessons'][index]));
  const allFormulas = [...formulas, ...records.flatMap(record => record.formulas.map(item => ({ ...item, topic: record.topicLabel })))];
  const searchIndex = records.flatMap(record => [
    ...record.definitions.map(item => ({ type: 'Definition', title: item.term, text: `${item.term} ${item.meaning || ''} ${record.title}`, href: `/lesson/${record.slug}` })),
    ...record.formulas.map(item => ({ type: 'Formula', title: item.name, text: `${item.name} ${item.formula} ${item.explanation || ''}`, href: `/lesson/${record.slug}` })),
    ...record.worked_examples.map(item => ({ type: 'Worked example', title: record.title, text: `${item.question} ${item.answer}`, href: `/lesson/${record.slug}` }))
  ]);
  return { topics, formulas: allFormulas, questions, glossary, simulations, examples, legacyLessons, searchIndex, lessonIndex: records.map(({ slug, title, topicLabel, level, summary, learning_objectives }) => ({ slug, title, topicLabel, level, summary, learning_objectives })) };
}
async function tutor(req, res) {
  if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. Please wait a few minutes and try again.' });
  if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'PHY is ready, but OPENAI_API_KEY has not been configured.' });
  try {
    const body = await readJSON(req); const message = typeof body.message === 'string' ? body.message.trim().slice(0, 6000) : '';
    if (!message) return send(res, 400, { error: 'Please write a question for PHY.' });
    const modes=['Explain','Teach','Step-by-step','Hint','Examiner','Revision','Challenge Me','Flashcards','Concept Check','Numerical Solver','Socratic Tutor','Quick Answer','Deep Explanation']; const mode=modes.includes(body.mode)?body.mode:'Explain'; const context=body.context&&typeof body.context==='object'?body.context:{}; const catalogue=await contentIndex(); const terms=message.toLowerCase().split(/\W+/).filter(x=>x.length>3); const sources=catalogue.searchIndex.filter(x=>terms.some(t=>x.text.toLowerCase().includes(t))).slice(0,6); const retrieval=sources.map(x=>`[${x.type}] ${x.title}: ${x.text.slice(0,500)}`).join('\n'); const instructions=`${TUTOR_CONTEXT}\nTeaching mode: ${mode}.\nCurrent PHYLAB context: ${JSON.stringify(context).slice(0,2000)}\nUse this retrieved PHYLAB material before general knowledge:\n${retrieval||'No direct catalogue match. State when information is outside PHYLAB content.'}\nFor numerical problems, use Known values, Unknown, equation choice, substitution, units, significant figures, final answer, and a reasonableness check. Do not claim a retrieved source says something it does not.`;
    const history=Array.isArray(body.history)?body.history.slice(-8).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,4000)})):[]; const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'X-Client-Request-Id': crypto.randomUUID() }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.6-sol', instructions, input: [...history,{ role: 'user', content: message }], reasoning: { effort: 'high' }, text: { verbosity: 'medium' }, store: false, safety_identifier: 'phylab-anonymous' }) });
    const data = await response.json(); if (!response.ok) return send(res, response.status, { error: data?.error?.message || 'PHY could not complete that request.' });
    send(res, 200, { answer: data.output_text || 'PHY could not produce a response.', sources:sources.map(x=>({type:x.type,title:x.title,href:x.href})), requestId: response.headers.get('x-request-id') });
  } catch (error) { console.error('PHY request failed:', error.message); send(res, 500, { error: 'PHY is temporarily unavailable. Please try again shortly.' }); }
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
}).listen(PORT, process.env.HOST || '127.0.0.1', () => console.log(`PHYLAB running at http://${process.env.HOST || '127.0.0.1'}:${PORT}`));
