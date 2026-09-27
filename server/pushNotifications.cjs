'use strict';

const crypto = require('node:crypto');
const webpush = require('web-push');

const config = () => ({
  url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'https://getkinetiq.vercel.app',
  cronSecret: process.env.CRON_SECRET || '',
});

const configured = () => {
  const value = config();
  return Boolean(value.url && value.anonKey && value.secretKey && value.publicKey && value.privateKey);
};

const bearer = req => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

async function request(path, { method = 'GET', body, key, authorization = key, prefer } = {}) {
  const { url } = config();
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(`Supabase returned ${response.status}.`), { status: response.status, result });
  return result;
}

async function currentUser(token) {
  const { anonKey } = config();
  if (!token) return null;
  try { return await request('/auth/v1/user', { key: anonKey, authorization: token }); }
  catch { return null; }
}

function validSubscription(value) {
  const endpoint = String(value?.endpoint || '');
  const p256dh = String(value?.keys?.p256dh || '');
  const auth = String(value?.keys?.auth || '');
  return /^https:\/\//.test(endpoint) && endpoint.length <= 2048
    && /^[A-Za-z0-9_-]{40,200}$/.test(p256dh)
    && /^[A-Za-z0-9_-]{8,100}$/.test(auth);
}

function initialiseVapid() {
  const { subject, publicKey, privateKey } = config();
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

async function send(subscription, payload) {
  initialiseVapid();
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 86400, urgency: 'normal' });
}

async function subscribeHandler(req, res, sendJSON, body = {}) {
  if (!configured()) return sendJSON(res, 503, { error: 'Scheduled reminders are not configured yet.' });
  const user = await currentUser(bearer(req));
  if (!user?.id) return sendJSON(res, 401, { error: 'Sign in to enable scheduled reminders.' });
  if (!validSubscription(body.subscription)) return sendJSON(res, 400, { error: 'This browser did not provide a valid push subscription.' });

  const row = {
    user_id: user.id,
    endpoint: body.subscription.endpoint,
    p256dh: body.subscription.keys.p256dh,
    auth: body.subscription.keys.auth,
    timezone: /^[A-Za-z0-9_+\-/]{1,80}$/.test(body.timezone || '') ? body.timezone : 'UTC',
    enabled: true,
    failure_count: 0,
  };
  try {
    const { secretKey } = config();
    await request('/rest/v1/push_subscriptions?on_conflict=endpoint', {
      method: 'POST', key: secretKey, prefer: 'resolution=merge-duplicates,return=minimal', body: row,
    });
    let testDelivered = false;
    try {
      await send(body.subscription, {
        title: 'KINETIQ reminders are ready',
        body: 'Due flashcards and revision tasks can now reach this device.',
        url: '/revision', tag: 'kinetiq-reminders-ready',
      });
      testDelivered = true;
    } catch { /* Saved subscriptions are retried by the daily sender. */ }
    return sendJSON(res, 200, { subscribed: true, testDelivered });
  } catch (error) {
    return sendJSON(res, 502, { error: `Could not save this reminder subscription: ${error.message}` });
  }
}

async function unsubscribeHandler(req, res, sendJSON, body = {}) {
  if (!configured()) return sendJSON(res, 503, { error: 'Scheduled reminders are not configured yet.' });
  const user = await currentUser(bearer(req));
  if (!user?.id) return sendJSON(res, 401, { error: 'Sign in to change scheduled reminders.' });
  const endpoint = String(body.endpoint || '');
  if (!/^https:\/\//.test(endpoint)) return sendJSON(res, 400, { error: 'A valid subscription endpoint is required.' });
  try {
    const { secretKey } = config();
    const query = `?user_id=eq.${encodeURIComponent(user.id)}&endpoint=eq.${encodeURIComponent(endpoint)}`;
    await request(`/rest/v1/push_subscriptions${query}`, { method: 'DELETE', key: secretKey, prefer: 'return=minimal' });
    return sendJSON(res, 200, { subscribed: false });
  } catch (error) {
    return sendJSON(res, 502, { error: `Could not disable this reminder subscription: ${error.message}` });
  }
}

const digestPayload = item => {
  const cards = Number(item.due_cards || 0);
  const tasks = Number(item.due_tasks || 0);
  const parts = [];
  if (cards) parts.push(`${cards} flashcard${cards === 1 ? '' : 's'}`);
  if (tasks) parts.push(`${tasks} revision task${tasks === 1 ? '' : 's'}`);
  return {
    title: 'Your KINETIQ review is ready',
    body: `${parts.join(' and ')} due. Open your capped daily session.`,
    url: '/revision', tag: `kinetiq-review-${new Date().toISOString().slice(0, 10)}`,
  };
};

async function cronHandler(req, res, sendJSON) {
  const value = config();
  if (!configured() || !value.cronSecret) return sendJSON(res, 503, { error: 'Scheduled reminders are not fully configured.' });
  if (!safeEqual(req.headers.authorization, `Bearer ${value.cronSecret}`)) return sendJSON(res, 401, { error: 'Unauthorized.' });

  const day = new Date().toISOString().slice(0, 10);
  try {
    const rows = await request('/rest/v1/rpc/claim_push_digest', {
      method: 'POST', key: value.secretKey, body: { p_day: day, p_limit: 1000 },
    });
    const delivered = []; const expired = []; const failed = [];
    const queue = Array.isArray(rows) ? rows : [];
    for (let start = 0; start < queue.length; start += 20) {
      await Promise.all(queue.slice(start, start + 20).map(async item => {
        try {
          await send({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, digestPayload(item));
          delivered.push(item.subscription_id);
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) expired.push(item.subscription_id);
          else failed.push(item.subscription_id);
        }
      }));
    }
    await request('/rest/v1/rpc/finish_push_digest', {
      method: 'POST', key: value.secretKey,
      body: { p_day: day, p_delivered: delivered, p_expired: expired, p_failed: failed },
    });
    return sendJSON(res, 200, { claimed: queue.length, delivered: delivered.length, expired: expired.length, failed: failed.length });
  } catch (error) {
    return sendJSON(res, 502, { error: `Reminder delivery failed: ${error.message}` });
  }
}

module.exports = { configured, validSubscription, digestPayload, subscribeHandler, unsubscribeHandler, cronHandler };
