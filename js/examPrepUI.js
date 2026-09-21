import { escapeHTML } from './utils.js';

/**
 * Practice formats. Each route already exists in the quiz engine, so every
 * card starts a real session rather than a placeholder.
 */
const FORMATS = [
  { title: 'Paper 1A style: multiple choice', route: '/quiz?mode=Quick%205&type=mcq&count=5', time: '5-8 min', marks: '5 marks', level: 'SL + HL', type: 'Recall and quick application', skills: ['Rapid recall', 'Unit awareness', 'Eliminating distractors'], detail: 'Short, single-mark questions to check that definitions and standard relationships are secure.' },
  { title: 'Paper 2 style: structured response', route: '/quiz?mode=Mixed%20Quiz&type=short%20response&count=10', time: '12-18 min', marks: '10 marks', level: 'SL + HL', type: 'Multi-step written answers', skills: ['Method setting out', 'Unit conversion', 'Explanation chains'], detail: 'Longer questions where working and reasoning carry the marks, not just the final number.' },
  { title: 'Data-based questions', route: '/quiz?mode=Mixed%20Quiz&type=numerical&count=10', time: '10-15 min', marks: '6 marks', level: 'SL + HL', type: 'Graph and table analysis', skills: ['Gradient interpretation', 'Linearisation', 'Uncertainty'], detail: 'Read values, process them, and say what the gradient and intercept mean physically.' },
  { title: 'Practical and experimental', route: '/toolkit', time: '15-20 min', marks: 'Method-based', level: 'SL + HL', type: 'Investigation design and evaluation', skills: ['Variable control', 'Uncertainty treatment', 'Evaluation'], detail: 'Work through the practical method, then design or critique an investigation.' },
  { title: 'HL extension practice', route: '/quiz?mode=Mixed%20Quiz&level=HL&count=10', time: '12-16 min', marks: '8 marks', level: 'HL only', type: 'Higher-level content', skills: ['Rotational dynamics', 'Relativity', 'Advanced fields'], detail: 'Questions drawn from the HL-only material, filtered to level HL.' },
  { title: 'Timed exam mode', route: '/exam', time: '30 min', marks: 'Full session', level: 'SL + HL', type: 'Whole-session pacing', skills: ['Time management', 'Working under pressure', 'Prioritising'], detail: 'A single timed sitting with a countdown, navigator and flagging, closest to a real paper.' },
  { title: 'Weak-topic practice', route: '/quiz?mode=Weak%20Topic%20Quiz', time: '10-15 min', marks: 'Up to 6 questions', level: 'SL + HL', type: 'Targeted revision', skills: ['Closing gaps', 'Spaced repetition'], detail: 'Focuses on topics your results show need another pass. Falls back to a mixed diagnostic until you have enough evidence.' },
  { title: 'Formula recall', route: '/quiz?mode=Formula%20Quiz', time: '10-15 min', marks: '6 marks', level: 'SL + HL', type: 'Equation selection', skills: ['Choosing the right equation', 'Symbol meaning', 'Units and dimensions'], detail: 'Practise selecting and interpreting equations rather than substituting into a given one.' }
];

const topicLabel = topic => topic?.label || topic?.topic_slug || '';

export function examPrepPage(index, summary = {}) {
  const questionCount = (index.questions || []).length;
  const weakest = topicLabel(summary.weakestTopics?.[0]);
  const recommendedRoute = weakest
    ? `/quiz?mode=Weak%20Topic%20Quiz&topic=${encodeURIComponent(weakest)}&count=5`
    : '/quiz?mode=Quick%205&count=5';
  const formats = FORMATS.map(format => format.title === 'Weak-topic practice' && weakest
    ? { ...format, route: recommendedRoute, detail: `Your evidence currently points to ${weakest}. This set keeps that topic selected and starts with five questions.` }
    : format);
  return `<section class="page exam-prep-page">
    <p class="eyebrow">EXAM PREPARATION</p>
    <h1>Practise the way you will be assessed.</h1>
    <p class="page-lead">Eight practice formats, each showing what it assesses, roughly how long it takes and what it is worth before you commit. KINETIQ draws on its own bank of ${questionCount} original questions.</p>

    <p class="practice-note"><b>KINETIQ practice, not an IB examination.</b> These formats are modelled on the style of IB assessment for study purposes. They are not past papers, and KINETIQ marking is not official IB marking.</p>

    <section class="target-test-callout" aria-labelledby="target-test-heading">
      <div>
        <p class="eyebrow">TARGET TEST</p>
        <h2 id="target-test-heading">Build the exact practice you need.</h2>
        <p>Choose topics, SL or HL, easy through hard, question type, length and timing. The builder shows how many original KINETIQ questions really match before you start.</p>
      </div>
      <div class="target-test-callout__actions">
        <a class="button" href="/quiz?mode=Mixed%20Quiz" data-route>Open target-test builder</a>
        <a class="outline" href="${escapeHTML(recommendedRoute)}" data-route>${weakest ? `Target ${escapeHTML(weakest)}` : 'Take a five-question baseline'}</a>
      </div>
    </section>

    <section class="practice-path" aria-labelledby="practice-path-heading">
      <div class="section-title"><p class="eyebrow">BUILD CONFIDENCE</p><h2 id="practice-path-heading">Easy to medium to hard.</h2></div>
      <div class="practice-path__steps">
        ${[
          ['01', 'Secure the idea', 'easy', 'Definitions, direct substitutions and one-step decisions.'],
          ['02', 'Connect the method', 'medium', 'Choose relationships, combine steps and explain the physics.'],
          ['03', 'Work under pressure', 'hard', 'Unfamiliar contexts, deeper reasoning and multi-step decisions.']
        ].map(([number, title, difficulty, detail]) => `<a href="/quiz?mode=Mixed%20Quiz&difficulty=${difficulty}&count=5" data-route>
          <span>${number}</span><div><b>${title}</b><p>${detail}</p></div><small>${difficulty}</small>
        </a>`).join('')}
      </div>
    </section>

    <div class="exam-grid">
      ${formats.map(format => `<article class="exam-card">
        <header><span class="tag">${escapeHTML(format.type)}</span><h2>${escapeHTML(format.title)}</h2></header>
        <p class="exam-card__detail">${escapeHTML(format.detail)}</p>
        <dl class="exam-card__meta">
          <div><dt>Time</dt><dd>${escapeHTML(format.time)}</dd></div>
          <div><dt>Worth</dt><dd>${escapeHTML(format.marks)}</dd></div>
          <div><dt>Level</dt><dd>${escapeHTML(format.level)}</dd></div>
        </dl>
        <p class="exam-card__skills"><b>Skills assessed:</b> ${format.skills.map(skill => escapeHTML(skill)).join(' · ')}</p>
        <a class="button" href="${escapeHTML(format.route)}" data-route>Start ${escapeHTML(format.title.split(':')[0].toLowerCase())} →</a>
      </article>`).join('')}
    </div>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">BEFORE YOU START</p><h2>Prepare properly</h2></div>
      <div class="card-grid">
        <article class="content-card"><h3>Know the command term</h3><p>Each term expects a specific shape of answer. Check the pattern before you write.</p><a class="text-button" href="/patterns" data-route>Question patterns →</a></article>
        <article class="content-card"><h3>Use a method</h3><p>Numerical, graph, data, practical and extended-response procedures, all in one place.</p><a class="text-button" href="/toolkit" data-route>Active toolkit →</a></article>
        <article class="content-card"><h3>Apply it in context</h3><p>Case practice puts the physics in a real setting with an exam-style prompt.</p><a class="text-button" href="/cases" data-route>Case practice →</a></article>
        <article class="content-card"><h3>Revisit your mistakes</h3><p>Every question you have answered wrongly, collected automatically and brought back at widening intervals.</p><a class="text-button" href="/mistakes" data-route>Mistake bank →</a></article>
        <article class="content-card"><h3>Check your gaps</h3><p>Your progress page shows completion and, once you have results, weaker topics.</p><a class="text-button" href="/progress" data-route>View progress →</a></article>
      </div>
    </section>
  </section>`;
}
