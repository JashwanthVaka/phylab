import { getSupabase } from './supabaseClient.js';

const failure = error => ({ error: error?.message || 'Practice could not be synced.' });
const RESULTS_PREFIX = 'phylab_quiz_results:';
const SESSION_KEY = 'phylab_quiz_session';

function markLocalSynced(id) {
  try {
    const key = `${RESULTS_PREFIX}${id}`;
    const report = JSON.parse(localStorage.getItem(key) || 'null');
    if (report) localStorage.setItem(key, JSON.stringify({ ...report, cloudSynced: true }));
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (session?.id === id) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, cloudSynced: true }));
  } catch { /* Cloud data is safe even if the local marker cannot be written. */ }
}

async function signedIn() {
  const supabase = await getSupabase();
  if (!supabase) return { offline: true };
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : { guest: true };
}

/** Persists a completed deterministic KINETIQ practice session. */
async function recordSession(session) {
  const account = await signedIn();
  if (!account.supabase) return account;
  const { supabase, user } = account;
  try {
    const topics = session.analytics?.topics || [];
    const oneDifficulty = session.questions?.length
      && new Set(session.questions.map(item => item.difficulty)).size === 1;
    const { data: attempt, error: attemptError } = await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      quiz_key: session.mode || 'Practice',
      topic_slug: topics.length === 1 ? topics[0].label : null,
      difficulty: oneDifficulty ? session.questions[0].difficulty : null,
      started_at: new Date(session.startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      seconds_spent: session.elapsedSeconds || 0,
      awarded_marks: session.marksEarned || 0,
      maximum_marks: session.maxMarks || 0
    }).select('id').single();
    if (attemptError) throw attemptError;

    const questionRows = (session.review || []).map(item => ({
      user_id: user.id,
      quiz_attempt_id: attempt.id,
      question_key: item.q.id,
      topic_slug: item.q.topic,
      difficulty: item.q.difficulty,
      student_response: { answer: item.a || '' },
      is_correct: Boolean(item.r.correct),
      awarded_marks: item.r.marks || 0,
      maximum_marks: item.q.marks || 0,
      feedback: item.r.reason || ''
    }));
    if (questionRows.length) {
      const { error } = await supabase.from('question_attempts').insert(questionRows);
      if (error) throw error;
    }

    if (topics.length) {
      const names = topics.map(topic => topic.label);
      const { data: previous, error: readError } = await supabase.from('topic_mastery')
        .select('topic_slug,mastery_score,attempt_count').in('topic_slug', names);
      if (readError) throw readError;
      const existing = new Map((previous || []).map(row => [row.topic_slug, row]));
      const rows = topics.map(topic => {
        const old = existing.get(topic.label) || { mastery_score: 0, attempt_count: 0 };
        const added = topic.attempted || 0;
        const total = old.attempt_count + added;
        const mastery = total
          ? Math.round(((old.mastery_score * old.attempt_count) + (topic.percentage * added)) / total)
          : topic.percentage;
        return {
          user_id: user.id,
          topic_slug: topic.label,
          mastery_score: mastery,
          attempt_count: total,
          confidence: Math.max(1, Math.min(5, Math.ceil(total / 3))),
          last_assessed_at: new Date().toISOString()
        };
      });
      const { error } = await supabase.from('topic_mastery').upsert(rows, { onConflict: 'user_id,topic_slug' });
      if (error) throw error;
    }
    markLocalSynced(session.id);
    return { synced: true, id: attempt.id };
  } catch (error) {
    return failure(error);
  }
}

export const quizService = {
  recordSession,
  async migrateLocal() {
    const pending = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(RESULTS_PREFIX)) continue;
      try {
        const report = JSON.parse(localStorage.getItem(key));
        if (report?.submitted && !report.cloudSynced) pending.push(report);
      } catch { /* Leave unreadable data untouched. */ }
    }
    const failures = [];
    for (const report of pending) {
      const result = await recordSession(report);
      if (!result?.synced) failures.push(report.id);
    }
    return { migrated: pending.length - failures.length, failed: failures };
  },
  forgetDevice() {
    const remove = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(RESULTS_PREFIX)) continue;
      try {
        if (JSON.parse(localStorage.getItem(key))?.cloudSynced) remove.push(key);
      } catch { /* Keep anything that cannot be verified as synced. */ }
    }
    remove.forEach(key => localStorage.removeItem(key));
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (session?.cloudSynced) localStorage.removeItem(SESSION_KEY);
    } catch { /* Keep it. */ }
    return remove.length;
  },
  async recordAttempt(record) {
    const account = await signedIn();
    if (!account.supabase) return account;
    const { data, error } = await account.supabase.from('question_attempts').insert({ ...record, user_id: account.user.id });
    return error ? failure(error) : data;
  }
};
