import { escapeHTML } from './utils.js';
import {
  parseTable, transformRows, bestFit, gradientUncertainty,
  propagateProduct, propagateSum, formatWithUncertainty, agreement, TRANSFORMS
} from './uncertaintyEngine.js';

const SAMPLE = `length  period\n0.200   0.897\n0.400   1.269\n0.600   1.554\n0.800   1.794\n1.000   2.006`;

const WIDTH = 640;
const HEIGHT = 400;
const PAD = { left: 78, right: 24, top: 24, bottom: 62 };

/** Chooses a tick step that lands on 1, 2 or 5 times a power of ten. */
function ticks(min, max, target = 6) {
  const span = max - min || 1;
  const rough = span / target;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map(m => m * power).find(candidate => candidate >= rough) || power * 10;
  const first = Math.ceil(min / step) * step;
  const values = [];
  for (let value = first; value <= max + step * 0.001; value += step) values.push(Number(value.toPrecision(12)));
  return values;
}

const short = value => {
  if (!Number.isFinite(value)) return '—';
  const size = Math.abs(value);
  if (size !== 0 && (size < 1e-3 || size >= 1e5)) return value.toExponential(1);
  return String(Number(value.toPrecision(4)));
};

/** Draws the scatter, its error bars, the best fit and the two extreme lines. */
function plot(points, fit, uncertainty, labels) {
  if (!points.length) return '<p class="muted">Add at least two rows of data to see a graph.</p>';
  const xs = points.flatMap(p => [p.x - p.dx, p.x + p.dx]);
  const ys = points.flatMap(p => [p.y - p.dy, p.y + p.dy]);
  let minX = Math.min(...xs); let maxX = Math.max(...xs);
  let minY = Math.min(...ys); let maxY = Math.max(...ys);
  // Always show the origin when it is close, because "through the origin" is a real conclusion.
  if (minX > 0 && minX < (maxX - minX)) minX = 0;
  if (minY > 0 && minY < (maxY - minY)) minY = 0;
  const padX = (maxX - minX) * 0.06 || 1;
  const padY = (maxY - minY) * 0.08 || 1;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  const sx = x => PAD.left + ((x - minX) / (maxX - minX)) * (WIDTH - PAD.left - PAD.right);
  const sy = y => HEIGHT - PAD.bottom - ((y - minY) / (maxY - minY)) * (HEIGHT - PAD.top - PAD.bottom);

  const line = (gradient, intercept, className) => {
    const y1 = gradient * minX + intercept;
    const y2 = gradient * maxX + intercept;
    return `<line class="${className}" x1="${sx(minX).toFixed(1)}" y1="${sy(y1).toFixed(1)}" x2="${sx(maxX).toFixed(1)}" y2="${sy(y2).toFixed(1)}"/>`;
  };

  const marks = points.map(p => {
    const bars = [];
    if (p.dy) bars.push(`<line class="dl-bar" x1="${sx(p.x).toFixed(1)}" y1="${sy(p.y - p.dy).toFixed(1)}" x2="${sx(p.x).toFixed(1)}" y2="${sy(p.y + p.dy).toFixed(1)}"/>`);
    if (p.dx) bars.push(`<line class="dl-bar" x1="${sx(p.x - p.dx).toFixed(1)}" y1="${sy(p.y).toFixed(1)}" x2="${sx(p.x + p.dx).toFixed(1)}" y2="${sy(p.y).toFixed(1)}"/>`);
    return `${bars.join('')}<circle class="dl-point" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4"/>`;
  }).join('');

  const xTicks = ticks(minX, maxX).map(v => `<line class="dl-tick" x1="${sx(v).toFixed(1)}" y1="${HEIGHT - PAD.bottom}" x2="${sx(v).toFixed(1)}" y2="${HEIGHT - PAD.bottom + 5}"/><text class="dl-tick-label" x="${sx(v).toFixed(1)}" y="${HEIGHT - PAD.bottom + 19}" text-anchor="middle">${short(v)}</text>`).join('');
  const yTicks = ticks(minY, maxY).map(v => `<line class="dl-tick" x1="${PAD.left - 5}" y1="${sy(v).toFixed(1)}" x2="${PAD.left}" y2="${sy(v).toFixed(1)}"/><text class="dl-tick-label" x="${PAD.left - 9}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end">${short(v)}</text>`).join('');

  return `<svg class="dl-plot" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Scatter plot of ${escapeHTML(labels.y)} against ${escapeHTML(labels.x)} with a line of best fit">
    <line class="dl-axis" x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${HEIGHT - PAD.bottom}"/>
    <line class="dl-axis" x1="${PAD.left}" y1="${HEIGHT - PAD.bottom}" x2="${WIDTH - PAD.right}" y2="${HEIGHT - PAD.bottom}"/>
    ${xTicks}${yTicks}
    ${uncertainty ? line(uncertainty.steepest, fit.intercept, 'dl-extreme') + line(uncertainty.shallowest, fit.intercept, 'dl-extreme') : ''}
    ${fit ? line(fit.gradient, fit.intercept, 'dl-fit') : ''}
    ${marks}
    <text class="dl-axis-label" x="${(PAD.left + WIDTH - PAD.right) / 2}" y="${HEIGHT - 12}" text-anchor="middle">${escapeHTML(labels.x)}</text>
    <text class="dl-axis-label" transform="rotate(-90 18 ${(HEIGHT) / 2})" x="18" y="${HEIGHT / 2}" text-anchor="middle">${escapeHTML(labels.y)}</text>
  </svg>`;
}

export function dataLabPage() {
  return `<section class="page datalab-page">
    <p class="eyebrow">DATA LAB</p>
    <h1>Turn measurements into a result.</h1>
    <p class="page-lead">Paste your practical data, choose how to linearise it, and KINETIQ plots it with error bars, fits a line, and works out the gradient with its uncertainty using the steepest and shallowest line method. This is the skill Paper 1B and the internal assessment are built on.</p>

    <div class="dl-grid">
      <section class="content-card">
        <h2>Your data</h2>
        <label for="dlData">Paste columns: x, y, and optionally the uncertainty in x and in y</label>
        <textarea id="dlData" rows="9" spellcheck="false" aria-describedby="dlDataHelp" placeholder="0.200&#10;0.400&#10;0.600"></textarea>
        <p class="dl-example-row">
          <button type="button" class="text-button" data-load-example>Load a worked example →</button>
          <span class="muted">A pendulum experiment, so you can see what a finished analysis looks like.</span>
        </p>
        <p id="dlDataHelp" class="muted">One row per line, separated by spaces, tabs or commas. A first line of words is treated as a header. Example: <code>0.20 0.897 0.001 0.01</code></p>

        <label for="dlTransform">Plot</label>
        <select id="dlTransform">${Object.entries(TRANSFORMS).map(([key, value]) => `<option value="${key}">${escapeHTML(value.label)}</option>`).join('')}</select>

        <div class="dl-fields">
          <label>x-axis label <input id="dlXLabel" placeholder="e.g. length / m"></label>
          <label>y-axis label <input id="dlYLabel" placeholder="e.g. period / s"></label>
        </div>
        <div class="dl-fields">
          <label>Gradient should equal <input id="dlRelation" placeholder="e.g. 4π²/g" aria-label="What the gradient represents"></label>
          <label>Accepted value <input id="dlAccepted" inputmode="decimal" placeholder="e.g. 9.81"></label>
        </div>
        <p class="muted">Enter an accepted value to have KINETIQ judge whether your result agrees within its uncertainty.</p>
      </section>

      <section class="content-card">
        <h2>Result</h2>
        <div id="dlResult" aria-live="polite"></div>
      </section>
    </div>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">THE GRAPH</p><h2>Plot with error bars and fit</h2></div>
      <div id="dlPlot" class="dl-plot-holder"></div>
      <p class="dl-legend"><span class="dl-key dl-key--fit"></span> line of best fit <span class="dl-key dl-key--extreme"></span> steepest and shallowest lines through the error bars</p>
      <p class="muted" id="dlNote"></p>
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">COMBINING UNCERTAINTIES</p><h2>Propagation calculator</h2></div>
      <p class="page-lead">For a product or quotient, fractional uncertainties add. For a sum or difference, absolute uncertainties add. Raising to a power multiplies the fractional uncertainty by that power.</p>
      <div class="dl-prop">
        <div class="dl-prop-rows" id="dlPropRows"></div>
        <div class="dl-prop-actions">
          <button type="button" class="outline" id="dlAddTerm">Add a quantity</button>
          <label>Combining by <select id="dlPropMode"><option value="product">multiplying or dividing</option><option value="sum">adding or subtracting</option></select></label>
        </div>
        <div id="dlPropResult" aria-live="polite"></div>
      </div>
    </section>

    <section class="lesson-section">
      <div class="section-title"><p class="eyebrow">HOW TO WRITE IT UP</p><h2>What the examiner wants</h2></div>
      <div class="card-grid">
        <article class="content-card"><h3>Quote uncertainty to one significant figure</h3><p>Then round the value to the same decimal place. 9.7234 ± 0.4123 becomes 9.7 ± 0.4.</p></article>
        <article class="content-card"><h3>Say what the gradient means</h3><p>A gradient is not a result on its own. State the relationship it represents and derive the quantity you actually wanted.</p></article>
        <article class="content-card"><h3>Judge agreement, don't just compare</h3><p>If the accepted value lies inside your uncertainty range, say the results agree. If it lies outside, that indicates a systematic error.</p><a class="text-button" href="/toolkit" data-route>Data-analysis method →</a></article>
      </div>
    </section>
  </section>`;
}

export function bindDataLab() {
  const page = document.querySelector('.datalab-page');
  if (!page) return undefined;
  const controller = new AbortController();
  const dataInput = page.querySelector('#dlData');
  const transformSelect = page.querySelector('#dlTransform');
  const xLabel = page.querySelector('#dlXLabel');
  const yLabel = page.querySelector('#dlYLabel');
  const relation = page.querySelector('#dlRelation');
  const accepted = page.querySelector('#dlAccepted');
  const result = page.querySelector('#dlResult');
  const plotHolder = page.querySelector('#dlPlot');
  const note = page.querySelector('#dlNote');

  /**
   * Fills the lab with a complete pendulum experiment, labels and all, so a
   * student can see a finished analysis before trusting it with their own
   * numbers. Delegated from the page, because the button also appears inside
   * the result panel, which is re-rendered on every keystroke.
   */
  const loadExample = () => {
    dataInput.value = SAMPLE;
    xLabel.value = "length / m";
    yLabel.value = "period / s";
    relation.value = "4\u03C0\u00B2/g";
    accepted.value = "9.81";
    // T = 2π√(L/g), so T² against L is the straight line, with gradient 4π²/g.
    if (transformSelect.querySelector(`option[value="y2-x"]`)) transformSelect.value = "y2-x";
    render();
    dataInput.focus();
  };
  page.addEventListener("click", event => {
    if (event.target.closest("[data-load-example]")) { event.preventDefault(); loadExample(); }
  }, { signal: controller.signal });

  const render = () => {
    const { rows, problems } = parseTable(dataInput.value);
    if (rows.length < 2) {
      // An empty lab used to arrive pre-filled with a pendulum experiment, so
      // the first thing a student saw was a finished analysis that looked like
      // their own result. It now starts blank and says what it is waiting for.
      const untouched = !dataInput.value.trim();
      result.innerHTML = untouched
        ? `<div class="empty-state dl-empty">
             <h3>Nothing plotted yet</h3>
             <p>Paste two or more rows of measurements on the left. KINETIQ will plot them with error bars, fit a line, and work out the gradient with its uncertainty.</p>
             <p class="muted">No data of your own yet? <button type="button" class="text-button" data-load-example>Load a worked example</button>.</p>
           </div>`
        : `<p class="dl-warn">Enter at least two rows of data.${problems.length ? ` ${escapeHTML(problems[0])}` : ''}</p>`;
      plotHolder.innerHTML = '';
      note.textContent = '';
      return;
    }
    const key = transformSelect.value;
    const { points, dropped, transform } = transformRows(rows, key);
    const fit = bestFit(points);
    if (!fit) {
      result.innerHTML = '<p class="dl-warn">These points do not define a line. Check for repeated x values.</p>';
      plotHolder.innerHTML = '';
      return;
    }
    const uncertainty = gradientUncertainty(points, fit);
    const gradientText = uncertainty
      ? formatWithUncertainty(fit.gradient, uncertainty.absolute)
      : { value: short(fit.gradient), uncertainty: null };

    const axisX = transform.xLabel(xLabel.value || 'x');
    const axisY = transform.yLabel(yLabel.value || 'y');

    const acceptedValue = Number(accepted.value);
    // If the gradient represents a relationship the student named, they still read the
    // derived quantity themselves; agreement is judged on the gradient as measured.
    const verdict = Number.isFinite(acceptedValue) && accepted.value.trim()
      ? agreement(fit.gradient, uncertainty?.absolute, acceptedValue)
      : null;

    result.innerHTML = `
      <dl class="dl-readout">
        <div><dt>Gradient</dt><dd>${gradientText.uncertainty ? `${gradientText.value} ± ${gradientText.uncertainty}` : gradientText.value}</dd></div>
        ${uncertainty ? `<div><dt>Gradient uncertainty</dt><dd>± ${short(uncertainty.percentage)} %</dd></div>` : ''}
        <div><dt>Intercept</dt><dd>${short(fit.intercept)}</dd></div>
        <div><dt>r²</dt><dd>${fit.rSquared.toFixed(4)}</dd></div>
        <div><dt>Points used</dt><dd>${points.length}${dropped.length ? ` (${dropped.length} dropped)` : ''}</dd></div>
      </dl>
      ${relation.value.trim() ? `<p class="dl-meaning">Gradient represents <b>${escapeHTML(relation.value)}</b>, so rearrange to get the quantity you want.</p>` : ''}
      ${Math.abs(fit.intercept) < Math.abs(fit.gradient) * 0.02
        ? '<p class="dl-good">The intercept is close to zero, so the relationship looks proportional, not merely linear.</p>'
        : '<p class="muted">The intercept is not zero, so describe the relationship as linear rather than proportional.</p>'}
      ${verdict ? `<p class="${verdict.within ? 'dl-good' : 'dl-warn'}">${escapeHTML(verdict.verdict)} Percentage difference ${short(verdict.percentageError)} %.</p>` : ''}
      ${problems.length ? `<p class="dl-warn">${escapeHTML(problems.join(' '))}</p>` : ''}
      ${!points.some(p => p.dy || p.dx) ? '<p class="muted">No uncertainties supplied, so no error bars or gradient uncertainty. Add a third and fourth column to include them.</p>' : ''}`;

    plotHolder.innerHTML = plot(points, fit, uncertainty, { x: axisX, y: axisY });
    note.textContent = transform.note;
  };

  // --- propagation calculator ---
  const propRows = page.querySelector('#dlPropRows');
  const propResult = page.querySelector('#dlPropResult');
  const propMode = page.querySelector('#dlPropMode');
  let termCount = 0;

  const addTerm = (name = '', value = '', uncertainty = '', power = 1) => {
    termCount += 1;
    const row = document.createElement('div');
    row.className = 'dl-prop-row';
    row.innerHTML = `<label>Name <input data-prop="name" value="${escapeHTML(name)}" placeholder="e.g. length"></label>
      <label>Value <input data-prop="value" inputmode="decimal" value="${escapeHTML(String(value))}"></label>
      <label>± <input data-prop="uncertainty" inputmode="decimal" value="${escapeHTML(String(uncertainty))}"></label>
      <label>Power <input data-prop="power" inputmode="numeric" value="${power}"></label>
      <button type="button" class="text-button" data-prop-remove aria-label="Remove this quantity">Remove</button>`;
    propRows.append(row);
    renderProp();
  };

  const renderProp = () => {
    const terms = [...propRows.querySelectorAll('.dl-prop-row')].map(row => ({
      name: row.querySelector('[data-prop="name"]').value,
      value: Number(row.querySelector('[data-prop="value"]').value),
      uncertainty: Number(row.querySelector('[data-prop="uncertainty"]').value),
      power: Number(row.querySelector('[data-prop="power"]').value) || 1
    })).filter(term => Number.isFinite(term.value) && Number.isFinite(term.uncertainty));

    if (!terms.length) { propResult.innerHTML = '<p class="muted">Add at least one quantity.</p>'; return; }

    if (propMode.value === 'sum') {
      const absolute = propagateSum(terms);
      propResult.innerHTML = `<p class="dl-prop-out">Absolute uncertainties add: <b>± ${short(absolute)}</b></p>
        <p class="muted">${terms.map(t => `±${short(Math.abs(t.uncertainty))}`).join(' + ')} = ±${short(absolute)}</p>`;
      return;
    }
    const combined = propagateProduct(terms);
    propResult.innerHTML = `<p class="dl-prop-out">Fractional uncertainties add: <b>± ${short(combined.percentage)} %</b></p>
      <p class="muted">${terms.map(t => `${t.power !== 1 ? `${t.power} × ` : ''}${short(Math.abs(t.uncertainty / t.value) * 100)}%`).join(' + ')} = ${short(combined.percentage)}%</p>`;
  };

  page.querySelector('#dlAddTerm').addEventListener('click', () => addTerm(), { signal: controller.signal });
  propRows.addEventListener('click', event => {
    if (!event.target.matches('[data-prop-remove]')) return;
    event.target.closest('.dl-prop-row').remove();
    renderProp();
  }, { signal: controller.signal });
  propRows.addEventListener('input', renderProp, { signal: controller.signal });
  propMode.addEventListener('change', renderProp, { signal: controller.signal });

  [dataInput, transformSelect, xLabel, yLabel, relation, accepted].forEach(field =>
    field.addEventListener('input', render, { signal: controller.signal }));
  transformSelect.addEventListener('change', render, { signal: controller.signal });

  // Seed the propagation calculator with a worked pair so the panel is never empty.
  addTerm('length', 0.500, 0.001, 1);
  addTerm('time', 2.006, 0.01, 2);
  render();

  return () => controller.abort();
}
