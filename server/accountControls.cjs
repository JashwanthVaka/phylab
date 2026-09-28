'use strict';

const config = () => ({
  url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
});

const configured = () => Object.values(config()).every(Boolean);
const bearer = req => String(req.headers.authorization || '').startsWith('Bearer ')
  ? String(req.headers.authorization).slice(7).trim() : '';

async function request(path, { key, authorization = key, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${config().url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(`Supabase returned ${response.status}.`), { status: response.status, result });
  return result;
}

async function currentUser(req) {
  const token = bearer(req);
  if (!token) return null;
  try { return await request('/auth/v1/user', { key: config().anonKey, authorization: token }); }
  catch { return null; }
}

const EXPORT_TABLES = Object.freeze([
  ['profiles', 'id'], ['user_settings', 'user_id'], ['lesson_progress', 'user_id'],
  ['topic_mastery', 'user_id'], ['quiz_attempts', 'user_id'], ['question_attempts', 'user_id'],
  ['bookmarks', 'user_id'], ['flashcard_progress', 'user_id'], ['study_sessions', 'user_id'],
  ['revision_plans', 'user_id'], ['revision_tasks', 'user_id'], ['ai_conversations', 'user_id'],
  ['ai_messages', 'user_id'], ['class_memberships', 'user_id'], ['assignment_submissions', 'student_id'],
  ['teacher_classes', 'teacher_id'], ['assignments', 'teacher_id'],
  ['subscriptions', 'user_id'], ['content_feedback', 'user_id'],
]);

async function rows(table, column, userId) {
  const result = [];
  for (let start = 0; start < 5000; start += 1000) {
    const page = await request(`/rest/v1/${table}?${column}=eq.${encodeURIComponent(userId)}&select=*`, {
      key: config().secretKey,
      headers: { Range: `${start}-${start + 999}`, Prefer: 'count=none' },
    });
    if (!Array.isArray(page)) break;
    result.push(...page);
    if (page.length < 1000) break;
  }
  return result;
}

async function quizAnswers(attempts = []) {
  const ids = attempts.map(item => item.id).filter(id => /^[0-9a-f-]{36}$/i.test(id));
  const result = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const group = ids.slice(offset, offset + 100).join(',');
    const page = await request(`/rest/v1/quiz_answers?quiz_attempt_id=in.(${group})&select=*`, {
      key: config().secretKey,
    });
    if (Array.isArray(page)) result.push(...page);
  }
  return result;
}

async function exportHandler(req, res, send) {
  if (!configured()) return send(res, 503, { error: 'Account controls are not configured.' });
  const user = await currentUser(req);
  if (!user?.id) return send(res, 401, { error: 'Sign in to export your account data.' });
  try {
    const entries = await Promise.all(EXPORT_TABLES.map(async ([table, column]) => [table, await rows(table, column, user.id)]));
    const attempts = entries.find(([table]) => table === 'quiz_attempts')?.[1] || [];
    entries.push(['quiz_answers', await quizAnswers(attempts)]);
    return send(res, 200, {
      format: 'kinetiq.account', version: 1, exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email || null, createdAt: user.created_at || null },
      data: Object.fromEntries(entries),
    }, { 'Cache-Control': 'no-store' });
  } catch (error) {
    return send(res, 502, { error: `Could not export your account data: ${error.message}` });
  }
}

async function deleteHandler(req, res, send, body = {}) {
  if (!configured()) return send(res, 503, { error: 'Account controls are not configured.' });
  if (body.confirmation !== 'DELETE') return send(res, 400, { error: 'Type DELETE to confirm account deletion.' });
  const user = await currentUser(req);
  if (!user?.id) return send(res, 401, { error: 'Sign in before deleting your account.' });
  try {
    await request(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE', key: config().secretKey,
    });
    return send(res, 200, { deleted: true });
  } catch (error) {
    return send(res, 502, { error: `Could not delete the account: ${error.message}` });
  }
}

module.exports = { configured, EXPORT_TABLES, exportHandler, deleteHandler };
