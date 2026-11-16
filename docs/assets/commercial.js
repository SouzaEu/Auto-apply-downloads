import { startPreview } from './commercial-preview.js?v=220';
import { commercialConfig } from './commercial-config.js';
import { offers, selectPlan, safeCheckoutUrl, validPurchase, paymentState, readyToBuy } from './commercial-core.js';
import { getLanguage, t } from '../i18n.js?v=220';
const $ = id => document.getElementById(id);
const sessionKey = 'auto_apply_purchase';
const api = commercialConfig.apiBase.replace(/\/$/, '');
const sandbox = commercialConfig.paymentEnvironment === 'sandbox';
const enabled = ['sandbox', 'production'].includes(commercialConfig.paymentEnvironment) && commercialConfig.salesEnabled === true && /^https:\/\//.test(api);
let messageKey = '';
function message(key, id) {
  messageKey = key;
  $(id).textContent = t(key);
}
async function request(path, body) {
  const response = await fetch(api + path, {
    method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Service unavailable');
  return response.json();
}
function loadPurchase() {
  try { return JSON.parse(sessionStorage.getItem(sessionKey)); } catch { return null; }
}
function randomSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
function checkout() {
  const plan = selectPlan(new URLSearchParams(location.search).get('plano'));
  function sync() {
    $('plan-name').textContent = t(`plan.duration${plan}`);
    $('plan-price').textContent = new Intl.NumberFormat(getLanguage(), { style: 'currency', currency: 'BRL' }).format(offers[plan].amount_cents / 100);
    if (messageKey) $('checkout-msg').textContent = t(messageKey);
  }
  sync();
  window.addEventListener('forma-language', sync);
  // No email collection or request to the payment service during preparation.
  if (!enabled) return;
  const form = $('checkout-form'), fieldset = form.querySelector('fieldset'), button = $('pay-button');
  request('/api/config').then(config => {
    if (!readyToBuy(config, plan, { environment: commercialConfig.paymentEnvironment })) return;
    // Final terms/privacy links and checkout wording must be installed before
    // enabling the client launch flag. This guard is intentionally independent.
    if (!sandbox && (!document.querySelector('a[data-purchase-terms]') || !document.querySelector('a[data-purchase-privacy]'))) return;
    fieldset.disabled = false;
    button.disabled = false;
    button.dataset.i18n = sandbox ? 'sandbox.pay' : 'buy.pay';
    button.textContent = t(button.dataset.i18n);
  }).catch(() => message('buy.blocked', 'checkout-msg'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || fieldset.disabled || !form.reportValidity()) return;
    const email = $('email').value.trim().toLowerCase();
    if (email !== $('email2').value.trim().toLowerCase()) {
      $('email2').setCustomValidity(t('buy.mismatch')); $('email2').reportValidity(); return;
    }
    button.disabled = true;
    try {
      // Persist request identity BEFORE contacting the server. Network uncertainty
      // must retry the same order rather than create a second charge.
      let purchase = loadPurchase();
      if (purchase?.client_request_id && (purchase.plan !== plan || purchase.email !== email)) throw new Error('Existing purchase');
      purchase ||= { plan, email, claim_secret: randomSecret(), client_request_id: crypto.randomUUID() };
      sessionStorage.setItem(sessionKey, JSON.stringify(purchase));
      const order = await request('/api/checkout', purchase);
      if (!safeCheckoutUrl(order.checkout_url) || !/^[a-f0-9-]{36}$/i.test(order.order_id || '')) throw new Error('Invalid checkout');
      sessionStorage.setItem(sessionKey, JSON.stringify({ ...purchase, order_id: order.order_id }));
      location.assign(order.checkout_url);
    } catch { message('payment.error', 'checkout-msg'); button.disabled = false; }
  });
  $('email2').addEventListener('input', () => $('email2').setCustomValidity(''));
}
function payment() {
  const status = $('payment-status'), retry = $('retry-payment');
  let stopped = false, timer, attempts = 0, busy = false;
  const purchase = loadPurchase();
  const sync = () => { if (messageKey) status.textContent = t(messageKey); };
  window.addEventListener('forma-language', sync);
  if (!enabled) { message('payment.unavailable', 'payment-status'); return; }
  if (!validPurchase(purchase)) { message('payment.missing', 'payment-status'); return; }
  async function refresh() {
    if (busy || stopped) return;
    clearTimeout(timer); busy = true; retry.hidden = true; attempts++;
    $('license-container').hidden = true; $('license-code').textContent = '';
    message('payment.checking', 'payment-status');
    let state = 'error';
    try {
      // No querystring, redirect status or browser-supplied code is trusted.
      const result = await request('/api/orders/status', { order_id: purchase.order_id, claim_secret: purchase.claim_secret });
      if (stopped) return;
      state = paymentState(result);
      message(`payment.${state}`, 'payment-status');
      if (state === 'paid') {
        $('license-code').textContent = result.license_code;
        $('license-container').hidden = false;
      }
    } catch { if (!stopped) message('payment.error', 'payment-status'); }
    finally { busy = false; }
    if (stopped) return;
    if (['pending', 'error'].includes(state) && attempts < 35) timer = setTimeout(refresh, 9000);
    else if (['pending', 'error'].includes(state)) { message('payment.stopped', 'payment-status'); retry.hidden = false; }
  }
  retry.addEventListener('click', () => { attempts = 0; refresh(); });
  $('copy-license').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('license-code').textContent); $('copy-license').textContent = t('payment.copied'); }
    catch { $('copy-license').textContent = t('payment.manual'); }
  });
  window.addEventListener('pagehide', () => { stopped = true; clearTimeout(timer); });
  refresh();
}
if (commercialConfig.previewEnabled === true && !enabled) {
  startPreview();
} else {
  document.querySelectorAll('.purchase-steps,#fill-demo-email').forEach(el => el.hidden = true);
  document.querySelectorAll('.preview-banner').forEach(el => el.hidden = !sandbox);
  const replaceCopy = (selector, key) => { document.querySelectorAll(selector).forEach(el => { el.dataset.i18n = key; el.textContent = t(key); }); };
  replaceCopy('.preview-banner strong', 'sandbox.badge');
  replaceCopy('.preview-banner p', 'sandbox.notice');
  replaceCopy('#sales-notice', sandbox ? 'sandbox.badge' : 'buy.meta.title');
  replaceCopy('[data-i18n="preview.emailnote"]', sandbox ? 'sandbox.notice' : 'buy.readyNotice');
  replaceCopy('[data-i18n="preview.terms"]', sandbox ? 'sandbox.terms' : 'buy.terms');
  replaceCopy('#license-container h2', 'payment.code');
  if (document.body.dataset.page === 'buy') checkout();
  if (document.body.dataset.page === 'payment') payment();
}
