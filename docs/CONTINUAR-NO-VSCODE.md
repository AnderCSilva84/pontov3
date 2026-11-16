# Retomada no VS Code — 15/11/2026

Abrir `ta-no-ponto.code-workspace` na raiz. Este arquivo é o ponto de retomada atual; os roteiros datados em `mobile/` preservam a história e podem descrever estados já superados.

**Rodada mais recente:** [publicação coordenada concluída](mobile/26-publicacao-functions-regras.md). **42 Functions e firestore.rules do commit681ac8a implantados**. 30 callables recusam sem autenticação; 20 Functions fora do lote preservadas. Regras remotas iguais ao arquivo versionado. Gates desligados e grupo dedicado em transição. Próximo passo: homologação autenticada/funcional no Android e grupo dedicado. Sem push, nova publicação PWA/Android ou cobrança.

Histórico da revisão: [inspeção inicial](mobile/23-lote-rollout-revisao.md), [integrações/regras remotas](mobile/24-integracoes-e-regras-remotas.md) e [snapshot](mobile/25-versionamento-publicacao-coordenada.md). A antiga release de regras foi substituída na rodada26; esses roteiros descrevem o estado anterior à publicação.

Guardas de noBolsoConsulta/comprasEstimativa/comprasRelatorio e gestão privada da central agora publicadas. Bloqueiam operações compartilhadas indevidas, preservando titular, transição e consulta ao catálogo agregado conforme definição aprovada. [Matriz histórica](mobile/22-prontidao-rollout-assinaturas.md).

## Estado confirmado

| Área | Situação atual |
| --- | --- |
| Checkout | Branch `feat/rebrand-ta-no-ponto`; snapshot integrado da rodada25 em Git local. Consultar `git log -1`; sem push nesta rodada |
| Android | Código **7**, nome **1.0.0**, disponível para testadores internos; sem promoção a Produção |
| Aparelho do titular | Titular confirmou atualização pela Play, sessão preservada e abertura normal de Compras/Tarefas/Lembretes/Gestão após rollout26. Fluxos específicos pendentes; sem leitura ADB do código |
| PWA | Código compartilhado atualizado localmente; refino atual ainda sem nova publicação web nesta rodada |
| Backend | **42 Functions do lote e regras comerciais implantadas**, com verificações pós-deploy aprovadas; homologação autenticada pendente |
| Google Play | 3 produtos/planos-base em rascunho. RTDN configurado e teste pelo Console recebido pelo backend |
| Cobrança | Contratação nativa desabilitada; backend aceita entrega controlada de compras de TESTE, sob gates ainda desligados |
| Grupos | Preservados em transição. Grupo dedicado `demo_play_ap1303_v1` não foi ativado comercialmente |
| Mercado Pago | Aplicação/contas de teste preparadas; integração, segredos, checkout, webhook e ciclo completo pendentes |
| Criador | Concessão Diamante solicitada na #14, ainda não implementada |

## O que está implantado

Lote completo: 42 nomes do manifesto23. Evidências, hash da release Rules e revisões estão no roteiro26. As 11 abaixo são apenas o subconjunto novo, não a lista completa publicada.

Assinaturas/notificações: `consultarAssinatura`, `verificarCompraPlayTeste`, `processarCompraPlayTeste`, `receberRtdnPlay`, `retomarRtdnPlay`, `reconhecerEntregaPlay`.

Suporte à interface: `cadastrarFuncionario`, `pontoTitular`, `gerirAcesso`, `escritorioOperacao`, `cadastrarTarefa`.

Callables em `us-central1`; gatilho `reconhecerEntregaPlay` em `southamerica-east1`. APIs conferidas sem autenticação retornam 401. Isso não substitui teste autenticado/funcional da candidata no aparelho.

RTDN: tópico `projects/ponto-app-1c55a/topics/assinaturas-play-rtdn`; retomada a cada 15min. Permissões restritas de entrega/publicação já autorizadas e aplicadas. Não repetir a criação das identidades, tópicos ou papéis. [Infraestrutura](mobile/19-preparacao-backend-homologacao.md) e [integração com o Console](mobile/20-play-rtdn-candidata7.md).

## Próximas ações, na ordem

1. **#11 — retorno físico:** atualização pela Play e sessão preservada confirmadas pelo titular em 15/11. Concluir verificações funcionais essenciais (dados, vínculo, telas e fluxos). Nome 1.0.0 sozinho não prova o código instalado. [Checklist físico](mobile/21-teste-interno-codigo7.md).
2. **#9 — homologação dedicada:** rollout de Functions/regras concluído. Revisar filas, locais e seleção do ponto, preparar testes autenticados no grupo dedicado antes de ativar regime comercial. Não usar o grupo principal para ensaios de escrita.
3. **#9/#12/#15 — cobrança Android:** concluir produtos/testadores e fluxo de compra controlado; verificar acesso, ACK, renovação, cancelamento, expiração, restauração e conflitos de canal. O AAB7 não abre compras.
4. **#9 — Mercado Pago/PWA:** implementar e homologar canal web, com segredos exclusivamente no backend. Nenhuma credencial no chat, `VITE_*` ou repositório.
5. **#13/#14:** validar refino visual no aparelho e implementar concessão do criador protegida no servidor, separada de pagamento/recibo.
6. **#6/#7:** fechar publicação coordenada e critérios da versão completa. Aprovação de acesso à faixa Produção não significa aplicativo publicado.

A prioridade atual de lançamento é homologar o cliente7 com o backend/regras já publicados, conforme roteiro26. Não repetir o deploy nem ativar assinaturas apenas para tentar acelerar essa validação.

Registrar cada conclusão na issue do Projects, com o que mudou, evidência e pendências. Deixar a issue aberta até satisfazer seus critérios. Quadro: https://github.com/users/AnderCSilva84/projects/3/views/1.

## Mapa dos arquivos

| Frente | Código principal | Evidência/roteiro |
| --- | --- | --- |
| Catálogo, cotas e vigência | `functions/assinaturas-planos.json`, `assinaturas-dominio.cjs`, `assinaturas-cotas.cjs`, `assinaturas-recursos.cjs`; `firestore.rules` | [Definição](PLANOS-E-ASSINATURAS.md); mobile/11–16 |
| Cobrança Play | `functions/assinaturas-play*.cjs`; `src/services/playBilling.js`; `src/utils/playBilling.js`; plugin Android `PlayBillingPlugin.java` | mobile/06–10 e 18–21 |
| Ponto Free / transferência | `functions/ponto-titular.cjs`, `titularidade.cjs`, `conta.cjs`; `src/components/PontoTitular.jsx`; `src/services/pontoTitular.js` | [Roteiro 17](mobile/17-ponto-titular-transferencia.md) |
| Permissões / Escritório | `functions/gestao-acessos.cjs`, `escritorio-operacoes.cjs`; `src/pages/HistoricoContabil.jsx`; `src/components/AcessoRecurso.jsx` | mobile/14–16 |
| Interface | `src/pages/Planos.jsx`, `src/components/PlanosCatalogo.jsx`, `src/styles/planos.css`, `src/styles/escritorio.css` | #13; mobile/08 e 21 |
| Migração / infraestrutura | `scripts/inventariar-assinaturas.cjs`, `verificar-homologacao-backend.cjs`, `testar-rtdn-homologacao.cjs` | mobile/18–20 |
| Visão geral | `scripts/gerar-fluxograma-app.py`, `docs/arquitetura/` | [Fluxograma](arquitetura/README.md) |

Os scripts não são equivalentes: inventário/verificação leem dados e fazem checagens; **testar-rtdn-homologacao publica uma mensagem de teste** e pode gerar execução faturada. As tarefas do workspace são locais; nenhuma faz deploy, migração comercial, assinatura ou publicação na Play.

## Trabalhar localmente

Após instalar dependências com `npm ci` e `npm --prefix functions ci` quando necessário:

```powershell
# Terminal 1: ambiente local, nunca usar alias Firebase default
firebase emulators:start --project demo-ap1303 --config firebase.compras-emulator.json --only firestore,auth,functions

# Terminal 2: frontend apontando aos emuladores
npm run dev:emuladores
```

Portas: Auth9098, Firestore8877, Functions5007. Requer Java compatível com os emuladores; tarefas Windows apontam para o JBR existente em `%ProgramFiles%/Android/Android Studio/jbr`. Ajustar a tarefa se o SDK/Java estiver em outro local. Encerrar emuladores antes da tarefa de integração para não disputar portas. `npm run dev` usa a configuração web local, que pode apontar a produção; preferir `dev:emuladores` para testes de escrita.

Pela paleta do VS Code, **Tasks: Run Task** oferece dev com emuladores, iniciar emuladores, lint, testes gerais, build e integração local de assinaturas. Nenhuma tarefa inicia automaticamente ao abrir o workspace. Extensão ESLint é apenas recomendada, não instalada automaticamente.

```powershell
npm run lint
npm test
npm run build
```

Última suíte geral registrada: **380 aprovados, 67 ignorados, zero falhas** na revisão da #9. Novo teste de integração é ignorado quando não há emulador; ignorados não são prova de integração. Regressão da revisão: 38 testes integrados aprovados; cenários direcionados finais no roteiro22. Referências anteriores: 31 da frente ponto/conta/permissões, 23 conjuntos e 6 finais de entrega/migração. Lint/sintaxe e build web aprovados na revisão; assinatura/bundletool e verificações remotas pertencem às rodadas de implantação/publicação, não foram repetidos por esta revisão de backend.

## Git e artefatos

- Branch atual preservada; `master` é a principal. `main` tem histórico inicial separado; não mesclar automaticamente ou usar force push.
- Alterações novas de `functions/`, `src/`, `tests/`, `android/`, `scripts/` e `docs/` precisam entrar na revisão. `git diff --stat` não inclui arquivos ainda não rastreados; conferir também `git status --short`.
- Separação sugerida para commits: backend/regras/testes; interface/testes; Android; scripts/documentação/fluxograma. São partes da mesma evolução e não certificam prontidão individual.
- Nenhum commit/push das alterações acumuladas foi feito nesta organização. Revisar os diffs e a ausência de segredos antes de versionar; não usar `git add .` indiscriminadamente.
- `output/`, logs, builds, `.env*`, configurações locais Firebase/assinatura e keystores continuam ignorados. Não apagar evidências nem mover fontes/imports por estética. O workspace só oculta artefatos gerados da navegação/busca, preservando arquivos.
- AAB7: `output/Ta-no-Ponto-7-1.0.0-Homologacao.aab`; SHA256 `AEECC68718F43BED16166BA45F2E654135234E7EB86DE6C184DF9FB53C61177B`. Já enviado. `versionCodeDisponivel:false` impede reutilizar o 7. Não reativar essa flag; próxima versão exige código novo conferido.
- Evidências do Console: `output/candidata7-play-interno.png`, `output/play-rtdn-configuracao.png`. São locais, sem link público no GitHub.

**Atenção ao destino:** `.firebaserc` tem alias `default` para outro projeto. Qualquer ação remota do Tá no Ponto exige projeto explícito `ponto-app-1c55a` e escopo previamente revisado. Nesta retomada não há autorização nova para ativar grupos/planos, iniciar cobrança, mudar IAM ou publicar em Produção.

## Texto para retomar com um agente no VS Code

> Leia README.md e docs/CONTINUAR-NO-VSCODE.md, depois os roteiros da frente escolhida. Preserve o checkout feat/rebrand-ta-no-ponto e as alterações acumuladas sem commit. Código7/1.0.0 já está na faixa interna; titular já confirmou atualização pela Play e sessão preservada; demais testes funcionais pendentes. Onze Functions novas e RTDN implantados; gates desligados, grupo em transição, regras/Functions antigas modificadas sem rollout completo. Avance na #9 conforme o Projects e registre cada conclusão. Não trate arquivos locais ou transporte RTDN testado como cobrança/produção homologados. Antes de outra entrega, confira evidências e estado atual.
