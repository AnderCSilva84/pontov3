# Correções de prontidão — 11/11/2026

## Realizado localmente
- Dependências do backend atualizadas: firebase-functions 7.4.0, google-auth-library 10.9.1 e html-to-text 10.0.1. firebase-admin permanece em 13.10.0. O parser XML transitivo foi resolvido para 5.12.0. Overrides corretivos: qs 6.17.1 e uuid 11.1.1. Os consumidores Google examinados usam UUID v4 via CommonJS, interface disponível na versão 11; não foi adotado o UUID 12+ que remove CommonJS. A mudança de html-to-text mantém o export `convert` usado no importador de notas.
- Auditoria de dependências de produção do backend: 19 avisos no início desta rodada, zero ao final, incluindo zero baixas/moderadas/altas/críticas. Não foi usado audit fix --force. Avisos de desenvolvimento não são apresentados como auditoria zerada global.
- Conferência somente leitura do Play Console: app br.dev.acstech.ap1303 (ainda nomeado AP1303 no Console), maior código exibido 2, versão 1.0.0, em Alpha e teste interno. Preparado código 3 localmente, mantendo versão 1.0.0 e assinatura existente. Nenhum envio/reserva de código/alteração de faixa no Console.
- Nome público da configuração local alinhado a Tá no Ponto. Texto de privacidade preparado com distinção entre edições PWA/Android e data 11/11/2026. A flag `privacidadeAprovada` continua falsa: aprovação do conteúdo não foi presumida a partir da autorização para corrigir pendências.

## Validação
| Verificação | Resultado |
|---|---|
| Suíte local | 279 aprovados, 57 condicionais ignorados, zero falhas |
| Integração Firestore/Auth demo | 90 aprovados, zero falhas/ignorados |
| Node de produção | 19 testes direcionados aprovados no Node 24.22.2, zero falhas |
| ESLint e build web | Aprovados |
| Build Android reduzido | Aprovado, produção explícita sem emuladores, sem módulos de cuidados |
| APK candidato | Build release aprovado, código 3, pacote br.dev.acstech.ap1303, nome Tá no Ponto e assinatura v2 verificados |

APК candidato: `output/Ta-no-Ponto-candidato-codigo-3-2026-11-11.apk`, 10.353.909 bytes, SHA256 `987F14842D0FFFBA4729818CF675EDE58F7C9D2B7FCCA7115C506E8B65EE7EE8`. Não instalado e não enviado à Play.

## O que permanece pendente
1. Aprovação explícita do texto concreto em `docs/mobile/aprovacao-privacidade-2026-11-11.md` e `public/privacidade/index.html`, exigida pelo validador local `scripts/android-release-validacao.mjs`.
2. Homologação física: ADB foi consultado e não havia aparelho conectado. Roteiro concreto em `docs/mobile/homologacao-codigo-3.md`, com resultados ainda pendentes. Não se atribui aprovação física aos testes automatizados.
3. Publicar as correções do backend e o documento após aprovação/autorização; a auditoria zerada é do lockfile corrigido localmente, não uma afirmação de que as funções já implantadas foram atualizadas.
4. Play: o Console exibiu aviso de declaração de status de comerciante. Não preenchi essa declaração em nome do titular. O código 3 só foi preparado localmente e deve ser reconferido se houver outros envios antes da submissão.

As assinaturas ainda não foram implementadas e o app não está liberado irrestritamente para cobrança/lançamento público. Não houve publicação de funções/PWA, instalação, alteração de dados reais, envio à loja, commit ou push nesta rodada.

## Referências e evidências
- `output/prontidao-correcoes-*` (audit antes/parcial/final, instalações, testes, integração, builds, identidade e assinatura).
- Compatibilidade consultada no registro oficial npm (engines/exports/dependências) e changelogs primários: https://github.com/html-to-text/node-html-to-text/blob/master/CHANGELOG.md e https://github.com/uuidjs/uuid/blob/main/CHANGELOG.md.
- O conjunto de alterações locais anterior foi preservado. Um vínculo `app-ponto-3:file:..` introduzido na resolução npm foi removido antes da validação; o lockfile final não contém dependência do projeto pai.

## Aprovação e aparelho USB — 11/11/2026
O titular aprovou explicitamente o texto de privacidade e conectou um Samsung SM-A057M. Aprovação registrada com hashes em `output/privacidade-aprovacao-2026-11-11.json`; flag local atualizada e validador completo de release aprovado. O aplicativo instalado é código 2 e veio da Play. A comparação dos certificados comprovou assinatura de distribuição diferente da chave de upload local, impedindo atualizar por sideload normal sem remover o app. Nenhuma desinstalação, limpeza, troca de assinatura ou gravação em dados do telefone foi executada.

AAB código 3 gerado e assinatura JAR verificada: `output/Ta-no-Ponto-codigo-3-teste-interno-2026-11-11.aab`, SHA256 `2640748EA52618B4FE276872C67E757FF2AF2ED9B1CD0F7E82512536D83DE967`. Proposta de envio ao teste interno em `candidata-teste-interno-codigo-3.md`. Aguarda autorização específica para envio/implantação; a homologação física da candidata permanece pendente da atualização compatível pela Play.

## Publicação e retomada concluídas — 11/11/2026
PWA publicado em https://ponto.acstech.dev.br, deploy Netlify `6af4961fa4975ae111a65b8f`. Verificação: 9 rotas e 25 arquivos iguais por hash ao build local; privacidade, suporte e exclusão retornaram HTTP 200 e conteúdo igual ao aprovado. Backend Firebase `ponto-app-1c55a`: 51 funções existentes atualizadas com sucesso, sem criação ou remoção de funções, conforme `output/codigo3-servidor-verificado.json` e log de deploy completo.

O AAB código 3 foi recebido e processado pela Play. Avisos não bloqueantes observados: aumento de tamanho, ausência de arquivo de desofuscação e ausência de símbolos de depuração nativos. A confirmação final da publicação tentada pelo agente foi impedida por limite de uso na revisão automática e não foi executada naquele momento. Na retomada, a faixa interna já exibia “Última versão: 3 (1.0.0)” e “Disponível para testadores internos”, com lançamento exibido em 11/11 às 13:29. Não foi feito novo envio ou confirmação duplicada ao retomar. Captura: `capturas/codigo3/play-teste-interno-3.png`.

Link observado no Console: https://play.google.com/apps/internaltest/4701579709408729258. Nenhuma alteração na faixa fechada ou lançamento público. A publicação final não é atribuída ao agente: o estado disponível foi confirmado em leitura após a interrupção.

Celular USB reconferido após a disponibilização: permanece com código 2 instalado pela Play. É necessário atualizar pela loja para executar a homologação do código 3. Não houve instalação por sideload, limpeza de dados ou teste físico de fluxos reais. Assinaturas/cobranças ainda não implementadas.
