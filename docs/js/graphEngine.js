import { escapeHTML, slugify } from './utils.js';

const configs = [
  { id: 'motion', title: 'Position–time', x: 'Time (s)', y: 'Position (m)', fn: x => 0.12 * x * x },
  { id: 'wave', title: 'Wave motion', x: 'Position', y: 'Displacement', fn: x => Math.sin(x * 0.17) * 3 },
  { id: 'shm', title: 'Simple harmonic motion', x: 'Time', y: 'Displacement', fn: x => Math.sin(x * 0.24) * 3 },
  { id: 'field', title: 'Electric potential', x: 'Distance', y: 'Potential', fn: x => 18 / (x + 4) },
  { id: 'thermal', title: 'Thermal graph', x: 'Energy added', y: 'Temperature', fn: x => x < 28 ? x * 0.25 : x < 53 ? 7 : x < 78 ? 7 + (x - 53) * 0.25 : 13.25 },
  { id: 'decay', title: 'Nuclear decay', x: 'Time', y: 'Undecayed nuclei', fn: x => 18 * Math.exp(-x / 26) }
];

const graphRegistry = new Map();
let graphSequence = 0;

export function graphFor(lesson) {
  const topic = slugify(`${lesson.title} ${lesson.topicLabel}`);
  return configs.find(item =>
    (item.id === 'shm' && /harmonic/.test(topic)) ||
    (item.id === 'wave' && /wave/.test(topic)) ||
    (item.id === 'field' && /electric|field/.test(topic)) ||
    (item.id === 'thermal' && /thermal|gas|thermo/.test(topic)) ||
    (item.id === 'decay' && /nuclear/.test(topic)) ||
    (item.id === 'motion' && /kinematic|motion|force/.test(topic)) ||
    item.id === 'motion'
  );
}

function graphPoints(config, scale = 1, pan = 0) {
  const values = [];
  for (let index = 0; index <= 100; index += 2) {
    const x = index * scale + pan;
    const y = Number(config.fn(x));
    if (Number.isFinite(y)) values.push({ x: index, y });
  }
  if (!values.length) return '';
  const minimum = Math.min(...values.map(point => point.y));
  const maximum = Math.max(...values.map(point => point.y));
  const span = Math.max(maximum - minimum, 1);
  return values.map(point => {
    const svgX = 35 + point.x * 2.7;
    const svgY = 170 - ((point.y - minimum) / span) * 140;
    return `${svgX.toFixed(2)},${svgY.toFixed(2)}`;
  }).join(' ');
}

function registerGraph(config) {
  const id = `graph-${++graphSequence}`;
  graphRegistry.set(id, config);
  return id;
}

function exportGraph(card, type) {
  const svg = card.querySelector('svg');
  const serial = new XMLSerializer().serializeToString(svg);
  const download = (href, extension) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = `${card.dataset.graphName || 'physics-graph'}.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  };
  if (type === 'svg') {
    download(URL.createObjectURL(new Blob([serial], { type: 'image/svg+xml;charset=utf-8' })), 'svg');
    return;
  }
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1320;
    canvas.height = 820;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f7f6ef';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    download(canvas.toDataURL('image/png'), 'png');
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serial)}`;
}

export function renderGraph(config) {
  const graphId = registerGraph(config);
  return `<article class="graph-card" data-graph-id="${graphId}" data-graph-name="${escapeHTML(config.id || 'physics-graph')}">
    <div class="graph-toolbar">
      <b>${escapeHTML(config.title)}</b>
      <div>
        <button type="button" data-graph-action="zoom-in" aria-label="Zoom in">＋</button>
        <button type="button" data-graph-action="zoom-out" aria-label="Zoom out">－</button>
        <button type="button" data-graph-action="play" aria-label="Play graph animation">Play</button>
        <button type="button" data-graph-action="pause" aria-label="Pause graph animation">Pause</button>
        <button type="button" data-graph-action="replay" aria-label="Replay graph animation">Replay</button>
        <button type="button" data-graph-action="reset" aria-label="Reset graph view">Reset</button>
        <button type="button" data-graph-action="dark" aria-label="Toggle high contrast graph">◐</button>
        <button type="button" data-graph-action="svg" aria-label="Export graph as SVG">SVG</button>
        <button type="button" data-graph-action="png" aria-label="Export graph as PNG">PNG</button>
      </div>
    </div>
    <svg class="physics-graph" viewBox="0 0 330 205" role="img" aria-label="Interactive ${escapeHTML(config.title)} graph" tabindex="0">
      <line x1="35" y1="15" x2="35" y2="175"/><line x1="35" y1="175" x2="310" y2="175"/>
      <polyline class="graph-line" points="${graphPoints(config)}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="graph-marker" r="4" fill="#e4b516" stroke="#17392f" stroke-width="1.5" aria-hidden="true"/>
      <text x="150" y="199">${escapeHTML(config.x)}</text><text x="8" y="18">${escapeHTML(config.y)}</text>
    </svg>
    <p class="muted" data-graph-status>Animating the relationship. Use playback controls, mouse wheel, or drag to inspect it.</p>
  </article>`;
}

const graphCard = target => (target?.matches?.('[data-graph-id]') ? target : target?.querySelector?.('[data-graph-id]'));

/** Recalculates a mounted graph without re-rendering its surrounding lesson or simulation page. */
export function updateGraph(target, config, { animate = true } = {}) {
  const card = graphCard(target);
  if (!card || typeof config?.fn !== 'function') return;
  graphRegistry.set(card.dataset.graphId, config);
  card.dispatchEvent(new CustomEvent('phylab:graph-update', { detail: { config, animate } }));
}

/** Moves the graph marker to a fraction of the plotted range so a caller can drive it from a physical model. */
export function seekGraph(target, progress, label) {
  const card = graphCard(target);
  if (!card || !Number.isFinite(progress)) return;
  card.dispatchEvent(new CustomEvent('phylab:graph-seek', { detail: { progress, label } }));
}

export function bindGraphs() {
  const controllers = [];
  const animationFrames = new Set();
  document.querySelectorAll('[data-graph-id]').forEach(card => {
    if (card.dataset.graphBound) return;
    let config = graphRegistry.get(card.dataset.graphId);
    if (!config || typeof config.fn !== 'function') return;
    card.dataset.graphBound = 'true';
    const controller = new AbortController();
    controllers.push(controller);
    let scale = 1;
    let pan = 0;
    let dragStart = null;
    let animationFrame = 0;
    let animationElapsed = 0;
    let animationStartedAt = 0;
    let isAnimating = false;
    const svg = card.querySelector('svg');
    const line = card.querySelector('.graph-line');
    const marker = card.querySelector('.graph-marker');
    const status = card.querySelector('[data-graph-status]');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = 1650;
    const renderAnimation = progress => {
      let length = 0;
      try { length = line.getTotalLength(); } catch { return; }
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(Math.max(0, length * (1 - progress)));
      const point = line.getPointAtLength(Math.max(0, Math.min(length, length * progress)));
      marker.setAttribute('cx', point.x);
      marker.setAttribute('cy', point.y);
      marker.style.opacity = progress ? '1' : '0';
    };
    const stop = () => {
      cancelAnimationFrame(animationFrame);
      animationFrames.delete(animationFrame);
      isAnimating = false;
    };
    const pause = () => {
      if (!isAnimating) return;
      animationElapsed = Math.min(duration, performance.now() - animationStartedAt);
      stop();
      status.textContent = 'Animation paused. Press Play to continue or Replay to start again.';
    };
    /** Positions the marker at a fraction of the plotted points so an external model can drive it. */
    const seek = (progress, label) => {
      stop();
      const pairs = (line.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).map(pair => pair.split(',').map(Number));
      if (pairs.length < 2) return;
      line.style.strokeDasharray = 'none';
      line.style.strokeDashoffset = '0';
      const position = Math.max(0, Math.min(1, progress)) * (pairs.length - 1);
      const index = Math.floor(position);
      const next = Math.min(pairs.length - 1, index + 1);
      const ratio = position - index;
      marker.setAttribute('cx', pairs[index][0] + (pairs[next][0] - pairs[index][0]) * ratio);
      marker.setAttribute('cy', pairs[index][1] + (pairs[next][1] - pairs[index][1]) * ratio);
      marker.style.opacity = '1';
      if (label) status.textContent = label;
    };
    const play = (restart = false) => {
      if (reducedMotion) { renderAnimation(1); status.textContent = 'Animation is shown as a complete graph because reduced motion is enabled.'; return; }
      if (restart) { stop(); animationElapsed = 0; }
      if (isAnimating) return;
      isAnimating = true;
      animationStartedAt = performance.now() - animationElapsed;
      const frame = now => {
        animationElapsed = Math.min(duration, now - animationStartedAt);
        const progress = animationElapsed / duration;
        renderAnimation(progress);
        if (progress < 1 && isAnimating) { animationFrame = requestAnimationFrame(frame); animationFrames.add(animationFrame); return; }
        isAnimating = false;
        status.textContent = 'Animation complete. Replay, zoom, drag, or export this graph.';
      };
      animationFrame = requestAnimationFrame(frame);
      animationFrames.add(animationFrame);
    };
    const redraw = () => {
      stop();
      line.setAttribute('points', graphPoints(config, scale, pan));
      line.style.strokeDasharray = 'none';
      line.style.strokeDashoffset = '0';
      animationElapsed = 0;
    };
    const update = () => {
      redraw();
      status.textContent = `View: ${Math.round(100 * scale)}% horizontal range. Replaying the animated graph.`;
      play(true);
    };
    const reset = () => { scale = 1; pan = 0; update(); };
    card.addEventListener('phylab:graph-update', event => {
      config = event.detail.config;
      scale = 1;
      pan = 0;
      if (event.detail.animate === false) redraw();
      else update();
    }, { signal: controller.signal });
    card.addEventListener('phylab:graph-seek', event => seek(event.detail.progress, event.detail.label), { signal: controller.signal });
    card.querySelectorAll('[data-graph-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.graphAction;
      if (action === 'zoom-in') scale = Math.max(0.2, scale * 0.8);
      if (action === 'zoom-out') scale = Math.min(5, scale * 1.25);
      if (action === 'play') play();
      if (action === 'pause') pause();
      if (action === 'replay') play(true);
      if (action === 'reset') reset();
      if (action === 'dark') card.classList.toggle('graph-dark');
      if (action === 'svg' || action === 'png') exportGraph(card, action);
      if (!['svg', 'png', 'dark', 'reset', 'play', 'pause', 'replay'].includes(action)) update();
    }, { signal: controller.signal }));
    svg.addEventListener('wheel', event => {
      event.preventDefault();
      scale = Math.max(0.2, Math.min(5, scale * (event.deltaY < 0 ? 0.85 : 1.18)));
      update();
    }, { passive: false, signal: controller.signal });
    svg.addEventListener('pointerdown', event => { dragStart = { x: event.clientX, pan }; svg.setPointerCapture(event.pointerId); }, { signal: controller.signal });
    svg.addEventListener('pointermove', event => {
      if (!dragStart) return;
      pan = dragStart.pan - (event.clientX - dragStart.x) * scale * 0.35;
      update();
    }, { signal: controller.signal });
    svg.addEventListener('pointerup', () => { dragStart = null; }, { signal: controller.signal });
    svg.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { pan -= 8 * scale; update(); }
      if (event.key === 'ArrowRight') { pan += 8 * scale; update(); }
      if (event.key === '+' || event.key === '=') { scale = Math.max(0.2, scale * 0.8); update(); }
      if (event.key === '-') { scale = Math.min(5, scale * 1.25); update(); }
      if (event.key === 'Home') { event.preventDefault(); reset(); }
      if (event.key === ' ') { event.preventDefault(); isAnimating ? pause() : play(); }
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); play(true); }
    }, { signal: controller.signal });
    play(true);
  });
  return () => { controllers.forEach(controller => controller.abort()); animationFrames.forEach(frame => cancelAnimationFrame(frame)); };
}
