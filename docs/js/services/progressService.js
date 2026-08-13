import { getSupabase } from './supabaseClient.js';
import { completeLesson, getProgress, saveProgress, unique } from '../utils.js';

const queue = [];

/**
 * Lesson completion, persisted to Supabase when a learner is signed in and to
 * this device otherwise. UI modules read through here so no view touches Supabase directly.
 */
export const progressService = {
  async upsert(record) {
    const supabase = await getSupabase();
    if (!supabase) { queue.push(record); return { offline: true }; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { queue.push(record); return { guest: true }; }
    return supabase.from('lesson_progress').upsert({ ...record, user_id: user.id }, { onConflict: 'user_id,lesson_slug' });
  },

  /** Returns { guest, completed: [slug] } from the cloud when signed in, otherwise from this device. */
  async list() {
    const supabase = await getSupabase();
    if (!supabase) return { guest: true, completed: getProgress().completedLessons };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { guest: true, completed: getProgress().completedLessons };
    const { data, error } = await supabase.from('lesson_progress').select('lesson_slug, completion_percentage');
    if (error) return { guest: false, completed: [], error: error.message };
    return { guest: false, completed: (data || []).filter(row => row.completion_percentage >= 100).map(row => row.lesson_slug) };
  },

  /** Marks a lesson complete in whichever store is active, then reports the new completed list. */
  async complete(slug) {
    const state = await this.list();
    if (state.guest) return { guest: true, completed: completeLesson(slug).completedLessons };
    await this.upsert({ lesson_slug: slug, completion_percentage: 100, completed_at: new Date().toISOString() });
    return { guest: false, completed: unique([...state.completed, slug]) };
  },

  /** Clears a completion so a learner can redo a lesson. */
  async clear(slug) {
    const state = await this.list();
    if (state.guest) {
      const progress = getProgress();
      progress.completedLessons = progress.completedLessons.filter(item => item !== slug);
      saveProgress(progress);
      return { guest: true, completed: progress.completedLessons };
    }
    await this.upsert({ lesson_slug: slug, completion_percentage: 0, completed_at: null });
    return { guest: false, completed: state.completed.filter(item => item !== slug) };
  },

  async migrateLocal() {
    const supabase = await getSupabase();
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    for (const lesson_slug of getProgress().completedLessons || []) {
      await supabase.from('lesson_progress').upsert({ user_id: user.id, lesson_slug, completion_percentage: 100, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_slug' });
    }
    while (queue.length) await this.upsert(queue.shift());
    return true;
  }
};
