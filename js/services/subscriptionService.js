import { getSupabase } from './supabaseClient.js';

/**
 * Billing-ready entitlement reader. KINETIQ has no paid plan or checkout yet,
 * so every learner receives launch access. A future billing webhook may write
 * the private subscriptions table; browser code can only read its own row.
 */
export const subscriptionService = {
  async current() {
    const fallback = { plan: 'launch', status: 'active', paid: false, label: 'Launch access' };
    const db = await getSupabase();
    if (!db) return fallback;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return fallback;
    const { data, error } = await db.from('subscriptions').select('plan_key,status,current_period_end').eq('user_id', user.id).maybeSingle();
    if (error || !data) return fallback;
    return { plan: data.plan_key, status: data.status, paid: data.plan_key !== 'launch', label: data.plan_key === 'launch' ? 'Launch access' : data.plan_key, renewsAt: data.current_period_end };
  }
};
