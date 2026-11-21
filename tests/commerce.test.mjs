import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { commercialConfig } from '../docs/assets/commercial-config.js';
import { offers, selectPlan, safeAccountUrl, accountOffer } from '../docs/assets/commercial-core.js';

const portal = 'https://cv-auto.freshpike132.chatgpt.site/conta';

test('the public offers are monthly and 90-day account subscriptions', () => {
  assert.deepEqual(Object.keys(offers), ['monthly', 'quarterly_90']);
  assert.equal(offers.monthly.amount_cents, 1990);
  assert.equal(offers.monthly.frequency_months, 1);
  assert.equal(offers.quarterly_90.amount_cents, 3490);
  assert.equal(offers.quarterly_90.frequency_months, 3);
  assert.equal(offers.monthly.active_devices, 1);
  assert.equal(selectPlan('monthly'), 'monthly');
  assert.equal(selectPlan('quarterly_90'), 'quarterly_90');
  for (const value of ['30', '90', '__proto__', null]) assert.equal(selectPlan(value), 'monthly');
});

test('billing remains gated and points only to the canonical account portal', () => {
  assert.equal(commercialConfig.salesEnabled, false);
  assert.equal(commercialConfig.accountPortal, portal);
  assert.deepEqual(accountOffer(commercialConfig), [offers.monthly, offers.quarterly_90]);
  for (const url of [
    'http://cv-auto.freshpike132.chatgpt.site/conta',
    'https://evil.test/conta',
    'https://cv-auto.freshpike132.chatgpt.site/other',
    'https://user:pass@cv-auto.freshpike132.chatgpt.site/conta',
    'javascript:alert(1)'
  ]) assert.equal(safeAccountUrl(url), false, url);
});

test('the plans page advertises both account subscriptions without legacy checkout', () => {
  const plans = readFileSync(new URL('../docs/planos.html', import.meta.url), 'utf8');
  assert.match(plans, /R\$ 19,90/);
  assert.match(plans, /freshpike132\.chatgpt\.site\/conta/);
  assert.match(plans, /R\$ 34,90/);
  assert.match(plans, /90 DIAS/);
  assert.doesNotMatch(plans, /R\$ 14,90|plano=30|plano=90/);
});

test('legacy purchase URLs safely transition to the account portal', () => {
  for (const name of ['comprar.html', 'checkout.html', 'pagamento.html', 'acesso.html']) {
    const page = readFileSync(new URL(`../docs/${name}`, import.meta.url), 'utf8');
    assert.match(page, /http-equiv="refresh"/);
    assert.match(page, /freshpike132\.chatgpt\.site\/conta/);
    assert.doesNotMatch(page, /DEMO-|CV-[A-F0-9]|plano=30|plano=90/);
  }
});
