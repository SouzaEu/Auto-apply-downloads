export const offers = Object.freeze({
  monthly: Object.freeze({ amount_cents: 1990, frequency_months: 1, currency: 'BRL', active_devices: 1 }),
  quarterly_90: Object.freeze({ amount_cents: 3490, frequency_months: 3, currency: 'BRL', active_devices: 1 })
});
export function selectPlan(value) {
  return Object.hasOwn(offers, value) ? value : 'monthly';
}
export function safeAccountUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.hostname === 'cv-auto.freshpike132.chatgpt.site' && url.pathname === '/conta';
  } catch { return false; }
}
export function accountOffer(config) {
  return config?.salesEnabled === false && safeAccountUrl(config?.accountPortal) ? Object.values(offers) : null;
}
