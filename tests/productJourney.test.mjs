import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { examPrepPage } from '../js/examPrepUI.js';
import { revisionPackPage } from '../js/revisionPack.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = {
  units: [{ id: 'A', title: 'Space, time and motion' }],
  lessonIndex: [{ slug: 'kinematics', title: 'A.1 Kinematics', topicLabel: 'Kinematics', unit: 'A', level: 'SL and HL', learning_objectives: ['Model constant acceleration.'] }],
  questions: [{ id: 1, topic: 'Kinematics', level: 'SL', difficulty: 'easy', marks: 2, question: 'Calculate the final speed.', answer: '20 m/s', solution: 'Use v = u + at.' }]
};

const prep = examPrepPage(index, { weakestTopics: [{ topic_slug: 'Wave Phenomena', mastery_score: 42 }] });
assert.match(prep, /TARGET TEST/);
assert.match(prep, /mode=Weak%20Topic%20Quiz&amp;topic=Wave%20Phenomena&amp;count=5/,
  'a measured weak topic must stay selected when exam prep opens practice');
for (const difficulty of ['easy', 'medium', 'hard']) {
  assert.match(prep, new RegExp(`difficulty=${difficulty}&count=5`), `exam prep must offer a ${difficulty} path`);
}

const pack = revisionPackPage(index);
assert.match(pack, /Original KINETIQ practice prompts/);
assert.match(pack, /Calculate the final speed/);
assert.match(pack, /20 m\/s/);

const learner = fs.readFileSync(path.join(root, 'js/learnerUI.js'), 'utf8');
for (const stage of ['Learn', 'Model', 'Practise', 'Retain']) {
  assert.match(learner, new RegExp(`kind: '${stage}'`), `progress needs a ${stage} stage`);
}
assert.match(learner, /mode=Weak%20Topic%20Quiz&topic=/,
  'weak-topic recommendations must open a correctly configured target test');

const resources = fs.readFileSync(path.join(root, 'js/resourcesUI.js'), 'utf8');
assert.match(resources, /One connected study cycle/);
assert.match(resources, /Target-test builder/);

console.log('product journey tests passed (adaptive path, target tests and printable practice packs)');
