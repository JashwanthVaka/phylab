import { card, definition, emptyState, example, formula, list, section, table } from './renderer.js';
import { escapeHTML, slugify } from './utils.js';
import { diagramFor } from './diagramEngine.js';
import { graphFor, renderGraph } from './graphEngine.js';
import { lessonFlashcards, renderFlashcards } from './flashcards.js';
import { renderCalculator } from './calculatorEngine.js';
import { KnowledgeGraph } from './knowledgeGraph.js';

const optional = (title, items, render, options) => items?.length ? section(title, `<div class="card-grid">${items.map(render).join('')}</div>`, options) : '';
const variables = lesson => lesson.formulas.flatMap(item => Object.entries(item.symbols || {}).map(([symbol, description]) => [symbol, description, item.units?.[symbol] || 'Not specified']));

/** Renders normalized dynamic lesson JSON without hard-coded lesson content. */
export function renderLesson(lesson, index = { lessonIndex: [] }) {
  const graph = new KnowledgeGraph(index).forLesson(lesson);
  const variableRows = variables(lesson);
  return `<article class="page lesson-page">
    <a class="back-link" href="/" data-route>← Course library</a>
    <header class="lesson-hero"><p class="eyebrow">${escapeHTML(lesson.subject || 'IBDP PHYSICS')} · ${escapeHTML(lesson.topicLabel)}</p><div class="title-row"><h1>${escapeHTML(lesson.title)}</h1><span class="level-badge">${escapeHTML(lesson.level || 'SL and HL')}</span></div><div class="lesson-meta"><span>Difficulty: ${escapeHTML(lesson.difficulty || 'SL + HL')}</span><span>Estimated study time: ${escapeHTML(lesson.estimatedStudyTime || 30)} min</span></div><p>${escapeHTML(lesson.introduction || '')}</p></header>
    <nav class="lesson-nav" aria-label="Lesson sections"><a href="#objectives">Objectives</a><a href="#concepts">Concepts</a><a href="#formulas">Formulae</a><a href="#practice">Practice</a><a href="#summary">Summary</a></nav>
    ${section('Learning objectives', list(lesson.learning_objectives || []), { id: 'objectives', eyebrow: 'OUTCOMES' })}
    ${section('Prerequisites', lesson.prerequisites?.length ? list(lesson.prerequisites) : emptyState('Start here', 'No formal prerequisites have been recorded for this lesson.'), { eyebrow: 'BEFORE YOU BEGIN' })}
    ${optional('Definitions', lesson.definitions, definition, { eyebrow: 'LANGUAGE OF PHYSICS' })}
    ${optional('Core concepts', lesson.core_concepts, item => card(item.heading, `<p>${escapeHTML(item.explanation)}</p>`), { id: 'concepts', eyebrow: 'BUILD UNDERSTANDING' })}
    ${lesson.formulas?.length ? section('Formula sheet', `<div class="formula-grid">${lesson.formulas.map(formula).join('')}</div>${variableRows.length ? `<h3>Variables and units</h3>${table(['Symbol', 'Meaning', 'Unit'], variableRows)}` : emptyState('Variable details unavailable', 'This source lesson does not yet provide variable definitions or units.')}`, { id: 'formulas', eyebrow: 'USE WITH CARE' }) : ''}
    ${section('Constants and derivations', `<div class="card-grid">${card('Physical constants', lesson.constants?.length ? list(lesson.constants) : '<p>Constants are introduced with the relevant formulae in this source lesson.</p>')}${card('Derivations', lesson.derivations?.length ? list(lesson.derivations) : '<p>No formal derivation is recorded yet. Use the formula sheet and worked examples to trace the relationship.</p>')}</div>`, { eyebrow: 'BUILD THE MODEL' })}
    ${section('Visual model', `${diagramFor(lesson)}${renderGraph(graphFor(lesson))}`, { eyebrow: 'SEE THE PHYSICS' })}
    ${section('Calculator', renderCalculator(), { eyebrow: 'CHECK A RESULT' })}
    ${optional('Worked examples', lesson.worked_examples, example, { eyebrow: 'METHOD IN ACTION' })}
    ${optional('Practice questions', lesson.practice_questions, item => card(`${item.level || 'Practice'} question`, `<p>${escapeHTML(item.question)}</p><button class="text-button" data-quiz-topic="${escapeHTML(lesson.slug)}">Practise this topic →</button>`), { id: 'practice', eyebrow: 'CHECK YOUR THINKING' })}
    ${optional('Exam questions', lesson.practice_questions?.filter(item => item.level === 'HL' || /exam/i.test(item.question)), item => card(`${item.level || 'Exam'} prompt`, `<p>${escapeHTML(item.question)}</p><p class="muted">Plan a structured response: principle, model, calculation or evidence, conclusion.</p>`), { eyebrow: 'EXAM APPLICATION' })}
    ${optional('IB exam tips', lesson.ib_exam_tips, tip => card('Exam technique', `<p>${escapeHTML(tip)}</p>`, 'tip-card'), { eyebrow: 'ASSESSMENT' })}
    ${optional('Common mistakes', lesson.common_mistakes, warning => card('Watch for this', `<p>${escapeHTML(warning)}</p>`, 'warning-card'), { eyebrow: 'AVOID LOSING MARKS' })}
    ${optional('HL extension', lesson.hl_extension, item => card(item.topic || 'HL extension', `<p>${escapeHTML(item.explanation || item)}</p>`), { eyebrow: 'GO FURTHER' })}
    ${section('Practical, IA and TOK connections', `<div class="card-grid">${card('Practical investigation', `<p>${escapeHTML(lesson.practical_experiment || 'Use this topic to design a controlled measurement, identify uncertainties, and evaluate evidence.')}</p>`)}${card('Internal assessment connection', `<p>${escapeHTML(lesson.ia_connection || 'Connect a measurable independent variable to a justified physical model and uncertainty treatment.')}</p>`)}${card('TOK connection', `<p>${escapeHTML(lesson.tok_connection || 'Consider how models, assumptions, and measurement limits shape what physics can claim.')}</p>`)}</div>`, { eyebrow: 'CONNECT THE KNOWLEDGE' })}
    ${section('Summary', `<div class="summary-card"><p>${escapeHTML(lesson.summary || 'Summary not yet supplied.')}</p></div>`, { id: 'summary', eyebrow: 'TAKEAWAY' })}
    ${section('Flashcards', renderFlashcards(lessonFlashcards(lesson)), { eyebrow: 'SPACED REVISION' })}
    ${section('Knowledge pathways', `<div class="pathway-grid">${graph.previous ? `<a href="/lesson/${graph.previous.slug}" data-route>← Previous<br><b>${escapeHTML(graph.previous.title)}</b></a>` : '<span></span>'}${graph.next ? `<a href="/lesson/${graph.next.slug}" data-route>Next →<br><b>${escapeHTML(graph.next.title)}</b></a>` : '<span></span>'}</div>${graph.related.length ? `<div class="related-links">${graph.related.map(item => `<a href="/lesson/${slugify(item)}" data-route>${escapeHTML(item)}</a>`).join('')}</div>` : ''}${graph.advanced.length ? `<p><b>Advanced:</b> ${escapeHTML(graph.advanced.join(' · '))}</p>` : ''}`, { eyebrow: 'CONTINUE LEARNING' })}
    <div class="lesson-actions"><button class="button" data-complete-lesson="${escapeHTML(lesson.slug)}">Mark lesson complete</button><a class="outline" href="/quiz" data-route>Practise now</a><button class="outline" data-open-tutor>Ask PHY about this lesson</button></div>
  </article>`;
}
