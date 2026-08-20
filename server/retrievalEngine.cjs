const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'when', 'where', 'which', 'about', 'into', 'your', 'have', 'does', 'using', 'show', 'explain']);

const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const terms = value => [...new Set(text(value).toLowerCase().match(/[a-z0-9]+/g)?.filter(term => term.length > 1 && !STOP_WORDS.has(term)) || [])];
const compact = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(compact).join(' ') : value && typeof value === 'object' ? Object.values(value).map(compact).join(' ') : '';

function record(type, title, body, href, metadata = {}) {
  return { id: `${type}:${href || title}`, type, title: text(title), body: text(body).slice(0, 2400), href, metadata };
}

function lessonRecords(lesson) {
  const href = `/lesson/${lesson.slug}`;
  const records = [record('Lesson', lesson.title, `${lesson.summary || ''} ${(lesson.learning_objectives || []).join(' ')}`, href, { topic: lesson.topicLabel, level: lesson.level })];
  (lesson.definitions || []).forEach(item => records.push(record('Definition', item.term, `${item.meaning || ''} ${lesson.title}`, href, { topic: lesson.topicLabel })));
  (lesson.formulas || []).forEach(item => records.push(record('Formula', item.name || item.formula, `${item.formula || ''} ${item.explanation || ''}`, href, { topic: lesson.topicLabel })));
  (lesson.worked_examples || []).forEach(item => records.push(record('Worked example', lesson.title, `${item.question || ''} ${item.answer || ''} ${item.solution || ''}`, href, { topic: lesson.topicLabel })));
  (lesson.constants || []).forEach(item => records.push(record('Constant', item.name || item.symbol, `${item.symbol || ''} ${item.value || ''} ${item.unit || ''}`, href, { topic: lesson.topicLabel })));
  // The explanatory body of a lesson is where most answers actually live, so
  // concepts, mistakes, tips and HL extensions are indexed too — previously
  // only summaries, definitions, formulas and examples were reachable.
  (lesson.core_concepts || []).forEach(item => records.push(record('Concept', item.heading || lesson.topicLabel, `${item.explanation || ''} ${lesson.title}`, href, { topic: lesson.topicLabel })));
  (lesson.common_mistakes || []).forEach(item => records.push(record('Common mistake', lesson.topicLabel, text(item), href, { topic: lesson.topicLabel })));
  (lesson.ib_exam_tips || []).forEach(item => records.push(record('Exam tip', lesson.topicLabel, text(item), href, { topic: lesson.topicLabel })));
  (lesson.hl_extension || []).forEach(item => records.push(record('HL extension', item.topic || lesson.topicLabel, `${item.explanation || ''} ${item.formula || ''}`, href, { topic: lesson.topicLabel, level: 'HL' })));
  (lesson.practice_questions || []).forEach(item => records.push(record('Practice question', lesson.topicLabel, `${item.question || ''} ${item.answer || ''}`, href, { topic: lesson.topicLabel, level: item.level })));
  records.push(record('Graph', `${lesson.topicLabel} visual model`, `${lesson.title} graph, diagram, and visual interpretation`, href, { topic: lesson.topicLabel }));
  return records;
}

function buildRecords(catalogue) {
  const records = (catalogue.lessons || []).flatMap(lessonRecords);
  (catalogue.formulas || []).forEach(item => records.push(record('Formula', item.name || item.formula, compact(item), `/formulas/${item.slug || ''}`, { topic: item.topic })));
  (catalogue.examples || []).forEach(item => records.push(record('Worked example', item.title || item.topic || 'KINETIQ example', compact(item), item.lesson_slug ? `/lesson/${item.lesson_slug}` : '/formulas', { topic: item.topic })));
  (catalogue.glossary || []).forEach(item => records.push(record('Glossary', item.term || item.word, compact(item), item.lesson_slug ? `/lesson/${item.lesson_slug}` : '/search', { topic: item.topic })));
  (catalogue.questions || []).forEach(item => records.push(record('Question', item.topic || 'Practice question', `${item.question || ''} ${item.solution || ''} ${item.answer || ''}`, '/quiz', { topic: item.topic, level: item.level, type: item.type })));
  (catalogue.simulations || []).forEach(item => records.push(record('Simulation', item.name || item.title, `${item.description || ''} ${compact(item.variables)}`, '/simulations', { topic: item.topic })));
  // Method and context material was never indexed, so questions about how to
  // do something ("find the gradient uncertainty", "structure an evaluation")
  // had nothing to match against.
  (catalogue.toolkit || []).forEach(item => records.push(record('Method', item.title, `${item.purpose || ''} ${compact(item.steps)}`, '/toolkit', { topic: item.title })));
  (catalogue.cases || []).forEach(item => records.push(record('Applied case', item.title, `${item.context || ''} ${compact(item.concepts)} ${compact(item.questions)}`, `/cases/${item.slug}`, { topic: item.title, unit: item.unit })));
  (catalogue.questionPatterns || []).forEach(item => records.push(record('Command term', item.command, `${item.meaning || ''} ${item.expectation || ''} ${compact(item.steps)} ${compact(item.model)}`, '/patterns', { topic: item.command })));
  return records;
}

/** Counts meaningful tokens so a passage that dwells on a term outranks one that mentions it once. */
function tokenCounts(value) {
  const counts = new Map();
  (text(value).toLowerCase().match(/[a-z0-9]+/g) || []).forEach(token => {
    if (token.length > 1 && !STOP_WORDS.has(token)) counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}

function score(record, queryTerms, context) {
  const titleTerms = terms(record.title);
  const bodyCounts = tokenCounts(record.body);
  // A private book passage is titled "Book — p.12", which carries no subject signal,
  // so its relevance has to come from the body alone. Weight it accordingly.
  const bodyWeight = record.metadata.private ? 5 : 3;
  let value = 0;
  let matched = 0;
  queryTerms.forEach(term => {
    const inTitle = titleTerms.includes(term);
    const occurrences = bodyCounts.get(term) || 0;
    if (inTitle) value += 9;
    if (occurrences) value += bodyWeight + Math.min(occurrences - 1, 3) * 1.5;
    if (inTitle || occurrences) matched += 1;
    if (record.metadata.topic && terms(record.metadata.topic).includes(term)) value += 5;
  });
  // Reward passages that answer most of the question rather than echoing one word of it.
  if (queryTerms.length > 1 && matched) value += 6 * (matched / queryTerms.length);
  // A record containing the query as a phrase is far more likely to be the
  // subject than one that merely shares a common word with it.
  if (queryTerms.length > 1) {
    const phrase = queryTerms.join(' ');
    const inTitle = text(record.title).toLowerCase();
    const inBody = text(record.body).toLowerCase();
    if (inTitle.includes(phrase)) value += 30;
    else if (inBody.includes(phrase)) value += 14;
    // Adjacent pairs catch "closed pipe" and "photoelectric effect" even when
    // the question carries extra words around them.
    for (let i = 0; i < queryTerms.length - 1; i += 1) {
      const pair = queryTerms[i] + ' ' + queryTerms[i + 1];
      if (inTitle.includes(pair)) value += 12;
      else if (inBody.includes(pair)) value += 5;
    }
  }
  const route = text(context?.route).toLowerCase();
  if (route && record.href && route === record.href) value += 6;
  if (context?.lesson_slug && record.href === `/lesson/${context.lesson_slug}`) value += 8;
  if (context?.topic && terms(record.metadata.topic).some(term => terms(context.topic).includes(term))) value += 4;
  return value;
}

function createRetrievalEngine(getCatalogue, { ttl = 300000, queryTtl = 60000, getExtraRecords = null } = {}) {
  let index = [];
  let indexedAt = 0;
  const resultCache = new Map();
  async function ensureIndex() {
    if (Date.now() - indexedAt < ttl && index.length) return index;
    const catalogue = await getCatalogue();
    // Extra records come from the learner's own private library and are additive only.
    const extra = getExtraRecords ? await getExtraRecords() : [];
    index = [...buildRecords(catalogue), ...extra];
    indexedAt = Date.now();
    resultCache.clear();
    return index;
  }
  return {
    async retrieve(query, context = {}, limit = 8) {
      const queryTerms = terms(query);
      const cacheKey = JSON.stringify([queryTerms, context?.route || '', context?.lesson_slug || '', context?.topic || '', limit]);
      const cached = resultCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < queryTtl) return cached.items;
      const items = (await ensureIndex()).map(item => ({ ...item, score: score(item, queryTerms, context) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, Math.max(1, Math.min(limit, 12)));
      resultCache.set(cacheKey, { createdAt: Date.now(), items });
      return items;
    },
    async size() { return (await ensureIndex()).length; },
    clear() { index = []; indexedAt = 0; resultCache.clear(); }
  };
}

module.exports = { buildRecords, createRetrievalEngine, terms };
