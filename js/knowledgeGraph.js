import { slugify, unique } from './utils.js';

/** Derives navigable curriculum relationships from the discovered lesson catalogue. */
export class KnowledgeGraph {
  constructor(index) { this.lessons = index.lessonIndex || []; }
  forLesson(lesson) {
    const position = this.lessons.findIndex(item => item.slug === lesson.slug);
    const previous = position > 0 ? this.lessons[position - 1] : null;
    const next = position >= 0 && position < this.lessons.length - 1 ? this.lessons[position + 1] : null;
    const terms = new Set([lesson.topicLabel, ...lesson.definitions.map(item => item.term), ...lesson.formulas.map(item => item.name)] .map(slugify));
    const related = this.lessons.filter(item => item.slug !== lesson.slug && [...terms].some(term => slugify(`${item.title} ${item.topicLabel}`).includes(term) || term.includes(slugify(item.topicLabel)))).slice(0, 4);
    return { previous, next, prerequisites: lesson.prerequisites || [], related: unique([...(lesson.relatedTopics || []).map(item => typeof item === 'string' ? item : item.title), ...related.map(item => item.title)]).slice(0, 5), advanced: lesson.hl_extension?.map(item => item.topic).filter(Boolean) || [] };
  }
}
