/**
 * Navigation shell behaviour for the Liquid Glass header.
 *
 * Three jobs: firm the glass bar up once the page scrolls, drive the "More"
 * popover and the mobile menu, and mark the current route so the active state
 * is carried by markup rather than by colour alone.
 *
 * The scroll listener is passive and only ever toggles one class, so it does
 * no layout work on the scroll thread — the usual cause of janky glass.
 */

const header = document.getElementById('siteHeader');
const moreBtn = document.getElementById('navMoreBtn');
const moreMenu = document.getElementById('navMoreMenu');
const burger = document.getElementById('navBurger');
const mobileNav = document.getElementById('mobileNav');

/* ── Scroll state ──────────────────────────────────────────────────── */
if (header) {
  const setScrolled = on => header.classList.toggle('is-scrolled', on);

  // A sentinel just above the fold tells us when the page has moved, without
  // a scroll listener touching the main thread at all. This is what keeps the
  // glass bar from stuttering on long pages.
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;';
  document.body.prepend(sentinel);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);
  } else {
    // Reading scrollY forces no layout; the class only flips as the threshold
    // is crossed, so the fallback is cheap too.
    let scrolled = false;
    const sync = () => {
      const next = window.scrollY > 8;
      if (next === scrolled) return;
      scrolled = next;
      setScrolled(scrolled);
    };
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }
}

/* ── Popover and mobile menu ───────────────────────────────────────── */
function setOpen(button, panel, open) {
  if (!button || !panel) return;
  button.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
  if (button === burger) button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

const closeAll = () => {
  setOpen(moreBtn, moreMenu, false);
  setOpen(burger, mobileNav, false);
};

const toggle = (button, panel) => {
  const open = button.getAttribute('aria-expanded') === 'true';
  closeAll();
  if (!open) setOpen(button, panel, true);
};

moreBtn?.addEventListener('click', event => {
  event.stopPropagation();
  toggle(moreBtn, moreMenu);
});

burger?.addEventListener('click', event => {
  event.stopPropagation();
  toggle(burger, mobileNav);
});

// Click outside, or Escape, closes whatever is open.
document.addEventListener('click', event => {
  if (moreMenu?.contains(event.target) || moreBtn?.contains(event.target)) return;
  if (mobileNav?.contains(event.target) || burger?.contains(event.target)) return;
  closeAll();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const wasOpen = moreBtn?.getAttribute('aria-expanded') === 'true'
    || burger?.getAttribute('aria-expanded') === 'true';
  if (!wasOpen) return;
  const focusTarget = moreBtn?.getAttribute('aria-expanded') === 'true' ? moreBtn : burger;
  closeAll();
  focusTarget?.focus();
});

// Following a link inside either panel should close it.
[moreMenu, mobileNav].forEach(panel => {
  panel?.addEventListener('click', event => {
    if (event.target.closest('a')) closeAll();
  });
});

// Roving focus through the popover, so it is operable from the keyboard.
moreMenu?.addEventListener('keydown', event => {
  const items = [...moreMenu.querySelectorAll('a')];
  const index = items.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
  }
});

moreBtn?.addEventListener('keydown', event => {
  if (event.key !== 'ArrowDown') return;
  event.preventDefault();
  setOpen(moreBtn, moreMenu, true);
  moreMenu?.querySelector('a')?.focus();
});

/* ── Active route ──────────────────────────────────────────────────── */
export function markActiveRoute(pathname = location.pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.site-header a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    const target = href.replace(/\/+$/, '') || '/';
    const active = target === '/' ? path === '/' : path === target || path.startsWith(target + '/');
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

markActiveRoute();
window.addEventListener('popstate', () => markActiveRoute());
