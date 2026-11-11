# Auto Apply — créditos da experiência visual

O site do Auto Apply adapta a estrutura visual e as interações do projeto [Forma Estúdio](https://github.com/SouzaEu/forma-estudio-demo): tipografia, escultura 3D, seção de rolagem interativa, temas, menu móvel e alternância de idiomas. Os textos, etapas e links de download foram adaptados para o Auto Apply. As composições das três etapas são ilustrações conceituais e não representam vagas ou candidaturas reais.

## Código e dependências

- A escultura usa Three.js 0.170.0 e RoomEnvironment. Licença MIT em `vendor/THREE-LICENSE.txt`.
- A base do renderer foi adaptada de Awwwards 3D sob licença MIT. Texto em `vendor/AWWWARDS-LICENSE.txt`.
- A transição de rolagem usa GSAP 3.12.5 e ScrollTrigger 3.12.5, com arquivos locais e avisos originais preservados. Consulte os [termos da GSAP](https://gsap.com/standard-license/).
- A técnica de transição entre painéis foi adaptada de Cinematic Scroll Landing sob licença MIT. Texto em `vendor/CINEMATIC-LICENSE.txt`.

A página de downloads consulta os lançamentos públicos do repositório `SouzaEu/cv-auto-downloads` para localizar instaladores com seus respectivos checksums. O conteúdo da página não envia dados de candidatos.
