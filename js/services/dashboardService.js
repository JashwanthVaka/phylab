import { getSupabase } from './supabaseClient.js';
import { getProgress } from '../utils.js';
import { recommendationService } from './recommendationService.js';
import { accountRows } from './accountRows.js';

const reliable = rows => rows.filter(row => (row.attempt_count || 0) >= 10);

export const dashboardService = {
  async summary() {
    const db = await getSupabase();
    if (!db) return this.summaryGuest();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return this.summaryGuest();
    const tables = ['lesson_progress', 'topic_mastery', 'quiz_attempts', 'bookmarks', 'flashcard_progress', 'revision_tasks', 'ai_conversations', 'study_sessions'];
    const [lessons, mastery, quizzes, bookmarks, cards, tasks, conversations, sessions] =
      await Promise.all(tables.map(table => accountRows(db, table, user.id)));
    const completed = lessons.filter(item => item.completion_percentage >= 100).length;
    const maximum = quizzes.reduce((total, item) => total + Number(item.maximum_marks || 0), 0);
    const accuracy = maximum ? quizzes.reduce((total, item) => total + Number(item.awarded_marks || 0), 0) / maximum : null;
    const measured = reliable(mastery);
    const ordinaryBookmarks = bookmarks.filter(row => row.content_type !== 'notebook');
    const activity = [
      ...lessons.map(row => ({
        kind: 'Lesson', title: row.lesson_slug, detail: `${Math.round(row.completion_percentage || 0)}% complete`,
        href: `/lesson/${row.lesson_slug}`, at: row.updated_at || row.last_studied_at || row.created_at
      })),
      ...quizzes.map(row => ({
        kind: 'Practice', title: row.quiz_key || 'Practice set',
        detail: `${Number(row.awarded_marks || 0)} / ${Number(row.maximum_marks || 0)} marks`,
        href: `/results/${row.id}`, at: row.completed_at || row.updated_at || row.created_at
      })),
      ...bookmarks.map(row => ({
        kind: row.content_type === 'notebook' ? 'Notebook' : 'Bookmark',
        title: row.content_type === 'notebook' ? 'Private notebook item' : row.content_key,
        detail: row.content_type === 'notebook' ? 'Saved to your private workspace' : row.content_type,
        href: row.content_type === 'notebook' ? '/notebook' : '/bookmarks', at: row.updated_at || row.created_at
      })),
      ...cards.filter(row => row.last_reviewed_at).map(row => ({
        kind: 'Revision', title: 'Flashcard reviewed', detail: row.card_key,
        href: '/revision', at: row.last_reviewed_at
      })),
      ...conversations.map(row => ({
        kind: 'Ask KIT', title: row.title || 'KIT question', detail: 'Source-cited learning conversation',
        href: '/ask', at: row.updated_at || row.created_at
      })),
      ...sessions.map(row => ({
        kind: row.context?.kind || 'Study', title: row.context?.title || row.context?.slug || 'Study session',
        detail: `${Math.max(1, Math.round(Number(row.seconds_spent || 0) / 60))} min`,
        href: row.context?.href || '/activity', at: row.ended_at || row.created_at
      }))
    ].filter(row => row.at).sort((left, right) => new Date(right.at) - new Date(left.at)).slice(0, 12);
    return {
      guest: false,
      overallProgress: lessons.length ? Math.round(lessons.reduce((total, item) => total + item.completion_percentage, 0) / lessons.length) : 0,
      lessonsCompleted: completed,
      lessonsInProgress: lessons.filter(item => item.completion_percentage > 0 && item.completion_percentage < 100).length,
      averageMastery: measured.length ? Math.round(measured.reduce((total, item) => total + item.mastery_score, 0) / measured.length) : 0,
      strongestTopics: measured.filter(row => row.mastery_score >= 75).sort((left, right) => right.mastery_score - left.mastery_score).slice(0, 3),
      weakestTopics: measured.filter(row => row.mastery_score < 60).sort((left, right) => left.mastery_score - right.mastery_score).slice(0, 3),
      developingTopics: mastery.filter(item => (item.attempt_count || 0) < 10),
      masteryTopics: mastery,
      quizAccuracy: accuracy === null ? null : Math.round(accuracy * 100),
      quizCount: quizzes.length,
      recentQuizScores: quizzes.slice(-5),
      flashcardsDue: cards.filter(item => new Date(item.due_at) <= new Date()).length,
      revisionTasksDue: tasks.filter(item => !item.completed_at).length,
      bookmarksCount: ordinaryBookmarks.length,
      recentAIConversations: conversations.slice(-5),
      studySeconds: sessions.reduce((total, item) => total + item.seconds_spent, 0),
      recentActivity: activity,
      recommendation: recommendationService.next({ lessons, mastery: measured, tasks, flashcardsDue: cards.filter(item => new Date(item.due_at) <= new Date()).length })
    };
  },
  summaryGuest() {
    const progress = getProgress();
    return {
      guest: true,
      lessonsCompleted: progress.completedLessons.length,
      overallProgress: 0,
      averageMastery: 0,
      recentActivity: [],
      bookmarksCount: 0,
      flashcardsDue: 0,
      recommendation: recommendationService.next({})
    };
  }
};
