import { physics } from './physicsEngine.js';
import { escapeHTML } from './utils.js';
import { renderGraph, bindGraphs, updateGraph, seekGraph } from './graphEngine.js';

const C = 299792458;
const H = 6.62607015e-34;
const K = 8.9875517923e9;
const R = 8.314462618;

const definitions = {
  projectile: { title: 'Projectile Motion', topic: 'Mechanics', engine: 'projectile', fields: [['v', 'Initial speed', 'm s⁻¹', 10, 0, 100], ['angle', 'Launch angle', '°', 45, 0, 90], ['gravity', 'Gravity', 'm s⁻²', 9.81, 1, 25], ['height', 'Initial height', 'm', 0, 0, 100]], formula: 'R = vₓt; y = h + vᵧt − ½gt²', mistakes: 'Using degrees as radians or forgetting initial height.', lesson: 'kinematics' },
  newton: { title: 'Newton’s Second Law', topic: 'Forces', engine: 'newton', fields: [['force', 'Net force', 'N', 10, -100, 100], ['mass', 'Mass', 'kg', 2, 0.1, 100]], formula: 'F = ma', mistakes: 'Using mass in grams rather than kilograms.', lesson: 'forces' },
  energy: { title: 'Kinetic & Potential Energy', topic: 'Energy', engine: 'energy', fields: [['mass', 'Mass', 'kg', 1, 0.1, 100], ['height', 'Height', 'm', 5, 0, 100], ['velocity', 'Initial downward speed', 'm s⁻¹', 5, 0, 100], ['gravity', 'Gravity', 'm s⁻²', 9.81, 1, 25]], formula: 'Eₖ = ½mv²; Eₚ = mgh', mistakes: 'Confusing gravitational potential energy with total energy.', lesson: 'energy' },
  shm: { title: 'Mass-Spring SHM', topic: 'Waves', engine: 'shm', fields: [['mass', 'Mass', 'kg', 1, 0.1, 20], ['k', 'Spring constant', 'N m⁻¹', 20, 0.1, 200], ['amplitude', 'Amplitude', 'm', 1, 0.01, 10]], formula: 'T = 2π√(m/k)', mistakes: 'Using amplitude in the period equation.', lesson: 'simple-harmonic-motion' },
  'electric-field': { title: 'Electric Field', topic: 'Fields', engine: 'coulomb', fields: [['q1', 'Source charge', 'C', 1, -10, 10], ['q2', 'Test charge', 'C', 1, -10, 10], ['r', 'Separation', 'm', 1, 0.01, 100]], formula: 'F = kq₁q₂/r²', mistakes: 'Forgetting that force direction depends on charge sign.', lesson: 'electric-fields' },
  'magnetic-force': { title: 'Magnetic Force', topic: 'Fields', engine: 'magnetic', fields: [['B', 'Flux density', 'T', 1, 0, 10], ['q', 'Charge', 'C', 1, -10, 10], ['v', 'Speed', 'm s⁻¹', 10, 0, 100], ['angle', 'Angle', '°', 90, 0, 180]], formula: 'F = Bqv sinθ', mistakes: 'Forgetting the sine factor.', lesson: 'magnetic-fields' },
  'gas-law': { title: 'Ideal Gas Law', topic: 'Thermal', engine: 'gas', fields: [['n', 'Amount', 'mol', 1, 0.01, 20], ['T', 'Temperature', 'K', 300, 1, 1000], ['V', 'Volume', 'm³', 1, 0.001, 100]], formula: 'PV = nRT', mistakes: 'Using Celsius instead of kelvin.', lesson: 'gas-laws' },
  'photon-energy': { title: 'Photon Energy', topic: 'Quantum', engine: 'photon', fields: [['f', 'Frequency', 'Hz', 1e14, 0, 1e16]], formula: 'E = hf', mistakes: 'Mixing wavelength and frequency units.', lesson: 'quantum-physics' },
  'radioactive-decay': { title: 'Radioactive Decay', topic: 'Nuclear', engine: 'decay', fields: [['N0', 'Initial nuclei', 'nuclei', 100, 1, 10000], ['halfLife', 'Half-life', 's', 5, 0.01, 1000], ['time', 'Time', 's', 5, 0, 10000]], formula: 'N = N₀(½)^(t/T½)', mistakes: 'Adding half-lives instead of halving repeatedly.', lesson: 'nuclear-physics' },
  'lorentz-factor': { title: 'Lorentz Factor', topic: 'Relativity', engine: 'relativity', fields: [['v', 'Velocity', 'm s⁻¹', 1e8, 0, 2.99e8]], formula: 'γ = 1 / √(1 − v²/c²)', mistakes: 'Using a velocity equal to or greater than c.', lesson: 'relativity' }
};

const presets = { Earth: { gravity: 9.81 }, Moon: { gravity: 1.62 }, Mars: { gravity: 3.71 }, Easy: { v: 5, force: 5, mass: 1 }, Medium: { v: 10, force: 10, mass: 2 }, Hard: { v: 30, force: 40, mass: 5 } };
const units = { time: 's', range: 'm', maxHeight: 'm', vx: 'm s⁻¹', vy: 'm s⁻¹', acceleration: 'm s⁻²', ke: 'J', gpe: 'J', total: 'J', period: 's', frequency: 'Hz', omega: 'rad s⁻¹', force: 'N', pressure: 'Pa', energy: 'J', remaining: 'nuclei', gamma: '' };
const labels = { time: 'Flight time', range: 'Horizontal range', maxHeight: 'Maximum height', vx: 'Horizontal velocity', vy: 'Vertical velocity', acceleration: 'Acceleration', ke: 'Kinetic energy', gpe: 'Gravitational potential energy', total: 'Total energy', period: 'Period', frequency: 'Frequency', omega: 'Angular frequency', force: 'Force', pressure: 'Pressure', energy: 'Photon energy', remaining: 'Undecayed nuclei', gamma: 'Lorentz factor γ' };

const card = sim => `<a class="module-card" href="/simulations/${sim}" data-route><span class="tag">${definitions[sim].topic} · SL + HL</span><h3>${definitions[sim].title}</h3><p>Change values and see the calculation and animated graph update together.</p><span class="open-module">Open lab →</span></a>`;

export const catalogue = () => `<section class="page"><p class="eyebrow">SIMULATION STUDIO</p><h1>Model the physics.</h1><p class="page-lead">Every lab is driven by the real equation. Change an input and the answer, the graph, and the animated marker all update from the same model.</p><div class="module-grid">${Object.keys(definitions).map(card).join('')}</div></section>`;

const number = (value, key) => Number(value[key]) || 0;
const clampAbove = (value, floor) => (Math.abs(value) < floor ? floor : value);

/**
 * Builds the physical model behind a lab: the plotted relationship, the independent
 * variable that playback sweeps through, and the quantities measured at any point on it.
 */
function modelFor(engine, value) {
  if (engine === 'projectile') {
    const radians = number(value, 'angle') * Math.PI / 180;
    const speed = number(value, 'v');
    const gravity = clampAbove(number(value, 'gravity'), 0.01);
    const start = number(value, 'height');
    const vx = speed * Math.cos(radians);
    const vy = speed * Math.sin(radians);
    const flight = clampAbove((vy + Math.sqrt(Math.max(vy * vy + 2 * gravity * start, 0))) / gravity, 0.001);
    const heightAt = t => start + vy * t - gravity * t * t / 2;
    const usesDistance = vx * flight > 0.001;
    const span = usesDistance ? vx * flight : flight;
    return {
      graph: usesDistance
        ? { id: 'trajectory', title: 'Projectile trajectory', x: `Horizontal distance (0 to ${format(span)} m)`, y: 'Height (m)', fn: u => heightAt(flight * u / 100) }
        : { id: 'trajectory', title: 'Vertical height against time', x: `Time (0 to ${format(flight)} s)`, y: 'Height (m)', fn: u => heightAt(flight * u / 100) },
      sweep: { label: 'Time', unit: 's', from: 0, to: flight, seconds: Math.min(8, Math.max(2.5, flight)) },
      at: t => [['Time', t, 's'], ['Horizontal distance', vx * t, 'm'], ['Height', heightAt(t), 'm'], ['Vertical velocity', vy - gravity * t, 'm s⁻¹'], ['Speed', Math.hypot(vx, vy - gravity * t), 'm s⁻¹']],
      note: 'The path is a parabola. The peak is where the vertical velocity passes through zero, and the horizontal velocity never changes.'
    };
  }
  if (engine === 'newton') {
    const mass = clampAbove(number(value, 'mass'), 0.01);
    const acceleration = number(value, 'force') / mass;
    const span = 10;
    return {
      graph: { id: 'velocity', title: 'Velocity against time', x: `Time (0 to ${span} s)`, y: 'Velocity (m s⁻¹)', fn: u => acceleration * span * u / 100 },
      sweep: { label: 'Time', unit: 's', from: 0, to: span, seconds: 5 },
      at: t => [['Time', t, 's'], ['Velocity', acceleration * t, 'm s⁻¹'], ['Displacement', acceleration * t * t / 2, 'm'], ['Momentum', mass * acceleration * t, 'kg m s⁻¹'], ['Kinetic energy', 0.5 * mass * (acceleration * t) ** 2, 'J']],
      note: 'The gradient of a velocity–time graph is the acceleration, and the area beneath it is the displacement.'
    };
  }
  if (engine === 'energy') {
    const mass = clampAbove(number(value, 'mass'), 0.01);
    const gravity = clampAbove(number(value, 'gravity'), 0.01);
    const start = Math.max(number(value, 'height'), 0);
    const initial = number(value, 'velocity');
    const fall = start > 0 ? (-initial + Math.sqrt(initial * initial + 2 * gravity * start)) / gravity : 0;
    const span = start > 0 ? start : 1;
    const total = 0.5 * mass * initial * initial + mass * gravity * start;
    const dropAt = t => initial * t + gravity * t * t / 2;
    return {
      graph: { id: 'energy', title: 'Kinetic energy against distance fallen', x: `Distance fallen (0 to ${format(span)} m)`, y: 'Kinetic energy (J)', fn: u => 0.5 * mass * initial * initial + mass * gravity * (start > 0 ? span * u / 100 : 0) },
      sweep: { label: 'Time', unit: 's', from: 0, to: fall || 1, seconds: Math.min(6, Math.max(1.5, fall || 1)) },
      at: t => {
        const drop = start > 0 ? Math.min(dropAt(t), start) : 0;
        const speed = initial + gravity * (start > 0 ? Math.min(t, fall) : 0);
        return [['Time', t, 's'], ['Height above ground', start - drop, 'm'], ['Speed', speed, 'm s⁻¹'], ['Kinetic energy', 0.5 * mass * speed * speed, 'J'], ['Potential energy', mass * gravity * (start - drop), 'J'], ['Total energy', total, 'J']];
      },
      note: start > 0
        ? 'Total energy stays constant: every joule of gravitational potential energy lost becomes a joule of kinetic energy.'
        : 'With no height to fall through, the energies stay constant. Raise the height to watch the transfer.'
    };
  }
  if (engine === 'shm') {
    const mass = clampAbove(number(value, 'mass'), 0.01);
    const stiffness = clampAbove(number(value, 'k'), 0.01);
    const amplitude = number(value, 'amplitude');
    const omega = Math.sqrt(stiffness / mass);
    const period = 2 * Math.PI / omega;
    const span = 2 * period;
    return {
      graph: { id: 'shm', title: 'Displacement against time', x: `Time (0 to ${format(span)} s, two periods)`, y: 'Displacement (m)', fn: u => amplitude * Math.cos(omega * span * u / 100) },
      sweep: { label: 'Time', unit: 's', from: 0, to: span, seconds: Math.min(8, Math.max(2, span)) },
      at: t => {
        const displacement = amplitude * Math.cos(omega * t);
        const velocity = -amplitude * omega * Math.sin(omega * t);
        return [['Time', t, 's'], ['Displacement', displacement, 'm'], ['Velocity', velocity, 'm s⁻¹'], ['Acceleration', -omega * omega * displacement, 'm s⁻²'], ['Kinetic energy', 0.5 * mass * velocity * velocity, 'J'], ['Elastic potential energy', 0.5 * stiffness * displacement * displacement, 'J']];
      },
      note: 'The gradient of displacement–time is the velocity. Acceleration is always directed back towards equilibrium, and the total energy ½kA² is constant.'
    };
  }
  if (engine === 'coulomb') {
    const q1 = number(value, 'q1');
    const q2 = number(value, 'q2');
    const separation = clampAbove(number(value, 'r'), 0.01);
    const from = separation / 5;
    const to = separation * 2;
    return {
      graph: { id: 'field', title: 'Force against separation', x: `Separation (${format(from)} to ${format(to)} m)`, y: 'Force (N)', fn: u => K * q1 * q2 / (from + (to - from) * u / 100) ** 2 },
      sweep: { label: 'Separation', unit: 'm', from, to, seconds: 6 },
      at: r => [['Separation', r, 'm'], ['Force', K * q1 * q2 / (r * r), 'N'], ['Field strength', K * q1 / (r * r), 'N C⁻¹'], ['Potential', K * q1 / r, 'V'], ['Potential energy', K * q1 * q2 / r, 'J']],
      note: 'Force obeys an inverse-square law, so doubling the separation reduces the force to a quarter. A negative force is attractive.'
    };
  }
  if (engine === 'magnetic') {
    const flux = number(value, 'B');
    const charge = number(value, 'q');
    const speed = number(value, 'v');
    return {
      graph: { id: 'magnetic', title: 'Force against angle', x: 'Angle between velocity and field (0 to 180°)', y: 'Force (N)', fn: u => flux * charge * speed * Math.sin(1.8 * u * Math.PI / 180) },
      sweep: { label: 'Angle', unit: '°', from: 0, to: 180, seconds: 6 },
      at: angle => [['Angle', angle, '°'], ['Force', flux * charge * speed * Math.sin(angle * Math.PI / 180), 'N'], ['Perpendicular velocity', speed * Math.sin(angle * Math.PI / 180), 'm s⁻¹'], ['Parallel velocity', speed * Math.cos(angle * Math.PI / 180), 'm s⁻¹']],
      note: 'The force peaks at 90°, where the velocity is perpendicular to the field, and falls to zero when the two are parallel.'
    };
  }
  if (engine === 'gas') {
    const moles = number(value, 'n');
    const temperature = number(value, 'T');
    const volume = clampAbove(number(value, 'V'), 0.001);
    const from = volume / 5;
    const to = volume * 2;
    return {
      graph: { id: 'gas', title: 'Pressure against volume at constant temperature', x: `Volume (${format(from)} to ${format(to)} m³)`, y: 'Pressure (Pa)', fn: u => moles * R * temperature / (from + (to - from) * u / 100) },
      sweep: { label: 'Volume', unit: 'm³', from, to, seconds: 6 },
      at: v => [['Volume', v, 'm³'], ['Pressure', moles * R * temperature / v, 'Pa'], ['pV product', moles * R * temperature, 'J'], ['Particle number', moles * 6.02214076e23, 'particles']],
      note: 'At a fixed temperature pressure is inversely proportional to volume, so the product pV stays constant along the curve.'
    };
  }
  if (engine === 'photon') {
    const frequency = Math.max(number(value, 'f'), 1);
    return {
      graph: { id: 'photon', title: 'Photon energy against frequency', x: `Frequency (0 to ${format(frequency)} Hz)`, y: 'Energy (J)', fn: u => H * frequency * u / 100 },
      sweep: { label: 'Frequency', unit: 'Hz', from: 0, to: frequency, seconds: 5 },
      at: f => [['Frequency', f, 'Hz'], ['Photon energy', H * f, 'J'], ['Photon energy', H * f / 1.602176634e-19, 'eV'], ['Wavelength', f > 0 ? C / f : Infinity, 'm']],
      note: 'The graph is a straight line through the origin, and its gradient is the Planck constant h.'
    };
  }
  if (engine === 'decay') {
    const initial = number(value, 'N0');
    const halfLife = clampAbove(number(value, 'halfLife'), 0.01);
    const span = halfLife * 5;
    const decayConstant = Math.LN2 / halfLife;
    return {
      graph: { id: 'decay', title: 'Undecayed nuclei against time', x: `Time (0 to ${format(span)} s, five half-lives)`, y: 'Undecayed nuclei', fn: u => initial * 0.5 ** (span * u / 100 / halfLife) },
      sweep: { label: 'Time', unit: 's', from: 0, to: span, seconds: 7 },
      at: t => {
        const remaining = initial * 0.5 ** (t / halfLife);
        return [['Time', t, 's'], ['Half-lives elapsed', t / halfLife, ''], ['Undecayed nuclei', remaining, 'nuclei'], ['Decayed nuclei', initial - remaining, 'nuclei'], ['Activity', decayConstant * remaining, 'Bq']];
      },
      note: 'Decay is exponential: each half-life halves the survivors, and the decay constant is ln 2 divided by the half-life.'
    };
  }
  const velocity = Math.min(Math.abs(number(value, 'v')), C * 0.999);
  const span = C * 0.999;
  const gammaAt = speed => 1 / Math.sqrt(Math.max(1 - (speed / C) ** 2, 1e-9));
  return {
    graph: { id: 'relativity', title: 'Lorentz factor against speed', x: 'Speed (0 to 0.999c)', y: 'Lorentz factor γ', fn: u => gammaAt(span * u / 100) },
    sweep: { label: 'Speed', unit: 'm s⁻¹', from: 0, to: span, seconds: 7, start: velocity },
    at: speed => [['Speed', speed, 'm s⁻¹'], ['Fraction of c', speed / C, ''], ['Lorentz factor γ', gammaAt(speed), ''], ['Time dilation of 1 s', gammaAt(speed), 's'], ['Contraction of 1 m', 1 / gammaAt(speed), 'm']],
    note: 'γ stays near 1 for everyday speeds and rises without limit as the speed approaches c, which is why c cannot be reached.'
  };
}

function format(value) {
  if (!Number.isFinite(value)) return '—';
  const size = Math.abs(value);
  if (size !== 0 && (size < 1e-3 || size >= 1e6)) return value.toExponential(3);
  return Number(value.toPrecision(5)).toString();
}

const withUnit = (value, unit) => `${format(value)}${unit ? ` ${unit}` : ''}`;

export const detail = slug => {
  const sim = definitions[slug];
  if (!sim) return '<section class="page"><h1>Simulation not found</h1><p class="page-lead">That lab is not part of the Simulation Studio.</p><a class="button" href="/simulations" data-route>Back to the studio</a></section>';
  const initialValues = Object.fromEntries(sim.fields.map(([key, , , value]) => [key, value]));
  const model = modelFor(sim.engine, initialValues);
  const controls = sim.fields.map(([key, label, unit, value, min, max]) => `<div class="sim-control"><label for="sim-${key}">${escapeHTML(label)} <span class="sim-unit">(${escapeHTML(unit)})</span></label><div class="sim-control-row"><input type="range" name="${key}" id="sim-${key}" min="${min}" max="${max}" step="any" value="${value}"><input type="number" data-number="${key}" min="${min}" max="${max}" step="any" value="${value}" aria-label="${escapeHTML(label)} in ${escapeHTML(unit)}"></div><p class="sim-range muted">Accepted range: ${min} to ${max} ${escapeHTML(unit)}</p></div>`).join('');
  return `<section class="page simulation-page"><a class="back-link" href="/simulations" data-route>← Simulation Studio</a><p class="eyebrow">${escapeHTML(sim.topic)} · SL + HL</p><h1>${escapeHTML(sim.title)}</h1><p class="page-lead">Change a value and KINETIQ recalculates the answer, redraws the graph, and replays the motion from the same equation.</p>
  <div class="sim-grid">
    <section class="content-card"><h2>Controls</h2><form id="simForm" data-sim="${slug}" novalidate>${controls}<p class="sim-validation" data-sim-validation role="alert" hidden></p><div class="sim-buttons"><button class="button" type="button" data-play>Play</button><button class="outline" type="button" data-pause>Pause</button><button class="outline" type="button" data-sim-reset>Reset</button><button class="outline" type="button" data-csv>Export CSV</button></div></form><div class="sim-presets"><span class="tag">PRESETS</span>${Object.keys(presets).map(name => `<button class="text-button" type="button" data-preset="${name}">${name}</button>`).join('')}</div></section>
    <section class="content-card"><h2>Live answer</h2><div id="simOutput" aria-live="polite"></div></section>
    <section class="content-card"><h2>Playback state</h2><div id="simState" aria-live="off"></div></section>
  </div>
  <section class="lesson-section" data-simulation-graph><h2>Graph panel</h2>${renderGraph(model.graph)}<p class="sim-note" data-sim-note>${escapeHTML(model.note)}</p></section>
  <section class="lesson-section"><h2>Theory & exam connection</h2><p><b>Equation:</b> ${escapeHTML(sim.formula)}</p><p><b>Common mistake:</b> ${escapeHTML(sim.mistakes)}</p><p>IB tip: state your assumptions, work in SI units, and comment on the limits of the model.</p><a href="/lesson/${sim.lesson}" data-route>Open related lesson →</a></section></section>`;
};

export function bindStudio() {
  const form = document.querySelector('#simForm');
  if (!form) return undefined;
  const sim = definitions[form.dataset.sim];
  const output = document.querySelector('#simOutput');
  const statePanel = document.querySelector('#simState');
  const validation = document.querySelector('[data-sim-validation]');
  const noteHolder = document.querySelector('[data-sim-note]');
  const graphRoot = document.querySelector('[data-simulation-graph]');
  const defaults = Object.fromEntries(sim.fields.map(([key, , , value]) => [key, value]));
  const cleanupGraphs = bindGraphs();
  let model = modelFor(sim.engine, defaults);
  let playing = false;
  let frame = 0;
  let startedAt = 0;
  let offset = 0;

  const readValues = () => Object.fromEntries(sim.fields.map(([key]) => [key, Number(form.querySelector(`[data-number="${key}"]`).value)]));
  const problems = () => sim.fields.reduce((list, [key, label, unit, , min, max]) => {
    const value = Number(form.querySelector(`[data-number="${key}"]`).value);
    const empty = form.querySelector(`[data-number="${key}"]`).value.trim() === '';
    if (empty || !Number.isFinite(value)) list.push(`${label} needs a number.`);
    else if (value < min || value > max) list.push(`${label} must be between ${min} and ${max} ${unit}.`);
    return list;
  }, []);

  const showState = value => {
    const rows = model.at(value);
    statePanel.innerHTML = `<p class="sim-sweep">${escapeHTML(model.sweep.label)}: <b>${withUnit(value, model.sweep.unit)}</b></p><dl class="sim-readout">${rows.map(([label, quantity, unit]) => `<div><dt>${escapeHTML(label)}</dt><dd>${withUnit(quantity, unit)}</dd></div>`).join('')}</dl>`;
    const range = model.sweep.to - model.sweep.from;
    seekGraph(graphRoot, range === 0 ? 0 : (value - model.sweep.from) / range, `${model.sweep.label} ${withUnit(value, model.sweep.unit)} — the marker follows the plotted relationship.`);
  };

  const stopPlayback = () => { playing = false; cancelAnimationFrame(frame); frame = 0; };

  /** Advances the model's own independent variable so playback shows physics changing, not a redraw loop. */
  const step = now => {
    if (!playing) return;
    const seconds = Math.max(model.sweep.seconds, 0.5);
    const elapsed = (now - startedAt) / 1000 + offset;
    const progress = (elapsed / seconds) % 1;
    showState(model.sweep.from + (model.sweep.to - model.sweep.from) * progress);
    frame = requestAnimationFrame(step);
  };

  const update = ({ animateGraph = true } = {}) => {
    const issues = problems();
    validation.hidden = issues.length === 0;
    validation.textContent = issues.join(' ');
    sim.fields.forEach(([key]) => {
      const field = form.querySelector(`[data-number="${key}"]`);
      const value = Number(field.value);
      const [, , , , min, max] = sim.fields.find(item => item[0] === key);
      field.setAttribute('aria-invalid', String(!Number.isFinite(value) || value < min || value > max));
    });
    if (issues.length) { output.innerHTML = '<p class="muted">Correct the highlighted inputs to recalculate. The graph still shows the last valid model.</p>'; return null; }
    const input = readValues();
    const result = physics[sim.engine](input);
    if (!result) { output.innerHTML = '<p role="alert">That combination has no physical solution. Try another value.</p>'; return null; }
    model = modelFor(sim.engine, input);
    output.innerHTML = `<dl class="sim-readout">${Object.entries(result).map(([key, value]) => `<div><dt>${escapeHTML(labels[key] || key)}</dt><dd>${withUnit(value, units[key])}</dd></div>`).join('')}</dl>`;
    noteHolder.textContent = model.note;
    updateGraph(graphRoot, model.graph, { animate: animateGraph && !playing });
    showState(model.sweep.start ?? model.sweep.from);
    if (playing) { startedAt = performance.now(); offset = 0; }
    return { input, result };
  };

  const syncNumberToRange = key => {
    const range = form.querySelector(`[name="${key}"]`);
    const field = form.querySelector(`[data-number="${key}"]`);
    const value = Number(field.value);
    if (Number.isFinite(value) && value >= Number(range.min) && value <= Number(range.max)) range.value = String(value);
  };

  form.querySelectorAll('input[type=range]').forEach(range => range.addEventListener('input', () => {
    form.querySelector(`[data-number="${range.name}"]`).value = range.value;
    update();
  }));
  form.querySelectorAll('[data-number]').forEach(field => field.addEventListener('input', () => { syncNumberToRange(field.dataset.number); update(); }));
  form.querySelector('[data-play]').addEventListener('click', () => {
    if (playing || problems().length) return;
    playing = true;
    startedAt = performance.now();
    frame = requestAnimationFrame(step);
  });
  form.querySelector('[data-pause]').addEventListener('click', () => {
    if (!playing) return;
    offset = (performance.now() - startedAt) / 1000 + offset;
    stopPlayback();
  });
  form.querySelector('[data-sim-reset]').addEventListener('click', () => {
    stopPlayback();
    offset = 0;
    sim.fields.forEach(([key]) => { form.querySelector(`[name="${key}"]`).value = String(defaults[key]); form.querySelector(`[data-number="${key}"]`).value = String(defaults[key]); });
    update();
  });
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    Object.entries(presets[button.dataset.preset]).forEach(([key, value]) => {
      const range = form.querySelector(`[name="${key}"]`);
      if (!range) return;
      range.value = String(value);
      form.querySelector(`[data-number="${key}"]`).value = String(value);
    });
    offset = 0;
    update();
  }));
  form.querySelector('[data-csv]').addEventListener('click', () => {
    if (problems().length) return;
    const input = readValues();
    const rows = [['quantity', 'value', 'unit'], ...Object.entries(input).map(([key, value]) => [key, value, '']), ...Object.entries(physics[sim.engine](input) || {}).map(([key, value]) => [labels[key] || key, value, units[key] || ''])];
    const range = model.sweep.to - model.sweep.from;
    rows.push([], [model.sweep.label, model.sweep.unit, ...model.at(model.sweep.from).map(([label, , unit]) => `${label}${unit ? ` (${unit})` : ''}`)]);
    for (let index = 0; index <= 20; index += 1) {
      const value = model.sweep.from + range * index / 20;
      rows.push([value, model.sweep.unit, ...model.at(value).map(([, quantity]) => quantity)]);
    }
    const csv = rows.map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `${form.dataset.sim}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  update({ animateGraph: false });
  return () => { stopPlayback(); cleanupGraphs?.(); };
}
