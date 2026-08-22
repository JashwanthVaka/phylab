/**
 * The account control in the top-right of the navigation.
 *
 * Signed out it is a "Sign in" link; signed in it becomes an initial that
 * opens a short menu. It reflects auth state rather than owning it, so it
 * re-reads on every auth change instead of caching a decision made at load.
 *
 * The Admin entry is asked for from the server, because the browser has no
 * business knowing who the administrators are. Hiding the link is only a
 * convenience: /api/admin/stats re-checks every request regardless of whether
 * this menu chose to show anything.
 */

import { authService } from './services/authService.js';
import { getSupabase } from './services/supabaseClient.js';

let root;
let menu;
let button;
let bound = false;

const nameOf = user =>
  user?.user_metadata?.full_name
  || user?.user_metadata?.display_name
  || user?.email?.split('@')[0]
  || 'Your account';

const initialOf = user => {
  const source = user?.user_metadata?.full_name || user?.email || '?';
  return String(source).trim().charAt(0).toUpperCase() || '?';
};

function closeMenu() {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  button?.setAttribute('aria-expanded', 'false');
}

function openMenu() {
  if (!menu) return;
  menu.hidden = false;
  button?.setAttribute('aria-expanded', 'true');
  menu.querySelector('a, button')?.focus();
}

/** Asks the server whether this session may see the dashboard. */
async function checkAdmin(token) {
  if (!token) return false;
  try {
    const response = await fetch('/api/admin/whoami', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return false;
    return Boolean((await response.json()).admin);
  } catch {
    return false;
  }
}

async function paint() {
  if (!root) return;
  const signIn = root.querySelector('[data-account-signin]');
  const adminLink = root.querySelector('[data-account-admin]');

  if (!authService.enabled()) {
    // Without Supabase there are no accounts yet. The control still shows,
    // because the sign-in page explains that plainly rather than presenting a
    // form that only fails once you have typed into it.
    root.dataset.accountState = 'unconfigured';
    root.hidden = false;
    signIn.hidden = false;
    button.hidden = true;
    closeMenu();
    return;
  }
  root.hidden = false;

  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    root.dataset.accountState = 'signed-out';
    signIn.hidden = false;
    button.hidden = true;
    closeMenu();
    return;
  }

  root.dataset.accountState = 'signed-in';
  signIn.hidden = true;
  button.hidden = false;
  root.querySelector('[data-account-initial]').textContent = initialOf(user);
  root.querySelector('[data-account-name]').textContent = nameOf(user);
  root.querySelector('[data-account-email]').textContent = user.email || '';
  button.title = user.email || nameOf(user);

  adminLink.hidden = !(await checkAdmin(session.access_token));
}

export async function initAccountMenu() {
  root = document.getElementById('navAccount');
  if (!root) return;
  menu = root.querySelector('#navAccountMenu');
  button = root.querySelector('#navAvatarBtn');

  if (!bound) {
    bound = true;
    button.addEventListener('click', event => {
      event.stopPropagation();
      menu.hidden ? openMenu() : closeMenu();
    });
    root.querySelector('[data-account-signout]').addEventListener('click', async () => {
      closeMenu();
      await authService.signOut();
      await paint();
      location.assign('/');
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('click', event => { if (!root.contains(event.target)) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

    // Signing in happens through a redirect, so the menu has to react to the
    // session appearing rather than assume the state it saw at load.
    authService.onChange(() => { void paint(); });
  }

  await paint();
}
