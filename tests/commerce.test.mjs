import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { commercialConfig } from '../docs/assets/commercial-config.js';
import { offers, selectPlan, safeCheckoutUrl, paymentState, validPurchase, readyToBuy } from '../docs/assets/commercial-core.js';

test('visual preview is open while real billing remains unconfigured', () => {
  assert.equal(commercialConfig.previewEnabled, true);
  assert.equal(commercialConfig.salesEnabled, false);
  assert.equal(commercialConfig.apiBase, '');
  const buy = readFileSync(new URL('../docs/comprar.html', import.meta.url), 'utf8');
  assert.match(buy, /<fieldset disabled>/);
  assert.match(buy, /id="pay-button"[^>]*disabled/);
  assert.equal(selectPlan('90'), '90');
  for (const plan of ['__proto__', 'toString', '1', null]) assert.equal(selectPlan(plan), '30');
});

test('canonical BRL offers must match server readiness, currency and duration', () => {
  assert.equal(offers['30'].amount_cents, 1490);
  assert.equal(offers['90'].amount_cents, 3490);
  const config = { sales_enabled: true, legal_ready: true, prices: offers };
  assert.equal(readyToBuy(config, '90'), true);
  assert.equal(readyToBuy({ ...config, legal_ready: false }, '90'), false);
  for (const changed of [{ amount_cents: 1 }, { currency: 'USD' }, { days: 30 }]) {
    assert.equal(readyToBuy({ ...config, prices: { '90': { ...offers['90'], ...changed } } }, '90'), false);
  }
});

test('payment status requires server-paid state and the existing app code format', () => {
  const code = 'CV-' + 'A'.repeat(32);
  assert.equal(paymentState({ status: 'paid', license_code: code }), 'paid');
  for (const status of ['approved', 'pending', 'failed', 'refunded', undefined]) {
    assert.notEqual(paymentState({ status, license_code: code }), 'paid');
  }
  assert.equal(paymentState({ status: 'paid', license_code: '<script>alert(1)</script>' }), 'error');
  assert.equal(paymentState({ status: 'paid' }), 'error');
  assert.ok(validPurchase({ order_id: 'a'.repeat(36), claim_secret: 'f'.repeat(64) }));
  assert.ok(!validPurchase({ order_id: '123', claim_secret: '123' }));
});

test('only HTTPS checkout hosts without credentials or custom ports are accepted', () => {
  assert.ok(safeCheckoutUrl('https://www.mercadopago.com.br/checkout/v1/redirect?order_id=test'));
  for (const url of ['javascript:alert(1)', 'http://www.mercadopago.com.br', 'https://mercadopago.com.br.evil.test', 'https://evil.mercadopago.com.br', 'https://user:pass@www.mercadopago.com.br', 'https://www.mercadopago.com.br:8443']) assert.equal(safeCheckoutUrl(url), false, url);
});


import { previewStates, selectPreviewState, demoCode, previewLink } from '../docs/assets/commercial-demo.js';
test('every visual scenario stays separate from real entitlements', () => {
  assert.equal(previewStates.length, 7);
  for (const plan of ['30', '90']) {
    const code = demoCode(plan);
    assert.match(code, /^DEMO-/);
    assert.equal(paymentState({ status: 'paid', license_code: code }), 'error');
  }
  assert.equal(selectPreviewState('approved'), 'pending');
  assert.equal(selectPreviewState('__proto__'), 'pending');
});
test('preview navigation preserves plan and language without buyer data', () => {
  const link = previewLink('pagamento.html', { plan: '90', language: 'es', state: 'paid', email: 'must-not-appear@example.test' });
  const url = new URL(link, 'https://example.test');
  assert.equal(url.searchParams.get('demo'), '1');
  assert.equal(url.searchParams.get('plano'), '90');
  assert.equal(url.searchParams.get('lang'), 'es');
  assert.equal(url.searchParams.get('estado'), 'paid');
  assert.equal(url.searchParams.has('email'), false);
  assert.throws(() => previewLink('https://evil.test'));
});

test('test checkout must match the declared sandbox environment', () => {
  const config = { sales_enabled: true, payment_environment: 'sandbox', legal_ready: false, prices: offers };
  assert.equal(readyToBuy(config, '30', { environment: 'sandbox' }), true);
  assert.equal(readyToBuy(config, '30', { environment: 'production' }), false);
  assert.equal(readyToBuy({ ...config, payment_environment: 'production', legal_ready: true }, '30', { environment: 'sandbox' }), false);
});
