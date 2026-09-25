import assert from 'node:assert/strict';
import {
  completeTopicMastery,
  difficultyForEvidence,
  evidenceFromReports,
  recoveryQuestion,
  selectAdaptiveQuestions,
  selectDiagnosticQuestions,
} from '../js/adaptiveLearning.js';

const questions = [
  { id: 'a1', topic: 'Kinematics', difficulty: 'easy', sourceType: 'original-kinetiq', skills: ['model'], tags: ['motion'] },
  { id: 'a2', topic: 'Kinematics', difficulty: 'medium', sourceType: 'original-kinetiq', skills: ['model'], tags: ['motion'] },
  { id: 'a3', topic: 'Kinematics', difficulty: 'hard', sourceType: 'original-kinetiq', skills: ['reason'], tags: ['motion'] },
  { id: 'b1', topic: 'Waves', difficulty: 'easy', sourceType: 'original-kinetiq', skills: ['graph'], tags: ['wave'] },
  { id: 'b2', topic: 'Waves', difficulty: 'medium', sourceType: 'original-kinetiq', skills: ['graph'], tags: ['wave'] },
  { id: 'b3', topic: 'Waves', difficulty: 'hard', sourceType: 'original-kinetiq', skills: ['reason'], tags: ['wave'] },
];

assert.deepEqual(selectDiagnosticQuestions(questions, { count: 4 }).map(row => row.id), ['a1', 'b1', 'a2', 'b2']);
assert.equal(difficultyForEvidence({ attempted: 2, percentage: 100 }), 'easy');
assert.equal(difficultyForEvidence({ attempted: 5, percentage: 70 }), 'medium');
assert.equal(difficultyForEvidence({ attempted: 10, percentage: 90 }), 'hard');

const evidence = { kinematics: { attempted: 10, percentage: 90 }, waves: { attempted: 2, percentage: 40 } };
const adaptive = selectAdaptiveQuestions(questions, evidence, { count: 2 });
assert.equal(adaptive[0].topic, 'Waves', 'least-secure topic should come first');
assert.equal(adaptive[0].difficulty, 'easy');

const recovery = recoveryQuestion(questions, questions[0]);
assert.equal(recovery.topic, 'Kinematics');
assert.equal(recovery.recoveryOf, 'a1');
assert.match(recovery.recoveryRelationship, /shared/);

const reports = [{ mode: 'Diagnostic', review: [{ q: { topic: 'Waves', marks: 2 }, r: { marks: 1 } }] }];
assert.equal(evidenceFromReports(reports).waves.percentage, 50);
assert.equal(evidenceFromReports(reports).waves.diagnosticAttempts, 1);

const mastery = completeTopicMastery(['Kinematics', 'Waves', 'Fields'], [{ label: 'Waves', attempted: 6, percentage: 75 }]);
assert.equal(mastery.length, 3);
assert.equal(mastery.find(row => row.label === 'Fields').score, null);
assert.equal(mastery.find(row => row.label === 'Waves').evidenceLabel, 'Developing evidence');

console.log('adaptive learning tests passed (diagnostic, difficulty, recovery and complete mastery map)');
