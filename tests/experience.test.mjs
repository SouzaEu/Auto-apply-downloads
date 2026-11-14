import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { translations } from '../docs/translations.js';

const home = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../docs/planos.html', import.meta.url), 'utf8');
const compatibility = readFileSync(new URL('../docs/compatibilidade.html', import.meta.url), 'utf8');

test('the original interactive scroll and accessible fallback remain wired', () => {
  assert.match(home, /src="vendor\/gsap\.min\.js"/);
  assert.match(home, /src="vendor\/ScrollTrigger\.min\.js"/);
  assert.match(home, /src="app\.js\?v=200"/);
  assert.equal([...home.matchAll(/data-project="[012]"/g)].length, 3);
  assert.match(home, /id="motion"/);
  assert.match(home, /id="scene-number"/);
  assert.match(home, /class="stage-progress wrap"/);
  assert.match(readFileSync(new URL('../docs/motion.js', import.meta.url), 'utf8'),
    /prefers-reduced-motion: reduce/);
});

test('Portuguese, English and Spanish cover every visible translatable field', () => {
  const keys = [...(home + plans + compatibility).matchAll(/data-i18n(?:-aria-label|-placeholder)?="([^"]+)"/g)]
    .map((match) => match[1]);
  const expected = Object.keys(translations['pt-BR']).sort();
  for (const [language, dictionary] of Object.entries(translations)) {
    assert.deepEqual(Object.keys(dictionary).sort(), expected, language);
    for (const key of keys) assert.ok(dictionary[key]?.trim(), `${language}: ${key}`);
    assert.match(dictionary['meta.title'], /Auto Apply/);
    assert.match(dictionary['plan.meta.title'], /Auto Apply/);
    assert.match(dictionary['compat.meta.title'], /Auto Apply/);
    for (const scenario of ['experience', 'education', 'authorization']) {
      assert.ok(dictionary[`demo.question.${scenario}`]?.trim(), `${language}: demo.question.${scenario}`);
      for (const step of ['recognition', 'interpretation', 'source', 'review', 'outcome']) {
        assert.ok(dictionary[`demo.${scenario}.${step}`]?.trim(), `${language}: demo.${scenario}.${step}`);
      }
    }
  }
});
