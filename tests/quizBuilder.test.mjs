import assert from 'node:assert/strict';
import { optionsFromSearch, selectQuestions } from '../js/quizSession.js';

const questions = [
  { id: 1, topic: 'Kinematics', level: 'SL', difficulty: 'easy', options: ['1', '2'], correctAnswer: '1' },
  { id: 2, topic: 'Kinematics', level: 'HL', difficulty: 'hard', answer: '4 m/s', type: 'calculation' },
  { id: 3, topic: 'Gas Laws', level: 'SL', difficulty: 'easy', answer: 'Explain', type: 'structured' },
  { id: 4, topic: 'Gas Laws', level: 'HL', difficulty: 'medium', answer: '8 Pa', type: 'numerical' },
  { id: 5, topic: 'Kinematics', level: 'SL', difficulty: 'medium', answer: 'Describe', type: 'structured' },
  { id: 6, topic: 'Gas Laws', level: 'SL', difficulty: 'hard', options: ['A', 'B'], correctAnswer: 'A' }
];

const parsed = optionsFromSearch('?mode=Mixed%20Quiz&topic=Kinematics&topic=Gas%20Laws&difficulty=easy&type=mcq&count=10&minutes=15');
assert.equal(parsed.mode, 'Mixed Quiz');
assert.deepEqual(parsed.topics, ['Kinematics', 'Gas Laws']);
assert.deepEqual(parsed.difficulties, ['easy']);
assert.deepEqual(parsed.types, ['mcq']);
assert.equal(parsed.count, 10);
assert.equal(parsed.durationSeconds, 900);

const mixed = selectQuestions(questions, { topics: ['Kinematics', 'Gas Laws'], count: 4 });
assert.deepEqual(mixed.questions.map(question => question.topic), ['Kinematics', 'Gas Laws', 'Kinematics', 'Gas Laws']);

const filtered = selectQuestions(questions, { topics: ['Kinematics'], difficulties: ['easy'], types: ['mcq'], count: 5 });
assert.deepEqual(filtered.questions.map(question => question.id), ['1']);
assert.equal(filtered.available, 1);

const diagnostic = selectQuestions(questions, {
  mode: 'Weak Topic Quiz', topics: ['Gas Laws'], level: 'SL', difficulties: ['hard'], types: ['mcq'], weakTopics: [], count: 6
});
assert.equal(diagnostic.diagnostic, true);
assert.deepEqual(diagnostic.questions.map(question => question.id), ['6'],
  'a weak-topic diagnostic fallback must keep the learner\'s chosen filters');

console.log('quiz builder tests passed (URL options, filters, diagnostic fallback and balanced topic selection)');
