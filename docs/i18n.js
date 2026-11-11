import { translations } from './translations.js';

export const languages = Object.keys(translations);
let language = languages.includes(document.documentElement.lang)
  ? document.documentElement.lang
  : 'pt-BR';
export const getLanguage = () => language;
export const t = (key) => translations[language][key] ?? translations['pt-BR'][key] ?? key;

export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.innerHTML = t(element.getAttribute('data-i18n'));
  });
  for (const attribute of ['aria-label', 'placeholder']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  document.querySelectorAll('.language-select').forEach((select) => {
    select.value = language;
  });
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]').content = t('meta.description');
  document.querySelector('meta[property="og:title"]').content = t('meta.title');
  document.querySelector('meta[property="og:description"]').content = t('meta.description');
  document.querySelector('meta[property="og:locale"]').content = {
    'pt-BR': 'pt_BR',
    en: 'en_US',
    es: 'es_ES',
  }[language];
}

export function setLanguage(next, { updateURL = true } = {}) {
  if (!languages.includes(next)) return;
  language = next;
  document.documentElement.lang = language;
  try {
    localStorage.setItem('auto-apply-language', language);
  } catch {
    /* Optional persistence. */
  }
  if (updateURL) {
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState(null, '', url);
  }
  translatePage();
  window.dispatchEvent(new CustomEvent('forma-language'));
}
