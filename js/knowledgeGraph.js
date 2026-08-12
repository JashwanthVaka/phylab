import { orderLessons, slugify } from './utils.js';

/** Derives navigable curriculum relationships from the discovered lesson catalogue. */
export class KnowledgeGraph {
  constructor(index) { this.lessons = orderLessons(index.lessonIndex); }
  forLesson(lesson) {
    const position = this.lessons.findIndex(item => item.slug === lesson.slug);
    const previous = position > 0 ? this.lessons[position - 1] : null;
    const next = position >= 0 && position < this.lessons.length - 1 ? this.lessons[position + 1] : null;
    const terms = new Set([lesson.topicLabel, ...lesson.definitions.map(item => item.term), ...lesson.formulas.map(item => item.name)] .map(slugify));
    const matched = this.lessons.filter(item => item.slug !== lesson.slug && [...terms].some(term => slugify(`${item.title} ${item.topicLabel}`).includes(term) || term.includes(slugify(item.topicLabel)))).slice(0, 4);
    const bySlug = new Map(this.lessons.map(item => [item.slug, item]));
    const candidates = [
      ...(lesson.relatedTopics || []).map(item => (typeof item === 'string' ? { slug: slugify(item), title: item } : { slug: item.slug || slugify(item.title), title: item.title })),
      ...matched.map(item => ({ slug: item.slug, title: item.title }))
    ];
    const related = [];
    const seen = new Set([lesson.slug]);
    candidates.forEach(item => {
      const known = bySlug.get(item.slug);
      if (!known || seen.has(known.slug) || related.length >= 5) return;
      seen.add(known.slug);
      related.push({ slug: known.slug, title: known.title });
    });
    return { previous, next, prerequisites: lesson.prerequisites || [], related, advanced: lesson.hl_extension?.map(item => item.topic).filter(Boolean) || [] };
  }
}
