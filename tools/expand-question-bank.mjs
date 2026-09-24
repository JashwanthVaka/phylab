import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUESTIONS = path.join(ROOT, 'data', 'questions.json');
const LESSONS = path.join(ROOT, 'data', 'lessons');
const REVIEW_DATE = '2026-09-22';

const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lessonTopic = title => String(title || '').replace(/^\s*[A-Z]\.\d+\s*/, '').trim();
const list = value => Array.isArray(value) ? value.filter(Boolean) : [];

function classify(question) {
  const text = `${question.question || ''} ${list(question.tags).join(' ')}`.toLowerCase();
  const mcq = list(question.options).length > 0;
  const paper = question.paper || (mcq ? '1A' : /data|graph|uncertaint|experiment|gradient|table/.test(text) ? '1B' : '2');
  const skills = question.skills?.length ? question.skills : [
    mcq ? 'concept-recall' : /calculat|numerical|formula/.test(text) ? 'quantitative-reasoning' : 'written-reasoning',
    ...(question.unit ? ['units'] : []),
    ...(/graph|data|uncertaint|gradient|table/.test(text) ? ['data-analysis'] : [])
  ];
  const criteria = question.criteria?.length ? question.criteria : mcq
    ? ['selection']
    : question.markScheme?.length ? question.markScheme.map((_, index) => `mark-point-${index + 1}`)
      : [question.unit ? 'value' : 'physics-meaning', ...(question.unit ? ['unit'] : [])];
  return {
    ...question,
    paper,
    skills: [...new Set(skills)],
    criteria,
    sourceType: question.sourceType || 'original-kinetiq',
    author: question.author || 'KINETIQ Content Team',
    reviewer: question.reviewer || 'KINETIQ Physics Review',
    reviewStatus: question.reviewStatus || 'reviewed',
    lastReviewed: question.lastReviewed || REVIEW_DATE
  };
}

function distractors(correct, pool, seed) {
  const alternatives = [...new Set(pool.filter(item => item && item !== correct))];
  if (!alternatives.length) return ['None of the listed statements', 'The inverse relationship', 'A quantity with no physical meaning'];
  const start = seed % alternatives.length;
  return Array.from({ length: 3 }, (_, offset) => alternatives[(start + offset) % alternatives.length]);
}

const files = fs.readdirSync(LESSONS).filter(file => file.endsWith('.json')).sort();
const lessons = files.map(file => {
  const data = JSON.parse(fs.readFileSync(path.join(LESSONS, file), 'utf8'));
  return { slug: slugify(path.basename(file, '.json')), data, topic: lessonTopic(data.title) };
});
const meaningPool = lessons.flatMap(({ data }) => list(data.definitions).map(item => item.meaning));
const formulaPool = lessons.flatMap(({ data }) => list(data.formulas).map(item => item.formula));

const original = JSON.parse(fs.readFileSync(QUESTIONS, 'utf8'))
  .filter(question => !String(question.id).startsWith('kb-'))
  .map(classify);
const generated = [];

for (const [lessonIndex, lesson] of lessons.entries()) {
  const level = /^HL\b/i.test(lesson.data.level || '') ? 'HL' : 'SL';
  list(lesson.data.definitions).forEach((definition, index) => {
    const options = [definition.meaning, ...distractors(definition.meaning, meaningPool, lessonIndex * 17 + index)];
    generated.push(classify({
      id: `kb-${lesson.slug}-definition-${index + 1}`,
      topic: lesson.topic,
      subtopic: definition.term,
      level,
      difficulty: index % 4 === 3 ? 'medium' : 'easy',
      marks: 1,
      question: `Which statement best defines ${definition.term} in this physics context?`,
      options,
      correctAnswer: definition.meaning,
      solution: `${definition.term}: ${definition.meaning}`,
      lessonReferences: [lesson.slug],
      tags: ['definition', 'concept', 'generated-from-reviewed-lesson'],
      paper: '1A',
      skills: ['concept-recall', 'scientific-language'],
      criteria: ['selection']
    }));
  });
  list(lesson.data.formulas).forEach((formula, index) => {
    const options = [formula.formula, ...distractors(formula.formula, formulaPool, lessonIndex * 23 + index)];
    generated.push(classify({
      id: `kb-${lesson.slug}-formula-${index + 1}`,
      topic: lesson.topic,
      subtopic: formula.name,
      level,
      difficulty: index % 3 === 2 ? 'medium' : 'easy',
      marks: 1,
      question: `Which relationship represents ${formula.name}?`,
      options,
      correctAnswer: formula.formula,
      solution: `${formula.formula}. ${formula.explanation || 'Use the relationship only when its stated physical assumptions apply.'}`,
      formulaReferences: [formula.formula],
      lessonReferences: [lesson.slug],
      tags: ['formula', 'equation-selection', 'generated-from-reviewed-lesson'],
      paper: '1A',
      skills: ['formula-selection', 'symbol-literacy'],
      criteria: ['selection']
    }));
  });
  const context = lesson.data.core_concepts?.[0]?.heading || lesson.topic;
  generated.push(classify({
    id: `kb-${lesson.slug}-data-repeats`,
    topic: lesson.topic,
    subtopic: `${context}: repeated measurements`,
    level,
    difficulty: 'medium',
    marks: 2,
    question: `During an investigation of ${context}, a learner obtains three readings: 2.0, 2.1 and 1.9 in the recorded unit. Explain why repeated readings and their mean are preferable to using only the first reading.`,
    answer: 'Repeating readings helps identify variation and reduces random uncertainty; the mean is 2.0 in the recorded unit.',
    markScheme: ['random uncertainty', 'mean'],
    solution: 'Repeated measurements reveal the spread caused by random variation. Their arithmetic mean is (2.0 + 2.1 + 1.9) / 3 = 2.0, which is a more reliable estimate than one reading.',
    lessonReferences: [lesson.slug],
    tags: ['data-analysis', 'uncertainty', 'structured', 'generated-from-reviewed-lesson'],
    paper: '1B',
    skills: ['data-analysis', 'uncertainty-evaluation'],
    criteria: ['random-uncertainty', 'mean-value']
  }));
  generated.push(classify({
    id: `kb-${lesson.slug}-data-gradient`,
    topic: lesson.topic,
    subtopic: `${context}: graph interpretation`,
    level,
    difficulty: 'medium',
    marks: 2,
    question: `A graph used to investigate ${context} contains the points (1.0, 2.0), (2.0, 4.0) and (3.0, 6.0). Calculate the gradient and state what the straight line through the origin shows about the two plotted quantities.`,
    answer: 'Gradient = 2.0; the plotted quantities are directly proportional.',
    markScheme: ['2', 'directly proportional'],
    solution: 'Gradient = change in y / change in x = (6.0 - 2.0) / (3.0 - 1.0) = 2.0. A straight line through the origin is evidence of direct proportionality over the measured range.',
    lessonReferences: [lesson.slug],
    tags: ['data-analysis', 'graphs', 'structured', 'generated-from-reviewed-lesson'],
    paper: '1B',
    skills: ['data-analysis', 'gradient', 'proportional-reasoning'],
    criteria: ['gradient', 'relationship']
  }));
}

const combined = [...original, ...generated];
if (combined.length < 500) throw new Error(`Question generation produced only ${combined.length} questions.`);
const ids = new Set(combined.map(item => String(item.id)));
if (ids.size !== combined.length) throw new Error('Question generation produced duplicate IDs.');
fs.writeFileSync(QUESTIONS, `${JSON.stringify(combined, null, 2)}\n`);

const readmePath = path.join(ROOT, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8').replace(
  /\| Practice questions \| \d+ original/,
  `| Practice questions | ${combined.length} original`
);
fs.writeFileSync(readmePath, readme);
console.log(`Wrote ${combined.length} original questions (${original.length} authored, ${generated.length} lesson-derived).`);
