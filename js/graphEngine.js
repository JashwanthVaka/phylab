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
        <button type="button" data-graph-action="reset" aria-label="Reset graph view">Reset</button>
        <button type="button" data-graph-action="dark" aria-label="Toggle high contrast graph">◐</button>
        <button type="button" data-graph-action="svg" aria-label="Export graph as SVG">SVG</button>
        <button type="button" data-graph-action="png" aria-label="Export graph as PNG">PNG</button>
      </div>
    </div>
    <svg class="physics-graph" viewBox="0 0 330 205" role="img" aria-label="Interactive ${escapeHTML(config.title)} graph" tabindex="0">
      <line x1="35" y1="15" x2="35" y2="175"/><line x1="35" y1="175" x2="310" y2="175"/>
      <polyline class="graph-line" points="${graphPoints(config)}"/>
      <text x="150" y="199">${escapeHTML(config.x)}</text><text x="8" y="18">${escapeHTML(config.y)}</text>
    </svg>
    <p class="muted" data-graph-status>Use the buttons, mouse wheel, or drag the graph to inspect the relationship.</p>
  </article>`;
}

export function bindGraphs() {
  const controllers = [];
  document.querySelectorAll('[data-graph-id]').forEach(card => {
    if (card.dataset.graphBound) return;
    const config = graphRegistry.get(card.dataset.graphId);
    if (!config || typeof config.fn !== 'function') return;
    card.dataset.graphBound = 'true';
    const controller = new AbortController();
    controllers.push(controller);
    let scale = 1;
    let pan = 0;
    let dragStart = null;
    const svg = card.querySelector('svg');
    const status = card.querySelector('[data-graph-status]');
    const update = () => {
      card.querySelector('.graph-line').setAttribute('points', graphPoints(config, scale, pan));
      status.textContent = `View: ${Math.round(100 * scale)}% horizontal range. Use zoom, drag, reset, contrast, or export controls.`;
    };
    const reset = () => { scale = 1; pan = 0; update(); };
    card.querySelectorAll('[data-graph-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.graphAction;
      if (action === 'zoom-in') scale = Math.max(0.2, scale * 0.8);
      if (action === 'zoom-out') scale = Math.min(5, scale * 1.25);
      if (action === 'reset') reset();
      if (action === 'dark') card.classList.toggle('graph-dark');
      if (action === 'svg' || action === 'png') exportGraph(card, action);
      if (!['svg', 'png', 'dark', 'reset'].includes(action)) update();
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
    }, { signal: controller.signal });
  });
  return () => controllers.forEach(controller => controller.abort());
}
