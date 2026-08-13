const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const numericValue = value => Number(String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i)?.[0]);

function hasRequiredUnit(response, unit) {
  if (!unit) return true;
  const normalisedResponse = normalize(response).replaceAll(' ', '');
  const normalisedUnit = normalize(unit).replaceAll(' ', '');
  return normalisedResponse.includes(normalisedUnit);
}

function numericalMark(question, response) {
  const answer = numericValue(response);
  const target = numericValue(question.correct_answer);
  const tolerance = Number.isFinite(question.tolerance) ? question.tolerance : Math.max(Math.abs(target) * 0.02, 1e-12);
  const valueCorrect = Number.isFinite(answer) && Number.isFinite(target) && Math.abs(answer - target) <= tolerance;
  const unitCorrect = hasRequiredUnit(response, question.unit);
  return {
    correct: valueCorrect && unitCorrect,
    marks: valueCorrect && unitCorrect ? question.marks : 0,
    reason: !valueCorrect ? 'The numerical value is outside the accepted tolerance.' : !unitCorrect ? `Include the unit ${question.unit}.` : 'Correct.'
  };
}

export const assessment = {
  mark(question, response) {
    const answer = normalize(response);
    if (!answer) return { correct: false, marks: 0, reason: 'No answer submitted.' };
    if (question.type === 'mcq') {
      const correct = answer === normalize(question.correct_answer);
      return { correct, marks: correct ? question.marks : 0, reason: correct ? 'Correct.' : 'Select the best answer before submitting.' };
    }
    if (question.type === 'numerical') return numericalMark(question, response);
    const points = question.mark_scheme || [];
    if (points.length) {
      const matched = points.filter(point => answer.includes(normalize(point))).length;
      const marks = Math.min(matched, question.marks);
      return { correct: marks === question.marks, marks, reason: marks === question.marks ? 'All practice mark points matched.' : 'Some practice mark points are still missing.' };
    }
    const correct = answer === normalize(question.correct_answer) || answer.includes(normalize(question.correct_answer));
    return { correct, marks: correct ? question.marks : 0, reason: correct ? 'Correct.' : 'Compare your response with the model answer.' };
  }
};
