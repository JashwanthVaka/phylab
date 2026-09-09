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
    // Without an account service there is nobody to sign in. The control shows
    // the device-local profile instead, so it reflects something real rather
    // than offering a sign-in that cannot happen.
    const { getLocalProfile, initial } = await import('./localProfile.js');
    const local = getLocalProfile();
    root.dataset.accountState = local ? 'local' : 'unconfigured';
    root.hidden = false;
    adminLink.hidden = true;
    if (!local) {
      signIn.hidden = false;
      button.hidden = true;
      closeMenu();
      return;
    }
    signIn.hidden = true;
    button.hidden = false;
    root.querySelector('[data-account-initial]').textContent = initial();
    root.querySelector('[data-account-name]').textContent = local.name;
    root.querySelector('[data-account-email]').textContent = 'Saved on this device';
    button.title = local.name;
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
      if (!authService.enabled()) {
        // A device profile is only a name. Study progress is the sole copy
        // here, so removing the name must not destroy the work with it.
        const { clearLocalProfile } = await import('./localProfile.js');
        clearLocalProfile();
      } else {
        // Anything still on the device belongs in the account first. Only
        // once it is safely there is it taken off the machine, so the next
        // person to sign in does not inherit the last person's lessons.
        const { progressService } = await import('./services/progressService.js');
        let moved;
        try {
          moved = await progressService.migrateLocal();
        } catch {
          moved = { cleared: false };
        }
        await authService.signOut();
        const { clearLocalProfile } = await import('./localProfile.js');
        clearLocalProfile();
        if (moved?.cleared === false && moved?.reason !== 'nothing-to-move') {
          // Saying nothing here would be the wrong kind of quiet: the work is
          // still on this browser and the person is walking away from it.
          window.alert('Some lessons could not be saved to your account just now, so they are still on this browser. Sign in again on this device when you are back online.');
        }
      }
      await paint();
      location.assign('/');
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('click', event => { if (!root.contains(event.target)) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

    // Signing in happens through a redirect, so the menu has to react to the
    // session appearing rather than assume the state it saw at load.
    authService.onChange(() => { void paint(); });
    // A device-local profile changes without any auth event, so the control
    // has to be told directly or it keeps showing the previous state.
    window.addEventListener("kinetiq:profile-changed", () => { void paint(); });
  }

  await paint();
}
