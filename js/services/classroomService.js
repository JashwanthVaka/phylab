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
  const [{ data: memberships, error: memberError }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase.from('class_memberships').select('user_id,created_at').eq('class_id', row.id),
    supabase.from('assignments').select('*').eq('class_id', row.id).order('created_at', { ascending: false }),
  ]);
  if (memberError) fail(memberError);
  if (assignmentError) fail(assignmentError);
  const ids = (memberships || []).map(item => item.user_id);
  if (!ids.length) return { ...row, students: [], assignments: assignments || [] };
  const [{ data: profiles, error: profileError }, { data: progress, error: progressError }, { data: mastery, error: masteryError }] = await Promise.all([
    supabase.from('profiles').select('id,display_name').in('id', ids),
    supabase.from('lesson_progress').select('user_id,completion_percentage').in('user_id', ids),
    supabase.from('topic_mastery').select('user_id,mastery_score,attempt_count').in('user_id', ids),
  ]);
  if (profileError) fail(profileError);
  if (progressError) fail(progressError);
  if (masteryError) fail(masteryError);
  const students = ids.map(id => {
    const lessons = (progress || []).filter(item => item.user_id === id);
    const topics = (mastery || []).filter(item => item.user_id === id && Number(item.attempt_count) > 0);
    return {
      id,
      name: profiles?.find(item => item.id === id)?.display_name || 'Learner',
      lessonsCompleted: lessons.filter(item => Number(item.completion_percentage) >= 100).length,
      mastery: topics.length ? Math.round(topics.reduce((sum, item) => sum + Number(item.mastery_score || 0), 0) / topics.length) : null,
    };
  });
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
