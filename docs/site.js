(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let chosen;
  try { chosen = localStorage.getItem('auto-apply-theme'); } catch {}
  function apply(theme) {
    root.dataset.theme = theme;
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#191b18' : '#f2f1ec';
    window.dispatchEvent(new CustomEvent('auto-theme'));
  }
  apply(chosen === 'dark' || chosen === 'light' ? chosen : preference.matches ? 'dark' : 'light');
  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('auto-apply-theme', next); } catch {}
    apply(next);
  });
  preference.addEventListener('change', event => {
    try { if (localStorage.getItem('auto-apply-theme')) return; } catch {}
    apply(event.matches ? 'dark' : 'light');
  });
})();
