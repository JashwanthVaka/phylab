import { assessment } from './assessmentEngine.js';
import { escapeHTML, slugify } from './utils.js';
import { learningStorage as localStorage } from './services/learningStorage.js';

const KEY = 'phylab_quiz_session';
const RESULTS = 'phylab_quiz_results';
const MODES = {
  'Quick 5': { count: 5, description: 'Five focused questions for a quick confidence check.', time: '5–8 min' },
  'Quick 10': { count: 10, description: 'A broader ten-question practice set.', time: '12–18 min' },
  'Topic Quiz': { count: 5, description: 'Practise one topic at your selected level.', time: '8–12 min' },
  'Mixed Quiz': { count: 8, description: 'Build confidence across the course.', time: '12–16 min' },
  'Formula Quiz': { count: 6, description: 'Equation selection, application, and units.', time: '10–15 min' },
  'Weak Topic Quiz': { count: 6, description: 'Target topics that need another pass.', time: '10–15 min' },
  'Timed Quiz': { count: 10, durationSeconds: 900, description: 'Practise calm thinking under time pressure.', time: '15 min' },
  'Exam Practice': { count: 20, durationSeconds: 5400, description: 'Build a timed Paper 1A, 1B or 2 practice paper.', time: 'Up to 2 h 30 min' }
};

const asNumerical = question => /calculation|numerical|data analysis/i.test(question.type || '') || (/[-+]?\d/.test(question.answer || question.correctAnswer || '') && !(question.options || []).length);
const unitFromAnswer = answer => String(answer || '').replace(/^[\s\d.+\-eE]+/, '').trim();

export const normalize = question => ({
  id: String(question.id),
  topic: question.topic || 'General',
  subtopic: question.subtopic || '',
  level: question.level || 'SL',
  difficulty: question.difficulty || 'medium',
  marks: Number(question.marks) || 1,
  type: (question.options || []).length ? 'mcq' : asNumerical(question) ? 'numerical' : 'short response',
  question: question.question || '',
  options: question.options || [],
  correct_answer: question.correctAnswer || question.correct_answer || question.answer || '',
  solution: question.solution || '',
  mark_scheme: question.markScheme || question.mark_scheme || [],
  tolerance: question.tolerance,
  unit: question.unit || unitFromAnswer(question.correctAnswer || question.correct_answer || question.answer),
  significantFigures: question.significantFigures,
  formulaReferences: question.formulaReferences || [],
  lessonReferences: question.lessonReferences || [],
  tags: Array.isArray(question.tags) ? question.tags : [question.tags || '']
  ,paper: question.paper || ((question.options || []).length ? '1A' : '2')
  ,skills: question.skills || []
  ,criteria: question.criteria || []
});

const list = value => (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

/** Turns a quiz URL into safe, known builder options. */
export function optionsFromSearch(search = new URLSearchParams()) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const requestedMode = params.get('mode') || '';
  const topics = params.getAll('topic');
  const mode = Object.hasOwn(MODES, requestedMode) ? requestedMode : topics.length ? 'Topic Quiz' : '';
  return {
    mode,
    topics,
    level: ['SL', 'HL'].includes(params.get('level')) ? params.get('level') : '',
    difficulties: params.getAll('difficulty').filter(value => ['easy', 'medium', 'hard'].includes(value)),
    types: params.getAll('type').filter(value => ['mcq', 'numerical', 'short response'].includes(value)),
    paper: ['1A', '1B', '2'].includes(params.get('paper')) ? params.get('paper') : '',
    count: [5, 10, 15, 20, 25, 30, 40, 45].includes(Number(params.get('count'))) ? Number(params.get('count')) : undefined,
    durationSeconds: Math.max(0, Math.min(7200, Number(params.get('minutes')) * 60 || 0))
  };
}

export const selectQuestions = (questions, { mode = 'Mixed Quiz', topic, topics, level, difficulty, difficulties, type, types, paper, count = 5, weakTopics = [] } = {}) => {
  const source = questions.map(normalize);
  const topicList = list(topics?.length ? topics : topic);
  const difficultyList = list(difficulties?.length ? difficulties : difficulty);
  const typeList = list(types?.length ? types : type);
  let selected = source.filter(question =>
    (!topicList.length || topicList.some(item => question.topic.toLowerCase() === item.toLowerCase() || slugify(question.topic) === slugify(item))) &&
    (!level || question.level === level) &&
    (!paper || question.paper === paper) &&
    (!difficultyList.length || difficultyList.includes(question.difficulty)) &&
    (!typeList.length || typeList.includes(question.type))
  );
  let diagnostic = false;
  if (mode === 'Weak Topic Quiz') {
    selected = selected.filter(question => weakTopics.includes(question.topic));
    if (!selected.length) {
      // A diagnostic must still honour the learner's topic, level and type.
      selected = source.filter(question =>
        (!topicList.length || topicList.some(item => slugify(question.topic) === slugify(item))) &&
        (!level || question.level === level) &&
        (!paper || question.paper === paper) &&
        (!difficultyList.length || difficultyList.includes(question.difficulty)) &&
        (!typeList.length || typeList.includes(question.type)));
      diagnostic = true;
    }
  }
  if (mode === 'Formula Quiz') {
    const formulaQuestions = selected.filter(question => /formula|calculation|numerical|equation/i.test(`${question.tags.join(' ')} ${question.type}`));
    selected = formulaQuestions.length ? formulaQuestions : selected;
  }
  // When several topics are selected, take one from each in turn instead of
  // exhausting the first topic in the JSON file before reaching the next.
  if (topicList.length > 1) {
    const groups = topicList.map(topicName => selected.filter(question => question.topic.toLowerCase() === topicName.toLowerCase() || slugify(question.topic) === slugify(topicName)));
    const balanced = [];
    for (let row = 0; balanced.length < selected.length; row += 1) {
      let found = false;
      groups.forEach(group => {
        if (group[row]) { balanced.push(group[row]); found = true; }
      });
      if (!found) break;
    }
    selected = balanced;
  }
  return { questions: selected.slice(0, count), available: selected.length, diagnostic };
};

export const create = (questions, options = {}) => ({
  id: crypto.randomUUID(),
  mode: options.mode || 'Quick 5',
  questions,
  currentIndex: 0,
  answers: {},
  flags: [],
  startedAt: Date.now(),
  durationSeconds: options.durationSeconds || 0,
  elapsedSeconds: 0,
  remainingSeconds: options.durationSeconds || 0,
  submitted: false,
  marksEarned: 0,
  maxMarks: questions.reduce((total, question) => total + question.marks, 0)
});

export const save = session => localStorage.setItem(KEY, JSON.stringify(session));
export const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
};
export const tick = session => {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
  return { ...session, elapsedSeconds, remainingSeconds: session.durationSeconds ? Math.max(0, session.durationSeconds - elapsedSeconds) : 0 };
};

const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const answerCount = session => Object.values(session.answers).filter(Boolean).length;
const questionStatus = (session, index) => {
  const id = session.questions[index].id;
  if (session.flags.includes(id)) return 'flagged';
  return session.answers[id] ? 'answered' : 'unanswered';
};

export const analytics = session => {
  const review = session.review || [];
  const group = key => Object.entries(review.reduce((groups, item) => {
    const value = item.q[key] || 'General';
    groups[value] ||= { label: value, earned: 0, max: 0, attempted: 0 };
    groups[value].earned += item.r.marks;
    groups[value].max += item.q.marks;
    groups[value].attempted += 1;
    return groups;
  }, {})).map(([, value]) => ({ ...value, percentage: value.max ? Math.round(value.earned / value.max * 100) : 0 }));
  const topics = group('topic');
  const skills = Object.values(review.reduce((groups, item) => {
    (item.q.skills || []).forEach(skill => {
      groups[skill] ||= { label: skill, earned: 0, max: 0, attempted: 0 };
      groups[skill].earned += item.r.marks;
      groups[skill].max += item.q.marks;
      groups[skill].attempted += 1;
    });
    return groups;
  }, {})).map(value => ({ ...value, percentage: value.max ? Math.round(value.earned / value.max * 100) : 0 }));
  return {
    percentage: session.maxMarks ? Math.round(session.marksEarned / session.maxMarks * 100) : 0,
    accuracy: review.length ? Math.round(review.filter(item => item.r.correct).length / review.length * 100) : 0,
    topics,
    skills,
    difficulties: group('difficulty'),
    strongTopics: [...topics].sort((a, b) => b.percentage - a.percentage).slice(0, 2),
    weakTopics: [...topics].sort((a, b) => a.percentage - b.percentage).slice(0, 2)
  };
};

export const submit = session => {
  if (session.submitted) return session;
  const review = session.questions.map(question => {
    const answer = session.answers[question.id] || '';
    const marking = assessment.mark(question, answer);
    const points = question.mark_scheme || [];
    return {
      q: question,
      a: answer,
      r: marking,
      matched: points.filter(point => String(answer).toLowerCase().includes(String(point).toLowerCase())),
      missing: points.filter(point => !String(answer).toLowerCase().includes(String(point).toLowerCase()))
    };
  });
  const complete = { ...tick(session), submitted: true, review, marksEarned: review.reduce((total, item) => total + item.r.marks, 0) };
  complete.analytics = analytics(complete);
  localStorage.setItem(`${RESULTS}:${complete.id}`, JSON.stringify(complete));
  save(complete);
  return complete;
};

export const result = id => {
  try { return JSON.parse(localStorage.getItem(`${RESULTS}:${id}`) || 'null'); } catch { return null; }
};

export const quizPage = data => {
  const topics = [...new Set(data.questions.map(question => question.topic))].sort();
  return `<section class="page"><p class="eyebrow">QUIZ STUDIO</p><h1>Practise with purpose.</h1><p class="page-lead">Choose a mode, set your focus, and receive transparent KINETIQ practice feedback.</p>
    <div class="card-grid quiz-mode-grid" aria-label="Practice modes">${Object.entries(MODES).map(([mode, details]) => `<button class="content-card" type="button" data-mode="${mode}" aria-pressed="false"><span class="tag">${details.time} · SL + HL</span><h3>${mode}</h3><p>${details.description}</p></button>`).join('')}</div>
    <section id="quizMount" data-topics="${escapeHTML(JSON.stringify(topics))}" class="lesson-section" aria-live="polite"></section>
  </section>`;
};

function setupView(topics, resume, selection = {}) {
  const selectedTopics = list(selection.topics?.length ? selection.topics : selection.topic);
  const selectedDifficulties = list(selection.difficulties?.length ? selection.difficulties : selection.difficulty);
  const selectedTypes = list(selection.types?.length ? selection.types : selection.type);
  const chosen = (values, value) => values.includes(value) ? ' checked' : '';
  const mode = Object.hasOwn(MODES, selection.mode || '') ? selection.mode : '';
  const duration = selection.durationSeconds || MODES[mode]?.durationSeconds || 0;
  return `<div class="content-card quiz-builder" data-quiz-builder>
    <div class="section-title"><p class="eyebrow">TARGET TEST BUILDER</p><h2>Build your practice</h2></div>
    <p>Choose one or more topics, question styles and difficulties. KINETIQ only uses questions that are really in its original bank.</p>
    <div class="quiz-builder__grid">
      <details class="quiz-filter-group" ${selectedTopics.length ? 'open' : ''}>
        <summary>Topics <span data-topic-count>${selectedTopics.length ? `${selectedTopics.length} selected` : 'All topics'}</span></summary>
        <div class="quiz-option-grid">${topics.map(topic => `<label><input type="checkbox" name="quiz-topic" value="${escapeHTML(topic)}"${chosen(selectedTopics, topic)}> ${escapeHTML(topic)}</label>`).join('')}</div>
      </details>
      <fieldset class="quiz-filter-group"><legend>Difficulty</legend>
        <div class="quiz-choice-row">${['easy', 'medium', 'hard'].map(value => `<label><input type="checkbox" name="quiz-difficulty" value="${value}"${chosen(selectedDifficulties, value)}> ${value[0].toUpperCase() + value.slice(1)}</label>`).join('')}</div>
        <p class="muted">Leave all clear to include every difficulty.</p>
      </fieldset>
      <fieldset class="quiz-filter-group"><legend>Question type</legend>
        <div class="quiz-choice-row">
          <label><input type="checkbox" name="quiz-type" value="mcq"${chosen(selectedTypes, 'mcq')}> Multiple choice</label>
          <label><input type="checkbox" name="quiz-type" value="numerical"${chosen(selectedTypes, 'numerical')}> Numerical</label>
          <label><input type="checkbox" name="quiz-type" value="short response"${chosen(selectedTypes, 'short response')}> Structured response</label>
        </div>
        <p class="muted">Leave all clear to mix question types.</p>
      </fieldset>
      <div class="quiz-toolbar">
        <label>Level <select data-quiz-level><option value="">SL + HL</option><option${selection.level === 'SL' ? ' selected' : ''}>SL</option><option${selection.level === 'HL' ? ' selected' : ''}>HL</option></select></label>
        <label>Paper <select data-quiz-paper><option value="">Mixed papers</option>${['1A','1B','2'].map(value => `<option value="${value}"${selection.paper === value ? ' selected' : ''}>Paper ${value}</option>`).join('')}</select></label>
        <label>Questions <select data-quiz-count><option value="">Use the mode length</option>${[5, 10, 15, 20, 25, 30, 40, 45].map(value => `<option value="${value}"${selection.count === value ? ' selected' : ''}>${value} questions</option>`).join('')}</select></label>
        <label class="quiz-timer-toggle"><input type="checkbox" data-quiz-timer${duration ? ' checked' : ''}> Timed</label>
        <label>Minutes <input type="number" data-quiz-minutes min="5" max="120" step="5" value="${Math.round(duration / 60) || 15}"></label>
      </div>
    </div>
    <p data-quiz-selection>${mode ? `<b>${escapeHTML(mode)}</b> selected. Adjust the options, then start.` : 'Select a practice mode above to begin.'}</p>
    <div class="quiz-builder__actions">
      <button class="button" type="button" data-start-practice ${mode ? '' : 'disabled'}>Start practice</button>
      ${resume ? '<button class="outline" type="button" data-resume>Resume saved practice</button><button class="text-button" type="button" data-discard>Discard saved practice</button>' : ''}
    </div>
  </div>`;
}

function sessionView(session) {
  const question = session.questions[session.currentIndex];
  const completed = answerCount(session);
  if (!question) return '<div class="empty-state"><h3>No matching questions</h3><p>Try a different topic or level.</p></div>';
  const answerField = question.options.length
    ? `<fieldset><legend>Your answer</legend>${question.options.map((option, index) => `<label><input type="radio" name="answer" value="${escapeHTML(option)}" ${session.answers[question.id] === option ? 'checked' : ''}> ${String.fromCharCode(65 + index)}. ${escapeHTML(option)}</label>`).join('')}</fieldset>`
    : `<label for="answer">Your answer${question.unit ? ` (${escapeHTML(question.unit)})` : ''}<textarea id="answer" rows="4" autocomplete="off">${escapeHTML(session.answers[question.id] || '')}</textarea></label>`;
  return `<section class="quiz-card" data-session-id="${session.id}"><header><span class="tag">${escapeHTML(session.mode)} · Question ${session.currentIndex + 1} of ${session.questions.length}</span>
    <p aria-live="polite"><b>${session.durationSeconds ? `Remaining ${formatTime(session.remainingSeconds)}` : `Elapsed ${formatTime(session.elapsedSeconds)}`}</b>${session.durationSeconds ? ` · Elapsed ${formatTime(session.elapsedSeconds)}` : ''}</p>
    <progress value="${completed}" max="${session.questions.length}">${completed}/${session.questions.length}</progress><p>${completed} completed · ${session.questions.length - completed} remaining · ${session.maxMarks} marks available</p></header>
    <nav aria-label="Question navigator" class="quiz-navigator">${session.questions.map((item, index) => `<button type="button" data-jump="${index}" aria-label="Question ${index + 1}: ${questionStatus(session, index)}" aria-current="${index === session.currentIndex ? 'step' : 'false'}" class="${index === session.currentIndex ? 'active' : ''} ${questionStatus(session, index)}">${index + 1}</button>`).join('')}</nav>
    <p class="tag">PAPER ${escapeHTML(question.paper)} · ${escapeHTML(question.topic)} · ${escapeHTML(question.difficulty)} · ${question.marks} mark${question.marks === 1 ? '' : 's'}</p><h2>${escapeHTML(question.question)}</h2>${answerField}
    <footer><button type="button" data-prev ${session.currentIndex === 0 ? 'disabled' : ''}>Previous</button><button type="button" data-flag>${session.flags.includes(question.id) ? 'Remove flag' : 'Flag for review'}</button><button type="button" data-next ${session.currentIndex === session.questions.length - 1 ? 'disabled' : ''}>Next</button><button type="button" data-review>Review flags (${session.flags.length})</button><button type="button" data-submit class="button">Submit quiz</button></footer></section>`;
}

/**
 * The mark broken down by criterion.
 *
 * A single score tells a student what they got, not where it went. Showing
 * value, unit and significant figures separately means a right answer written
 * without "m s⁻¹" reads as one lost mark on a named criterion rather than as
 * a blank result they have to reverse-engineer.
 *
 * Advisory criteria are marked as such, because significant figures are
 * reported here but not penalised.
 */
const criteriaHTML = result => {
  const criteria = result?.criteria || [];
  if (!criteria.length) return '';
  return `<ul class="mark-criteria">${criteria.map(item => `
    <li class="mark-criteria__row ${item.met ? 'is-met' : 'is-missed'}${item.advisory ? ' is-advisory' : ''}">
      <span class="mark-criteria__mark" aria-hidden="true">${item.met ? '✓' : (item.advisory ? '!' : '✕')}</span>
      <span class="mark-criteria__name">${escapeHTML(item.name)}<span class="visually-hidden">: ${item.met ? 'met' : 'not met'}</span></span>
      <span class="mark-criteria__note">${escapeHTML(item.note || '')}</span>
    </li>`).join('')}</ul>`;
};

const feedbackPath = item => {
  if (item.r.correct) return '<p class="feedback-success"><b>Secure:</b> Your answer met the recorded KINETIQ marking criteria.</p>';
  const formulae = (item.q.formulaReferences || []).filter(Boolean);
  const lesson = item.q.lessonReferences?.[0];
  return `<aside class="feedback-path">
    <h4>How to improve this answer</h4>
    <ul>
      <li><b>Concept:</b> Review ${escapeHTML(item.q.subtopic || item.q.topic)} and identify the physical principle before calculating.</li>
      ${formulae.length ? `<li><b>Formula:</b> Revisit ${formulae.map(escapeHTML).join(' · ')} and define every symbol before substitution.</li>` : '<li><b>Method:</b> State the principle, show the reasoning or working, then give the conclusion.</li>'}
      ${item.q.unit ? `<li><b>Units:</b> The final answer must include ${escapeHTML(item.q.unit)} and a sensible number of significant figures.</li>` : '<li><b>Precision:</b> Match the command term and include every requested point.</li>'}
    </ul>
    <div class="feedback-path__actions">
      ${lesson ? `<a class="text-button" href="/lesson/${encodeURIComponent(lesson)}" data-route>Review the lesson →</a>` : ''}
      <a class="text-button" href="/quiz?mode=Topic%20Quiz&topic=${encodeURIComponent(item.q.topic)}" data-route>Retest this topic →</a>
      <a class="text-button" href="/ask?q=${encodeURIComponent(`Explain this ${item.q.topic} question: ${item.q.question}`)}" data-route>Ask KIT to explain →</a>
    </div>
  </aside>`;
};

function measuredWeakTopics() {
  const groups = new Map();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(`${RESULTS}:`)) continue;
    try {
      const report = JSON.parse(localStorage.getItem(key));
      (report?.analytics?.topics || []).forEach(topic => {
        const row = groups.get(topic.label) || { label: topic.label, earned: 0, max: 0, attempted: 0 };
        row.earned += topic.earned || 0;
        row.max += topic.max || 0;
        row.attempted += topic.attempted || 0;
        groups.set(topic.label, row);
      });
    } catch { /* Ignore a corrupt local attempt. */ }
  }
  return [...groups.values()].filter(row => row.attempted >= 10)
    .map(row => ({ ...row, percentage: row.max ? Math.round(row.earned / row.max * 100) : 0 }))
    .sort((left, right) => left.percentage - right.percentage)
    .slice(0, 3).map(row => row.label);
}

export const resultView = report => `<section class="page"><p class="eyebrow">PRACTICE RESULTS</p><h1>${report.marksEarned}/${report.maxMarks} marks</h1><p class="page-lead">${report.analytics.percentage}% overall · ${report.analytics.accuracy}% question accuracy · ${formatTime(report.elapsedSeconds)} used</p>
  <p class="practice-note"><b>KINETIQ practice marking.</b> Marks are awarded by KINETIQ’s own deterministic marker against the recorded answer, tolerance and unit. This is study feedback, not an official IB mark or an IB mark scheme.</p>
  <div class="card-grid"><article class="content-card"><h3>Strongest topics</h3><p>${report.analytics.strongTopics.map(topic => `${escapeHTML(topic.label)} (${topic.percentage}%)`).join('<br>') || 'Complete more questions to identify a strength.'}</p></article><article class="content-card"><h3>Review next</h3><p>${report.analytics.weakTopics.map(topic => `${escapeHTML(topic.label)} (${topic.percentage}%)`).join('<br>') || 'Complete more questions to identify a review target.'}</p></article><article class="content-card"><h3>Skills measured</h3><p>${(report.analytics.skills || []).sort((a,b)=>b.attempted-a.attempted).slice(0,5).map(skill => `${escapeHTML(skill.label)} (${skill.percentage}%)`).join('<br>') || 'This set did not contain skill metadata.'}</p></article></div>
  <section class="lesson-section"><h2>Question review</h2>${report.review.map((item, index) => `<article class="content-card question-feedback"><span class="tag">QUESTION ${index + 1} · ${escapeHTML(item.q.topic)} · ${item.r.marks}/${item.q.marks} MARKS</span><h3>${escapeHTML(item.q.question)}</h3><p><b>Your answer:</b> ${escapeHTML(item.a || 'No answer')}</p><p><b>Model answer:</b> ${escapeHTML(item.q.correct_answer)}</p><p>${escapeHTML(item.r.reason || '')}</p>${criteriaHTML(item.r)}${feedbackPath(item)}${item.q.solution ? `<details><summary>View worked solution</summary><p>${escapeHTML(item.q.solution)}</p></details>` : ''}</article>`).join('')}</section><a class="button" href="/quiz" data-route>Build another practice set</a></section>`;

export function bindQuizSession(data, initialOptions = {}) {
  const root = document.querySelector('#quizMount');
  if (!root) return undefined;
  const topics = data.questions.map(question => question.topic).filter((topic, index, list) => list.indexOf(topic) === index).sort();
  let session = load();
  let selectedMode = Object.hasOwn(MODES, initialOptions.mode || '') ? initialOptions.mode : '';
  let interval;
  const clearTimer = () => { if (interval) window.clearInterval(interval); interval = undefined; };
  const persist = () => { session = tick(session); save(session); };
  const navigateToResults = async complete => {
    clearTimer();
    try {
      const { quizService } = await import('./services/quizService.js');
      // Keep navigation responsive if the learner is offline or the account
      // service is slow. The complete local result is already safe.
      await Promise.race([
        quizService.recordSession(complete),
        new Promise(resolve => setTimeout(resolve, 1800))
      ]);
    } catch { /* Local persistence remains the source of truth for guests. */ }
    window.location.assign(`/results/${complete.id}`);
  };
  const captureAnswer = () => {
    if (!session || session.submitted) return;
    const question = session.questions[session.currentIndex];
    const selected = root.querySelector('input[name="answer"]:checked')?.value;
    const written = root.querySelector('#answer')?.value;
    if (selected !== undefined) session.answers[question.id] = selected;
    if (written !== undefined) session.answers[question.id] = written.trim();
    persist();
  };
  const renderSession = () => { persist(); root.innerHTML = sessionView(session); };
  const start = (mode, selection = {}) => {
    const settings = { ...MODES[mode], ...selection, mode };
    if (mode === 'Weak Topic Quiz' && !settings.weakTopics?.length) settings.weakTopics = measuredWeakTopics();
    const pick = selectQuestions(data.questions, settings);
    if (!pick.questions.length) { root.innerHTML = '<div class="empty-state"><h3>No questions match this selection</h3><p>Choose another topic or include both levels.</p></div>'; return; }
    session = create(pick.questions, settings);
    save(session);
    renderSession();
    if (pick.questions.length < settings.count) root.insertAdjacentHTML('afterbegin', `<p class="practice-note">This selection has ${pick.questions.length} matching question${pick.questions.length === 1 ? '' : 's'} in the KINETIQ bank rather than the ${settings.count} this mode usually uses. Every question shown is a real one. None are generated to pad the set.</p>`);
    clearTimer();
    interval = window.setInterval(() => {
      if (!session || session.submitted) return clearTimer();
      persist();
      const timer = root.querySelector('[aria-live="polite"]');
      if (timer) timer.innerHTML = `<b>${session.durationSeconds ? `Remaining ${formatTime(session.remainingSeconds)}` : `Elapsed ${formatTime(session.elapsedSeconds)}`}</b>${session.durationSeconds ? ` · Elapsed ${formatTime(session.elapsedSeconds)}` : ''}`;
      if (session.durationSeconds && session.remainingSeconds === 0) navigateToResults(submit(session));
    }, 1000);
  };
  const markMode = () => document.querySelectorAll('[data-mode]').forEach(button => {
    const active = button.dataset.mode === selectedMode;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const showSetup = (selection = {}) => {
    clearTimer();
    root.innerHTML = setupView(topics, session && !session.submitted, { ...selection, mode: selectedMode });
    markMode();
  };
  const valuesOf = name => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
  const builderOptions = () => {
    const timer = root.querySelector('[data-quiz-timer]')?.checked;
    const minutes = Math.max(5, Math.min(120, Number(root.querySelector('[data-quiz-minutes]')?.value) || 15));
    return {
      topics: valuesOf('quiz-topic'),
      difficulties: valuesOf('quiz-difficulty'),
      types: valuesOf('quiz-type'),
      level: root.querySelector('[data-quiz-level]')?.value || '',
      paper: root.querySelector('[data-quiz-paper]')?.value || '',
      count: Number(root.querySelector('[data-quiz-count]')?.value) || MODES[selectedMode]?.count || 5,
      durationSeconds: timer ? minutes * 60 : 0
    };
  };
  const updateBuilderSummary = () => {
    const message = root.querySelector('[data-quiz-selection]');
    const startButton = root.querySelector('[data-start-practice]');
    if (!message || !startButton) return;
    if (!selectedMode) {
      message.textContent = 'Select a practice mode above to begin.';
      startButton.disabled = true;
      return;
    }
    const options = builderOptions();
    const match = selectQuestions(data.questions, { ...options, mode: selectedMode, count: data.questions.length });
    message.innerHTML = `<b>${escapeHTML(selectedMode)}</b> selected. ${match.available} original question${match.available === 1 ? '' : 's'} match these filters.`;
    startButton.disabled = match.available === 0;
    const topicCount = root.querySelector('[data-topic-count]');
    if (topicCount) topicCount.textContent = options.topics.length ? `${options.topics.length} selected` : 'All topics';
  };

  if (initialOptions.autoStart && selectedMode) start(selectedMode, initialOptions);
  else showSetup(initialOptions);
  updateBuilderSummary();

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    selectedMode = button.dataset.mode;
    markMode();
    updateBuilderSummary();
  }));
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.matches('[data-start-practice]')) {
      if (selectedMode) start(selectedMode, builderOptions());
      return;
    }
    if (button.matches('[data-resume]')) { renderSession(); return; }
    if (button.matches('[data-discard]')) { localStorage.removeItem(KEY); session = null; showSetup(initialOptions); return; }
    if (!session) return;
    if (button.matches('[data-jump]')) { captureAnswer(); session.currentIndex = Number(button.dataset.jump); renderSession(); }
    if (button.matches('[data-next]')) { captureAnswer(); session.currentIndex = Math.min(session.currentIndex + 1, session.questions.length - 1); renderSession(); }
    if (button.matches('[data-prev]')) { captureAnswer(); session.currentIndex = Math.max(session.currentIndex - 1, 0); renderSession(); }
    if (button.matches('[data-flag]')) { const id = session.questions[session.currentIndex].id; session.flags = session.flags.includes(id) ? session.flags.filter(flag => flag !== id) : [...session.flags, id]; renderSession(); }
    if (button.matches('[data-review]')) { const index = session.questions.findIndex(question => session.flags.includes(question.id)); if (index >= 0) { captureAnswer(); session.currentIndex = index; renderSession(); } else window.alert('There are no flagged questions.'); }
    if (button.matches('[data-submit]')) { captureAnswer(); const unanswered = session.questions.length - answerCount(session); if (window.confirm(`${unanswered} unanswered and ${session.flags.length} flagged question(s). Submit and lock this practice attempt?`)) navigateToResults(submit(session)); }
  });
  root.addEventListener('change', event => {
    if (event.target.matches('input[name="answer"]')) captureAnswer();
    else if (event.target.closest('[data-quiz-builder]')) updateBuilderSummary();
  });
  root.addEventListener('keydown', event => {
    if (!session || !event.altKey) return;
    if (event.key === 'ArrowLeft' && session.currentIndex > 0) { event.preventDefault(); captureAnswer(); session.currentIndex -= 1; renderSession(); }
    if (event.key === 'ArrowRight' && session.currentIndex < session.questions.length - 1) { event.preventDefault(); captureAnswer(); session.currentIndex += 1; renderSession(); }
  });
  return clearTimer;
}
