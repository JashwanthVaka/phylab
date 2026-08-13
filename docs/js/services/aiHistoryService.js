import { getSupabase } from './supabaseClient.js';

export const aiHistoryService = {
  async list() { const s = await getSupabase(); return s ? (await s.from('ai_conversations').select('*').order('updated_at', { ascending: false })).data || [] : []; },
  async createConversation(record) { const s = await getSupabase(); if (!s) return null; const { data: { user } } = await s.auth.getUser(); if (!user) return null; return s.from('ai_conversations').insert({ ...record, user_id: user.id }).select().single(); },
  async update(id, patch) { const s = await getSupabase(); return s?.from('ai_conversations').update(patch).eq('id', id); },
  async rename(id, title) { return this.update(id, { title }); },
  async remove(id) { const s = await getSupabase(); return s?.from('ai_conversations').delete().eq('id', id); },
  async messages(conversation_id) { const s = await getSupabase(); return s ? (await s.from('ai_messages').select('*').eq('conversation_id', conversation_id).order('created_at')).data || [] : []; },
  async addMessage(record) { const s = await getSupabase(); if (!s) return null; const { data: { user } } = await s.auth.getUser(); if (!user) return null; return s.from('ai_messages').insert({ ...record, user_id: user.id }).select().single(); },
  async removeMessage(id) { const s = await getSupabase(); return s?.from('ai_messages').delete().eq('id', id); }
};
