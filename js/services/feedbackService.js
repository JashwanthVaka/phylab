import { getSupabase } from './supabaseClient.js';

const CATEGORIES = new Set(['content', 'question', 'visual', 'accessibility', 'idea', 'other']);

export const feedbackService = {
  async list() {
    const database = await getSupabase();
    if (!database) return [];
    const { data: { user } } = await database.auth.getUser();
    if (!user) return [];
    const { data, error } = await database.from('content_feedback')
      .select('id,category,page_path,content_ref,message,status,created_at,updated_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(25);
    if (error) throw new Error(error.message || 'Your reports could not be loaded.');
    return data || [];
  },

  async submit(values = {}) {
    const database = await getSupabase();
    if (!database) throw new Error('Sign-in services are unavailable right now.');
    const { data: { user } } = await database.auth.getUser();
    if (!user) throw new Error('Sign in before sending a private report.');
    const category = CATEGORIES.has(values.category) ? values.category : 'other';
    const message = String(values.message || '').trim();
    if (message.length < 10) throw new Error('Please give at least one complete sentence.');
    const row = {
      user_id: user.id,
      category,
      page_path: String(values.page_path || location.pathname).slice(0, 500),
      content_ref: String(values.content_ref || '').trim().slice(0, 200) || null,
      message: message.slice(0, 2000),
    };
    const { data, error } = await database.from('content_feedback').insert(row).select('id,status,created_at').single();
    if (error) throw new Error(error.message || 'The report could not be sent.');
    return data;
  },
};
