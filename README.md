# Auto Apply — site oficial

[Página do produto](https://souzaeu.github.io/Auto-apply-downloads/) · [Compatibilidade](https://souzaeu.github.io/Auto-apply-downloads/compatibilidade.html) · [Planos](https://souzaeu.github.io/Auto-apply-downloads/planos.html) · [Versões e instaladores](https://github.com/SouzaEu/Auto-apply-downloads/releases)

O site apresenta o motor de interpretação de formulários, uma demonstração editorial sem envio e a experiência de busca, preparação e acompanhamento. Os instaladores disponíveis são selecionados entre os lançamentos oficiais com checksum.

O teste dura sete dias a partir da ativação no aplicativo, sem cartão e sem cobrança automática. O preço anunciado é R$ 14,90 por 30 dias ou R$ 34,90 por 90 dias, mas compras ainda estão indisponíveis. O instalador Windows segue em beta e ainda não foi validado em Windows real.

Para testar localmente: `python3 -m http.server --directory docs 8767` e `node --test tests/*.test.mjs`.


A oferta comercial foi mesclada ao visual existente em 15/11/2026 a partir do
pacote `auto-apply-comercial`. São dois períodos com os mesmos recursos,
atualizações incluídas e créditos externos de IA cobrados pelo provedor.
As páginas [escolher acesso](https://souzaeu.github.io/Auto-apply-downloads/comprar.html)
e [pagamento](https://souzaeu.github.io/Auto-apply-downloads/pagamento.html) estão
abertas em demonstração, traduzidas em PT/EN/ES. O formulário pode ser
percorrido com e-mail de exemplo, sem salvar ou enviar esse dado e sem criar
pedidos. Checkout Pix/cartão, sete estados de pagamento, ativação, dispositivos,
recuperação e reembolso podem ser explorados visualmente.

`docs/assets/commercial-config.js` contém somente configuração pública:
`previewEnabled: true`, `paymentEnvironment: 'preview'`, `salesEnabled: false` e `apiBase: ''`. Não colocar segredos no GitHub Pages.
A abertura depende de validação do produto, sandbox, licenças macOS/Windows,
entrega e recuperação do código, suporte e documentação jurídica com dados
reais do vendedor. Não basta alterar uma flag. O backend não foi implantado
nesta alteração. Veja [escopo e validação](COMMERCIAL-INTEGRATION-2026-11-15.md).


A navegação completa começa em `comprar.html?plano=30`. `checkout.html` é uma
prévia do nosso fluxo; o checkout real será servido pelo Mercado Pago.
`pagamento.html` oferece seletor de estados; `acesso.html` reúne as ações de
licença demonstrativas. `termos.html` e `privacidade.html` mostram condições
previstas, sem inventar dados de vendedor ou atendimento.

Para conectar um Worker de testes, altere a configuração pública para
`paymentEnvironment: 'sandbox'`, `salesEnabled: true` e a URL de sandbox em
`apiBase`. O frontend exige que o ambiente retornado pelo servidor corresponda.
Nenhuma credencial privada deve ir no frontend. O modo preview não chama API
nem lê ou altera a sessão de compra real.
