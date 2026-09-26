import { escapeHTML } from './utils.js';
import { physics } from './physicsEngine.js';
import { learningStorage as storage } from './services/learningStorage.js';

const STATE_KEY = 'kinetiq_study_studio_v1';
const readState = () => {
  try { return JSON.parse(storage.getItem(STATE_KEY) || '{}'); } catch { return {}; }
};
const saveState = value => storage.setItem(STATE_KEY, JSON.stringify(value));
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export const CONVERSIONS = {
  'km/h → m/s': value => value / 3.6,
  'm/s → km/h': value => value * 3.6,
  'cm → m': value => value / 100,
  'mm → m': value => value / 1000,
  'kJ → J': value => value * 1000,
  'eV → J': value => value * 1.602176634e-19,
  '° → rad': value => value * Math.PI / 180,
};

export const GRAPH_CHALLENGES = [
  { prompt: 'Gravitational field strength g against distance r from a point mass', answer: 'inverse-square', note: 'g = GM/r², so doubling r reduces g to one quarter.' },
  { prompt: 'Extension x against applied force F for a Hookean spring', answer: 'linear', note: 'F = kx, so x is directly proportional to F before the limit of proportionality.' },
  { prompt: 'Kinetic energy against speed v for a fixed mass', answer: 'quadratic', note: 'Eₖ = ½mv², so doubling speed quadruples kinetic energy.' },
  { prompt: 'Undecayed nuclei N against time t', answer: 'exponential', note: 'N = N₀e⁻ˡᵃᵐᵇᵈᵃᵗ, so equal time intervals remove equal fractions, not equal numbers.' },
];

const shapeSVG = shape => ({
  linear: 'M18 122 L190 22',
  quadratic: 'M18 126 Q90 122 190 20',
  'inverse-square': 'M20 20 C38 85 75 110 190 124',
  exponential: 'M18 22 C60 68 112 108 190 124',
}[shape] || 'M18 124 L190 124');

function formulaOptions(formulas) {
  return formulas.slice(0, 80).map((item, index) => `<option value="${index}">${escapeHTML(item.name)} · ${escapeHTML(item.formula)}</option>`).join('');
}

function mistakeOptions(lessons) {
  return lessons.map((lesson, index) => `<option value="${index}">${escapeHTML(lesson.title)}</option>`).join('');
}

export function studyStudioPage(index = {}, lessons = []) {
  const formulas = index.formulas || [];
  const state = readState();
  const goals = state.goals || [];
  const collections = state.collections || [];
  return `<section class="page study-studio" data-study-studio>
    <p class="eyebrow">KINETIQ STUDY STUDIO</p>
    <h1>Think, test and organise your physics.</h1>
    <p class="page-lead">A collection of focused tools for deriving relationships, predicting graphs, comparing models, planning experiments and managing a study session. Everything works locally without a paid AI service.</p>

    <nav class="studio-jump glass" aria-label="Study Studio sections">
      <a href="#reasoning">Reasoning</a><a href="#visual">Visual tools</a><a href="#session">Study session</a><a href="#organise">Organise</a>
    </nav>

    <section class="lesson-section" id="reasoning">
      <div class="section-title"><p class="eyebrow">REASONING</p><h2>Build the method, not only the answer.</h2></div>
      <div class="studio-grid">
        <article class="studio-tool" data-derivation>
          <span class="studio-tool__number">01</span><h3>Interactive derivation stepper</h3>
          <label>Relationship<select data-derivation-select>${formulaOptions(formulas)}</select></label>
          <div class="derivation-stage" aria-live="polite" data-derivation-stage></div>
          <div class="studio-actions"><button class="outline" type="button" data-derive-back>Previous</button><button class="button" type="button" data-derive-next>Next step</button></div>
        </article>

        <article class="studio-tool" data-prediction>
          <span class="studio-tool__number">02</span><h3>Graph prediction challenge</h3>
          <p data-prediction-prompt></p>
          <div class="shape-options" role="group" aria-label="Choose the graph shape">${['linear','quadratic','inverse-square','exponential'].map(shape => `<button class="outline" type="button" data-shape="${shape}">${shape}</button>`).join('')}</div>
          <svg class="prediction-graph" viewBox="0 0 210 145" role="img" aria-label="Graph shape preview"><path d="M18 12 V126 H198"/><path data-shape-line d="M18 124 L190 124"/></svg>
          <p class="studio-feedback" role="status" data-prediction-feedback>Predict before revealing the relationship.</p>
          <button class="text-button" type="button" data-prediction-next>Next challenge</button>
        </article>

        <article class="studio-tool" data-misconception>
          <span class="studio-tool__number">03</span><h3>Misconception finder</h3>
          <label>Lesson<select data-mistake-lesson>${mistakeOptions(lessons)}</select></label>
          <label>Your reasoning<textarea rows="4" data-mistake-answer placeholder="Paste the step or explanation you are unsure about."></textarea></label>
          <button class="button" type="button" data-check-mistake>Check against known mistakes</button>
          <div class="studio-feedback" role="status" data-mistake-feedback>Uses the reviewed common-mistake guidance already stored in the selected lesson.</div>
        </article>

        <article class="studio-tool" data-explain>
          <span class="studio-tool__number">04</span><h3>Explain it yourself</h3>
          <label>Concept<input data-explain-concept placeholder="For example: electromagnetic induction"></label>
          <label>Your explanation<textarea rows="5" data-explain-text></textarea></label>
          <div class="checklist"><label><input type="checkbox"> Named the principle</label><label><input type="checkbox"> Explained the mechanism</label><label><input type="checkbox"> Used an equation or evidence</label><label><input type="checkbox"> Checked limits and units</label></div>
          <div class="studio-actions"><button class="outline" type="button" data-record>Record explanation</button><button class="button" type="button" data-save-explanation>Save reflection</button></div>
          <audio controls data-recording hidden></audio><p class="studio-feedback" role="status" data-explain-status></p>
        </article>
      </div>
    </section>

    <section class="lesson-section" id="visual">
      <div class="section-title"><p class="eyebrow">VISUAL TOOLS</p><h2>Change a variable and see what follows.</h2></div>
      <div class="studio-grid">
        <article class="studio-tool" data-compare>
          <span class="studio-tool__number">05</span><h3>Simulation comparison</h3>
          <p>Compare two projectile launches using the same physical model as the KINETIQ lab.</p>
          <div class="compare-inputs">${['A','B'].map((label, index) => `<fieldset><legend>Launch ${label}</legend><label>Speed / m s⁻¹<input type="number" min="0" max="100" value="${index ? 30 : 20}" data-compare-speed="${index}"></label><label>Angle / °<input type="number" min="0" max="90" value="${index ? 60 : 45}" data-compare-angle="${index}"></label></fieldset>`).join('')}</div>
          <svg class="compare-plot" viewBox="0 0 420 220" role="img" aria-label="Compared projectile paths"><path class="axis" d="M34 12 V190 H406"/><path data-compare-path="0"/><path data-compare-path="1"/></svg>
          <div class="compare-results" data-compare-results></div>
        </article>

        <article class="studio-tool" data-converter>
          <span class="studio-tool__number">06</span><h3>Unit-conversion trainer</h3>
          <label>Conversion<select data-conversion>${Object.keys(CONVERSIONS).map(key => `<option>${key}</option>`).join('')}</select></label>
          <label>Starting value<input type="number" value="72" data-conversion-value></label>
          <label>Your answer<input type="number" data-conversion-answer></label>
          <button class="button" type="button" data-check-conversion>Check conversion</button>
          <p class="studio-feedback" role="status" data-conversion-feedback></p>
        </article>

        <article class="studio-tool" data-annotation>
          <span class="studio-tool__number">07</span><h3>Graph annotation workspace</h3>
          <svg class="annotation-plot" viewBox="0 0 360 220" role="img" aria-label="Example experimental graph with optional annotations"><path class="axis" d="M38 14 V184 H342"/><path class="data-line" d="M50 168 L96 148 L142 119 L188 98 L234 62 L280 45 L326 24"/>${[[50,168],[96,148],[142,119],[188,98],[234,62],[280,45],[326,24]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}<g data-annotation-layer></g></svg>
          <div class="studio-actions"><button class="outline" type="button" data-annotation="gradient">Gradient triangle</button><button class="outline" type="button" data-annotation="uncertainty">Error bars</button><button class="outline" type="button" data-annotation="intercept">Intercept</button><button class="text-button" type="button" data-annotation="clear">Clear</button></div>
          <p class="studio-feedback" data-annotation-note>Add only annotations that have a physical meaning.</p>
        </article>

        <article class="studio-tool" data-practical>
          <span class="studio-tool__number">08</span><h3>Practical-design builder</h3>
          <label>Research question<input data-practical-question placeholder="How does … affect …?"></label>
          <label>Independent variable<input data-practical-independent></label>
          <label>Dependent variable<input data-practical-dependent></label>
          <label>Range and uncertainty<input data-practical-range placeholder="0.20 m to 1.00 m, ±0.001 m"></label>
          <label>Controls<textarea rows="3" data-practical-controls></textarea></label>
          <button class="button" type="button" data-build-practical>Review design</button>
          <ul class="studio-feedback" data-practical-feedback></ul>
        </article>
      </div>
    </section>

    <section class="lesson-section" id="session">
      <div class="section-title"><p class="eyebrow">STUDY SESSION</p><h2>Focus with a clear finish line.</h2></div>
      <div class="studio-grid studio-grid--compact">
        <article class="studio-tool focus-timer" data-timer><span class="studio-tool__number">09</span><h3>Study timer</h3><output data-timer-output>25:00</output><label>Minutes<input type="number" min="1" max="120" value="25" data-timer-minutes></label><div class="studio-actions"><button class="button" type="button" data-timer-toggle>Start</button><button class="outline" type="button" data-timer-reset>Reset</button></div></article>
        <article class="studio-tool" data-goals><span class="studio-tool__number">10</span><h3>Session goals</h3><form data-goal-form><label>One clear outcome<input required maxlength="140" name="goal" placeholder="Complete five kinematics questions"></label><button class="button" type="submit">Add goal</button></form><ul class="goal-list" data-goal-list>${goals.map(goal => `<li data-goal-id="${escapeHTML(goal.id)}"><label><input type="checkbox" ${goal.done ? 'checked' : ''}> ${escapeHTML(goal.text)}</label><button class="text-button" type="button" data-remove-goal>Remove</button></li>`).join('')}</ul></article>
        <article class="studio-tool"><span class="studio-tool__number">11</span><h3>Physics symbol keyboard</h3><p>Select a text box anywhere in this page, then insert a symbol.</p><div class="symbol-keyboard">${['Δ','λ','θ','μ','Ω','π','²','³','×10⁻','±','≤','≥','√','∑','→'].map(symbol => `<button class="outline" type="button" data-symbol="${symbol}">${symbol}</button>`).join('')}</div></article>
        <article class="studio-tool"><span class="studio-tool__number">12</span><h3>Worked-solution scratchpad</h3><textarea rows="9" data-scratchpad placeholder="Known quantities&#10;Equation&#10;Substitution&#10;Result and unit">${escapeHTML(state.scratchpad || '')}</textarea><p class="studio-feedback" role="status" data-scratch-status>Saved automatically on this device.</p></article>
      </div>
    </section>

    <section class="lesson-section" id="organise">
      <div class="section-title"><p class="eyebrow">ORGANISE</p><h2>Keep useful work easy to find.</h2></div>
      <div class="studio-grid studio-grid--compact">
        <article class="studio-tool"><span class="studio-tool__number">13</span><h3>Study calendar</h3><div class="study-calendar" data-calendar></div></article>
        <article class="studio-tool"><span class="studio-tool__number">14</span><h3>Revision reminders</h3><p>Ask this browser to notify you. KINETIQ never enables notifications without your choice.</p><button class="button" type="button" data-enable-reminders>Enable reminders</button><p class="studio-feedback" role="status" data-reminder-status></p></article>
        <article class="studio-tool"><span class="studio-tool__number">15</span><h3>Custom collections</h3><form data-collection-form><label>Collection name<input name="name" required maxlength="80" placeholder="Mock exam 1"></label><label>Link<input name="href" value="${escapeHTML(location.pathname)}" required></label><button class="button" type="submit">Save current page</button></form><ul class="collection-list" data-collection-list>${collections.map(item => `<li><a href="${escapeHTML(item.href)}" data-route>${escapeHTML(item.name)}</a></li>`).join('')}</ul></article>
        <article class="studio-tool"><span class="studio-tool__number">16</span><h3>Progress report</h3><p>Create a clean printable report from the progress and activity already recorded in KINETIQ.</p><div class="studio-actions"><a class="outline" href="/progress" data-route>Review evidence</a><button class="button" type="button" data-print-report>Print report</button></div></article>
      </div>
    </section>
  </section>`;
}

function insertAtCursor(field, text) {
  if (!field || !('value' in field)) return;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  field.value = field.value.slice(0, start) + text + field.value.slice(end);
  field.focus();
  field.setSelectionRange?.(start + text.length, start + text.length);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

export function calendarHTML(state = {}, now = new Date()) {
  const today = new Date();
  today.setTime(now.getTime());
  const dateKey = date => date.toISOString().slice(0, 10);
  const goalsByDate = (state.goals || []).reduce((map, goal) => {
    if (!goal.date) return map;
    map[goal.date] = (map[goal.date] || 0) + 1;
    return map;
  }, {});
  const reflectionsByDate = (state.reflections || []).reduce((map, reflection) => {
    const key = reflection.at?.slice(0, 10);
    if (key) map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
  return Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(today); date.setDate(today.getDate() + offset);
    const key = dateKey(date);
    const due = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short' });
    const evidence = [];
    if (goalsByDate[key]) evidence.push(`${goalsByDate[key]} ${goalsByDate[key] === 1 ? 'goal' : 'goals'}`);
    if (reflectionsByDate[key]) evidence.push(`${reflectionsByDate[key]} ${reflectionsByDate[key] === 1 ? 'reflection' : 'reflections'}`);
    return `<div class="calendar-day ${offset === 0 ? 'is-today' : ''}"><b>${date.getDate()}</b><span>${due}</span><small>${evidence.length ? evidence.join(' · ') : 'No planned item'}</small></div>`;
  }).join('');
}

export function convertUnit(key, value) {
  const convert = CONVERSIONS[key];
  return convert && Number.isFinite(Number(value)) ? convert(Number(value)) : null;
}

export function bindStudyStudio(index = {}, lessons = []) {
  const root = document.querySelector('[data-study-studio]');
  if (!root) return undefined;
  const controller = new AbortController();
  const signal = controller.signal;
  let state = readState();
  let activeField = null;
  let prediction = 0;
  let derivationStep = 0;
  let timerId = 0;
  let seconds = 1500;
  let recorder = null;
  let chunks = [];
  let recordingURL = '';

  root.addEventListener('focusin', event => { if (event.target.matches('input,textarea')) activeField = event.target; }, { signal });

  const renderDerivation = () => {
    const formula = (index.formulas || [])[Number(root.querySelector('[data-derivation-select]').value)] || {};
    const variables = Object.entries(formula.variables || formula.symbols || {});
    const steps = [
      ['Start from the model', formula.formula || 'Relationship unavailable'],
      ['Name every quantity', variables.length ? variables.map(([symbol, meaning]) => `${symbol}: ${meaning}`).join(' · ') : 'Identify each symbol and its SI unit.'],
      ['Choose the target', `Rearrange symbolically before substituting. Keep ${formula.formula || 'the relationship'} balanced on both sides.`],
      ['Substitute in SI units', 'Write values with units, carry guard digits and keep the sign convention consistent.'],
      ['Validate the result', 'Check dimensions, order of magnitude, sign and whether the model assumptions still apply.']
    ];
    derivationStep = Math.max(0, Math.min(steps.length - 1, derivationStep));
    const [title, body] = steps[derivationStep];
    root.querySelector('[data-derivation-stage]').innerHTML = `<span>Step ${derivationStep + 1} of ${steps.length}</span><h4>${escapeHTML(title)}</h4><p>${escapeHTML(body)}</p><div class="derivation-progress"><i style="width:${(derivationStep + 1) / steps.length * 100}%"></i></div>`;
  };
  root.querySelector('[data-derivation-select]')?.addEventListener('change', () => { derivationStep = 0; renderDerivation(); }, { signal });
  root.querySelector('[data-derive-next]')?.addEventListener('click', () => { derivationStep += 1; renderDerivation(); }, { signal });
  root.querySelector('[data-derive-back]')?.addEventListener('click', () => { derivationStep -= 1; renderDerivation(); }, { signal });
  renderDerivation();

  const renderPrediction = () => {
    const item = GRAPH_CHALLENGES[prediction % GRAPH_CHALLENGES.length];
    root.querySelector('[data-prediction-prompt]').textContent = item.prompt;
    root.querySelector('[data-shape-line]').setAttribute('d', 'M18 124 L190 124');
    root.querySelector('[data-prediction-feedback]').textContent = 'Predict before revealing the relationship.';
  };
  root.querySelectorAll('[data-shape]').forEach(button => button.addEventListener('click', () => {
    const item = GRAPH_CHALLENGES[prediction % GRAPH_CHALLENGES.length];
    root.querySelector('[data-shape-line]').setAttribute('d', shapeSVG(item.answer));
    root.querySelector('[data-prediction-feedback]').textContent = `${button.dataset.shape === item.answer ? 'Correct. ' : `The correct shape is ${item.answer}. `}${item.note}`;
  }, { signal }));
  root.querySelector('[data-prediction-next]')?.addEventListener('click', () => { prediction += 1; renderPrediction(); }, { signal });
  renderPrediction();

  root.querySelector('[data-check-mistake]')?.addEventListener('click', () => {
    const lesson = lessons[Number(root.querySelector('[data-mistake-lesson]').value)] || {};
    const answer = root.querySelector('[data-mistake-answer]').value.toLowerCase();
    const mistakes = lesson.common_mistakes || [];
    const terms = answer.split(/\W+/).filter(word => word.length > 3);
    const ranked = mistakes.map(text => ({ text, score: terms.filter(term => text.toLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score);
    root.querySelector('[data-mistake-feedback]').innerHTML = mistakes.length
      ? `<b>Check this first:</b> ${escapeHTML(ranked[0].text)}<br><a href="/lesson/${escapeHTML(lesson.slug)}" data-route>Open the reviewed lesson guidance</a>`
      : 'No reviewed common-mistake note is stored for this lesson yet. Check the formula assumptions and units.';
  }, { signal });

  const updateCompare = () => {
    const runs = [0, 1].map(i => {
      const v = Number(root.querySelector(`[data-compare-speed="${i}"]`).value);
      const angle = Number(root.querySelector(`[data-compare-angle="${i}"]`).value);
      return { v, angle, result: physics.projectile({ v, angle, gravity: 9.81, height: 0 }) };
    });
    const maxRange = Math.max(1, ...runs.map(run => run.result?.range || 0));
    const maxHeight = Math.max(1, ...runs.map(run => run.result?.maxHeight || 0));
    runs.forEach((run, i) => {
      const points = Array.from({ length: 31 }, (_, n) => {
        const x = (run.result.range || 0) * n / 30;
        const t = run.result.vx ? x / run.result.vx : 0;
        const y = Math.max(0, run.result.vy * t - 4.905 * t * t);
        return `${34 + x / maxRange * 360},${190 - y / maxHeight * 165}`;
      });
      root.querySelector(`[data-compare-path="${i}"]`).setAttribute('d', `M${points.join(' L')}`);
    });
    root.querySelector('[data-compare-results]').innerHTML = runs.map((run, i) => `<p><b>Launch ${i ? 'B' : 'A'}</b><span>${run.result ? `${run.result.range.toFixed(1)} m range · ${run.result.maxHeight.toFixed(1)} m maximum height · ${run.result.time.toFixed(2)} s` : 'Enter valid values.'}</span></p>`).join('');
  };
  root.querySelectorAll('[data-compare-speed],[data-compare-angle]').forEach(input => input.addEventListener('input', updateCompare, { signal }));
  updateCompare();

  root.querySelector('[data-check-conversion]')?.addEventListener('click', () => {
    const key = root.querySelector('[data-conversion]').value;
    const value = Number(root.querySelector('[data-conversion-value]').value);
    const answer = Number(root.querySelector('[data-conversion-answer]').value);
    const expected = convertUnit(key, value);
    const correct = Number.isFinite(answer) && Math.abs(answer - expected) <= Math.max(Math.abs(expected) * 0.001, 1e-12);
    root.querySelector('[data-conversion-feedback]').textContent = `${correct ? 'Correct.' : 'Try again.'} ${value} ${key.split(' → ')[0]} = ${Number(expected.toPrecision(6))} ${key.split(' → ')[1]}.`;
  }, { signal });

  root.querySelectorAll('[data-annotation]').forEach(button => button.addEventListener('click', () => {
    const layer = root.querySelector('[data-annotation-layer]');
    const kind = button.dataset.annotation;
    if (kind === 'clear') { layer.innerHTML = ''; root.querySelector('[data-annotation-note]').textContent = 'Annotations cleared.'; return; }
    const markup = kind === 'gradient' ? '<path class="annotation" d="M96 148 H234 V62"/><text x="150" y="158">Δx</text><text x="240" y="110">Δy</text>'
      : kind === 'uncertainty' ? [96,142,188,234,280].map((x, i) => `<path class="annotation" d="M${x} ${146-i*22} v24 M${x-6} ${146-i*22} h12 M${x-6} ${170-i*22} h12"/>`).join('')
        : '<path class="annotation" d="M38 186 L38 174 M30 174 H46"/><text x="48" y="178">intercept</text>';
    layer.insertAdjacentHTML('beforeend', markup);
    root.querySelector('[data-annotation-note]').textContent = kind === 'gradient' ? 'Use a large triangle so reading uncertainty has less effect.' : kind === 'uncertainty' ? 'Error bars show measurement uncertainty, not scatter decoration.' : 'Interpret a non-zero intercept before calling it systematic error.';
  }, { signal }));

  root.querySelector('[data-build-practical]')?.addEventListener('click', () => {
    const values = ['question','independent','dependent','range','controls'].map(key => root.querySelector(`[data-practical-${key}]`).value.trim());
    const checks = [
      [values[0].includes('?') || /how|what|extent/i.test(values[0]), 'Phrase a testable research question.'],
      [values[1].length > 2, 'Name the independent variable.'],
      [values[2].length > 2, 'Name the dependent variable.'],
      [/\d/.test(values[3]) && /±|uncert|range|to/i.test(values[3]), 'Give a numerical range and measurement uncertainty.'],
      [values[4].split(/[,\n]/).filter(Boolean).length >= 2, 'State at least two controls and how they stay constant.']
    ];
    root.querySelector('[data-practical-feedback]').innerHTML = checks.map(([pass, text]) => `<li class="${pass ? 'is-pass' : 'is-warning'}">${pass ? 'Ready' : 'Needs work'}: ${escapeHTML(text)}</li>`).join('');
  }, { signal });

  root.querySelector('[data-save-explanation]')?.addEventListener('click', () => {
    const concept = root.querySelector('[data-explain-concept]').value.trim();
    const text = root.querySelector('[data-explain-text]').value.trim();
    const checked = root.querySelectorAll('[data-explain] input[type=checkbox]:checked').length;
    state.reflections = [{ id: uid(), concept, text, checked, at: new Date().toISOString() }, ...(state.reflections || [])].slice(0, 30);
    saveState(state);
    root.querySelector('[data-explain-status]').textContent = `Reflection saved with ${checked} of 4 explanation checks complete.`;
  }, { signal });

  root.querySelector('[data-record]')?.addEventListener('click', async event => {
    const status = root.querySelector('[data-explain-status]');
    if (recorder?.state === 'recording') { recorder.stop(); event.currentTarget.textContent = 'Record explanation'; return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { status.textContent = 'Audio recording is not supported by this browser. The written reflection still works.'; return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const audio = root.querySelector('[data-recording]');
        if (recordingURL) URL.revokeObjectURL(recordingURL);
        recordingURL = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        audio.src = recordingURL; audio.hidden = false;
        stream.getTracks().forEach(track => track.stop()); status.textContent = 'Recording ready for playback. It stays in this browser tab.';
      };
      recorder.start(); event.currentTarget.textContent = 'Stop recording'; status.textContent = 'Recording. Explain the principle, mechanism and evidence.';
    } catch { status.textContent = 'Microphone permission was not granted. You can continue with the written explanation.'; }
  }, { signal });

  const renderGoals = () => {
    root.querySelector('[data-goal-list]').innerHTML = (state.goals || []).map(goal => `<li data-goal-id="${escapeHTML(goal.id)}"><label><input type="checkbox" ${goal.done ? 'checked' : ''}> ${escapeHTML(goal.text)}</label><button class="text-button" type="button" data-remove-goal>Remove</button></li>`).join('');
  };
  root.querySelector('[data-goal-form]')?.addEventListener('submit', event => {
    event.preventDefault(); const text = new FormData(event.currentTarget).get('goal').trim();
    state.goals = [...(state.goals || []), { id: uid(), text, done: false, date: new Date().toISOString().slice(0, 10) }];
    saveState(state); event.currentTarget.reset(); renderGoals();
    root.querySelector('[data-calendar]').innerHTML = calendarHTML(state);
  }, { signal });
  root.querySelector('[data-goal-list]')?.addEventListener('click', event => {
    const item = event.target.closest('[data-goal-id]'); if (!item) return;
    if (event.target.matches('input')) state.goals = (state.goals || []).map(goal => goal.id === item.dataset.goalId ? { ...goal, done: event.target.checked } : goal);
    if (event.target.closest('[data-remove-goal]')) state.goals = (state.goals || []).filter(goal => goal.id !== item.dataset.goalId);
    saveState(state); renderGoals();
  }, { signal });

  const timerOutput = root.querySelector('[data-timer-output]');
  const paintTimer = () => { timerOutput.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
  root.querySelector('[data-timer-toggle]')?.addEventListener('click', event => {
    if (timerId) { clearInterval(timerId); timerId = 0; event.currentTarget.textContent = 'Continue'; return; }
    event.currentTarget.textContent = 'Pause';
    timerId = setInterval(() => { seconds = Math.max(0, seconds - 1); paintTimer(); if (!seconds) { clearInterval(timerId); timerId = 0; event.currentTarget.textContent = 'Start again'; root.querySelector('[data-timer]').classList.add('is-complete'); } }, 1000);
  }, { signal });
  root.querySelector('[data-timer-reset]')?.addEventListener('click', () => { clearInterval(timerId); timerId = 0; seconds = Number(root.querySelector('[data-timer-minutes]').value || 25) * 60; paintTimer(); root.querySelector('[data-timer-toggle]').textContent = 'Start'; }, { signal });

  root.querySelectorAll('[data-symbol]').forEach(button => button.addEventListener('mousedown', event => { event.preventDefault(); insertAtCursor(activeField, button.dataset.symbol); }, { signal }));
  root.querySelector('[data-scratchpad]')?.addEventListener('input', event => { state.scratchpad = event.target.value; saveState(state); }, { signal });
  root.querySelector('[data-calendar]').innerHTML = calendarHTML(state);

  root.querySelector('[data-enable-reminders]')?.addEventListener('click', async () => {
    const status = root.querySelector('[data-reminder-status]');
    if (!('Notification' in window)) { status.textContent = 'Notifications are not supported by this browser.'; return; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('KINETIQ notifications enabled', { body: 'Due work can be surfaced while KINETIQ is open.' });
      status.textContent = 'Notifications enabled for active KINETIQ sessions. Background scheduling is not enabled.';
    } else status.textContent = 'Notifications remain off.';
  }, { signal });

  root.querySelector('[data-collection-form]')?.addEventListener('submit', event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    state.collections = [{ id: uid(), ...data }, ...(state.collections || [])].slice(0, 50); saveState(state);
    root.querySelector('[data-collection-list]').innerHTML = state.collections.map(item => `<li><a href="${escapeHTML(item.href)}" data-route>${escapeHTML(item.name)}</a></li>`).join('');
    event.currentTarget.reset();
    event.currentTarget.elements.href.value = location.pathname;
  }, { signal });
  root.querySelector('[data-print-report]')?.addEventListener('click', () => {
    history.pushState({}, '', '/progress?print=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, { signal });

  return () => {
    controller.abort();
    clearInterval(timerId);
    if (recorder?.state === 'recording') recorder.stop();
    if (recordingURL) URL.revokeObjectURL(recordingURL);
  };
}
