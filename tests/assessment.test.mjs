/** Guards the practice marker: partial credit, criteria, and slip diagnosis. */
import assert from 'node:assert/strict';
import { assessment } from '../js/assessmentEngine.js';

const numeric = { type: 'numerical', marks: 3, correct_answer: '11200', unit: 'm s⁻¹', tolerance: 400 };

// A right value written without its unit used to score zero. That is not how
// the course is marked, and it is not useful feedback.
const noUnit = assessment.mark(numeric, '11200');
assert.equal(noUnit.marks, 2, 'a right value missing its unit should lose one mark, not all of them');
assert.equal(noUnit.correct, false);
assert.ok(noUnit.criteria.find(item => item.name === 'Value')?.met, 'the value criterion should still be met');
assert.equal(noUnit.criteria.find(item => item.name === 'Unit')?.met, false);

const full = assessment.mark(numeric, '11200 m s⁻¹');
assert.equal(full.marks, 3);
assert.ok(full.correct);

// Scientific notation is the same answer.
assert.equal(assessment.mark(numeric, '1.12e4 m s⁻¹').marks, 3, 'scientific notation must be accepted');

// A value out by a clean power of ten is a conversion slip, and saying so is
// more useful than "outside tolerance".
const slip = assessment.mark(numeric, '11.2 m s⁻¹');
assert.equal(slip.marks, 0);
assert.match(slip.reason, /10\^-3|powers of ten/, 'a power-of-ten error should be named as one');

const halved = assessment.mark(numeric, '5600 m s⁻¹');
assert.match(halved.reason, /factor of two/, 'a factor-of-two error should be named as one');

// Nothing submitted earns nothing, and says so plainly.
const blank = assessment.mark(numeric, '');
assert.equal(blank.marks, 0);
assert.equal(blank.reason, 'No answer submitted.');

// Significant figures are advisory: they must never remove a mark.
const sfLoose = assessment.mark(numeric, '11200.000 m s⁻¹');
assert.equal(sfLoose.marks, 3, 'significant figures must not be penalised');
const sfCriterion = sfLoose.criteria.find(item => item.name === 'Significant figures');
if (sfCriterion) assert.ok(sfCriterion.advisory, 'the significant-figures criterion must be advisory');

// Multiple choice still marks cleanly and explains itself.
const choice = { type: 'mcq', marks: 1, correct_answer: 'doubles' };
assert.equal(assessment.mark(choice, 'doubles').marks, 1);
assert.equal(assessment.mark(choice, 'halves').marks, 0);
assert.ok(assessment.mark(choice, 'halves').criteria.length, 'a wrong choice should still explain itself');

// Structured answers earn a mark per point reached.
const structured = { marks: 3, mark_scheme: ['newton', 'momentum', 'impulse'], correct_answer: '' };
const partial = assessment.mark(structured, 'momentum and impulse are related');
assert.equal(partial.marks, 2, 'two of three mark points should score two');
assert.equal(partial.criteria.filter(item => item.met).length, 2);
assert.match(partial.reason, /2 of 3/);

// Marks can never exceed the total on offer.
const over = assessment.mark({ marks: 1, mark_scheme: ['a', 'b', 'c'], correct_answer: '' }, 'a b c');
assert.equal(over.marks, 1, 'marks must be capped at the question total');

console.log('assessment tests passed (partial credit, criteria, slip diagnosis)');
