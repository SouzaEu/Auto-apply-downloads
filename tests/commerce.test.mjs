import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { commercialConfig } from '../docs/assets/commercial-config.js';
import { offers, selectPlan, safeAccountUrl, accountOffer } from '../docs/assets/commercial-core.js';

const portal = 'https://cv-auto.freshpike132.chatgpt.site/conta';

test('the only public offer is the monthly account subscription', () => {
  assert.deepEqual(Object.keys(offers), ['monthly']);
  assert.equal(offers.monthly.amount_cents, 1990);
  assert.equal(offers.monthly.interval, 'month');
  assert.equal(offers.monthly.active_devices, 1);
  assert.equal(selectPlan('monthly'), 'monthly');
  for (const value of ['30', '90', '__proto__', null]) assert.equal(selectPlan(value), 'monthly');
});

test('billing remains gated and points only to the canonical account portal', () => {
  assert.equal(commercialConfig.salesEnabled, false);
  assert.equal(commercialConfig.accountPortal, portal);
  assert.equal(accountOffer(commercialConfig), offers.monthly);
  for (const url of [
    'http://cv-auto.freshpike132.chatgpt.site/conta',
    'https://evil.test/conta',
    'https://cv-auto.freshpike132.chatgpt.site/other',
    'https://user:pass@cv-auto.freshpike132.chatgpt.site/conta',
    'javascript:alert(1)'
  ]) assert.equal(safeAccountUrl(url), false, url);
});

test('the plans page advertises account subscription without legacy packages', () => {
  const plans = readFileSync(new URL('../docs/planos.html', import.meta.url), 'utf8');
  assert.match(plans, /R\$ 19,90/);
  assert.match(plans, /freshpike132\.chatgpt\.site\/conta/);
  assert.doesNotMatch(plans, /R\$ 14,90|R\$ 34,90|plano=30|plano=90/);
});

test('legacy purchase URLs safely transition to the account portal', () => {
  for (const name of ['comprar.html', 'checkout.html', 'pagamento.html', 'acesso.html']) {
    const page = readFileSync(new URL(`../docs/${name}`, import.meta.url), 'utf8');
    assert.match(page, /http-equiv="refresh"/);
    assert.match(page, /freshpike132\.chatgpt\.site\/conta/);
    assert.doesNotMatch(page, /DEMO-|CV-[A-F0-9]|plano=30|plano=90/);
  }
});
