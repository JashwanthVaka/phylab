import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const questions = JSON.parse(read('data/questions.json'));
const app = read('app.js');
const adaptive = read('js/adaptiveLearning.js');
const learner = read('js/learnerUI.js');
const quiz = read('js/quizSession.js');
const revision = read('js/revisionUI.js');
const notebook = read('js/notebookUI.js');
const notebookService = read('js/services/notebookService.js');
const simulation = read('js/simulationStudio.js');
const lesson = read('js/lessonEngine.js');
const ui = read('js/ui.js');
const sw = read('sw.js');
const schema = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql'))
  .map(file => read(`supabase/migrations/${file}`)).join('\n');

const features = [
  ['diagnostic starting test', /selectDiagnosticQuestions/.test(adaptive) && /Diagnostic/.test(quiz)],
  ['topic mastery map', /completeTopicMastery/.test(adaptive) && /SKILL MASTERY/.test(learner)],
  ['adaptive practice', /selectAdaptiveQuestions/.test(adaptive) && /Adaptive Practice/.test(quiz)],
  ['recovery questions', /recoveryQuestion/.test(adaptive) && /recovery/.test(quiz)],
  ['Paper 1A, 1B and 2 builder', ['1A', '1B', '2'].every(paper => questions.some(q => q.paper === paper)) && /paper/.test(quiz)],
  ['criterion feedback', questions.every(q => q.criteria?.length) && /criterion/i.test(read('js/assessmentEngine.js'))],
  ['daily workspace', /TODAY/.test(learner) && /Your next three actions/.test(learner)],
  ['exam-date planner', /exam_date/.test(learner) && /weekly_hours/.test(revision)],
  ['coverage dashboard', /\/admin\/coverage/.test(app) && /coverageReport/.test(read('js/coverageUI.js'))],
  ['500 original questions', questions.length >= 500 && questions.every(q => q.sourceType === 'original-kinetiq')],
  ['personal notebook', /value="note"/.test(notebook)],
  ['lesson highlights', /Save highlight/.test(notebook)],
  ['personal flashcards', /value="flashcard"/.test(notebook)],
  ['capped daily flashcards', /capped at 20/.test(revision) && /slice\(0, 20\)/.test(revision)],
  ['formula drills', /Formula Quiz/.test(quiz) && /Practise formula recall/.test(ui)],
  ['command-term trainer', /Command-term Drill/.test(quiz) && /\/patterns/.test(app)],
  ['data laboratory', /\/data/.test(app) && /gradientUncertainty/.test(read('js/dataLabUI.js'))],
  ['IA workspace', /\/ia/.test(app) && /internal assessment workspace/i.test(read('js/iaWorkspace.js'))],
  ['contextual Ask KIT', /Ask KIT about this lesson/.test(lesson) && /Ask KIT about this formula/.test(ui)
    && /Ask KIT about this model/.test(simulation) && /Ask KIT to explain/.test(quiz)],
  ['unified learning timeline', ['Lesson', 'Practice', 'Notebook', 'Revision', 'Ask KIT']
    .every(kind => read('js/services/dashboardService.js').includes(kind))
    && /kind: 'Simulation'/.test(simulation) && /\.\.\.sessions\.map/.test(read('js/services/dashboardService.js'))],
  ['continue learning', /Continue with/.test(learner)],
  ['cross-device sync', /notebookService\.restore/.test(app) && /notebookService\.migrateLocal/.test(app)
    && /quizService\.migrateLocal/.test(app) && /progressService\.migrateLocal/.test(app)],
  ['offline study packs', /KINETIQ_CACHE_LESSONS/.test(sw) && /offline-pack/.test(read('js/resourcesUI.js'))],
  ['content quality labels', questions.every(q => q.author && q.reviewer && q.lastReviewed)
    && /Original KINETIQ/.test(read('js/resourcesUI.js'))],
  ['teacher workspace', /\/classroom/.test(app) && /teacher_student_summaries/.test(schema)
    && /row level security/i.test(schema)]
];

features.forEach(([name, implemented]) => assert.ok(implemented, `${name} is not fully connected`));
assert.match(notebookService, /user_id/, 'notebook cloud rows must remain account-scoped');
console.log(`feature coverage tests passed (${features.length}/25 requested upgrades connected)`);
