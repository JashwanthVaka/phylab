/** Checks the data-lab maths against results worked out by hand. */
import assert from 'node:assert/strict';
import {
  parseTable, transformRows, bestFit, extremeLines, gradientUncertainty,
  propagateProduct, propagateSum, formatWithUncertainty, agreement
} from '../js/uncertaintyEngine.js';

const close = (got, want, tolerance = 1e-6) => assert.ok(Math.abs(got - want) <= tolerance, `expected ${want}, got ${got}`);

// --- parsing -------------------------------------------------------------
{
  const { rows, problems } = parseTable('length time\n0.20 0.90\n0.40, 1.27\n0.60\t1.55');
  assert.equal(rows.length, 3, 'three data rows, header skipped');
  assert.equal(problems.length, 0);
  close(rows[1].x, 0.40);
  close(rows[2].y, 1.55);

  const messy = parseTable('1 2\nnot data here\n3 4');
  assert.equal(messy.rows.length, 2);
  assert.equal(messy.problems.length, 0, 'a text line is treated as a header, not an error');

  const broken = parseTable('1 2\n5 abc\n3 4');
  assert.equal(broken.problems.length, 1, 'a numeric row with a bad cell is reported');
}

// --- best fit on an exact line -------------------------------------------
{
  // y = 3x + 2 exactly.
  const points = [1, 2, 3, 4, 5].map(x => ({ x, y: 3 * x + 2, dx: 0, dy: 0 }));
  const fit = bestFit(points);
  close(fit.gradient, 3);
  close(fit.intercept, 2);
  close(fit.rSquared, 1, 1e-9);
}

// --- best fit on scattered data, checked by hand --------------------------
{
  // Least squares for (1,2) (2,3) (3,5): gradient 1.5, intercept 0.3333...
  const points = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }].map(p => ({ ...p, dx: 0, dy: 0 }));
  const fit = bestFit(points);
  close(fit.gradient, 1.5, 1e-9);
  close(fit.intercept, 1 / 3, 1e-9);
}

// --- pendulum linearisation ----------------------------------------------
{
  // T = 2*pi*sqrt(L/g) with g = 9.81. Plotting T^2 against L should give 4*pi^2/g.
  const g = 9.81;
  const rows = [0.2, 0.4, 0.6, 0.8, 1.0].map(L => ({ x: L, y: 2 * Math.PI * Math.sqrt(L / g), dx: 0, dy: 0 }));
  const { points } = transformRows(rows, 'y2-x');
  const fit = bestFit(points);
  close(fit.gradient, 4 * Math.PI ** 2 / g, 1e-6);
  // Recovering g from the gradient is the whole point of the exercise.
  close(4 * Math.PI ** 2 / fit.gradient, g, 1e-6);
}

// --- exponential linearisation -------------------------------------------
{
  // N = N0 * exp(-lambda t) with lambda = 0.25. ln N against t has gradient -lambda.
  const lambda = 0.25;
  const rows = [0, 2, 4, 6, 8].map(t => ({ x: t, y: 500 * Math.exp(-lambda * t), dx: 0, dy: 0 }));
  const { points } = transformRows(rows, 'lny-x');
  const fit = bestFit(points);
  close(fit.gradient, -lambda, 1e-9);
  close(Math.exp(fit.intercept), 500, 1e-6);
}

// --- inverse linearisation ------------------------------------------------
{
  // Boyle: p = k/V with k = 240. p against 1/V has gradient k.
  const rows = [1, 2, 3, 4].map(V => ({ x: V, y: 240 / V, dx: 0, dy: 0 }));
  const { points } = transformRows(rows, 'y-1x');
  close(bestFit(points).gradient, 240, 1e-9);
}

// --- transforms drop impossible points rather than producing NaN ----------
{
  const { points, dropped } = transformRows([{ x: 1, y: -5, dx: 0, dy: 0 }, { x: 2, y: 10, dx: 0, dy: 0 }], 'lny-x');
  assert.equal(points.length, 1, 'ln of a negative value is dropped');
  assert.equal(dropped.length, 1);
  assert.ok(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
}

// --- steepest and shallowest lines ---------------------------------------
{
  // Two points with y error bars only: (0, 0 +/- 1) and (10, 20 +/- 1).
  const points = [{ x: 0, y: 0, dx: 0, dy: 1 }, { x: 10, y: 20, dx: 0, dy: 1 }];
  const extremes = extremeLines(points);
  close(extremes.steepest, (20 + 1 - (0 - 1)) / 10);   // 2.2
  close(extremes.shallowest, (20 - 1 - (0 + 1)) / 10); // 1.8
  const fit = bestFit(points);
  const uncertainty = gradientUncertainty(points, fit);
  close(fit.gradient, 2);
  close(uncertainty.absolute, 0.2, 1e-9);
  close(uncertainty.percentage, 10, 1e-9);
}

// --- propagation ----------------------------------------------------------
{
  // Multiplying: fractional uncertainties add. 2% + 3% = 5%.
  const product = propagateProduct([{ value: 100, uncertainty: 2 }, { value: 50, uncertainty: 1.5 }]);
  close(product.percentage, 5, 1e-9);

  // A squared term contributes twice its fractional uncertainty.
  const squared = propagateProduct([{ value: 10, uncertainty: 0.1, power: 2 }]);
  close(squared.percentage, 2, 1e-9);

  // Adding: absolute uncertainties add.
  close(propagateSum([{ uncertainty: 0.3 }, { uncertainty: 0.4 }]), 0.7, 1e-9);
}

// --- IB rounding conventions ---------------------------------------------
{
  const a = formatWithUncertainty(9.7234, 0.4123);
  assert.equal(a.uncertainty, '0.4', 'uncertainty to one significant figure');
  assert.equal(a.value, '9.7', 'value rounded to match the uncertainty');

  const b = formatWithUncertainty(1234.5, 12);
  assert.equal(b.uncertainty, '10', 'one significant figure, so 12 becomes 10');
  assert.equal(b.value, '1235');

  const c = formatWithUncertainty(0.04567, 0.00021);
  assert.equal(c.uncertainty, '0.0002');
  assert.equal(c.value, '0.0457');
}

// --- agreement with an accepted value ------------------------------------
{
  const agrees = agreement(9.7, 0.4, 9.81);
  assert.equal(agrees.within, true, '9.81 lies inside 9.7 +/- 0.4');

  const disagrees = agreement(9.2, 0.2, 9.81);
  assert.equal(disagrees.within, false, '9.81 lies outside 9.2 +/- 0.2');
  assert.ok(/systematic/i.test(disagrees.verdict), 'a disagreement should point at systematic error');
  close(disagrees.percentageError, Math.abs(9.2 - 9.81) / 9.81 * 100, 1e-9);
}

console.log('uncertainty engine tests passed');
