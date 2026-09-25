import { getSupabase } from './supabaseClient.js';

const fail = error => { throw new Error(error?.message || 'The classroom could not be updated.'); };

async function context() {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Accounts are not available.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to use classes.');
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) fail(error);
  return { supabase, user, profile };
}

async function teacherClass(supabase, row) {
  const [{ data: summaries, error: summaryError }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase.rpc('teacher_student_summaries', { p_class_id: row.id }),
    supabase.from('assignments').select('*').eq('class_id', row.id).order('created_at', { ascending: false }),
  ]);
  if (summaryError) fail(summaryError);
  if (assignmentError) fail(assignmentError);
  const students = (summaries || []).map(item => ({
    id: item.student_id,
    name: item.display_name || 'Learner',
    lessonsCompleted: Number(item.lessons_completed || 0),
    mastery: item.assessed_mastery_average == null ? null : Math.round(Number(item.assessed_mastery_average)),
    assessedTopics: Number(item.assessed_topic_count || 0),
    quizAttempts: Number(item.quiz_attempt_count || 0),
    quizAwardedMarks: Number(item.quiz_awarded_marks || 0),
    quizMaximumMarks: Number(item.quiz_maximum_marks || 0),
  }));
  return { ...row, students, assignments: assignments || [] };
}

export const classroomService = {
  async overview() {
    const { supabase, profile } = await context();
    const role = profile?.role || 'student';
    if (role === 'teacher' || role === 'admin') {
      const { data, error } = await supabase.from('teacher_classes').select('*').order('created_at', { ascending: false });
      if (error) fail(error);
      return { role, classes: await Promise.all((data || []).map(row => teacherClass(supabase, row))) };
    }
    const { data: memberships, error } = await supabase.from('class_memberships').select('class_id,created_at');
    if (error) fail(error);
    const ids = (memberships || []).map(item => item.class_id);
    if (!ids.length) return { role, classes: [] };
    const [{ data: classes, error: classError }, { data: assignments, error: assignmentError }] = await Promise.all([
      supabase.from('teacher_classes').select('id,name,created_at').in('id', ids),
      supabase.from('assignments').select('*').in('class_id', ids).eq('status', 'published').order('due_at', { ascending: true }),
    ]);
    if (classError) fail(classError);
    if (assignmentError) fail(assignmentError);
    return { role, classes: (classes || []).map(row => ({ ...row, assignments: (assignments || []).filter(item => item.class_id === row.id) })) };
  },

  async join(code) {
    const { supabase } = await context();
    const { data, error } = await supabase.rpc('join_class', { p_join_code: String(code || '').trim() });
    if (error) fail(error);
    return data?.[0] || null;
  },

  async createClass(name) {
    const { supabase, user, profile } = await context();
    if (!['teacher', 'admin'].includes(profile?.role)) throw new Error('Teacher access is required.');
    const { data, error } = await supabase.from('teacher_classes').insert({ teacher_id: user.id, name: String(name || '').trim() }).select().single();
    if (error) fail(error);
    return data;
  },

  async createAssignment(values) {
    const { supabase, user, profile } = await context();
    if (!['teacher', 'admin'].includes(profile?.role)) throw new Error('Teacher access is required.');
    const row = {
      class_id: values.classId,
      teacher_id: user.id,
      title: String(values.title || '').trim(),
      instructions: String(values.instructions || '').trim() || null,
      due_at: values.dueAt || null,
      status: 'published',
      content: {
        type: 'kinetiq-practice', topic: values.topic || 'all', questionCount: Number(values.questionCount || 10),
        level: ['SL', 'HL'].includes(values.level) ? values.level : '',
        paper: ['1A', '1B', '2'].includes(values.paper) ? values.paper : '',
        difficulty: ['easy', 'medium', 'hard'].includes(values.difficulty) ? values.difficulty : ''
      },
    };
    const { data, error } = await supabase.from('assignments').insert(row).select().single();
    if (error) fail(error);
    return data;
  },

  async leave(classId) {
    const { supabase, user } = await context();
    const { error } = await supabase.from('class_memberships').delete().eq('class_id', classId).eq('user_id', user.id);
    if (error) fail(error);
  },
};
