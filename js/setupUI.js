/**
 * A setup page for the site owner.
 *
 * Turning on real accounts needs two things this app cannot create for itself:
 * a Supabase project and a Google OAuth client. Both live in accounts only the
 * owner can open, so the work cannot be removed -- but the guessing can.
 *
 * The value here is the checking. Pasting a key and finding out days later
 * that it was the wrong one is the failure this page exists to prevent: it
 * calls Supabase with what you paste and tells you immediately whether the
 * project answers, whether the key is the right one, and whether Google is
 * switched on for it.
 */

import { escapeHTML } from './utils.js';

const STORE = 'kinetiq_setup_draft';

const readDraft = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch { return {}; }
};

export function setupPage() {
  const draft = readDraft();
  return `<section class="page setup-page">
    <p class="eyebrow">SITE SETUP</p>
    <h1>Turn on real accounts.</h1>
    <p class="page-lead">Google will only sign people in to an app it knows about, so KINETIQ needs a project of its own. This page checks each value as you paste it, so nothing is left to guess.</p>

    <ol class="setup-steps">
      <li class="setup-step">
        <h2><span>1</span> Create the project</h2>
        <p>Open <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">supabase.com/dashboard</a> and sign in with GitHub. You already have an account there, so there is no new password. Choose <b>New project</b>, give it any name, pick the nearest region, and let it finish starting up.</p>
      </li>

      <li class="setup-step">
        <h2><span>2</span> Copy the two public values</h2>
        <p>In that project open <b>Project Settings → API</b>. Copy the <b>Project URL</b> and the key labelled <b>anon</b> <b>public</b>. Both are designed to be seen by browsers.</p>
        <p class="setup-warn"><b>Do not paste the <code>service_role</code> key here.</b> It can read and change every user in your project. It goes only into Vercel, in step 4.</p>

        <label for="setupUrl">Project URL
          <input id="setupUrl" type="url" spellcheck="false" autocomplete="off"
                 placeholder="https://abcdefgh.supabase.co" value="${escapeHTML(draft.url || '')}">
        </label>
        <label for="setupAnon">anon public key
          <input id="setupAnon" type="text" spellcheck="false" autocomplete="off"
                 placeholder="eyJhbGciOi…" value="${escapeHTML(draft.anon || '')}">
        </label>

        <div class="setup-actions">
          <button type="button" class="button" data-setup-check>Check these values</button>
        </div>
        <div class="setup-result" data-setup-result role="status" aria-live="polite"></div>
      </li>

      <li class="setup-step">
        <h2><span>3</span> Switch on Google</h2>
        <p>In Supabase open <b>Authentication → Providers → Google</b> and enable it. It asks for a client ID and secret, which you make at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a> under <b>Create credentials → OAuth client ID → Web application</b>.</p>
        <p>Google will ask for an authorised redirect URI. Paste this one, which Supabase also shows on the same screen:</p>
        <div class="setup-copy"><code data-setup-callback>Fill in the Project URL above first</code><button type="button" class="text-button" data-copy="callback">Copy</button></div>
        <p>And add your site as an authorised JavaScript origin:</p>
        <div class="setup-copy"><code data-setup-origin>${escapeHTML(location.origin)}</code><button type="button" class="text-button" data-copy="origin">Copy</button></div>
      </li>

      <li class="setup-step">
        <h2><span>4</span> Give the values to the site</h2>
        <p>Open your project on <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">vercel.com</a>, then <b>Settings → Environment Variables</b>, and add these four. The first two are the values you checked above; the third is the secret <code>service_role</code> key from the same Supabase page; the fourth is your own address, which decides who may open the admin dashboard.</p>
        <div class="setup-vars" data-setup-vars></div>
        <p class="muted">Redeploy after saving them. This page will then say accounts are live, and <code>/login</code> becomes a real sign-in with a Google button.</p>
      </li>

      <li class="setup-step">
        <h2><span>5</span> Protect the database</h2>
        <p>In Supabase open the <b>SQL Editor</b> and run both migration files from this repository, in filename order:</p>
        <ul class="setup-files">
          <li><code>supabase/migrations/20260808_phylab_foundation.sql</code></li>
          <li><code>supabase/migrations/20260822_lock_profile_role.sql</code></li>
        </ul>
        <p class="setup-warn">Run <b>both</b>. The second closes a hole in the first: without it any signed-in student can make themselves an administrator and read every other student's work.</p>
      </li>
    </ol>

    <div class="setup-live" data-setup-live></div>
  </section>`;
}

/** Renders the four environment variables once a URL and key are known. */
function varsHTML(url, anon) {
  const rows = [
    ['SUPABASE_URL', url || 'https://YOURPROJECT.supabase.co'],
    ['SUPABASE_ANON_KEY', anon || '(the anon public key)'],
    ['SUPABASE_SERVICE_ROLE_KEY', '(the service_role key, secret)'],
    ['ADMIN_EMAILS', 'your@gmail.com'],
  ];
  return `<table class="setup-var-table"><tbody>${rows.map(([name, value]) =>
    `<tr><th><code>${escapeHTML(name)}</code></th><td><code>${escapeHTML(value)}</code></td></tr>`).join('')}</tbody></table>`;
}

export function bindSetup() {
  const page = document.querySelector('.setup-page');
  if (!page) return undefined;
  const controller = new AbortController();
  const urlInput = page.querySelector('#setupUrl');
  const anonInput = page.querySelector('#setupAnon');
  const result = page.querySelector('[data-setup-result]');
  const vars = page.querySelector('[data-setup-vars]');
  const callback = page.querySelector('[data-setup-callback]');

  const refresh = () => {
    const url = urlInput.value.trim().replace(/\/$/, '');
    vars.innerHTML = varsHTML(url, anonInput.value.trim());
    callback.textContent = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)
      ? `${url}/auth/v1/callback`
      : 'Fill in the Project URL above first';
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ url, anon: anonInput.value.trim() }));
    } catch { /* Draft only; not being able to keep it is harmless. */ }
  };

  const say = (tone, heading, detail) => {
    result.dataset.tone = tone;
    result.innerHTML = `<b>${escapeHTML(heading)}</b>${detail ? `<p>${detail}</p>` : ''}`;
  };

  /**
   * Asks the project itself whether these values work.
   *
   * The settings endpoint is the useful one: it answers without a session, so
   * a correct key gets a real reply and a wrong one gets a clear rejection --
   * and it lists the providers, which is how we can say whether Google is on
   * without the owner having to come back and find out by failing to sign in.
   */
  page.querySelector('[data-setup-check]').addEventListener('click', async () => {
    const url = urlInput.value.trim().replace(/\/$/, '');
    const anon = anonInput.value.trim();
    refresh();

    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
      return say('bad', 'That does not look like a project URL.', 'It should look like <code>https://abcdefgh.supabase.co</code>, with no path after it.');
    }
    if (anon.length < 30) {
      return say('bad', 'That key looks too short.', 'Copy the whole <b>anon public</b> value. It is long and usually starts <code>eyJ</code>.');
    }
    if (/service_role/i.test(anon)) {
      return say('bad', 'That is the service_role key.', 'It must never go in a browser. Use the <b>anon public</b> key here, and keep the other one for Vercel only.');
    }

    say('busy', 'Checking…', 'Asking your project whether these values work.');
    try {
      const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
      if (response.status === 401) {
        return say('bad', 'The project answered, but rejected that key.', 'The URL is right. Copy the <b>anon public</b> key again from Project Settings → API.');
      }
      if (!response.ok) {
        return say('bad', `The project answered with ${response.status}.`, 'If the project was only just created it may still be starting. Wait a minute and try again.');
      }
      const settings = await response.json();
      const googleOn = Boolean(settings?.external?.google);
      return say(googleOn ? 'ok' : 'warn',
        googleOn ? 'These values work, and Google is switched on.' : 'These values work. Google is not switched on yet.',
        googleOn
          ? 'Put them into Vercel in step 4, redeploy, and sign-in will be live.'
          : 'Finish step 3 to enable the Google provider, then put these into Vercel in step 4.');
    } catch {
      return say('bad', 'Could not reach that project.',
        'Check the URL for typos. A project that has been paused for inactivity also has to be resumed from the Supabase dashboard first.');
    }
  }, { signal: controller.signal });

  page.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const source = button.dataset.copy === 'callback' ? callback : page.querySelector('[data-setup-origin]');
      try {
        await navigator.clipboard.writeText(source.textContent.trim());
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = original; }, 1400);
      } catch {
        // Clipboard blocked; selecting the text is the fallback.
        const range = document.createRange();
        range.selectNodeContents(source);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, { signal: controller.signal });
  });

  [urlInput, anonInput].forEach(input =>
    input.addEventListener('input', refresh, { signal: controller.signal }));

  // Say plainly whether the deployed site already has accounts working.
  const live = page.querySelector('[data-setup-live]');
  fetch('/api/config')
    .then(response => response.json())
    .then(body => {
      const on = Boolean(body?.supabaseUrl && body?.supabaseAnonKey);
      live.dataset.tone = on ? 'ok' : 'warn';
      live.innerHTML = on
        ? '<b>Accounts are live on this deployment.</b><p>Sign-in is working. If Google is not offered, finish step 3.</p>'
        : '<b>Accounts are not switched on for this deployment yet.</b><p>Everything on KINETIQ works without them; progress is kept per browser until they are.</p>';
    })
    .catch(() => { live.hidden = true; });

  refresh();
  return () => controller.abort();
}
