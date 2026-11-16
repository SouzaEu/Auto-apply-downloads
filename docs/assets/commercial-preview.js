import { offers, selectPlan } from './commercial-core.js';
import { selectPreviewState, demoCode, previewLink } from './commercial-demo.js';
import { getLanguage, t } from '../i18n.js?v=220';
const $ = id => document.getElementById(id);

// Visual-only controller: no fetch, provider SDK, real order or license API.
export function startPreview() {
  const page = document.body.dataset.page;
  const query = new URLSearchParams(location.search);
  const plan = selectPlan(query.get('plano'));
  let state = selectPreviewState(query.get('estado'));
  let method = 'pix', activated = false;
  const results = new Set();
  const link = (page, extra = {}) => previewLink(page, { plan, language: getLanguage(), ...extra });
  function sync() {
    document.querySelectorAll('[data-preview-link]').forEach(a => a.href = link(new URL(a.href).pathname.split('/').pop()));
    document.querySelectorAll('[data-preview-duration]').forEach(el => el.textContent = t(`plan.duration${plan}`));
    document.querySelectorAll('[data-preview-price]').forEach(el => el.textContent = new Intl.NumberFormat(getLanguage(), { style: 'currency', currency: 'BRL' }).format(offers[plan].amount_cents / 100));
    if (page === 'buy') {
      $('plan-name').textContent = t(`plan.duration${plan}`);
      $('plan-price').textContent = new Intl.NumberFormat(getLanguage(), { style: 'currency', currency: 'BRL' }).format(offers[plan].amount_cents / 100);
      $('pay-button').textContent = t('preview.continue');
    }
    if (page === 'checkout') $('preview-checkout-next').href = link('pagamento.html', { state: method === 'pix' ? 'pending' : 'paid' });
    if (page === 'payment') renderPayment();
    if (page === 'access') {
      $('preview-access-code').textContent = demoCode(plan);
      $('preview-activation-state').textContent = t(activated ? 'access.activated' : 'access.waiting');
      for (const name of results) {
        const element = $(`preview-${name}-result`);
        element.textContent = t(element.dataset.resultKey);
      }
    }
  }
  function renderPayment() {
    const paid = state === 'paid';
    $('payment-status').textContent = t(paid ? 'preview.paid' : `payment.${state}`);
    $('license-container').hidden = !paid;
    $('license-code').textContent = paid ? demoCode(plan) : '';
    $('preview-access-link').hidden = !paid;
    $('preview-access-link').href = link('acesso.html');
    $('retry-payment').hidden = !['pending', 'error'].includes(state);
    $('preview-state').value = state;
    document.querySelector('.payment-result').dataset.state = state;
  }
  if (page === 'buy') {
    const form = $('checkout-form');
    form.querySelector('fieldset').disabled = false;
    $('pay-button').disabled = false;
    $('fill-demo-email').hidden = false;
    const fill = () => { $('email').value = 'demo@example.test'; $('email2').value = 'demo@example.test'; $('email2').setCustomValidity(''); };
    $('fill-demo-email').addEventListener('click', fill);
    $('email2').addEventListener('input', () => $('email2').setCustomValidity(''));
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if ($('email').value.trim().toLowerCase() !== $('email2').value.trim().toLowerCase()) {
        $('email2').setCustomValidity(t('buy.mismatch')); $('email2').reportValidity(); return;
      }
      // Deliberately omit email and any real purchase session from navigation.
      location.assign(link('checkout.html'));
    });
  }
  if (page === 'checkout') {
    document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => {
      method = button.dataset.method;
      document.querySelectorAll('[data-method]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.method === method)));
      $('pix-panel').hidden = method !== 'pix'; $('card-panel').hidden = method !== 'card'; sync();
    }));
  }
  if (page === 'payment') {
    for (const [oldKey, key] of [['payment.intro', 'preview.paymentIntro'], ['payment.instructions', 'preview.instructions'], ['payment.retry', 'preview.confirm']]) {
      const el = document.querySelector(`[data-i18n="${oldKey}"]`);
      if (el) { el.dataset.i18n = key; el.textContent = t(key); }
    }
    $('preview-scenarios').hidden = false;
    $('preview-state').addEventListener('change', event => {
      state = selectPreviewState(event.target.value);
      history.replaceState(null, '', link('pagamento.html', { state }));
      renderPayment();
    });
    $('retry-payment').addEventListener('click', () => { state = 'paid'; renderPayment(); });
    $('copy-license').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(demoCode(plan)); $('copy-license').textContent = t('payment.copied'); }
      catch { $('copy-license').textContent = t('payment.manual'); }
    });
  }
  if (page === 'access') {
    document.querySelectorAll('[data-local-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.localAction;
      if (action === 'activate') { activated = true; button.disabled = true; }
      else { results.add(action); $(`preview-${action}-result`).hidden = false; }
      sync();
    }));
  }
  sync();
  window.addEventListener('forma-language', sync);
}
if (['checkout', 'access', 'legal', 'privacy'].includes(document.body.dataset.page)) startPreview();
