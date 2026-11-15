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
em preparação, traduzidas em PT/EN/ES. O formulário está desativado e não
coleta e-mail nem inicia transações nesta versão.

`docs/assets/commercial-config.js` contém somente configuração pública:
`salesEnabled: false` e `apiBase: ''`. Não colocar segredos no GitHub Pages.
A abertura depende de validação do produto, sandbox, licenças macOS/Windows,
entrega e recuperação do código, suporte e documentação jurídica com dados
reais do vendedor. Não basta alterar uma flag. O backend não foi implantado
nesta alteração. Veja [escopo e validação](COMMERCIAL-INTEGRATION-2026-11-15.md).
