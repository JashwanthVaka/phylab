/**
 * A week's study plan, built from what the learner has actually done.
 *
 * The rule this file follows is the one the revision planner already states:
 * nothing here is invented. Every item is a lesson that is genuinely
 * unstarted, a card whose interval has genuinely elapsed, or a question that
 * was genuinely answered wrongly. A plan that pads itself out with plausible
 * filler is worse than no plan, because a student cannot tell which parts to
 * trust.
 *
 * Minutes are the budget. Work is added in the order that matters most --
 * overdue review first, because forgetting compounds, then the next lesson,
 * then practice -- and stops when the budget is spent.
 */

const LESSON_MINUTES = 30;
const CARD_MINUTES = 0.5;
const MISTAKE_MINUTES = 2;
const QUIZ_MINUTES = 10;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * @param {object} input
 * @param {Array}  input.lessons      ordered lesson index
 * @param {Array}  input.completed    slugs already finished
 * @param {number} input.dueCards     flashcards whose interval has elapsed
 * @param {number} input.dueMistakes  banked questions due for another look
 * @param {Array}  input.weakTopics   [{ label, percentage }] from real results
 * @param {number} input.weeklyMinutes the learner's budget
 */
export function buildWeeklyPlan({
  lessons = [], completed = [], dueCards = 0, dueMistakes = 0,
  weakTopics = [], weeklyMinutes = 180,
} = {}) {
  const remaining = lessons.filter(lesson => !completed.includes(lesson.slug));
  const items = [];
  let spent = 0;

  const add = (item, minutes) => {
    if (spent + minutes > weeklyMinutes && items.length) return false;
    items.push({ ...item, minutes });
    spent += minutes;
    return true;
  };

  // 1. Overdue review, because a forgotten card costs more the longer it waits.
  if (dueMistakes > 0) {
    add({
      kind: 'Review',
      title: `Clear ${plural(dueMistakes, 'banked mistake')}`,
      detail: 'Questions you got wrong, back at the interval that makes them stick.',
      href: '/mistakes',
    }, Math.min(Math.ceil(dueMistakes * MISTAKE_MINUTES), 30));
  }
  if (dueCards > 0) {
    add({
      kind: 'Review',
      title: `Work through ${plural(dueCards, 'flashcard')}`,
      detail: 'Cards whose interval has elapsed. Rating them honestly is what sets the next one.',
      href: '/revision',
    }, Math.min(Math.ceil(dueCards * CARD_MINUTES), 40));
  }

  // 2. The next lesson or two, in syllabus order.
  remaining.slice(0, 2).forEach(lesson => {
    add({
      kind: 'Learn',
      title: lesson.title,
      detail: 'Next in syllabus order.',
      href: `/lesson/${lesson.slug}`,
    }, Number(lesson.estimatedStudyTime) || LESSON_MINUTES);
  });

  // 3. Practice, aimed at a measured weakness rather than a guess.
  const weakest = weakTopics.filter(topic => Number.isFinite(topic.percentage))[0];
  if (weakest) {
    add({
      kind: 'Practise',
      title: `Practice set: ${weakest.label}`,
      detail: `Your weakest measured topic at ${weakest.percentage}%.`,
      href: '/quiz',
    }, QUIZ_MINUTES);
  } else if (items.length) {
    add({
      kind: 'Practise',
      title: 'A ten-question set',
      detail: 'You have no scored practice yet, so this establishes a baseline.',
      href: '/quiz',
    }, QUIZ_MINUTES);
  }

  return {
    items,
    minutes: spent,
    budget: weeklyMinutes,
    // An empty plan is a real answer: everything is done and nothing is due.
    exhausted: !remaining.length && !dueCards && !dueMistakes,
  };
}
