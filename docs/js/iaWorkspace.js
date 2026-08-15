/**
 * The internal assessment workspace.
 *
 * The IA is worth 20% and students lose marks on structure rather than physics.
 * This walks the scientific investigation through the sections IB assesses,
 * keeps a draft on this device, and warns about the specific weaknesses
 * examiners flag — a research question with no range, controlled variables
 * listed without saying how they are controlled, and evaluation that says
 * "human error" instead of naming a systematic effect.
 */
import { escapeHTML } from './utils.js';

const KEY = 'phylab_ia_draft_v1';

const SECTIONS = [
  {
    id: 'question',
    title: 'Research question',
    weight: 'Personal engagement · Exploration',
    prompt: 'State exactly what you are varying, what you are measuring, and over what range.',
    placeholder: 'How does the length of a simple pendulum (0.20 m to 1.00 m) affect its period of oscillation?',
    guidance: [
      'Name the independent variable and its range in the question itself.',
      'Name the dependent variable and how you will measure it.',
      'A question that cannot be answered with a graph is too vague.'
    ],
    checks: [
      { test: value => /\b(how|what|to what extent)\b/i.test(value), hint: 'Phrase it as a question — "How does… affect…" is the safest form.' },
      { test: value => /\d/.test(value), hint: 'Include the numerical range of your independent variable.' },
      { test: value => /\baffect|depend|vary|relationship\b/i.test(value), hint: 'Make the relationship explicit: which variable affects which.' }
    ]
  },
  {
    id: 'variables',
    title: 'Variables',
    weight: 'Exploration',
    prompt: 'Independent, dependent, and every controlled variable with how you hold it constant.',
    placeholder: 'Independent: pendulum length, 0.20–1.00 m in 0.20 m steps, measured with a metre rule to ±1 mm.\nDependent: period, from timing 20 oscillations with a stopwatch and dividing by 20.\nControlled: bob mass (same bob throughout), amplitude (released from 10° each time, set with a protractor), location (same lab bench, so g is constant).',
    guidance: [
      'Give the precision of every measuring instrument.',
      'For each controlled variable, say HOW you keep it constant — not just that you do.',
      'Five or more values of the independent variable, with repeats.'
    ],
    checks: [
      { test: value => /independent/i.test(value), hint: 'Name the independent variable explicitly.' },
      { test: value => /dependent/i.test(value), hint: 'Name the dependent variable explicitly.' },
      { test: value => /control/i.test(value), hint: 'List the controlled variables.' },
      { test: value => /±|\+\/-|uncertain|precis/i.test(value), hint: 'State instrument precision, for example ±1 mm.' }
    ]
  },
  {
    id: 'method',
    title: 'Method',
    weight: 'Exploration',
    prompt: 'Enough detail that someone else could repeat it exactly, plus safety.',
    placeholder: '1. Clamp the string so the bob hangs freely…\n5. Time 20 complete oscillations, starting the stopwatch at the lowest point.\n6. Repeat three times at each length and take a mean.\nSafety: the clamp stand is weighted so it cannot topple.',
    guidance: [
      'Numbered steps, written so a stranger could follow them.',
      'Say how many repeats and why timing many oscillations reduces uncertainty.',
      'Include one genuine safety or ethical consideration.'
    ],
    checks: [
      { test: value => /repeat|three times|3 times|mean|average/i.test(value), hint: 'Say how many repeats you take and that you average them.' },
      { test: value => /safety|hazard|care|secure/i.test(value), hint: 'Add a safety consideration.' },
      { test: value => value.split(/\n/).filter(Boolean).length >= 4, hint: 'Break the method into numbered steps.' }
    ]
  },
  {
    id: 'data',
    title: 'Data and processing',
    weight: 'Analysis',
    prompt: 'Raw data with uncertainties, then how you process and linearise it.',
    placeholder: 'Raw: length / m (±0.001), time for 20 oscillations / s (±0.2)…\nProcessed: period T = t/20, then T² so that T² = (4π²/g)L gives a straight line through the origin.\nUncertainty in T is half the range of the three repeats.',
    guidance: [
      'Consistent decimal places, with an uncertainty on every measured column.',
      'Linearise so the gradient means something — plot T² against L, not T against L.',
      'Say where each uncertainty came from.'
    ],
    checks: [
      { test: value => /±|\+\/-|uncertain/i.test(value), hint: 'Every measured quantity needs an uncertainty.' },
      { test: value => /graph|plot|gradient|linearis|linheariz/i.test(value), hint: 'Say what you will plot and why.' }
    ],
    tool: { href: '/data', label: 'Open the data lab to plot this and get the gradient with its uncertainty →' }
  },
  {
    id: 'conclusion',
    title: 'Conclusion',
    weight: 'Evaluation',
    prompt: 'What the gradient gives you, compared with the accepted value.',
    placeholder: 'The gradient was 4.1 ± 0.2 s² m⁻¹. Since T² = (4π²/g)L, g = 4π²/gradient = 9.6 ± 0.5 m s⁻². The accepted 9.81 m s⁻² lies inside this range, so the results agree.',
    guidance: [
      'Derive the physical quantity from the gradient, do not stop at the gradient.',
      'Quote your uncertainty and say whether the accepted value falls inside it.',
      'Percentage difference is not enough on its own.'
    ],
    checks: [
      { test: value => /gradient/i.test(value), hint: 'Refer to the gradient you measured.' },
      { test: value => /±|\+\/-|uncertain/i.test(value), hint: 'Quote the uncertainty in your final result.' },
      { test: value => /accepted|literature|expected|agree/i.test(value), hint: 'Compare with the accepted value and judge agreement.' }
    ]
  },
  {
    id: 'evaluation',
    title: 'Evaluation',
    weight: 'Evaluation',
    prompt: 'Your largest weakness, whether errors were random or systematic, and specific improvements.',
    placeholder: 'The dominant uncertainty was in timing, at 1.4% compared with 0.3% for length. Since the accepted value lay inside the range, errors appear random rather than systematic. Measuring to the centre of mass of the bob rather than the top would remove a systematic offset in L…',
    guidance: [
      'Identify which uncertainty dominated, with numbers.',
      'Distinguish random scatter from a systematic offset, using your own evidence.',
      'Improvements must target the weakness you named. "Be more careful" earns nothing.'
    ],
    checks: [
      { test: value => /systematic|random/i.test(value), hint: 'Say whether your errors were random or systematic, and how you know.' },
      { test: value => /improv|instead|replace|use a/i.test(value), hint: 'Propose a specific improvement.' },
      { test: value => !/human error|carele/i.test(value), hint: '"Human error" is not creditable — name the physical cause instead.' }
    ]
  }
];

const readDraft = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};
const writeDraft = draft => {
  try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* storage blocked */ }
};

/** Runs a section's checks against its current text. */
export function reviewSection(section, value) {
  const text = String(value || '').trim();
  if (!text) return { started: false, passed: 0, total: section.checks.length, hints: [] };
  const hints = section.checks.filter(check => !check.test(text)).map(check => check.hint);
  return { started: true, passed: section.checks.length - hints.length, total: section.checks.length, hints };
}

export function iaPage() {
  const draft = readDraft();
  return `<section class="page ia-page">
    <p class="eyebrow">INTERNAL ASSESSMENT</p>
    <h1>Build your investigation.</h1>
    <p class="page-lead">The IA is worth 20% of your grade, and most marks are lost on structure rather than physics. Work through the sections below. Your draft is saved on this device as you type, and each section checks itself against the weaknesses examiners flag most often.</p>
    <p class="practice-note"><b>KINETIQ study support.</b> These checks are KINETIQ's own guidance on common IA weaknesses, not an official IB rubric or mark scheme. Your teacher's guidance always takes precedence.</p>

    <div class="ia-progress"><div class="ia-progress__bar"><i data-ia-bar style="width:0%"></i></div><span data-ia-count></span></div>

    ${SECTIONS.map((section, index) => `<section class="ia-section" data-ia-section="${section.id}">
      <header class="ia-section__head">
        <div><span class="ia-num">${String(index + 1).padStart(2, '0')}</span><h2>${escapeHTML(section.title)}</h2><p class="muted">${escapeHTML(section.weight)}</p></div>
        <span class="ia-status" data-ia-status></span>
      </header>
      <p class="ia-prompt">${escapeHTML(section.prompt)}</p>
      <ul class="ia-guidance">${section.guidance.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
      <label class="visually-hidden" for="ia-${section.id}">${escapeHTML(section.title)}</label>
      <textarea id="ia-${section.id}" data-ia-input="${section.id}" rows="7" placeholder="${escapeHTML(section.placeholder)}">${escapeHTML(draft[section.id] || '')}</textarea>
      <div class="ia-hints" data-ia-hints></div>
      ${section.tool ? `<a class="text-button" href="${section.tool.href}" data-route>${escapeHTML(section.tool.label)}</a>` : ''}
    </section>`).join('')}

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">WHEN YOU ARE DONE</p><h2>Take it with you</h2></div>
      <div class="ia-actions">
        <button type="button" class="button" data-ia-copy>Copy the whole draft</button>
        <button type="button" class="outline" data-ia-clear>Clear the draft</button>
        <a class="chip" href="/toolkit" data-route>Practical and IA method →</a>
        <a class="chip" href="/data" data-route>Data lab →</a>
      </div>
      <p class="muted" data-ia-copied aria-live="polite"></p>
    </section>
  </section>`;
}

export function bindIA() {
  const page = document.querySelector('.ia-page');
  if (!page) return undefined;
  const controller = new AbortController();
  const bar = page.querySelector('[data-ia-bar]');
  const count = page.querySelector('[data-ia-count]');

  const refresh = () => {
    let complete = 0;
    SECTIONS.forEach(section => {
      const node = page.querySelector(`[data-ia-section="${section.id}"]`);
      const value = node.querySelector('[data-ia-input]').value;
      const review = reviewSection(section, value);
      const status = node.querySelector('[data-ia-status]');
      const hints = node.querySelector('[data-ia-hints]');
      if (!review.started) {
        status.textContent = 'Not started';
        status.className = 'ia-status';
        hints.innerHTML = '';
        return;
      }
      const done = review.hints.length === 0;
      if (done) complete += 1;
      status.textContent = done ? 'Looks complete' : `${review.passed}/${review.total} checks`;
      status.className = `ia-status ${done ? 'is-done' : 'is-partial'}`;
      hints.innerHTML = done
        ? '<p class="ia-hint ia-hint--ok">Every check passed for this section.</p>'
        : review.hints.map(hint => `<p class="ia-hint">${escapeHTML(hint)}</p>`).join('');
    });
    const percentage = Math.round(complete / SECTIONS.length * 100);
    bar.style.width = `${percentage}%`;
    count.textContent = `${complete} of ${SECTIONS.length} sections complete`;
  };

  const save = () => {
    const draft = {};
    SECTIONS.forEach(section => { draft[section.id] = page.querySelector(`[data-ia-input="${section.id}"]`).value; });
    writeDraft(draft);
  };

  page.querySelectorAll('[data-ia-input]').forEach(field =>
    field.addEventListener('input', () => { save(); refresh(); }, { signal: controller.signal }));

  page.querySelector('[data-ia-copy]').addEventListener('click', async () => {
    const text = SECTIONS.map(section => `## ${section.title}\n\n${page.querySelector(`[data-ia-input="${section.id}"]`).value.trim()}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      page.querySelector('[data-ia-copied]').textContent = 'Draft copied to the clipboard.';
    } catch {
      page.querySelector('[data-ia-copied]').textContent = 'Could not reach the clipboard. Select the text in each box and copy manually.';
    }
  }, { signal: controller.signal });

  page.querySelector('[data-ia-clear]').addEventListener('click', () => {
    if (!window.confirm('Clear the whole IA draft on this device? This cannot be undone.')) return;
    page.querySelectorAll('[data-ia-input]').forEach(field => { field.value = ''; });
    save();
    refresh();
    page.querySelector('[data-ia-copied]').textContent = 'Draft cleared.';
  }, { signal: controller.signal });

  refresh();
  return () => controller.abort();
}
