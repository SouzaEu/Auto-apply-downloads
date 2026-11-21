export const offers = Object.freeze({
  '30': Object.freeze({ amount_cents: 1490, days: 30, currency: 'BRL' }),
  '90': Object.freeze({ amount_cents: 3490, days: 90, currency: 'BRL' })
});
export function selectPlan(value) {
  return Object.hasOwn(offers, value) ? value : '30';
}
export function safeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['www.mercadopago.com.br', 'sandbox.mercadopago.com.br'].includes(url.hostname);
  } catch { return false; }
}
export function validPurchase(value) {
  return value && /^[a-f0-9-]{36}$/i.test(value.order_id || '') && /^[a-f0-9]{64}$/.test(value.claim_secret || '');
}
export function paymentState(result) {
  if (result?.status === 'paid') {
    return /^CV-[A-F0-9]{32}$/.test(result.license_code || '') ? 'paid' : 'error';
  }
  return ['pending', 'failed', 'cancelled', 'refunded', 'review'].includes(result?.status) ? result.status : 'error';
}
export function readyToBuy(config, plan, { environment = 'production' } = {}) {
  const price = config?.prices?.[plan];
  return ['production', 'sandbox'].includes(environment) &&
    (config?.payment_environment || 'production') === environment &&
    config?.sales_enabled === true && (environment === 'sandbox' || config?.legal_ready === true) &&
    price?.amount_cents === offers[plan].amount_cents && price?.days === offers[plan].days &&
    price?.currency === 'BRL';
}
