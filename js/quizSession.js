import { assessment } from './assessmentEngine.js';
import { escapeHTML } from './utils.js';

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
  'Exam Practice': { count: 12, durationSeconds: 1800, description: 'A longer IB-inspired practice session.', time: '30 min' }
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
});

export const selectQuestions = (questions, { mode = 'Mixed Quiz', topic, level, difficulty, type, count = 5, weakTopics = [] } = {}) => {
  const source = questions.map(normalize);
  let selected = source.filter(question =>
    (!topic || question.topic.toLowerCase() === topic.toLowerCase()) &&
    (!level || question.level === level) &&
    (!difficulty || question.difficulty === difficulty) &&
    (!type || question.type === type)
  );
  let diagnostic = false;
  if (mode === 'Weak Topic Quiz') {
    selected = selected.filter(question => weakTopics.includes(question.topic));
    if (!selected.length) { selected = source; diagnostic = true; }
  }
  if (mode === 'Formula Quiz') {
    const formulaQuestions = selected.filter(question => /formula|calculation|numerical|equation/i.test(`${question.tags.join(' ')} ${question.type}`));
    selected = formulaQuestions.length ? formulaQuestions : selected;
  }
  return { questions: selected.slice(0, count), diagnostic };
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
  return {
    percentage: session.maxMarks ? Math.round(session.marksEarned / session.maxMarks * 100) : 0,
    accuracy: review.length ? Math.round(review.filter(item => item.r.correct).length / review.length * 100) : 0,
    topics,
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
  return `<section class="page"><p class="eyebrow">QUIZ STUDIO</p><h1>Practise with purpose.</h1><p class="page-lead">Choose a mode, set your focus, and receive transparent PHYLAB practice feedback.</p>
    <div class="card-grid" aria-label="Practice modes">${Object.entries(MODES).map(([mode, details]) => `<button class="content-card" type="button" data-mode="${mode}"><span class="tag">${details.time} · SL + HL</span><h3>${mode}</h3><p>${details.description}</p></button>`).join('')}</div>
    <section id="quizMount" data-topics="${escapeHTML(JSON.stringify(topics))}" class="lesson-section" aria-live="polite"></section>
  </section>`;
};

function setupView(topics, resume) {
  return `<div class="content-card"><h2>Set up your practice</h2><p>Choose a mode above, then adjust the scope before starting.</p>
    <div class="quiz-toolbar"><label>Topic <select data-quiz-topic><option value="">All topics</option>${topics.map(topic => `<option value="${escapeHTML(topic)}">${escapeHTML(topic)}</option>`).join('')}</select></label>
    <label>Level <select data-quiz-level><option value="">SL + HL</option><option>SL</option><option>HL</option></select></label>
    <label>Questions <select data-quiz-count><option value="5">5 questions</option><option value="10">10 questions</option></select></label></div>
    <p data-quiz-selection>Select a practice mode to begin.</p>${resume ? '<button class="button" type="button" data-resume>Resume saved practice</button> <button class="outline" type="button" data-discard>Discard saved practice</button>' : ''}</div>`;
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
    <p class="tag">${escapeHTML(question.topic)} · ${escapeHTML(question.difficulty)} · ${question.marks} mark${question.marks === 1 ? '' : 's'}</p><h2>${escapeHTML(question.question)}</h2>${answerField}
    <footer><button type="button" data-prev ${session.currentIndex === 0 ? 'disabled' : ''}>Previous</button><button type="button" data-flag>${session.flags.includes(question.id) ? 'Remove flag' : 'Flag for review'}</button><button type="button" data-next ${session.currentIndex === session.questions.length - 1 ? 'disabled' : ''}>Next</button><button type="button" data-review>Review flags (${session.flags.length})</button><button type="button" data-submit class="button">Submit quiz</button></footer></section>`;
}

export const resultView = report => `<section class="page"><p class="eyebrow">PRACTICE RESULTS</p><h1>${report.marksEarned}/${report.maxMarks} marks</h1><p class="page-lead">${report.analytics.percentage}% overall · ${report.analytics.accuracy}% question accuracy · ${formatTime(report.elapsedSeconds)} used</p>
  <p class="practice-note"><b>PHYLAB practice marking.</b> Marks are awarded by PHYLAB’s own deterministic marker against the recorded answer, tolerance and unit. This is study feedback, not an official IB mark or an IB mark scheme.</p>
  <div class="card-grid"><article class="content-card"><h3>Strongest topics</h3><p>${report.analytics.strongTopics.map(topic => `${escapeHTML(topic.label)} (${topic.percentage}%)`).join('<br>') || 'Complete more questions to identify a strength.'}</p></article><article class="content-card"><h3>Review next</h3><p>${report.analytics.weakTopics.map(topic => `${escapeHTML(topic.label)} (${topic.percentage}%)`).join('<br>') || 'Complete more questions to identify a review target.'}</p></article></div>
  <section class="lesson-section"><h2>Question review</h2>${report.review.map((item, index) => `<article class="content-card"><span class="tag">QUESTION ${index + 1} · ${escapeHTML(item.q.topic)} · ${item.r.marks}/${item.q.marks} MARKS</span><h3>${escapeHTML(item.q.question)}</h3><p><b>Your answer:</b> ${escapeHTML(item.a || 'No answer')}</p><p><b>Model answer:</b> ${escapeHTML(item.q.correct_answer)}</p><p>${escapeHTML(item.r.reason || '')}</p>${item.q.solution ? `<details><summary>View worked solution</summary><p>${escapeHTML(item.q.solution)}</p></details>` : ''}${item.q.lessonReferences?.[0] ? `<a href="/lesson/${encodeURIComponent(item.q.lessonReferences[0])}" data-route>Review lesson →</a>` : ''}</article>`).join('')}</section><a class="button" href="/quiz" data-route>Practise again</a></section>`;

export function bindQuizSession(data, initialOptions = {}) {
  const root = document.querySelector('#quizMount');
  if (!root) return undefined;
  const topics = data.questions.map(question => question.topic).filter((topic, index, list) => list.indexOf(topic) === index).sort();
  let session = load();
  let interval;
  const clearTimer = () => { if (interval) window.clearInterval(interval); interval = undefined; };
  const persist = () => { session = tick(session); save(session); };
  const navigateToResults = complete => { clearTimer(); window.location.assign(`/results/${complete.id}`); };
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
    const pick = selectQuestions(data.questions, settings);
    if (!pick.questions.length) { root.innerHTML = '<div class="empty-state"><h3>No questions match this selection</h3><p>Choose another topic or include both levels.</p></div>'; return; }
    session = create(pick.questions, settings);
    save(session);
    renderSession();
    if (pick.questions.length < settings.count) root.insertAdjacentHTML('afterbegin', `<p class="practice-note">This selection has ${pick.questions.length} matching question${pick.questions.length === 1 ? '' : 's'} in the PHYLAB bank rather than the ${settings.count} this mode usually uses. Every question shown is a real one — none are generated to pad the set.</p>`);
    clearTimer();
    interval = window.setInterval(() => {
      if (!session || session.submitted) return clearTimer();
      persist();
      const timer = root.querySelector('[aria-live="polite"]');
      if (timer) timer.innerHTML = `<b>${session.durationSeconds ? `Remaining ${formatTime(session.remainingSeconds)}` : `Elapsed ${formatTime(session.elapsedSeconds)}`}</b>${session.durationSeconds ? ` · Elapsed ${formatTime(session.elapsedSeconds)}` : ''}`;
      if (session.durationSeconds && session.remainingSeconds === 0) navigateToResults(submit(session));
    }, 1000);
  };
  const showSetup = () => { clearTimer(); root.innerHTML = setupView(topics, session && !session.submitted); };
  const routeMode = initialOptions.mode || (initialOptions.topic ? 'Topic Quiz' : '');
  if (routeMode) start(routeMode, initialOptions);
  else showSetup();
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    const topic = root.querySelector('[data-quiz-topic]')?.value || '';
    const level = root.querySelector('[data-quiz-level]')?.value || '';
    const count = Number(root.querySelector('[data-quiz-count]')?.value) || MODES[button.dataset.mode].count;
    start(button.dataset.mode, { topic, level, count });
  }));
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.matches('[data-resume]')) { renderSession(); return; }
    if (button.matches('[data-discard]')) { localStorage.removeItem(KEY); session = null; showSetup(); return; }
    if (!session) return;
    if (button.matches('[data-jump]')) { captureAnswer(); session.currentIndex = Number(button.dataset.jump); renderSession(); }
    if (button.matches('[data-next]')) { captureAnswer(); session.currentIndex = Math.min(session.currentIndex + 1, session.questions.length - 1); renderSession(); }
    if (button.matches('[data-prev]')) { captureAnswer(); session.currentIndex = Math.max(session.currentIndex - 1, 0); renderSession(); }
    if (button.matches('[data-flag]')) { const id = session.questions[session.currentIndex].id; session.flags = session.flags.includes(id) ? session.flags.filter(flag => flag !== id) : [...session.flags, id]; renderSession(); }
    if (button.matches('[data-review]')) { const index = session.questions.findIndex(question => session.flags.includes(question.id)); if (index >= 0) { captureAnswer(); session.currentIndex = index; renderSession(); } else window.alert('There are no flagged questions.'); }
    if (button.matches('[data-submit]')) { captureAnswer(); const unanswered = session.questions.length - answerCount(session); if (window.confirm(`${unanswered} unanswered and ${session.flags.length} flagged question(s). Submit and lock this practice attempt?`)) navigateToResults(submit(session)); }
  });
  root.addEventListener('change', event => { if (event.target.matches('input[name="answer"]')) captureAnswer(); });
  root.addEventListener('keydown', event => {
    if (!session || !event.altKey) return;
    if (event.key === 'ArrowLeft' && session.currentIndex > 0) { event.preventDefault(); captureAnswer(); session.currentIndex -= 1; renderSession(); }
    if (event.key === 'ArrowRight' && session.currentIndex < session.questions.length - 1) { event.preventDefault(); captureAnswer(); session.currentIndex += 1; renderSession(); }
  });
  return clearTimer;
}
