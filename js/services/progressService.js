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

  /**
   * Moves work done as a guest into the account that just signed in, then
   * takes it off the device.
   *
   * Both halves matter, and for different reasons. Without the move, a student
   * who studied before signing in loses all of it: the completions sit in a
   * browser key the account never reads. Without the clearing, that same work
   * stays on the device after they sign out, so the next person to use the
   * machine sees it as their own guest progress, and carries it into their
   * account the moment they sign in.
   *
   * The device copy is only removed once every row is confirmed written. A
   * failed migration keeps the local copy, because it is then the only copy
   * there is, and losing a student's work to a dropped connection is worse
   * than carrying it a while longer.
   */
  async migrateLocal() {
    const supabase = await getSupabase();
    if (!supabase) return { migrated: 0, cleared: false, reason: 'no-account-service' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { migrated: 0, cleared: false, reason: 'signed-out' };

    const local = getProgress().completedLessons || [];
    const pending = queue.splice(0, queue.length);
    if (!local.length && !pending.length) return { migrated: 0, cleared: true, reason: 'nothing-to-move' };

    const failures = [];
    for (const lesson_slug of local) {
      const { error } = await supabase.from('lesson_progress').upsert(
        { user_id: user.id, lesson_slug, completion_percentage: 100, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_slug' }
      );
      if (error) failures.push(lesson_slug);
    }
    for (const record of pending) {
      const { error } = await supabase.from('lesson_progress').upsert(
        { ...record, user_id: user.id }, { onConflict: 'user_id,lesson_slug' }
      );
      // Back on the queue, so a later attempt still has it.
      if (error) { failures.push(record.lesson_slug); queue.push(record); }
    }

    if (failures.length) return { migrated: local.length - failures.length, cleared: false, failed: failures };

    this.forgetDevice();
    return { migrated: local.length + pending.length, cleared: true };
  },

  /**
   * Removes study progress kept on this device.
   *
   * Called once work is safely in an account, and again on sign-out. A shared
   * laptop is the ordinary case for a class, and a signed-out browser must not
   * still be holding the last person's completed lessons.
   */
  forgetDevice() {
    const progress = getProgress();
    progress.completedLessons = [];
    progress.attempts = [];
    saveProgress(progress);
  }
};
