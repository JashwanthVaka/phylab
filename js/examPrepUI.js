import { escapeHTML } from './utils.js';

/**
 * Practice formats. Each route already exists in the quiz engine, so every
 * card starts a real session rather than a placeholder.
 */
const FORMATS = [
  { title: 'Paper 1 style — multiple choice', route: '/quiz', time: '5–8 min', marks: '5 marks', level: 'SL + HL', type: 'Recall and quick application', skills: ['Rapid recall', 'Unit awareness', 'Eliminating distractors'], detail: 'Short, single-mark questions to check that definitions and standard relationships are secure.' },
  { title: 'Paper 2 style — structured response', route: '/quiz', time: '12–18 min', marks: '10 marks', level: 'SL + HL', type: 'Multi-step written answers', skills: ['Method setting out', 'Unit conversion', 'Explanation chains'], detail: 'Longer questions where working and reasoning carry the marks, not just the final number.' },
  { title: 'Data-based questions', route: '/quiz', time: '10–15 min', marks: '6 marks', level: 'SL + HL', type: 'Graph and table analysis', skills: ['Gradient interpretation', 'Linearisation', 'Uncertainty'], detail: 'Read values, process them, and say what the gradient and intercept mean physically.' },
  { title: 'Practical and experimental', route: '/toolkit', time: '15–20 min', marks: 'Method-based', level: 'SL + HL', type: 'Investigation design and evaluation', skills: ['Variable control', 'Uncertainty treatment', 'Evaluation'], detail: 'Work through the practical method, then design or critique an investigation.' },
  { title: 'HL extension practice', route: '/quiz', time: '12–16 min', marks: '8 marks', level: 'HL only', type: 'Higher-level content', skills: ['Rotational dynamics', 'Relativity', 'Advanced fields'], detail: 'Questions drawn from the HL-only material, filtered to level HL.' },
  { title: 'Timed exam mode', route: '/exam', time: '30 min', marks: 'Full session', level: 'SL + HL', type: 'Whole-session pacing', skills: ['Time management', 'Working under pressure', 'Prioritising'], detail: 'A single timed sitting with a countdown, navigator and flagging, closest to a real paper.' },
  { title: 'Weak-topic practice', route: '/quiz', time: '10–15 min', marks: '6 marks', level: 'SL + HL', type: 'Targeted revision', skills: ['Closing gaps', 'Spaced repetition'], detail: 'Focuses on topics your results show need another pass. Falls back to a mixed set until you have results.' },
  { title: 'Formula recall', route: '/formulas', time: '10–15 min', marks: '6 marks', level: 'SL + HL', type: 'Equation selection', skills: ['Choosing the right equation', 'Symbol meaning', 'Units and dimensions'], detail: 'Practise selecting and interpreting equations rather than substituting into a given one.' }
];

export function examPrepPage(index) {
  const questionCount = (index.questions || []).length;
  return `<section class="page exam-prep-page">
    <p class="eyebrow">EXAM PREPARATION</p>
    <h1>Practise the way you will be assessed.</h1>
    <p class="page-lead">Eight practice formats, each showing what it assesses, roughly how long it takes and what it is worth before you commit. PHYLAB draws on its own bank of ${questionCount} original questions.</p>

    <p class="practice-note"><b>PHYLAB practice, not an IB examination.</b> These formats are modelled on the style of IB assessment for study purposes. They are not past papers, and PHYLAB marking is not official IB marking.</p>

    <div class="exam-grid">
      ${FORMATS.map(format => `<article class="exam-card">
        <header><span class="tag">${escapeHTML(format.type)}</span><h2>${escapeHTML(format.title)}</h2></header>
        <p class="exam-card__detail">${escapeHTML(format.detail)}</p>
        <dl class="exam-card__meta">
          <div><dt>Time</dt><dd>${escapeHTML(format.time)}</dd></div>
          <div><dt>Worth</dt><dd>${escapeHTML(format.marks)}</dd></div>
          <div><dt>Level</dt><dd>${escapeHTML(format.level)}</dd></div>
        </dl>
        <p class="exam-card__skills"><b>Skills assessed:</b> ${format.skills.map(skill => escapeHTML(skill)).join(' · ')}</p>
        <a class="button" href="${escapeHTML(format.route)}" data-route>Start ${escapeHTML(format.title.split(' — ')[0].toLowerCase())} →</a>
      </article>`).join('')}
    </div>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">BEFORE YOU START</p><h2>Prepare properly</h2></div>
      <div class="card-grid">
        <article class="content-card"><h3>Know the command term</h3><p>Each term expects a specific shape of answer. Check the pattern before you write.</p><a class="text-button" href="/patterns" data-route>Question patterns →</a></article>
        <article class="content-card"><h3>Use a method</h3><p>Numerical, graph, data, practical and extended-response procedures, all in one place.</p><a class="text-button" href="/toolkit" data-route>Active toolkit →</a></article>
        <article class="content-card"><h3>Apply it in context</h3><p>Case practice puts the physics in a real setting with an exam-style prompt.</p><a class="text-button" href="/cases" data-route>Case practice →</a></article>
        <article class="content-card"><h3>Check your gaps</h3><p>Your progress page shows completion and, once you have results, weaker topics.</p><a class="text-button" href="/progress" data-route>View progress →</a></article>
      </div>
    </section>
  </section>`;
}
