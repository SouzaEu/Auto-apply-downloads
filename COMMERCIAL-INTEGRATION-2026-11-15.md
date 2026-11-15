# Pacote comercial: integração no site — 15/11/2026

## Aplicado ao site

- Preços: R$ 14,90/30 dias e R$ 34,90/90 dias, mesmos recursos, pagamento único,
  renovação manual, sete dias grátis sem cartão, atualizações durante o acesso.
- Mesclagem em `planos.html`, sem substituir a identidade visual existente.
- Páginas `comprar.html` e `pagamento.html`, com navegação, SEO, PT/EN/ES,
  temas, rótulos, foco e layout responsivo.
- FAQ de IA com chave própria e custos externos, ausência de garantia de
  entrevista/emprego, portais suportados, Windows beta, atualização, início
  do acesso, dispositivos, renovação, dados após vencimento e reembolso.
- Compras em preparação: campos e botão desativados e nenhum e-mail coletado.
- Retorno de pagamento não confia em `status=approved` ou código na URL.
- Configuração pública de API vazia e bloqueio independente no frontend.

## Compatibilidade com o produto real

O aplicativo instalado usa licença CV, 30 dias desde o primeiro resgate e um
computador. A proposta AA/Ed25519 com dois computadores é incompatível com esse
contrato. Não foi publicado outro backend nem trocado o trial. A página explica
que 90 dias e dois dispositivos exigem atualização/validação antes de vender.

O adaptador de Orders API foi preparado LOCALMENTE no serviço existente,
reutilizando fulfillment e licença CV. O banco e o Worker em produção não
foram alterados, e nenhum segredo foi configurado. A documentação técnica,
ADR e testes do backend ficam no projeto privado responsável pelo serviço.

## Verificação

- `node --test tests/*.test.mjs`: downloads, experiência, cobertura PT/EN/ES,
  gates, preços/duração/moeda, esquema de código e URLs de checkout.
- Browser: seleção de 90 dias mostra R$ 34,90; troca PT/EN; retorno falso em ES
  mantém licença oculta; celular 390 px sem rolagem horizontal em comprar e
  pagamento; planos também revisados em desktop e celular; temas claro/escuro.
- Backend: build e scripts locais de licença, fulfillment e comércio com
  SQLite em memória e provedor SIMULADO. Não é evidência de sandbox real.

## Não liberado

Venda, transação real, sandbox Mercado Pago, deploy financeiro, migração remota,
release desktop, dois dispositivos, entitlement Ed25519, renovação acumulada,
e-mail verificado/recuperação, painel de suporte e protocolo de reembolso.

Termos e privacidade comerciais finais dependem da identificação verdadeira
do vendedor, canais de atendimento, retenção e revisão responsável. Não foram
inventados dados legais ou canais de suporte. Permanecem pendentes os gates
A/B/C do pacote, inclusive testes de Windows físico, recibos reais de portais,
histórico/exportação após expiração e segurança/concorrência no runtime real.
