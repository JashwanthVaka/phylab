/**
 * The owner's view of who is using KINETIQ.
 *
 * This page renders whatever /api/admin/stats agrees to return and nothing
 * else. It holds no allowlist and makes no decision about who may see the
 * numbers -- that is settled on the server, because anything decided here
 * could be read out of the bundle or bypassed by calling the endpoint
 * directly. If the server says 403, this page has nothing to show and says so.
 */

import { escapeHTML } from './utils.js';
import { getSupabase } from './services/supabaseClient.js';

const shell = body => `<section class="page admin-page">
  <p class="eyebrow">KINETIQ ADMIN</p>
  <h1>Who is using KINETIQ.</h1>
  ${body}
</section>`;

const notice = (heading, detail, extra = '') => shell(`
  <div class="empty-state admin-notice">
    <h3>${escapeHTML(heading)}</h3>
    <p>${detail}</p>
    ${extra}
  </div>`);

const SETUP = `
  <ol class="admin-steps">
    <li>Create a project at <b>supabase.com</b>, then open <b>Project Settings → API</b>.</li>
    <li>Put the <b>Project URL</b> and <b>anon public</b> key into <code>public-env.js</code>. These two are safe in the browser.</li>
    <li>In your host's environment settings (Vercel → Settings → Environment Variables) add
      <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>,
      <code>SUPABASE_SERVICE_ROLE_KEY</code> and <code>ADMIN_EMAILS</code>.</li>
    <li><b>The service-role key is a secret.</b> It can read and change every user in your
      project. It belongs only in the host's environment settings, never in
      <code>public-env.js</code>, never in the repository.</li>
    <li>Set <code>ADMIN_EMAILS</code> to your own Google address. Only addresses on that
      list can load this page.</li>
    <li>In Supabase, open <b>Authentication → Providers → Google</b>, enable it, and paste in a
      Google OAuth client ID and secret from <b>console.cloud.google.com</b>. Add
      <code>https://&lt;your-project&gt;.supabase.co/auth/v1/callback</code> as an authorised
      redirect URI there.</li>
  </ol>`;

const number = value => Number(value ?? 0).toLocaleString();
const when = value => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const PROVIDER_LABEL = { google: 'Google', email: 'Email and password', github: 'GitHub', apple: 'Apple' };

function stat(label, value, note) {
  return `<article class="admin-stat">
    <span class="tag">${escapeHTML(label)}</span>
    <b>${escapeHTML(number(value))}</b>
    ${note ? `<span class="admin-stat__note">${escapeHTML(note)}</span>` : ''}
  </article>`;
}

/** Thirty days of sign-ups as bars, labelled so the shape is readable without hover. */
function trendChart(trend) {
  const peak = Math.max(1, ...trend.map(day => day.count));
  const total = trend.reduce((sum, day) => sum + day.count, 0);
  return `<div class="admin-panel">
    <div class="admin-panel__head">
      <h2>Sign-ups, last 30 days</h2>
      <span class="admin-panel__note">${number(total)} in total</span>
    </div>
    <div class="admin-trend" role="img" aria-label="Daily sign-ups over the last 30 days, peaking at ${peak}">
      ${trend.map(day => `<span class="admin-trend__bar" style="--h:${Math.round((day.count / peak) * 100)}%" title="${escapeHTML(day.date)}: ${day.count}"></span>`).join('')}
    </div>
    <div class="admin-trend__axis"><span>${escapeHTML(trend[0]?.date || '')}</span><span>${escapeHTML(trend[trend.length - 1]?.date || '')}</span></div>
  </div>`;
}

function providerTable(byProvider, totalUsers) {
  const rows = Object.entries(byProvider).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  return `<div class="admin-panel">
    <div class="admin-panel__head"><h2>How they signed in</h2></div>
    <ul class="admin-providers">
      ${rows.map(([provider, count]) => {
        const share = totalUsers ? Math.round((count / totalUsers) * 100) : 0;
        return `<li>
          <span class="admin-providers__name">${escapeHTML(PROVIDER_LABEL[provider] || provider)}</span>
          <span class="admin-providers__bar"><span style="width:${share}%"></span></span>
          <span class="admin-providers__count">${number(count)} · ${share}%</span>
        </li>`;
      }).join('')}
    </ul>
  </div>`;
}

function recentTable(recent) {
  if (!recent.length) return '';
  return `<div class="admin-panel">
    <div class="admin-panel__head">
      <h2>Most recent accounts</h2>
      <span class="admin-panel__note">Newest ${recent.length}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Account</th><th>Method</th><th>Joined</th><th>Last seen</th><th>Verified</th></tr></thead>
        <tbody>
          ${recent.map(user => `<tr>
            <td>${escapeHTML(user.email)}${user.name ? `<br><span class="muted">${escapeHTML(user.name)}</span>` : ''}</td>
            <td>${escapeHTML(PROVIDER_LABEL[user.provider] || user.provider)}</td>
            <td>${escapeHTML(when(user.createdAt))}</td>
            <td>${escapeHTML(when(user.lastSignInAt))}</td>
            <td>${user.confirmed ? 'Yes' : 'No'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function dashboard(data) {
  const { totals } = data;
  return shell(`
    <p class="page-lead">Live from Supabase. Only addresses on the server's <code>ADMIN_EMAILS</code> list can load this.</p>
    <div class="admin-stats">
      ${stat('Total accounts', totals.users)}
      ${stat('New this week', totals.newThisWeek)}
      ${stat('Active this week', totals.activeThisWeek, 'signed in within 7 days')}
      ${stat('Active this month', totals.activeThisMonth, 'signed in within 30 days')}
      ${stat('Verified', totals.confirmed, `${number(totals.unconfirmed)} still unverified`)}
    </div>
    ${trendChart(data.trend || [])}
    ${providerTable(data.byProvider || {}, totals.users)}
    ${recentTable(data.recent || [])}
    <p class="muted admin-generated">Read at ${escapeHTML(new Date(data.generatedAt).toLocaleString())}.</p>
  `);
}

export async function adminPage() {
  const supabase = await getSupabase();
  if (!supabase) {
    return notice('Accounts are not configured yet',
      'KINETIQ is running without Supabase, so there are no accounts to report on. Progress is stored per browser until you configure it.',
      SETUP);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return notice('Sign in first',
      'This page is only available to the site owner. Sign in with the account on the administrator list.',
      '<p><a class="button" href="/login" data-route>Go to sign in</a></p>');
  }

  let response;
  try {
    response = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    return notice('Could not reach the server', 'The statistics endpoint did not respond. Check that the app is running with its server rather than as a static copy.');
  }

  if (response.status === 503) {
    const body = await response.json().catch(() => ({}));
    const missing = (body.missing || []).map(item => `<code>${escapeHTML(item)}</code>`).join(', ');
    return notice('Admin statistics are not configured',
      `This deployment is missing ${missing || 'its Supabase settings'}.`, SETUP);
  }
  if (response.status === 401) {
    return notice('Your session has expired', 'Sign in again to view this page.',
      '<p><a class="button" href="/login" data-route>Go to sign in</a></p>');
  }
  if (response.status === 403) {
    return notice('This account is not an administrator',
      'You are signed in, but this address is not on the administrator list for this deployment.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return notice('Could not read the user list', escapeHTML(body.error || `The server returned ${response.status}.`));
  }

  return dashboard(await response.json());
}
