import { getLanguage, setLanguage, t } from './i18n.js';
setLanguage(getLanguage());
const theme = document.querySelector('.theme-toggle');
function syncTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  theme.setAttribute('aria-label', t(dark ? 'theme.light' : 'theme.dark'));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#191b18' : '#f2f1ec';
}
function syncMeta() {
  document.title = t('plan.meta.title');
  document.querySelector('meta[name="description"]').content = t('plan.meta.description');
  document.querySelector('meta[property="og:title"]').content = t('plan.meta.title');
  document.querySelector('meta[property="og:description"]').content = t('plan.meta.description');
}
function syncLinks() {
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    url.searchParams.set('lang', getLanguage());
    link.href = url.href;
  });
}
syncTheme();
syncLinks();
syncMeta();
document.querySelector('.language-select').addEventListener('change', event => setLanguage(event.target.value));
document.querySelector('.theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('auto-apply-theme', next); } catch {}
  syncTheme();
});
window.addEventListener('forma-language', () => { syncTheme(); syncLinks(); syncMeta(); });
