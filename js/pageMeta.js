/**
 * Per-page title, description and canonical URL.
 *
 * Every route shipped as "KINETIQ — IBDP Physics" with one generic
 * description, because document.title was never assigned after the initial
 * HTML. A single-page app has to set it on navigation or every page looks
 * identical to a search engine, to a browser history entry, and to anyone
 * with twenty tabs open.
 *
 * Titles are written as the page's own name first, so the distinguishing
 * word is visible in a narrow tab strip rather than buried after the brand.
 */

const SITE = 'KINETIQ';
const ORIGIN = 'https://getkinetiq.vercel.app';

const STATIC = {
  '/': ['IBDP Physics, and every law in motion',
    'Interactive IBDP Physics: 26 syllabus lessons, 26 simulations driven by real equations, a formula centre that explains every symbol, and practice with transparent marking.'],
  '/library': ['Course library',
    'All 26 IBDP Physics lessons in syllabus order across the five course units, with search, filters and progress tracking.'],
  '/simulations': ['Simulation lab',
    'Simulations for every lesson, each computed from the real equation rather than a stored curve. Change a variable and watch the physics respond.'],
  '/formulas': ['Formula centre',
    'Every IBDP Physics formula with its variables, SI units, dimensions and physical meaning, plus a printable formula sheet.'],
  '/formulas/print': ['Printable formula sheet', 'Every KINETIQ formula on one printable sheet, grouped by topic.'],
  '/cases': ['Applied cases', 'Real-world physics contexts, from car safety to carbon dating, each with an exam-style question and mark points.'],
  '/toolkit': ['Active toolkit', 'Five study methods and every IB command term, with the response each one expects.'],
  '/patterns': ['Question patterns', 'What each IB command term is asking for, the method that answers it, and a model response.'],
  '/data': ['Data lab', 'Plot practical measurements with error bars, fit a line, and get the gradient with its uncertainty. The skill Paper 1B and the IA are built on.'],
  '/ia': ['IA workspace', 'Draft the scientific investigation in the six sections IB assesses, checked against the weaknesses that cost marks.'],
  '/exam-prep': ['Exam preparation', 'Practice formats with time, marks and level shown up front, from Paper 1A multiple choice to full structured practice.'],
  '/quiz': ['Practice quiz', 'Deterministic marking with worked solutions, so you can see exactly where a mark was won or lost.'],
  '/revision': ['Revision planner', 'What is genuinely due today across your flashcards and mistake bank.'],
  '/mistakes': ['Mistake bank', 'Every question you have answered wrongly, rescheduled at 1, 3, 7, 16 and 35 days.'],
  '/progress': ['Your progress', 'Lessons completed, mastery by topic, and what to study next.'],
  '/resources': ['Source library', 'KINETIQ reference material and links to freely published external sources.'],
  '/ask': ['Ask a question', 'Ask about any topic and get an answer drawn from KINETIQ lessons, with the source cited. No account or API key needed.'],
  '/ai': ['Ask KIT', 'A physics tutor that answers from KINETIQ content first and reads your place in the course.'],
  '/search': ['Search', 'Search lessons, formulae, definitions, simulations and cases together.'],
  '/bookmarks': ['Saved items', 'Everything you have saved to come back to.'],
  '/mastery': ['Mastery', 'Where you are strong and where the marks are still going missing.'],
  '/admin': ['Admin', 'Account statistics for the site owner.'],
  '/login': ['Sign in', 'Sign in to sync your progress across devices.'],
  '/signup': ['Create an account', 'Create a KINETIQ account to sync your progress across devices.'],
  '/activity': ['Activity', 'What you have studied recently.'],
};

const titleTag = value => (value === SITE ? SITE : `${value} — ${SITE}`);

function upsert(selector, create) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = create();
    document.head.appendChild(node);
  }
  return node;
}

const meta = (name, content, attribute = 'name') => {
  const node = upsert(`meta[${attribute}="${name}"]`, () => {
    const el = document.createElement('meta');
    el.setAttribute(attribute, name);
    return el;
  });
  node.setAttribute('content', content);
};

/** Titles a dynamic record page once its content is known. */
export function setPageMeta({ title, description, path }) {
  const url = ORIGIN + (path || location.pathname);
  document.title = titleTag(title);
  meta('description', description);
  meta('og:title', titleTag(title), 'property');
  meta('og:description', description, 'property');
  meta('og:url', url, 'property');
  meta('og:type', 'website', 'property');
  meta('og:site_name', SITE, 'property');
  meta('twitter:card', 'summary_large_image');
  meta('twitter:title', titleTag(title));
  meta('twitter:description', description);

  const canonical = upsert('link[rel="canonical"]', () => {
    const el = document.createElement('link');
    el.rel = 'canonical';
    return el;
  });
  canonical.href = url;
  setStructuredData(path || location.pathname, title, description);
}

/**
 * Structured data, so a lesson is indexed as a lesson rather than as an
 * anonymous page, and a search result can show where it sits in the course.
 */
function setStructuredData(path, title, description) {
  const node = upsert('script[data-page-schema]', () => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-page-schema', '');
    return el;
  });

  const [kind, slug] = path.split('/').filter(Boolean);
  const url = ORIGIN + path;
  const crumbs = [{ '@type': 'ListItem', position: 1, name: SITE, item: ORIGIN }];
  if (kind) {
    const section = { lesson: 'Course library', formulas: 'Formula centre', simulations: 'Simulation lab', cases: 'Applied cases' }[kind];
    if (section) crumbs.push({ '@type': 'ListItem', position: 2, name: section, item: `${ORIGIN}/${kind === 'lesson' ? 'library' : kind}` });
    if (slug) crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: title, item: url });
  }

  const graph = [{
    '@type': 'BreadcrumbList',
    itemListElement: crumbs,
  }];

  if (kind === 'lesson' && slug) {
    graph.push({
      '@type': 'LearningResource',
      name: title,
      description,
      url,
      learningResourceType: 'Lesson',
      educationalLevel: 'IB Diploma Programme',
      teaches: title,
      inLanguage: 'en',
      isPartOf: { '@type': 'Course', name: 'IBDP Physics', url: `${ORIGIN}/library` },
    });
  }

  node.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

/**
 * Best-effort metadata from the path alone, applied immediately on navigation
 * so the tab is never left showing the previous page's title while content
 * loads. Record pages call setPageMeta again with their real name.
 */
export function applyRouteMeta(path) {
  const clean = path.replace(/\/$/, '') || '/';
  const known = STATIC[clean];
  if (known) return setPageMeta({ title: known[0], description: known[1], path: clean });

  const [kind, slug] = clean.split('/').filter(Boolean);
  const pretty = String(slug || '').replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
  const byKind = {
    lesson: [pretty, `${pretty} for IBDP Physics: core concepts, worked examples, formulae, common mistakes and practice.`],
    formulas: [pretty, `${pretty}: what every symbol means, its SI unit and dimension, and how to use the relationship.`],
    simulations: [`${pretty} lab`, `Model ${pretty.toLowerCase()} from the real equation. Change a variable and watch the result respond.`],
    cases: [pretty, `${pretty}: a real-world physics context with an exam-style question and its mark points.`],
    // A results page belongs to one attempt on one device, so it gets a title
    // for the tab and history but nothing worth describing to a search engine.
    results: ['Practice results', 'Your marks for this practice attempt, broken down by criterion.'],
  };
  const fallback = byKind[kind];
  if (fallback && slug) return setPageMeta({ title: fallback[0], description: fallback[1], path: clean });
  return setPageMeta({ title: SITE, description: STATIC['/'][1], path: clean });
}
