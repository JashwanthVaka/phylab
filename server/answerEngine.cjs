/**
 * Deterministic answer composer.
 *
 * KINETIQ's tutor needs a provider key to generate prose. This does not: it
 * retrieves the most relevant passages from KINETIQ's own content and lays
 * them out as an answer — definition first, then the equation, the reasoning,
 * a worked example, and the mistakes that usually cost marks.
 *
 * It never invents physics. Every line it returns is a passage already written
 * into a KINETIQ lesson, and every section carries the lesson it came from, so
 * a reader can always check the source.
 */

const ORDER = [
  { kind: 'Definition',      label: 'Definition',      take: 1 },
  { kind: 'Glossary',        label: 'Definition',      take: 1 },
  { kind: 'Command term',    label: 'What it asks for', take: 1 },
  { kind: 'Method',          label: 'Method',          take: 1 },
  { kind: 'Formula',         label: 'Equation',        take: 2 },
  { kind: 'Concept',         label: 'How it works',    take: 2 },
  { kind: 'Lesson',          label: 'Overview',        take: 1 },
  { kind: 'HL extension',    label: 'Higher Level',    take: 1 },
  { kind: 'Applied case',    label: 'In context',      take: 1 },
  { kind: 'Worked example',  label: 'Worked example',  take: 1 },
  { kind: 'Practice question', label: 'Check yourself', take: 1 },
  { kind: 'Question',        label: 'Check yourself',  take: 1 },
  { kind: 'Common mistake',  label: 'Common mistake',  take: 2 },
  { kind: 'Exam tip',        label: 'Exam tip',        take: 1 },
];

const LABELS = new Map(ORDER.map(entry => [entry.kind, entry.label]));

/** True when the query is asking what something *is* rather than how to do it. */
const wantsDefinition = query => /\b(what is|what are|define|definition|meaning|means)\b/i.test(query);
const wantsFormula = query => /\b(formula|equation|expression|calculate|work out|find)\b/i.test(query);
const wantsMistake = query => /\b(mistake|wrong|error|trap|careful|watch out)\b/i.test(query);

/**
 * @param {string} query        the learner's question
 * @param {Array}  hits         scored records from the retrieval engine
 * @returns {{answered: boolean, headline: string, sections: Array, sources: Array, confidence: string}}
 */
function composeAnswer(query, hits) {
  if (!hits || !hits.length) {
    return {
      answered: false,
      headline: 'Nothing in KINETIQ matches that yet.',
      sections: [],
      sources: [],
      related: [],
      confidence: 'none',
      note: 'Try naming the quantity or the topic — for example "escape speed", "why does a closed pipe have no even harmonics", or "half-life".',
    };
  }

  const best = hits[0];
  const topScore = Number(best.score) || 1;

  // Passages far below the best match are usually a coincidental word overlap
  // rather than the subject. Keeping them produced answers that opened on the
  // wrong topic entirely.
  // A phrase match scores far above everything else, so a flat percentage of
  // the top score threw away the rest of the correct lesson. Anything from the
  // best hit's own lesson is kept regardless; others must be reasonably close.
  const relevant = hits.filter(hit =>
    hit.href === best.href || (Number(hit.score) || 0) >= topScore * 0.35);
  // Within that, material from the same lesson as the best hit comes first.
  const ranked = [...relevant].sort((x, y) => {
    const sameX = x.href === best.href ? 1 : 0;
    const sameY = y.href === best.href ? 1 : 0;
    return sameY - sameX || (Number(y.score) || 0) - (Number(x.score) || 0);
  });

  const byKind = new Map();
  ranked.forEach(hit => {
    if (!byKind.has(hit.type)) byKind.set(hit.type, []);
    byKind.get(hit.type).push(hit);
  });

  // Lead with whatever the question actually asked for, when it is available.
  const preferred = wantsDefinition(query) ? 'Definition'
    : wantsFormula(query) ? 'Formula'
      : wantsMistake(query) ? 'Common mistake'
        : null;

  const order = preferred
    ? [...ORDER].sort((a, b) => (a.kind === preferred ? -1 : b.kind === preferred ? 1 : 0))
    : ORDER;

  const sections = [];
  const seen = new Set();

  // The strongest match always leads, whatever kind it is. Without this a
  // record type missing from ORDER would supply the headline while the body
  // came from somewhere else entirely.
  const bestBody = String(best.body || '').trim();
  if (bestBody) {
    seen.add(bestBody);
    sections.push({
      label: LABELS.get(best.type) || best.type,
      title: best.title,
      body: bestBody,
      href: best.href,
      topic: best.metadata?.topic || '',
    });
  }

  order.forEach(({ kind, label, take }) => {
    (byKind.get(kind) || []).slice(0, take).forEach(hit => {
      const body = String(hit.body || '').trim();
      if (!body || seen.has(body)) return;
      seen.add(body);
      sections.push({ label, title: hit.title, body, href: hit.href, topic: hit.metadata?.topic || '' });
    });
  });

  // If nothing matched the shaped kinds, fall back to the strongest passages.
  if (!sections.length) {
    hits.slice(0, 3).forEach(hit => sections.push({
      label: hit.type, title: hit.title, body: String(hit.body || '').trim(), href: hit.href, topic: hit.metadata?.topic || '',
    }));
  }

  const sources = [];
  sections.forEach(section => {
    if (!section.href) return;
    if (sources.some(s => s.href === section.href)) return;
    sources.push({ href: section.href, title: section.topic || section.title });
  });

  // Confidence is a plain statement about match strength, not a guess dressed
  // up as a number. A weak top score means the reader should check the source.
  const top = Number(best.score) || 0;
  const confidence = top >= 24 ? 'strong' : top >= 12 ? 'partial' : 'weak';

  // Strong neighbouring matches that did not make it into the answer are the
  // natural next question, so they are offered rather than discarded.
  const used = new Set(sections.map(s => s.title));
  const related = [];
  hits.forEach(hit => {
    if (related.length >= 4) return;
    const title = String(hit.title || '').trim();
    if (!title || used.has(title) || related.some(r => r.title === title)) return;
    if (title.toLowerCase() === String(best.title).toLowerCase()) return;
    used.add(title);
    related.push({ title, href: hit.href, kind: hit.type });
  });

  return {
    answered: true,
    headline: best.title,
    sections: sections.slice(0, 7),
    sources: sources.slice(0, 5),
    related,
    confidence,
    note: confidence === 'weak'
      ? 'This is the closest material in KINETIQ, but it may not be exactly what you asked. Open the source to check.'
      : '',
  };
}

module.exports = { composeAnswer };
