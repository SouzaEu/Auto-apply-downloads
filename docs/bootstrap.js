/* Runs before the stylesheet. Storage can be unavailable in private contexts. */
(() => {
  const root = document.documentElement;
  let storedTheme;
  let storedLanguage;
  try {
    storedTheme = localStorage.getItem('auto-apply-theme');
    storedLanguage = localStorage.getItem('auto-apply-language');
  } catch {
    /* Preferences remain usable for this visit. */
  }
  const theme = ['light', 'dark'].includes(storedTheme)
    ? storedTheme
    : matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  const requested = new URL(location.href).searchParams.get('lang');
  root.dataset.theme = theme;
  root.lang = ['pt-BR', 'en', 'es'].includes(requested)
    ? requested
    : ['pt-BR', 'en', 'es'].includes(storedLanguage)
      ? storedLanguage
      : 'pt-BR';
  root.classList.add('js');
})();
