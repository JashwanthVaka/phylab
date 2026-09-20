import { getSupabase } from './supabaseClient.js';
import { accountRows } from './accountRows.js';
import { learningStorage as localStorage, storageFor } from './learningStorage.js';

const failure = error => ({ error: error?.message || 'Practice could not be synced.' });
const RESULTS_PREFIX = 'phylab_quiz_results:';
const SESSION_KEY = 'phylab_quiz_session';

function markLocalSynced(id, localStorage) {
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
  const local = storageFor(user.id);
  try {
    const topics = session.analytics?.topics || [];
    const oneDifficulty = session.questions?.length
      && new Set(session.questions.map(item => item.difficulty)).size === 1;
    const { data: attempt, error: attemptError } = await supabase.from('quiz_attempts').upsert({
      id: session.id,
      user_id: user.id,
      quiz_key: session.mode || 'Practice',
      topic_slug: topics.length === 1 ? topics[0].label : null,
      difficulty: oneDifficulty ? session.questions[0].difficulty : null,
      started_at: new Date(session.startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      seconds_spent: session.elapsedSeconds || 0,
      awarded_marks: session.marksEarned || 0,
      maximum_marks: session.maxMarks || 0
    }, { onConflict: 'id' }).select('id').single();
    if (attemptError) throw attemptError;

    const questionRows = await Promise.all((session.review || []).map(async item => ({
      id: await answerId(session.id, item.q.id),
      user_id: user.id,
      quiz_attempt_id: attempt.id,
      question_key: item.q.id,
      topic_slug: item.q.topic,
      difficulty: item.q.difficulty,
      student_response: { answer: item.a || '', question: item.q, assessment: item.r },
      is_correct: Boolean(item.r.correct),
      awarded_marks: item.r.marks || 0,
      maximum_marks: item.q.marks || 0,
      feedback: item.r.reason || ''
    })));
    if (questionRows.length) {
      const { error } = await supabase.from('question_attempts').upsert(questionRows, { onConflict: 'id' });
      if (error) throw error;
    }

    if (topics.length) {
      const names = topics.map(topic => topic.label);
      const evidence = await accountRows(supabase, 'question_attempts', user.id);
      const rows = topics.map(topic => {
        const attempts = evidence.filter(row => row.topic_slug === topic.label);
        const total = attempts.length;
        const marks = attempts.reduce((sum, row) => sum + Number(row.awarded_marks || 0), 0);
        const max = attempts.reduce((sum, row) => sum + Number(row.maximum_marks || 0), 0);
        const mastery = max ? Math.round(marks / max * 100) : 0;
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
    markLocalSynced(session.id, local);
    return { synced: true, id: attempt.id };
  } catch (error) {
    return failure(error);
  }
}

/** Stable row IDs make a dropped connection/retry safe without duplicate marks. */
async function answerId(sessionId, questionId) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sessionId}:${questionId}`)));
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes.slice(0, 16)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export const quizService = {
  recordSession,
  async restore(questions = []) {
    const account = await signedIn();
    if (!account.supabase) return;
    const { supabase, user } = account;
    const [attempts, answers] = await Promise.all([
      accountRows(supabase, 'quiz_attempts', user.id),
      accountRows(supabase, 'question_attempts', user.id)
    ]);
    const { normalize, analytics } = await import('../quizSession.js');
    const byId = new Map(questions.map(q => [String(q.id), normalize(q)]));
    const local = storageFor(user.id);
    for (const attempt of attempts) {
      if (!attempt.completed_at) continue;
      let existing = null;
      try { existing = JSON.parse(local.getItem(`${RESULTS_PREFIX}${attempt.id}`) || 'null'); } catch { /* Replace an unreadable cache with the cloud record. */ }
      if (existing && !existing.cloudSynced) continue;
      const review = answers.filter(a => a.quiz_attempt_id === attempt.id).map(a => ({
        q: a.student_response?.question || byId.get(String(a.question_key)),
        a: a.student_response?.answer || '',
        r: a.student_response?.assessment || { correct: a.is_correct, marks: a.awarded_marks, reason: a.feedback }
      })).filter(item => item.q);
      const report = { id: attempt.id, mode: attempt.quiz_key, submitted: true, cloudSynced: true,
        startedAt: new Date(attempt.started_at).getTime(), elapsedSeconds: attempt.seconds_spent,
        marksEarned: attempt.awarded_marks, maxMarks: attempt.maximum_marks, review };
      report.analytics = analytics(report);
      local.setItem(`${RESULTS_PREFIX}${attempt.id}`, JSON.stringify(report));
    }
  },
  async migrateLocal() {
    const guest = storageFor(null);
    const pending = [];
    for (let index = 0; index < guest.length; index += 1) {
      const key = guest.key(index);
      if (!key?.startsWith(RESULTS_PREFIX)) continue;
      try {
        const report = JSON.parse(guest.getItem(key));
        if (report?.submitted && !report.cloudSynced) pending.push(report);
      } catch { /* Leave unreadable data untouched. */ }
    }
    const failures = [];
    for (const report of pending) {
      const result = await recordSession(report);
      if (!result?.synced) failures.push(report.id);
      else {
        guest.removeItem(`${RESULTS_PREFIX}${report.id}`);
        try {
          const session = JSON.parse(guest.getItem(SESSION_KEY) || 'null');
          if (session?.id === report.id) guest.removeItem(SESSION_KEY);
        } catch { /* Keep an unreadable session rather than deleting unknown data. */ }
      }
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
