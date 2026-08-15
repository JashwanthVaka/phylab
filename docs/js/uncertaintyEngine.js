/**
 * The uncertainty and data-analysis maths behind KINETIQ's data lab.
 *
 * Pure functions only, so every result can be tested without a browser. The
 * gradient uncertainty uses the steepest/shallowest line method IB expects,
 * rather than a statistical standard error, because that is what students are
 * asked to draw and justify.
 */

/** Parses pasted data: two or more whitespace/comma/tab separated columns, one row per line. */
export function parseTable(text) {
  const rows = [];
  const problems = [];
  String(text || '').split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || /^[a-z_#]/i.test(trimmed)) return; // skip blanks and header rows
    const cells = trimmed.split(/[,\t;]+|\s{1,}/).filter(Boolean).map(Number);
    if (cells.length < 2 || cells.some(value => !Number.isFinite(value))) {
      problems.push(`Line ${index + 1} could not be read as numbers.`);
      return;
    }
    rows.push({ x: cells[0], y: cells[1], dx: cells[2] ?? 0, dy: cells[3] ?? 0 });
  });
  return { rows, problems };
}

/** The linearisations IB practicals actually use, each with the meaning of its gradient. */
export const TRANSFORMS = {
  'y-x': { label: 'y against x', xLabel: x => x, yLabel: y => y, x: x => x, y: y => y, note: 'A straight line here means y is directly related to x. Through the origin means proportional.' },
  'y-x2': { label: 'y against x²', xLabel: x => `${x}²`, yLabel: y => y, x: x => x * x, y: y => y, note: 'Use when y is expected to vary with the square of x.' },
  'y2-x': { label: 'y² against x', xLabel: x => x, yLabel: y => `${y}²`, x: x => x, y: y => y * y, note: 'Use when y is expected to vary with the square root of x.' },
  'y-1x': { label: 'y against 1/x', xLabel: x => `1/${x}`, yLabel: y => y, x: x => 1 / x, y: y => y, note: 'Use for inverse relationships, such as pressure against volume.' },
  'y-sqrtx': { label: 'y against √x', xLabel: x => `√${x}`, yLabel: y => y, x: x => Math.sqrt(x), y: y => y, note: 'Use when y varies with the square root of x, as a pendulum period does with length.' },
  'lny-x': { label: 'ln y against x', xLabel: x => x, yLabel: y => `ln ${y}`, x: x => x, y: y => Math.log(y), note: 'Use for exponential decay or growth. The gradient is the decay constant (negative) or growth rate.' }
};

/** Applies a transform, dropping any point the transform cannot represent. */
export function transformRows(rows, key) {
  const transform = TRANSFORMS[key] || TRANSFORMS['y-x'];
  const points = [];
  const dropped = [];
  rows.forEach(row => {
    const x = transform.x(row.x);
    const y = transform.y(row.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) { dropped.push(row); return; }
    // Propagate the point uncertainties through the transform by local scaling.
    const dx = row.dx ? Math.abs(transform.x(row.x + row.dx) - x) : 0;
    const dy = row.dy ? Math.abs(transform.y(row.y + row.dy) - y) : 0;
    points.push({ x, y, dx: Number.isFinite(dx) ? dx : 0, dy: Number.isFinite(dy) ? dy : 0 });
  });
  return { points, dropped, transform };
}

/** Ordinary least-squares best fit. */
export function bestFit(points) {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((total, p) => total + p.x, 0);
  const sumY = points.reduce((total, p) => total + p.y, 0);
  const sumXY = points.reduce((total, p) => total + p.x * p.y, 0);
  const sumXX = points.reduce((total, p) => total + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-15) return null;
  const gradient = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - gradient * sumX) / n;
  // Pearson r, reported as r² so a student can judge the fit.
  const meanX = sumX / n;
  const meanY = sumY / n;
  const ssxy = points.reduce((total, p) => total + (p.x - meanX) * (p.y - meanY), 0);
  const ssxx = points.reduce((total, p) => total + (p.x - meanX) ** 2, 0);
  const ssyy = points.reduce((total, p) => total + (p.y - meanY) ** 2, 0);
  const r = ssxx && ssyy ? ssxy / Math.sqrt(ssxx * ssyy) : 1;
  return { gradient, intercept, rSquared: r * r };
}

/**
 * Steepest and shallowest lines through the error bars of the extreme points,
 * which is the method IB asks students to use for the uncertainty in a gradient.
 */
export function extremeLines(points) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((left, right) => left.x - right.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last.x - first.x;
  if (Math.abs(span) < 1e-15) return null;
  // Steepest: bottom of the first point's bar to the top of the last point's bar.
  const steepest = (last.y + last.dy - (first.y - first.dy)) / ((last.x - last.dx) - (first.x + first.dx) || span);
  const shallowest = (last.y - last.dy - (first.y + first.dy)) / ((last.x + last.dx) - (first.x - first.dx) || span);
  return { steepest, shallowest };
}

/** Gradient uncertainty as half the range between the extreme lines. */
export function gradientUncertainty(points, fit) {
  const extremes = extremeLines(points);
  if (!extremes || !fit) return null;
  const half = Math.abs(extremes.steepest - extremes.shallowest) / 2;
  if (!Number.isFinite(half) || half === 0) return null;
  return { absolute: half, percentage: fit.gradient ? Math.abs(half / fit.gradient) * 100 : null, ...extremes };
}

/** Combines uncertainties for a product or quotient: fractional uncertainties add. */
export function propagateProduct(terms) {
  const fractional = terms.reduce((total, term) => total + Math.abs(term.uncertainty / term.value) * Math.abs(term.power ?? 1), 0);
  return { fractional, percentage: fractional * 100 };
}

/** Combines uncertainties for a sum or difference: absolute uncertainties add. */
export function propagateSum(terms) {
  return terms.reduce((total, term) => total + Math.abs(term.uncertainty), 0);
}

/** Rounds an uncertainty to one significant figure and the value to match, as IB expects. */
export function formatWithUncertainty(value, uncertainty) {
  if (!Number.isFinite(value)) return { value: '—', uncertainty: '—' };
  if (!Number.isFinite(uncertainty) || uncertainty === 0) return { value: String(Number(value.toPrecision(4))), uncertainty: null };
  const magnitude = Math.floor(Math.log10(Math.abs(uncertainty)));
  const rounded = Number(uncertainty.toPrecision(1));
  const decimals = Math.max(0, -magnitude);
  return {
    value: value.toFixed(decimals),
    uncertainty: rounded.toFixed(decimals),
    decimals
  };
}

/** Does an accepted value sit inside the measured range? This is the evaluation IB asks for. */
export function agreement(measured, uncertainty, accepted) {
  if (![measured, accepted].every(Number.isFinite)) return null;
  const difference = Math.abs(measured - accepted);
  const percentageError = accepted ? (difference / Math.abs(accepted)) * 100 : null;
  const within = Number.isFinite(uncertainty) && uncertainty > 0 ? difference <= uncertainty : null;
  return {
    difference,
    percentageError,
    within,
    verdict: within === null
      ? 'Add an uncertainty to judge agreement.'
      : within
        ? 'The accepted value lies inside your uncertainty range, so the results agree. Any discrepancy is consistent with random error.'
        : 'The accepted value lies outside your uncertainty range. That points to a systematic error rather than random scatter.'
  };
}
