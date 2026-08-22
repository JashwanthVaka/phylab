const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const numericValue = value => Number(String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i)?.[0]);

function hasRequiredUnit(response, unit) {
  if (!unit) return true;
  const normalisedResponse = normalize(response).replaceAll(' ', '');
  const normalisedUnit = normalize(unit).replaceAll(' ', '');
  return normalisedResponse.includes(normalisedUnit);
}

/**
 * Significant figures in a written answer.
 *
 * Leading zeros never count; trailing zeros count only after a decimal point,
 * which is the convention the course uses. "0.0250" is three, "250" is two by
 * this reckoning -- deliberately conservative, so the marker warns rather than
 * penalises when the notation is genuinely ambiguous.
 */
function significantFigures(text) {
  const match = String(text ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
  if (!match) return null;
  let digits = match[0].toLowerCase().split('e')[0].replace(/[-+]/g, '');
  if (!/\d/.test(digits)) return null;
  const hasPoint = digits.includes('.');
  digits = digits.replace('.', '').replace(/^0+/, '');
  if (!digits) return 1;
  return hasPoint ? digits.length : digits.replace(/0+$/, '').length || 1;
}

/**
 * Marks a numerical answer criterion by criterion.
 *
 * This used to be all-or-nothing: a right value written without its unit
 * scored zero. That is not how the course is marked and it is not useful
 * feedback -- a student who has done the physics correctly and forgotten "m
 * s⁻¹" needs to be told exactly that, not shown a blank score.
 *
 * The value carries the marks. The unit costs one mark when it is missing and
 * the question asked for one, which mirrors the usual penalty. Significant
 * figures are reported but never penalised, because the recorded answers are
 * not consistently written to a fixed precision and it would be unfair to
 * mark against a standard the bank does not itself hold to.
 */
function numericalMark(question, response) {
  const answer = numericValue(response);
  const target = numericValue(question.correct_answer);
  const tolerance = Number.isFinite(question.tolerance) ? question.tolerance : Math.max(Math.abs(target) * 0.02, 1e-12);
  const valueCorrect = Number.isFinite(answer) && Number.isFinite(target) && Math.abs(answer - target) <= tolerance;
  const unitRequired = Boolean(question.unit);
  const unitCorrect = hasRequiredUnit(response, question.unit);

  const total = Number(question.marks) || 1;
  let marks = 0;
  if (valueCorrect) marks = unitCorrect || !unitRequired ? total : Math.max(total - 1, total > 1 ? total - 1 : 0);

  // A value out by a clean power of ten is a conversion slip, not a wrong
  // method, and saying so is far more useful than "outside tolerance".
  let valueNote = 'Within the accepted tolerance.';
  if (!valueCorrect && Number.isFinite(answer) && Number.isFinite(target) && answer !== 0 && target !== 0) {
    const ratio = Math.abs(answer / target);
    const power = Math.log10(ratio);
    if (Math.abs(power - Math.round(power)) < 0.02 && Math.round(power) !== 0) {
      valueNote = `Out by a factor of 10^${Math.round(power)}. Check your unit conversions and powers of ten.`;
    } else if (Math.abs(ratio - 2) < 0.02 || Math.abs(ratio - 0.5) < 0.02) {
      valueNote = 'Out by a factor of two. Check for a missing or extra factor of ½ in the relationship.';
    } else {
      valueNote = 'Outside the accepted tolerance.';
    }
  } else if (!valueCorrect) {
    valueNote = 'No numerical value was found in your answer.';
  }

  const expectedSf = significantFigures(question.correct_answer);
  const givenSf = significantFigures(response);
  const criteria = [
    { name: 'Value', met: valueCorrect, note: valueNote },
  ];
  if (unitRequired) {
    criteria.push({
      name: 'Unit',
      met: unitCorrect,
      note: unitCorrect ? `Correct unit (${question.unit}).` : `The unit ${question.unit} is missing. In the exam this costs a mark even when the number is right.`,
    });
  }
  if (valueCorrect && expectedSf && givenSf) {
    criteria.push({
      name: 'Significant figures',
      met: Math.abs(givenSf - expectedSf) <= 1,
      advisory: true,
      note: Math.abs(givenSf - expectedSf) <= 1
        ? `${givenSf} significant figures, which suits the data.`
        : `You gave ${givenSf} significant figures where ${expectedSf} suits the data. Not penalised here, but examiners do check it.`,
    });
  }

  const reason = valueCorrect
    ? (unitCorrect || !unitRequired ? 'Correct.' : `Right value, but the unit ${question.unit} is missing.`)
    : valueNote;

  return { correct: valueCorrect && (unitCorrect || !unitRequired), marks, reason, criteria, total };
}

export const assessment = {
  mark(question, response) {
    const answer = normalize(response);
    const total = Number(question.marks) || 1;
    if (!answer) return { correct: false, marks: 0, reason: 'No answer submitted.', criteria: [], total };
    if (question.type === 'mcq') {
      const correct = answer === normalize(question.correct_answer);
      return {
        correct, marks: correct ? total : 0, total,
        reason: correct ? 'Correct.' : 'Select the best answer before submitting.',
        criteria: [{ name: 'Selection', met: correct, note: correct ? 'The best answer.' : 'Re-read the stem and eliminate the distractors one at a time.' }],
      };
    }
    if (question.type === 'numerical') return numericalMark(question, response);
    const points = question.mark_scheme || [];
    if (points.length) {
      // Structured answers earn a mark per point reached, which is what makes
      // the score legible: you can see which points you actually made.
      const criteria = points.map(point => ({
        name: 'Mark point',
        met: answer.includes(normalize(point)),
        note: point,
      }));
      const matched = criteria.filter(item => item.met).length;
      const marks = Math.min(matched, total);
      return {
        correct: marks === total, marks, total, criteria,
        reason: marks === total ? 'All practice mark points matched.' : `${matched} of ${points.length} mark points matched.`,
      };
    }
    const correct = answer === normalize(question.correct_answer) || answer.includes(normalize(question.correct_answer));
    return {
      correct, marks: correct ? total : 0, total,
      reason: correct ? 'Correct.' : 'Compare your response with the model answer.',
      criteria: [{ name: 'Response', met: correct, note: correct ? 'Matches the expected answer.' : 'Compare your wording against the model answer below.' }],
    };
  },
};
