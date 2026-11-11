import { getLanguage, setLanguage, t } from './i18n.js';
import { initMotion } from './motion.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
setLanguage(getLanguage());
const isReduced = initMotion();
const lifetime = new AbortController();
const listen = (target, event, handler, options = {}) =>
  target.addEventListener(event, handler, { ...options, signal: lifetime.signal });

// Theme changes preserve independently art-directed project palettes.
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let explicitTheme = false;
try {
  explicitTheme = ['light', 'dark'].includes(localStorage.getItem('auto-apply-theme'));
} catch {
  /* Optional. */
}
function updateThemeControls() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $$('.theme-toggle').forEach((button) => {
    button.setAttribute('aria-label', t(dark ? 'theme.light' : 'theme.dark'));
    button.title = t(dark ? 'theme.light' : 'theme.dark');
  });
  $('meta[name="theme-color"]').content = dark ? '#191b18' : '#f2f1ec';
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  updateThemeControls();
  window.dispatchEvent(new CustomEvent('auto-apply-theme', { detail: { theme } }));
}
$$('.theme-toggle').forEach((button) =>
  listen(button, 'click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    explicitTheme = true;
    try {
      localStorage.setItem('auto-apply-theme', theme);
    } catch {
      /* Remain usable without storage. */
    }
    applyTheme(theme);
  }),
);
listen(systemTheme, 'change', (event) => {
  if (!explicitTheme) applyTheme(event.matches ? 'dark' : 'light');
});
$$('.language-select').forEach((select) =>
  listen(select, 'change', () => setLanguage(select.value)),
);
listen(window, 'forma-language', updateThemeControls);
updateThemeControls();

// Native dialogs contain focus. Explicit openers also cover chained dialogs.
const menu = $('.menu-button');
const mobile = $('#mobile-nav');
const caseDialog = $('#case-dialog');
const openers = new WeakMap();
function syncLock() {
  document.body.classList.toggle('modal-open', $$('dialog[open]').length > 0);
}
function openDialog(dialog, opener = document.activeElement) {
  if (dialog.open) return;
  openers.set(dialog, opener);
  dialog.showModal();
  if (dialog === mobile) menu.setAttribute('aria-expanded', 'true');
  syncLock();
}
function closeDialog(dialog, { restore = true } = {}) {
  if (!dialog.open || dialog.classList.contains('closing')) return;
  const opener = openers.get(dialog);
  const finish = () => {
    dialog.close();
    dialog.classList.remove('closing');
    if (dialog === mobile) menu.setAttribute('aria-expanded', 'false');
    syncLock();
    if (restore && opener?.isConnected && !opener.closest('dialog:not([open])'))
      opener.focus({ preventScroll: true });
  };
  if (dialog === mobile && restore && !isReduced()) {
    dialog.classList.add('closing');
    setTimeout(finish, 160);
  } else finish();
}
listen(menu, 'click', () => openDialog(mobile));
listen($('.mobile-close'), 'click', () => closeDialog(mobile));
$$('dialog').forEach((dialog) => {
  // Explicit wrapping also covers embedded WebKit and browser keyboard settings.
  listen(dialog, 'keydown', (event) => {
    if (event.key !== 'Tab') return;
    const targets = [
      ...dialog.querySelectorAll('a[href],button,select,textarea,input,[tabindex="0"]'),
    ].filter(
      (element) =>
        !element.disabled &&
        !element.closest('[hidden],[inert]') &&
        element.getBoundingClientRect().width > 0,
    );
    const first = targets[0];
    const last = targets.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first || !dialog.contains(document.activeElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !dialog.contains(document.activeElement))
    ) {
      event.preventDefault();
      first?.focus();
    }
  });
  listen(dialog, 'cancel', (event) => {
    event.preventDefault();
    closeDialog(dialog);
  });
  listen(dialog, 'close', syncLock);
  listen(dialog, 'click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      closeDialog(dialog);
  });
  const close = dialog.querySelector('.dialog-close');
  if (close) listen(close, 'click', () => closeDialog(dialog));
});
listen(matchMedia('(min-width: 801px)'), 'change', (event) => {
  if (event.matches) closeDialog(mobile);
});
// A single native smooth scroll, followed by focus without a second scroll.
function navigate(hash, { record = true } = {}) {
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  closeDialog(mobile, { restore: false });
  if (hash === '#visao') document.body.classList.add('vision-arrived');
  requestAnimationFrame(() => {
    const top =
      hash === '#inicio'
        ? 0
        : Math.max(
            0,
            target.getBoundingClientRect().top + scrollY - $('.header').offsetHeight - 24,
          );
    if (record && location.hash !== hash) history.pushState(null, '', hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    window.scrollTo({ top, behavior: isReduced() ? 'instant' : 'smooth' });
  });
}
$$('a[href^="#"]').forEach((link) =>
  listen(link, 'click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const hash = link.getAttribute('href');
    if (!document.getElementById(hash.slice(1))) return;
    event.preventDefault();
    navigate(hash);
  }),
);
listen(window, 'popstate', () => {
  const language = new URL(location.href).searchParams.get('lang') || 'pt-BR';
  if (language !== getLanguage()) setLanguage(language, { updateURL: false });
  if (location.hash) navigate(location.hash, { record: false });
});
if (location.hash) navigate(location.hash, { record: false });

// One scheduled measurement covers progress and the section currently being read.
let scheduled = false;
function updateScroll() {
  const range = document.documentElement.scrollHeight - innerHeight;
  $('.progress').style.transform = `scaleX(${range > 0 ? scrollY / range : 0})`;
  let current = '#inicio';
  const threshold = $('.header').offsetHeight + Math.min(innerHeight * 0.3, 220);
  $$('main > section[id]').forEach((section) => {
    if (section.getBoundingClientRect().top <= threshold) current = `#${section.id}`;
  });
  $$('nav a[href^="#"]').forEach((link) => {
    if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
function scheduleScroll() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(updateScroll);
  }
}
listen(window, 'scroll', scheduleScroll, { passive: true });
listen(window, 'resize', scheduleScroll, { passive: true });
updateScroll();

let selectedCase;
function renderCase() {
  if (!selectedCase) return;
  $('#case-title').textContent = t(`case.${selectedCase}.title`);
  ['description', 'direction', 'intent'].forEach((field) => {
    $(`#case-${field}`).textContent = t(`case.${selectedCase}.${field}`);
  });
}
$$('[data-case]').forEach((button) =>
  listen(button, 'click', () => {
    selectedCase = button.dataset.case;
    renderCase();
    openDialog(caseDialog, button);
  }),
);
listen($('#case-next'), 'click', () => {
  closeDialog(caseDialog, { restore: false });
  navigate('#download');
});

listen(window, 'forma-language', () => {
  renderCase();
  scheduleScroll();
});
listen(window, 'pagehide', (event) => {
  if (!event.persisted) lifetime.abort();
});
