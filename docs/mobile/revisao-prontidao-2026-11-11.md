# Revisão de prontidão — Tá no Ponto — 11/11/2026

## Parecer
Base funcional com validações automatizadas aprovadas no recorte descrito abaixo. Ainda não há liberação irrestrita para produção/monetização: há dependências do backend com avisos de segurança, bloqueio explícito no validador de release e configuração de versão da Play a conferir. Assinaturas não implementadas nesta revisão.

## Evidências
| Verificação | Resultado |
|---|---|
| Suíte JS local | 336 testes: 279 aprovados, 57 condicionais ignorados, nenhuma falha |
| Integrações consolidadas em emuladores | 77 aprovadas, zero falhas e zero ignoradas |
| ESLint | Aprovado; também conferidos os dois arquivos de teste atualizados |
| Build web | Aprovado |
| Android Java/JUnit | 8 aprovados: 3 PDF/cache, 4 filtro push e 1 exemplo de template; Gradle BUILD SUCCESSFUL |
| PWA publicado | 9 rotas e 25 arquivos iguais por hash ao build; callable sem login devolve 401 |
| Páginas públicas | Privacidade, suporte e exclusão: HTTP 200 e iguais aos arquivos locais |
| Dependências de produção web | npm audit: zero vulnerabilidades informadas |
| Dependências de produção backend | npm audit: 15 moderadas e 3 baixas; zero altas/críticas |
| Validador de release completo | Reprovado: aprovação explícita da privacidade ainda não registrada |

A quantidade de testes ignorados não é contabilizada como aprovação. As integrações usam Firestore/Auth locais e IDs demo; não houve acesso a dados privados reais, teste de push em celulares de usuários ou migração.

## Integrações e manutenção das fixtures
Executados cenários de contas, exclusão de conta, isolamento entre grupos, ponto (operações/idempotência), compras e Farmácia, importação/associação de notas, classificação do catálogo, lembretes gerais, alimentação e foto de perfil. A primeira rodada expôs fixtures antigas de compras sem classificação e expectativas de nomes em caixa anterior. Ao avançar os cenários, também foi necessário alinhar a confirmação de novos produtos e as mensagens estruturadas por linha ao contrato atual.

Ajustes somente em `tests/compras-emulador.test.cjs` e `tests/grupos-emulador.test.cjs`: classificação explícita da fixture, confirmação de novo produto, apresentação/categoria na nota, comparação dos snapshots em maiúsculas e verificação do detalhe de erro de unidade na linha correta. Não houve flexibilização do backend, remoção dos testes negativos nem alteração de dados reais. Reteste específico de compras: 22 aprovados. Grupos e classificação passaram na rodada intermediária. Execução consolidada final: 77 testes aprovados, zero falhas e zero ignorados, registrada em `output/revisao-prontidao-integracao-final.log`.

## Pendências concretas antes de produção/assinaturas
1. **Dependências do backend.** Analisar/atualizar as dependências e lockfile afetados, preservando os contratos. Há avisos em dependências diretas e transitivas de firebase-admin/functions, google-auth-library e html-to-text. O relatório bruto está nos JSON de audit. Avisos não comprovam exploração; a sugestão automática inclui alterações maiores/inadequadas ao conjunto atual, por isso não foi executado `npm audit fix --force`.
2. **Privacidade.** `android/release.local.json` mantém `privacidadeAprovada:false`. O comando existente de validação completa interrompeu a liberação com “Documentos de privacidade precisam de aprovação explícita do titular”. As páginas estão públicas; isso não equivale à aprovação do conteúdo. Não alterei a flag por conta própria. Documento concreto: `public/privacidade/index.html`; fluxo complementar: `public/excluir-conta/index.html`.
3. **Versão Play.** O arquivo local ainda declara versão 1.0.0/código 2 e disponibilidade verdadeira, enquanto o histórico do projeto registra uso do código 2 em testes. É necessário conferir o maior código no Console e preparar um código novo antes de subir outro AAB. O Console não foi consultado nesta revisão; não se presume status de aprovação, acesso de produção ou código disponível.
4. **Homologação física da candidata.** O APK atual deve ser conferido em dispositivo na versão que será submetida: login/recuperação, ponto online e offline com sincronização, importação/associação de nota, PDF, notificações e troca/exclusão de conta. Resultados automatizados e feedback do teste fechado anterior não substituem a conferência física das mudanças posteriores.

## Limites e próximo estágio
Não é uma auditoria jurídica nem garantia de inexistência de defeitos ou vulnerabilidades. Não foram exercitados todos os serviços externos nem todas as combinações de aparelhos. Sem instalação, publicação, envio à Play, compra ou cobrança nesta rodada. A revisão não mudou código de produção nem introduziu dependências.

Antes de iniciar assinaturas, fechar os itens de preparação acima e definir o modelo comercial e os canais de cobrança. A implementação deverá tratar autorização/limites no servidor e ciclo de renovação/cancelamento; nada disso é anunciado como disponível hoje.

Evidências: `output/revisao-prontidao-*`. Auditorias npm contêm apenas o resultado de dependências; não expor arquivos locais de assinatura, credenciais ou Firebase debug bruto.

## Atualização após correções — 11/11/2026
As dependências de produção corrigidas localmente agora apresentam zero vulnerabilidades no npm audit; passaram 279 testes locais, 90 de integração e 19 direcionados em Node 24. O maior código observado no Console foi 2, e a candidata local usa código 3. A privacidade foi preparada para aprovação, sem presumir aceite, e a homologação física segue pendente por ausência de aparelho conectado. As correções não foram implantadas. Parecer e evidências atualizados em `correcoes-prontidao-2026-11-11.md`.
