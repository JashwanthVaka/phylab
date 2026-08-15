/**
 * Interactive graphs for lesson pages, driven by the lesson's own physics.
 *
 * The previous lesson graphs were decorative: a hardcoded curve such as
 * 0.12x^2 shown under every motion topic, with no inputs and no relationship
 * to the equations on the page. These compute from the real relationship,
 * respond to sliders, and say what the gradient and area actually mean.
 */
import { escapeHTML } from './utils.js';
import { renderGraph, updateGraph, seekGraph } from './graphEngine.js';

const C = 299792458;
const H = 6.62607015e-34;
const K_E = 8.9875517923e9;
const R_GAS = 8.314462618;

const round = (value, digits = 4) => {
  if (!Number.isFinite(value)) return '—';
  const size = Math.abs(value);
  if (size !== 0 && (size < 1e-3 || size >= 1e6)) return value.toExponential(3);
  return String(Number(value.toPrecision(digits)));
};

/**
 * One model per lesson topic. `fn` receives u in 0..100 (the graph engine's
 * sampling range) and maps it onto the model's real domain.
 */
const MODELS = {
  kinematics: {
    match: /kinematic/,
    title: 'Velocity–time for uniform acceleration',
    controls: [['u', 'Initial velocity', 'm/s', 5, -20, 40], ['a', 'Acceleration', 'm/s²', 3, -10, 10], ['t', 'Time shown', 's', 10, 1, 30]],
    build: v => ({
      graph: { id: 'kinematics', title: 'Velocity against time', x: `Time (0 to ${round(v.t)} s)`, y: 'Velocity (m/s)', fn: u => v.u + v.a * (v.t * u / 100) },
      sweep: { label: 'Time', unit: 's', from: 0, to: v.t },
      at: t => [['Time', t, 's'], ['Velocity', v.u + v.a * t, 'm/s'], ['Displacement', v.u * t + 0.5 * v.a * t * t, 'm']],
      meaning: `The gradient is the acceleration, ${round(v.a)} m/s². The area under the line is the displacement, which after ${round(v.t)} s is ${round(v.u * v.t + 0.5 * v.a * v.t * v.t)} m. A negative area means displacement backwards.`
    })
  },
  forces: {
    match: /force|momentum/,
    title: 'Momentum against time under a constant force',
    controls: [['m', 'Mass', 'kg', 2, 0.1, 50], ['F', 'Net force', 'N', 10, -100, 100], ['t', 'Time shown', 's', 10, 1, 30]],
    build: v => ({
      graph: { id: 'forces', title: 'Momentum against time', x: `Time (0 to ${round(v.t)} s)`, y: 'Momentum (kg m/s)', fn: u => v.F * (v.t * u / 100) },
      sweep: { label: 'Time', unit: 's', from: 0, to: v.t },
      at: t => [['Time', t, 's'], ['Momentum', v.F * t, 'kg m/s'], ['Velocity', v.F * t / v.m, 'm/s'], ['Kinetic energy', (v.F * t) ** 2 / (2 * v.m), 'J']],
      meaning: `The gradient of momentum against time is the net force, ${round(v.F)} N — that is Newton's second law in its momentum form. The change in momentum over the whole interval is the impulse, ${round(v.F * v.t)} N s.`
    })
  },
  energy: {
    match: /work|energy|power/,
    title: 'Energy exchange during a fall',
    controls: [['m', 'Mass', 'kg', 2, 0.1, 50], ['h', 'Drop height', 'm', 20, 1, 100], ['g', 'Gravity', 'm/s²', 9.81, 1, 25]],
    build: v => ({
      graph: { id: 'energy', title: 'Kinetic energy against distance fallen', x: `Distance fallen (0 to ${round(v.h)} m)`, y: 'Kinetic energy (J)', fn: u => v.m * v.g * (v.h * u / 100) },
      sweep: { label: 'Distance fallen', unit: 'm', from: 0, to: v.h },
      at: d => [['Distance fallen', d, 'm'], ['Kinetic energy', v.m * v.g * d, 'J'], ['Potential energy', v.m * v.g * (v.h - d), 'J'], ['Total', v.m * v.g * v.h, 'J'], ['Speed', Math.sqrt(2 * v.g * d), 'm/s']],
      meaning: `The gradient is mg, ${round(v.m * v.g)} N — the weight. Kinetic energy gained always equals potential energy lost, so the total stays at ${round(v.m * v.g * v.h)} J throughout.`
    })
  },
  'simple-harmonic-motion': {
    match: /harmonic/,
    title: 'Displacement, velocity and energy in SHM',
    controls: [['A', 'Amplitude', 'm', 0.2, 0.01, 2], ['m', 'Mass', 'kg', 0.5, 0.05, 10], ['k', 'Spring constant', 'N/m', 20, 0.5, 200], ['t', 'Time shown', 's', 4, 1, 20]],
    build: v => {
      const omega = Math.sqrt(v.k / v.m);
      const period = 2 * Math.PI / omega;
      const span = v.t;
      return {
        graph: { id: 'shm', title: 'Displacement against time', x: `Time (0 to ${round(span)} s)`, y: 'Displacement (m)', fn: u => v.A * Math.cos(omega * span * u / 100) },
        sweep: { label: 'Time', unit: 's', from: 0, to: span },
        at: t => {
          const x = v.A * Math.cos(omega * t);
          const speed = -v.A * omega * Math.sin(omega * t);
          return [['Time', t, 's'], ['Displacement', x, 'm'], ['Velocity', speed, 'm/s'], ['Acceleration', -omega * omega * x, 'm/s²'], ['Kinetic energy', 0.5 * v.m * speed * speed, 'J'], ['Elastic PE', 0.5 * v.k * x * x, 'J']];
        },
        meaning: `Period T = 2π√(m/k) = ${round(period)} s, so ${round(span / period, 3)} oscillations fit in the ${round(span)} s shown. ω = ${round(omega)} rad/s. The gradient of this curve is the velocity, zero at the turning points and largest at equilibrium. Total energy ½kA² = ${round(0.5 * v.k * v.A * v.A)} J stays constant.`
      };
    }
  },
  'wave-properties': {
    match: /wave/,
    title: 'A travelling wave in space',
    controls: [['A', 'Amplitude', 'm', 1, 0.1, 5], ['lambda', 'Wavelength', 'm', 2, 0.2, 10], ['f', 'Frequency', 'Hz', 5, 0.1, 40], ['span', 'Distance shown', 'm', 6, 1, 30]],
    build: v => ({
      graph: { id: 'wave', title: 'Displacement against position', x: `Position (0 to ${round(v.span)} m)`, y: 'Displacement (m)', fn: u => v.A * Math.sin(2 * Math.PI * (v.span * u / 100) / v.lambda) },
      sweep: { label: 'Position', unit: 'm', from: 0, to: v.span },
      at: x => [['Position', x, 'm'], ['Displacement', v.A * Math.sin(2 * Math.PI * x / v.lambda), 'm'], ['Wave speed', v.f * v.lambda, 'm/s'], ['Period', 1 / v.f, 's']],
      meaning: `The distance between successive peaks is the wavelength, ${round(v.lambda)} m, so ${round(v.span / v.lambda, 3)} wavelengths fit in the ${round(v.span)} m shown. With f = ${round(v.f)} Hz the wave speed is v = fλ = ${round(v.f * v.lambda)} m/s. Amplitude sets the energy carried, since intensity is proportional to A².`
    })
  },
  'electric-fields': {
    match: /electric|field/,
    title: 'Field and potential around a point charge',
    controls: [['Q', 'Charge', 'µC', 2, -20, 20], ['rmax', 'Distance shown', 'm', 1, 0.1, 5]],
    build: v => {
      const charge = v.Q * 1e-6;
      const from = v.rmax / 20;
      return {
        graph: { id: 'field', title: 'Field strength against distance', x: `Distance (${round(from)} to ${round(v.rmax)} m)`, y: 'Field strength (N/C)', fn: u => K_E * charge / (from + (v.rmax - from) * u / 100) ** 2 },
        sweep: { label: 'Distance', unit: 'm', from, to: v.rmax },
        at: r => [['Distance', r, 'm'], ['Field strength', K_E * charge / (r * r), 'N/C'], ['Potential', K_E * charge / r, 'V'], ['Force on 1 µC', K_E * charge * 1e-6 / (r * r), 'N']],
        meaning: `Field strength follows an inverse-square law, so doubling the distance quarters it. Potential falls as 1/r, more slowly. The gradient of the potential–distance graph is the negative of the field strength.`
      };
    }
  },
  'gas-laws': {
    match: /gas|thermal|thermodynamic|greenhouse/,
    title: 'Pressure against volume at constant temperature',
    controls: [['n', 'Amount', 'mol', 1, 0.05, 10], ['T', 'Temperature', 'K', 300, 50, 1000], ['Vmax', 'Volume shown', 'm³', 0.1, 0.01, 1]],
    build: v => {
      const from = v.Vmax / 10;
      return {
        graph: { id: 'gas', title: 'Pressure against volume', x: `Volume (${round(from)} to ${round(v.Vmax)} m³)`, y: 'Pressure (Pa)', fn: u => v.n * R_GAS * v.T / (from + (v.Vmax - from) * u / 100) },
        sweep: { label: 'Volume', unit: 'm³', from, to: v.Vmax },
        at: vol => [['Volume', vol, 'm³'], ['Pressure', v.n * R_GAS * v.T / vol, 'Pa'], ['pV', v.n * R_GAS * v.T, 'J'], ['Particles', v.n * 6.02214076e23, '']],
        meaning: `This is an isotherm. Pressure is inversely proportional to volume, so pV stays constant at ${round(v.n * R_GAS * v.T)} J everywhere on the curve. Raising the temperature moves the whole curve outwards.`
      };
    }
  },
  'nuclear-physics': {
    match: /nuclear/,
    title: 'Exponential decay',
    controls: [['N0', 'Initial nuclei', '', 1000, 10, 10000], ['halfLife', 'Half-life', 's', 10, 0.5, 200], ['t', 'Time shown', 's', 50, 5, 400]],
    build: v => {
      const span = v.t;
      const lambda = Math.LN2 / v.halfLife;
      return {
        graph: { id: 'decay', title: 'Undecayed nuclei against time', x: `Time (0 to ${round(span)} s)`, y: 'Undecayed nuclei', fn: u => v.N0 * Math.pow(0.5, (span * u / 100) / v.halfLife) },
        sweep: { label: 'Time', unit: 's', from: 0, to: span },
        at: t => [['Time', t, 's'], ['Half-lives', t / v.halfLife, ''], ['Remaining', v.N0 * Math.pow(0.5, t / v.halfLife), ''], ['Decayed', v.N0 - v.N0 * Math.pow(0.5, t / v.halfLife), ''], ['Activity', lambda * v.N0 * Math.pow(0.5, t / v.halfLife), 'Bq']],
        meaning: `Each half-life of ${round(v.halfLife)} s halves the survivors, and ${round(span / v.halfLife, 3)} half-lives fit in the ${round(span)} s shown. so the curve never reaches zero. The decay constant is λ = ln2/T½ = ${round(lambda)} s⁻¹, and the gradient at any point equals −λN, which is the activity.`
      };
    }
  },
  'quantum-physics': {
    match: /quantum/,
    title: 'Photoelectric effect',
    controls: [['phi', 'Work function', 'eV', 2.3, 0.5, 6], ['fmax', 'Frequency shown', '×10¹⁴ Hz', 15, 2, 30]],
    build: v => {
      const work = v.phi * 1.602176634e-19;
      const top = v.fmax * 1e14;
      const threshold = work / H;
      return {
        graph: { id: 'photoelectric', title: 'Maximum kinetic energy against frequency', x: `Frequency (0 to ${round(v.fmax)} ×10¹⁴ Hz)`, y: 'Max kinetic energy (J)', fn: u => Math.max(0, H * (top * u / 100) - work) },
        sweep: { label: 'Frequency', unit: 'Hz', from: 0, to: top },
        at: f => [['Frequency', f, 'Hz'], ['Photon energy', H * f, 'J'], ['Max KE', Math.max(0, H * f - work), 'J'], ['Emission?', f >= threshold ? 1 : 0, f >= threshold ? '(yes)' : '(no)']],
        meaning: `Below the threshold frequency f₀ = φ/h = ${round(threshold)} Hz nothing is emitted, however bright the light. Above it the line is straight with gradient h = 6.63×10⁻³⁴ J s, and the intercept on the energy axis is −φ.`
      };
    }
  },
  relativity: {
    match: /relativit/,
    title: 'The Lorentz factor',
    controls: [['vmax', 'Speed shown', '×c', 0.99, 0.1, 0.999]],
    build: v => {
      const top = v.vmax * C;
      const gamma = speed => 1 / Math.sqrt(Math.max(1 - (speed / C) ** 2, 1e-12));
      return {
        graph: { id: 'relativity', title: 'Lorentz factor against speed', x: `Speed (0 to ${round(v.vmax)}c)`, y: 'Lorentz factor γ', fn: u => gamma(top * u / 100) },
        sweep: { label: 'Speed', unit: 'm/s', from: 0, to: top },
        at: speed => [['Speed', speed, 'm/s'], ['Fraction of c', speed / C, ''], ['γ', gamma(speed), ''], ['1 s becomes', gamma(speed), 's'], ['1 m becomes', 1 / gamma(speed), 'm']],
        meaning: `γ stays close to 1 for everyday speeds, which is why relativity is invisible day to day. It rises without limit as v approaches c — the reason no massive object can reach the speed of light.`
      };
    }
  }
};

/** Picks the model whose pattern matches the lesson, or null when none does. */
export function modelForLesson(lesson) {
  const text = `${lesson.title || ''} ${lesson.topicLabel || ''}`.toLowerCase();
  const entry = Object.entries(MODELS).find(([, model]) => model.match.test(text));
  return entry ? { key: entry[0], ...entry[1] } : null;
}

/** Renders the interactive graph block, or nothing when a lesson has no model yet. */
export function lessonGraph(lesson) {
  const model = modelForLesson(lesson);
  if (!model) return '';
  const defaults = Object.fromEntries(model.controls.map(([key, , , value]) => [key, value]));
  const built = model.build(defaults);
  const controls = model.controls.map(([key, label, unit, value, min, max]) => `<div class="lg-control">
      <label for="lg-${key}">${escapeHTML(label)}${unit ? ` <span class="sim-unit">(${escapeHTML(unit)})</span>` : ''}</label>
      <div class="lg-control-row">
        <input type="range" id="lg-${key}" name="${key}" min="${min}" max="${max}" step="any" value="${value}">
        <input type="number" data-lg-number="${key}" min="${min}" max="${max}" step="any" value="${value}" aria-label="${escapeHTML(label)}">
      </div>
    </div>`).join('');

  return `<div class="lesson-graph" data-lesson-graph="${escapeHTML(model.key)}">
    <div class="lg-head"><h3>${escapeHTML(model.title)}</h3><p class="muted">Change a value and the graph, the readings and the marker all recompute from the equation.</p></div>
    <div class="lg-grid">
      <form class="lg-controls">${controls}<div class="lg-buttons">
        <button type="button" class="button" data-lg-play>Play</button>
        <button type="button" class="outline" data-lg-pause>Pause</button>
        <button type="button" class="outline" data-lg-reset>Reset</button>
      </div></form>
      <div class="lg-readout"><h4>At this point</h4><div data-lg-state aria-live="off"></div></div>
    </div>
    ${renderGraph(built.graph)}
    <p class="lg-meaning" data-lg-meaning>${escapeHTML(built.meaning)}</p>
  </div>`;
}

/** Wires the sliders, playback and marker for a lesson graph already in the DOM. */
export function bindLessonGraph() {
  const root = document.querySelector('[data-lesson-graph]');
  if (!root) return undefined;
  const model = MODELS[root.dataset.lessonGraph];
  if (!model) return undefined;
  const controller = new AbortController();
  const form = root.querySelector('.lg-controls');
  const statePanel = root.querySelector('[data-lg-state]');
  const meaning = root.querySelector('[data-lg-meaning]');
  const defaults = Object.fromEntries(model.controls.map(([key, , , value]) => [key, value]));
  let built = model.build(defaults);
  let playing = false;
  let frame = 0;
  let startedAt = 0;
  let offset = 0;

  const values = () => Object.fromEntries(model.controls.map(([key]) => {
    const raw = Number(form.querySelector(`[data-lg-number="${key}"]`).value);
    return [key, Number.isFinite(raw) ? raw : defaults[key]];
  }));

  const showState = value => {
    const rows = built.at(value);
    statePanel.innerHTML = `<p class="lg-sweep">${escapeHTML(built.sweep.label)}: <b>${round(value)} ${escapeHTML(built.sweep.unit)}</b></p>
      <dl class="sim-readout">${rows.map(([label, quantity, unit]) => `<div><dt>${escapeHTML(label)}</dt><dd>${round(quantity)}${unit ? ` ${escapeHTML(unit)}` : ''}</dd></div>`).join('')}</dl>`;
    const range = built.sweep.to - built.sweep.from;
    seekGraph(root, range === 0 ? 0 : (value - built.sweep.from) / range);
  };

  const stop = () => { playing = false; cancelAnimationFrame(frame); frame = 0; };
  const step = now => {
    if (!playing) return;
    const elapsed = (now - startedAt) / 1000 + offset;
    const progress = (elapsed / 6) % 1;
    showState(built.sweep.from + (built.sweep.to - built.sweep.from) * progress);
    frame = requestAnimationFrame(step);
  };

  const update = ({ animate = true } = {}) => {
    built = model.build(values());
    updateGraph(root, built.graph, { animate: animate && !playing });
    meaning.textContent = built.meaning;
    showState(built.sweep.from);
    if (playing) { startedAt = performance.now(); offset = 0; }
  };

  form.querySelectorAll('input[type=range]').forEach(range => range.addEventListener('input', () => {
    form.querySelector(`[data-lg-number="${range.name}"]`).value = range.value;
    update();
  }, { signal: controller.signal }));
  form.querySelectorAll('[data-lg-number]').forEach(field => field.addEventListener('input', () => {
    const key = field.dataset.lgNumber;
    const range = form.querySelector(`[name="${key}"]`);
    const value = Number(field.value);
    if (Number.isFinite(value) && value >= Number(range.min) && value <= Number(range.max)) range.value = String(value);
    update();
  }, { signal: controller.signal }));
  root.querySelector('[data-lg-play]').addEventListener('click', () => {
    if (playing) return;
    playing = true; startedAt = performance.now(); frame = requestAnimationFrame(step);
  }, { signal: controller.signal });
  root.querySelector('[data-lg-pause]').addEventListener('click', () => {
    if (!playing) return;
    offset = (performance.now() - startedAt) / 1000 + offset;
    stop();
  }, { signal: controller.signal });
  root.querySelector('[data-lg-reset]').addEventListener('click', () => {
    stop(); offset = 0;
    model.controls.forEach(([key]) => {
      form.querySelector(`[name="${key}"]`).value = String(defaults[key]);
      form.querySelector(`[data-lg-number="${key}"]`).value = String(defaults[key]);
    });
    update();
  }, { signal: controller.signal });

  update({ animate: false });
  return () => { stop(); controller.abort(); };
}
