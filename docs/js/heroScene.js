/**
 * The homepage hero visual. It is a real, running physics model — projectile motion,
 * simple harmonic motion, a travelling wave and radial field lines — that the visitor
 * can switch between and steer. It needs no AI key and no network access.
 */
const MODES = [
  { id: 'projectile', label: 'Projectile', control: 'Launch angle', unit: '°', min: 15, max: 80, value: 45 },
  { id: 'shm', label: 'Oscillation', control: 'Amplitude', unit: '%', min: 20, max: 100, value: 70 },
  { id: 'wave', label: 'Wave', control: 'Frequency', unit: 'Hz', min: 1, max: 8, value: 3 },
  { id: 'field', label: 'Field', control: 'Charge', unit: '', min: -5, max: 5, value: 3 }
];

const WIDTH = 420;
const HEIGHT = 300;
const GRAVITY = 22;

export function heroScene() {
  return `<div class="hero-scene" data-hero-scene>
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="hero-svg" role="img" aria-label="An animated physics model. Use the buttons to change which model is shown." data-hero-svg>
      <defs><radialGradient id="heroGlow" cx="50%" cy="50%"><stop offset="0%" stop-color="#b9e65d" stop-opacity=".55"/><stop offset="100%" stop-color="#b9e65d" stop-opacity="0"/></radialGradient></defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="none"/>
      <circle cx="${WIDTH / 2}" cy="${HEIGHT / 2}" r="130" fill="url(#heroGlow)"/>
      <g data-hero-static></g>
      <path class="hero-trace" data-hero-trace fill="none"/>
      <g data-hero-body></g>
    </svg>
    <div class="hero-scene__controls">
      <div class="hero-modes" role="group" aria-label="Choose a physics model">
        ${MODES.map((mode, index) => `<button type="button" class="chip ${index === 0 ? 'is-active' : ''}" data-hero-mode="${mode.id}">${mode.label}</button>`).join('')}
      </div>
      <label class="hero-slider"><span data-hero-label>Launch angle</span>
        <input type="range" data-hero-input min="15" max="80" step="1" value="45" aria-label="Launch angle">
        <output data-hero-value>45 °</output>
      </label>
      <button type="button" class="text-button" data-hero-toggle aria-pressed="true">Pause motion</button>
    </div>
  </div>`;
}

export function bindHeroScene() {
  const root = document.querySelector('[data-hero-scene]');
  if (!root) return undefined;
  const trace = root.querySelector('[data-hero-trace]');
  const body = root.querySelector('[data-hero-body]');
  const staticLayer = root.querySelector('[data-hero-static]');
  const input = root.querySelector('[data-hero-input]');
  const valueOut = root.querySelector('[data-hero-value]');
  const label = root.querySelector('[data-hero-label]');
  const toggle = root.querySelector('[data-hero-toggle]');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const controller = new AbortController();

  let mode = MODES[0];
  let setting = mode.value;
  let running = !reduced;
  let frame = 0;
  let elapsed = 0;
  let last = 0;

  const point = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;

  const paths = {
    projectile() {
      const radians = setting * Math.PI / 180;
      const speed = 62;
      const vx = speed * Math.cos(radians);
      const vy = speed * Math.sin(radians);
      const flight = 2 * vy / GRAVITY;
      const points = [];
      for (let step = 0; step <= 60; step += 1) {
        const t = flight * step / 60;
        points.push({ x: 40 + vx * t, y: HEIGHT - 40 - (vy * t - GRAVITY * t * t / 2) });
      }
      return { points, period: flight, ground: true };
    },
    shm() {
      const amplitude = setting / 100 * 110;
      const period = 2.4;
      const points = [];
      for (let step = 0; step <= 60; step += 1) {
        const t = period * step / 60;
        points.push({ x: WIDTH / 2 + amplitude * Math.cos(2 * Math.PI * t / period), y: HEIGHT / 2 });
      }
      return { points, period, spring: true };
    },
    wave() {
      const points = [];
      for (let step = 0; step <= 60; step += 1) {
        const x = 30 + step / 60 * (WIDTH - 60);
        points.push({ x, y: HEIGHT / 2 });
      }
      return { points, period: 1 / setting, travelling: true };
    },
    field() {
      return { points: [], period: 3, radial: true };
    }
  };

  const drawStatic = model => {
    if (model.ground) { staticLayer.innerHTML = `<line class="hero-axis" x1="20" y1="${HEIGHT - 40}" x2="${WIDTH - 20}" y2="${HEIGHT - 40}"/>`; return; }
    if (model.spring) { staticLayer.innerHTML = `<line class="hero-axis" x1="${WIDTH / 2 - 120}" y1="${HEIGHT / 2}" x2="${WIDTH / 2 + 120}" y2="${HEIGHT / 2}"/><line class="hero-axis hero-axis--dashed" x1="${WIDTH / 2}" y1="${HEIGHT / 2 - 60}" x2="${WIDTH / 2}" y2="${HEIGHT / 2 + 60}"/>`; return; }
    if (model.radial) {
      const lines = Array.from({ length: 12 }, (unused, index) => {
        const angle = index / 12 * Math.PI * 2;
        const inner = setting >= 0 ? 20 : 116;
        const outer = setting >= 0 ? 116 : 20;
        return `<line class="hero-field-line" x1="${WIDTH / 2 + inner * Math.cos(angle)}" y1="${HEIGHT / 2 + inner * Math.sin(angle)}" x2="${WIDTH / 2 + outer * Math.cos(angle)}" y2="${HEIGHT / 2 + outer * Math.sin(angle)}" marker-end="url(#heroArrow)"/>`;
      }).join('');
      staticLayer.innerHTML = `<defs><marker id="heroArrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4a8372"/></marker></defs>${lines}`;
      return;
    }
    staticLayer.innerHTML = `<line class="hero-axis" x1="20" y1="${HEIGHT / 2}" x2="${WIDTH - 20}" y2="${HEIGHT / 2}"/>`;
  };

  const render = () => {
    const model = paths[mode.id]();
    drawStatic(model);

    if (model.radial) {
      const magnitude = Math.abs(setting);
      const sign = setting >= 0 ? '+' : '−';
      trace.setAttribute('d', '');
      body.innerHTML = `<circle class="hero-charge ${setting >= 0 ? 'is-positive' : 'is-negative'}" cx="${WIDTH / 2}" cy="${HEIGHT / 2}" r="${14 + magnitude * 2.4}"/><text class="hero-charge-label" x="${WIDTH / 2}" y="${HEIGHT / 2 + 6}" text-anchor="middle">${sign}${magnitude}</text>`;
      return;
    }

    if (model.travelling) {
      const points = [];
      for (let step = 0; step <= 60; step += 1) {
        const x = 30 + step / 60 * (WIDTH - 60);
        const phase = (x - 30) / 70 - elapsed * setting;
        points.push({ x, y: HEIGHT / 2 - Math.sin(phase * Math.PI) * 62 });
      }
      trace.setAttribute('d', `M${points.map(item => point(item.x, item.y)).join(' L')}`);
      const lead = points[Math.floor(points.length * 0.5)];
      body.innerHTML = `<circle class="hero-body" cx="${lead.x.toFixed(1)}" cy="${lead.y.toFixed(1)}" r="7"/>`;
      return;
    }

    trace.setAttribute('d', `M${model.points.map(item => point(item.x, item.y)).join(' L')}`);
    const progress = model.period ? (elapsed % model.period) / model.period : 0;
    const index = Math.min(model.points.length - 1, Math.floor(progress * (model.points.length - 1)));
    const spot = model.points[index] || model.points[0];
    if (!spot) { body.innerHTML = ''; return; }
    const spring = model.spring ? `<line class="hero-spring" x1="${WIDTH / 2 - 120}" y1="${HEIGHT / 2}" x2="${spot.x.toFixed(1)}" y2="${spot.y.toFixed(1)}"/>` : '';
    body.innerHTML = `${spring}<circle class="hero-body" cx="${spot.x.toFixed(1)}" cy="${spot.y.toFixed(1)}" r="9"/>`;
  };

  const step = now => {
    if (!running) return;
    if (last) elapsed += Math.min((now - last) / 1000, 0.05);
    last = now;
    render();
    frame = requestAnimationFrame(step);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = 0;
    toggle.textContent = 'Pause motion';
    toggle.setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(step);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
    toggle.textContent = 'Play motion';
    toggle.setAttribute('aria-pressed', 'false');
  };

  root.querySelectorAll('[data-hero-mode]').forEach(button => button.addEventListener('click', () => {
    mode = MODES.find(item => item.id === button.dataset.heroMode) || MODES[0];
    setting = mode.value;
    elapsed = 0;
    root.querySelectorAll('[data-hero-mode]').forEach(other => other.classList.toggle('is-active', other === button));
    input.min = String(mode.min);
    input.max = String(mode.max);
    input.value = String(mode.value);
    input.setAttribute('aria-label', mode.control);
    label.textContent = mode.control;
    valueOut.textContent = `${mode.value} ${mode.unit}`.trim();
    render();
  }, { signal: controller.signal }));

  input.addEventListener('input', () => {
    setting = Number(input.value);
    valueOut.textContent = `${setting} ${mode.unit}`.trim();
    render();
  }, { signal: controller.signal });

  toggle.addEventListener('click', () => (running ? stop() : start()), { signal: controller.signal });

  // A page opened in a background tab gets no animation frames, which would leave the
  // loop stalled once the visitor switches to it. Restart the chain when it becomes visible.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !running) return;
    cancelAnimationFrame(frame);
    last = 0;
    frame = requestAnimationFrame(step);
  }, { signal: controller.signal });

  render();
  if (reduced) { running = false; toggle.textContent = 'Play motion'; toggle.setAttribute('aria-pressed', 'false'); }
  else frame = requestAnimationFrame(step);

  return () => { running = false; cancelAnimationFrame(frame); controller.abort(); };
}
