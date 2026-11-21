import { selectPlan } from './commercial-core.js';
export const previewStates = Object.freeze(['paid', 'pending', 'failed', 'cancelled', 'refunded', 'review', 'error']);
export function selectPreviewState(value) {
  return previewStates.includes(value) ? value : 'pending';
}
export function demoCode(plan) {
  return `DEMO-${selectPlan(plan)}D-SEM-VALIDADE`;
}
export function previewLink(page, { plan = '30', language = 'pt-BR', state } = {}) {
  if (!['planos.html', 'comprar.html', 'checkout.html', 'pagamento.html', 'acesso.html'].includes(page)) throw new Error('Invalid preview page');
  const params = new URLSearchParams({ demo: '1', plano: selectPlan(plan), lang: ['pt-BR', 'en', 'es'].includes(language) ? language : 'pt-BR' });
  if (state) params.set('estado', selectPreviewState(state));
  return `${page}?${params}`;
}
