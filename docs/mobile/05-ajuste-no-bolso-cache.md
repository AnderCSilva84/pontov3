# Ajuste do Script 05 — No Bolso, consulta e cache

> **Escopo vigente corrigido em 23/10/2026: Cache novo de supermercado exclusivo do APK do No Bolso.** O PWA do No Bolso usa novamente o componente anterior de consulta à API; o PWA do AP1303 não foi alterado. As descrições de cache da rodada inicial abaixo passam a se aplicar somente ao caminho nativo. Consulte a seção8 para a correção, evidências e limites.

Rodada local de 22/10/2026 (America/Fortaleza). Repositórios: AP1303 (`app-ponto-3`) e No Bolso (`organizanderson`). Instruções/README e documentos anteriores lidos; nenhum AGENTS.md aplicável encontrado. Preservadas todas as alterações anteriores, inclusive `eslint.config.js` já modificado no No Bolso. Sem deploy, migração, produção, commit, push, PR ou PDFs. Não foram criados serviços pagos, schedulers, índices ou credenciais.

## 1. Falha legada: causa e evidência

É problema de ambiente/fixture, não regressão do scanner. O `handleNoBolsoGrant` já fazia `getAuth().getUser(uid)` na base anterior ao Script 05. O Auth Emulator instalado ignora o projectId do SDK cliente para uma apiKey fictícia: `getProjectIdByApiKey` em firebase-tools retorna o projeto padrão do CLI. O SDK criava usuário em `demo-ap1303`, mas a execução anterior usava outro `GCLOUD_PROJECT` no Admin/Firestore.

Reprodução mínima isolada, sem imprimir token, senha ou UID: SDK configurado com `demo-ap1303-prova-<instante>` e apiKey fictícia criou conta cujo token tinha `aud: demo-ap1303`; Admin no projeto alternativo respondeu `auth/user-not-found`. Isso reproduz a causa exata do subteste. A primeira repetição do arquivo legado também revelou uma segunda fragilidade: email fixo já existente no Auth Emulator, parando antes do subteste com email-already-in-use. A fixture agora usa email fictício único, respeita portas dos emuladores via env e **afirma que o projeto do token é igual ao Admin**, em vez de esconder divergência.

Em ambiente isolado, mantendo o mesmo projeto `demo-ap1303` no CLI/SDK/Admin e portas Auth9097/Firestore8879, o teste legado passou: **21 aprovados, zero falhas**, incluindo `callable real gera código só com autenticação vigente e coleções da ponte ficam privadas`. Nenhuma verificação de reauth, escrita direta ou isolamento foi removida. A suíte isolada preservou as verificações fiscais/concorrência/deduplicação. Os emuladores que já atendiam ao APK nas portas9098/8877/5007 não tiveram dados apagados.

Também normalizado no backend o caso genuíno de conta Auth removida: retorna permission-denied e orientação para entrar novamente; falha interna de consulta de identidade retorna unavailable. Não usa perfil Firestore como substituto de conta Auth e não cria autorização em falha.

Comando executado (config temporária ignorada, localhost, regras do próprio repositório):

```powershell
npm exec --yes --package=node@24.22.1 -- node "$env:APPDATA\npm\node_modules\firebase-tools\lib\bin\firebase.js" emulators:exec --project demo-ap1303 --config tmp/firebase-nobolso-isolado.json --only "auth,firestore" "node --test --test-name-pattern=integração tests/compras-emulador.test.cjs"
```

Fontes: [Auth Emulator e consistência de projeto](https://firebase.google.com/docs/emulator-suite/connect_auth) e implementação local `firebase-tools/lib/emulator/auth/server.js` (`getProjectIdByApiKey`). Evidências locais ignoradas: `tmp/qr05-auth-prova.mjs`, `tmp/no-bolso-legado-corrigido.log`. A hipótese registrada no documento05 anterior fica esclarecida por esta rodada, sem apagar o registro histórico da falha.

## 2. Ações e limites no Android

Entrada: Minha conta → No Bolso → Consultar valores, ou rota `/integracoes/no-bolso`. Android renderiza `NoBolsoConsulta`, sem montar o formulário web de concessão/revogação.

| Ação | Android AP1303 nesta integração | Web autorizado existente |
|---|---|---|
| Consultar catálogo/rankings de preços | Sim, grupo do usuário; UI usa últimos90dias | Preservado |
| Comparar produto, embalagem, unidade, loja e data | Sim, grupo do usuário | Preservado |
| Criar/revogar código ou vínculo pessoal | Não oferecido pela entrada Android | Preservado no piloto autorizado |
| Importar compra/nota ou criar despesa pela integração | Não existe na nova entrada | Não foi adicionado |
| Sincronizar/alterar saldos e lançamentos | Não existe | Não foi adicionado |
| Compras, ponto e financeiro próprios do AP1303 | Permissões atuais preservadas | Preservado |

Backend novo `noBolsoConsulta`: allowlist `status`, `rankings`, `produto`; rejeita operações, campos extras, UID/grupo fornecidos pelo cliente, IDs inválidos e período fora de1–366dias. Resolve grupo pelo UID autenticado, valida perfil ativo e usa consultas limitadas a5001observações (falha acima de5000). Não retorna listas, autores, totais mensais privados, financeiro ou identificadores pessoais. Não tem dispatcher de escrita, transação de negócio ou geração de vínculo. Mesmo um administrador não consegue enviar um comando de importação a esse endpoint. Aproveita validação de perfil já feita por `bancoDoUsuario` no grupo, evitando uma leitura duplicada. A UI tem trava contra duplo envio e ignora resultado tardio ao mudar UID/grupo.

**Precisão do controle:** a garantia entregue é a capacidade de somente leitura dessa entrada/endpoint, não uma prova criptográfica de que todo token veio de Android ou web. O Auth atual identifica usuário; não atesta plataforma, e não há App Check/identidade nativa registrada nesta base. Os endpoints web antigos continuam acessíveis a uma identidade legitimamente autorizada por seus contratos. Não foi criada uma falsa autorização por User-Agent, Origin ou campo `plataforma`. Impedir também um cliente Android adulterado de chamar o endpoint web legado exigiria uma identidade de cliente atestada e uma política distinta; isso permanece pendente e não foi simulado nem ativado nesta rodada. [App Check](https://firebase.google.com/docs/app-check) é uma possibilidade a avaliar em etapa própria, sem afirmar que apenas a ocultação do formulário resolve esse limite.

Não há credencial de servidor no APK. O consumidor No Bolso continua usando sua Function autenticada, que verifica perfil e se comunica com `comprasApi` por identidade de serviço existente. Não se abriram APIs privadas nem se misturou consulta de preços com importação financeira.

## 3. Padrão real de combustível encontrado

No No Bolso, `functions/economy.js` ainda contém coletor ANP e flag `ENABLE_ANP_COLLECTION`; `fuel-publication.js` grava snapshots por cidade e só publica o ponteiro após concluir as cidades. Isso é cache no **servidor**, com escritas e leituras potencialmente faturáveis. Coleta semanal e agendamentos já existentes não foram reativados/alterados.

Entretanto, a tela atual não oferece consulta de combustível: `getEconomyPrices` retorna `fuel: null`, e Economize tem Supermercados/Passagens. Portanto não foi inventado um leitor ANP ativo. O padrão de consumo efetivamente encontrado em `EconomizePage.tsx` usa staleTime de15min para preços cadastrados, retry:false, sem refetch em foco/reconexão; QueryProvider/persister usam cache local IndexedDB para queries não privadas. Datas/origem são apresentadas, e o timer30s existente apenas filtra validade em memória, sem polling de rede. `docs/firestore-cost-strategy.md` registra esse intervalo para preços/ANP. IPCA24h e dólar6h são domínios diferentes e não foram usados para definir validade de supermercado.

## 4. Implementação no consumidor No Bolso

Alterado o **próprio No Bolso**, não o backend do AP1303 para fingir cache do consumidor. `price-cache.ts` aplica o intervalo de15min já existente aos comparativos AP1303. Armazena localmente apenas projeções de `rankings` e `produto`, em namespace próprio, separado do cache financeiro. Usa localStorage opcional para acomodar o componente existente baseado em efeitos sem migrar o módulo inteiro para outra arquitetura. Não guarda token, email, listas, totais pessoais, vínculos ou despesas. A chave contém escopo UID/grupo + período + produto; o componente é desmontado ao mudar esse escopo e só monta com perfil ativo.

Preserva produto, marca/apresentação, unidade, estabelecimento/filial/região no rótulo original `supermercado`, data de registro e campos estruturados de cidade/UF/filial quando fornecidos. Não deduz cidade de nome nem completa região ausente. Cache lido é projetado/validado novamente; campo inesperado de finanças não entra na projeção. Data `updatedAt` é recebimento da referência, distinta de `registradoEm` (observação do produto).

Cache válido evita novas consultas de **preços**. Cache antigo é mostrado com data e aviso enquanto uma atualização necessária é tentada; offline usa a referência existente, sinalizada, ou informa ausência sem inventar valor. Atualização manual permanece disponível. Sem polling, sem refetch automático por foco/reconexão, sem retry automático. Reaberturas após falha não repetem atualização durante o mesmo intervalo15min; o usuário pode tentar explicitamente. Promessas simultâneas de preço/acesso são deduplicadas. A resposta de acesso fica somente em memória por até15min para preservar o painel pessoal web autorizado; nunca é persistida junto aos preços. Após recarregar completamente o navegador, pode haver uma chamada `status` mesmo com preços válidos em cache, sem consultar novamente o histórico.

Toda atualização remota continua autorizada no servidor. permission-denied/unauthenticated apaga cache daquele escopo e invalida respostas simultâneas tardias. Nenhum cache elimina a validação remota ou garante revogação instantânea de referências já baixadas enquanto offline. Dados privados de compras pessoais continuam no fluxo próprio, fora desse cache, sem criação automática de despesa. O painel pessoal web mantém sua checagem autorizada quando online; offline ele não é liberado pela referência pública.

## 5. Custos esperados (estimativas por código; não fatura medida)

| Fluxo | No Bolso / cache local | Firestore/Functions/rede |
|---|---|---|
| Cache válido + acesso ainda em memória | Leitura local dos registros necessários | 0chamadas/0leituras remotas novas do comparativo |
| Preços válidos após reiniciar navegador | Exibe referência e restaura acesso | Pode haver1Function status/1leitura de perfil No Bolso; 0consultas de preços AP1303 |
| Primeira carga ou atualização completa | Status + rankings + produto, deduplicados | Até3Functions No Bolso/3leituras de perfil e2Functions HTTP AP1303; cada consulta AP faz1leitura de migração +Npreços do período; 0escritas de negócio/cache servidor |
| Produto ainda sem cache | Atualiza somente o produto | 1Function No Bolso/1perfil +1HTTP AP1303/1migração +Npreços do período |
| Aberturas repetidas dentro15min | Reutiliza cache e checagem em memória | Nenhuma consulta nova do comparativo; outros módulos/listeners preexistentes têm custos próprios |
| Sem conexão | Cache datado/sinalizado ou ausência explícita | Nenhuma nova chamada de preços iniciada; não garante conectividade só por navigator.onLine |
| Consulta nativa AP1303 | Ação explícita, sem cache consumidor no backend | 1callable/3leituras de contexto +Npreços no grupo (status tem só contexto); 0escritas |

N é limitado pelo período/5000observações; queries vazias ainda podem ter cobrança mínima. Reexecução de transações/gatilhos e módulos pessoais/financeiros existentes ficam fora dessas estimativas. A API existente de produto ainda lê o período limitado antes de filtrar pelo produto; essa redundância remota permanece, mas não se repete em cada abertura/seleção com cache válido. Não foi criado índice para otimizar uma consulta sem avaliar seu uso. Cache em Firestore/snapshot ANP **não** significa leitura grátis; o cache novo é local, não uma coleção adicional no servidor. Sem promessa de custo zero global ou permanência em cota gratuita.

## 6. Arquivos e validações

AP1303: novos `functions/no-bolso-consulta.cjs`, `src/pages/NoBolsoConsulta.jsx`, testes de consulta/HTTP e este documento; alterados `functions/index.js`, `functions/no-bolso-functions.cjs`, `NoBolsoConnection.jsx`, `Conta.jsx`, fixture de `compras-emulador.test.cjs`. Contratos web existentes preservados, exceto erro sanitizado de identidade removida. Nenhuma regra/índice modificado nesta rodada.

No Bolso: novos `src/features/ap1303/price-cache.ts`, seu teste e `docs/ap1303-cache-precos.md`; alterados `SupermarketComparison.tsx` e seu teste. Nenhuma mudança nova em backend, pacote, lockfile, regras, financeiro ou combustível. `eslint.config.js` anterior preservado.

Resultados finais e APK registrados na conclusão abaixo. Não foram testados dados de produção, loja iOS ou integração pública já publicada; novas Functions e frontend continuam apenas locais/demo.

## 7. Conclusão da verificação em 23/10/2026

- AP1303: lint aprovado; suíte geral158testes,137aprovados,21condicionais ignorados,0falhas. Os condicionais relacionados foram exercitados separadamente:3aprovados/0falhas, incluindo chamada SDK→HTTP real Auth/Functions/Firestore demo, recusa de comandos e isolamento por grupo. Teste legado em emuladores isolados:21aprovados/0falhas.
- No Bolso: lint e build aprovados;10arquivos/38testes de integração UI/cache/domínio aprovados. Backend de integração web:7aprovados e1condicional ignorado,0falhas. Sem alegar execução completa de toda a suíte financeira ou de seus emuladores nesta rodada.
- Builds AP1303 web/mobile demo, Capacitor sync e Gradle debug aprovados. Avisos preexistentes de tamanho de chunk permanecem nos dois projetos. Diff checks não apontaram erro de whitespace, somente avisos locais LF/CRLF.
- APK final: `android/app/build/outputs/apk/debug/app-debug.apk`,9.961.258bytes. SHA-256 `809EBDC5356CF4A1CD4BA982A09B43872EC70486D081F110886125E624C7B476`. Configuração embutida conferida: emuladores, `demo-ap1303`, host127.0.0.1 via USB. Sem mudança em permissões Android desta rodada.
- Instalação final `adb install -r` concluída com Success no Android autorizado, preservando dados. Assinatura aprovada por apksigner. Nenhuma conta foi trocada no aparelho para alegar um teste funcional que não ocorreu.
- A interrupção anterior foi da revisão automática de aprovação por limite de uso, não determinação de ação insegura. O comando de validação/instalação então não ocorreu; lint e testes foram executados novamente ao retomar.
- Não se declara teste físico da nova tela de consulta ou consumo de cache em celular real. A instalação do APK é separada da validação funcional, feita em testes automatizados/emuladores. O roteiro manual é Minha conta → No Bolso → Consultar valores; conferir comparação, ausência de ações de vínculo/escrita e trocar conta/grupo. No No Bolso: abrir Economize duas vezes, conferir timestamp/cache, simular offline com/sem cache e atualizar explicitamente.
- Nenhum deploy, migração, produção, commit, push, PR ou PDF. Publicação e identidade atestada de cliente continuam fora desta entrega; a limitação de plataforma da seção2 permanece explícita.

## 8. Correção de escopo — cache exclusivo do APK do No Bolso

**Cache novo de supermercado exclusivo do APK do No Bolso.** Confirmação do usuário: o APK do AP1303 não fará envio/sincronização para o No Bolso; o No Bolso pode consultar a API existente para preencher/renovar seu cache. Não foi adicionado envio pelo APK do AP1303, nem filtro por dispositivo nas compras próprias. A origem de consulta continua sendo a API existente do AP1303; seus fluxos PWA/backend e permissões não foram alterados nesta correção.

A primeira implementação havia aplicado o novo cache também ao PWA do No Bolso; isso foi corrigido. Foi comparado o snapshot anterior ao cache com `git show HEAD:src/features/ap1303/SupermarketComparison.tsx`: igualdade integral após normalizar LF/CRLF, SHA-256 `36ebd0989668b8074793807196734f34ba662a23668a7b836c3624e5556d291f`. `SupermarketComparisonWeb.tsx` preserva esse conteúdo, alterando somente o nome do componente exportado. A igualdade foi conferida novamente depois da formatação, desfazendo apenas essa renomeação para comparar. Não foi recriado um fluxo web por suposição.

`SupermarketComparison.tsx` agora seleciona o componente por `src/lib/platform.ts`. Sem a bridge Capacitor nativa, usa Web; somente `isNativePlatform()===true` e `getPlatform()==='android'` habilitam o componente Native. Sem user-agent, largura de tela, flag de ambiente ou detecção de PWA instalado. Bridge ausente/incompleta/falhando mantém Web. Isso seleciona experiência/cache, não substitui autorização no servidor.

| Superfície | Comportamento vigente |
|---|---|
| AP1303 PWA | Código/contratos anteriores preservados; API existente continua fonte de valores |
| AP1303 Android | Entrada de integração somente de consulta preservada; sem envio/sincronização para No Bolso |
| No Bolso PWA/web | Fluxo anterior `status → rankings → produto`, inclusive a cada reabertura; ignora o novo cache mesmo preenchido e não o usa em falha da API |
| No Bolso APK Android | Componente com cache15min anterior preservado, carregado por lazy import; consulta a API somente conforme preenchimento/expiração/atualização explícita da política já implementada |
| Combustível e caches anteriores | Inalterados; não foram removidos caches de ofertas/QueryProvider ou reativado ANP |

Native mantém data, aviso de desatualização/offline, ausência explícita, deduplicação, proteção de autorização, UID/grupo, período, unidades e estabelecimento. Os valores previamente armazenados não foram apagados só porque a seleção passou a excluir Web. Web não importa o componente Native em execução, não lê/escreve o novo cache de preços nem reutiliza a nova memória de acesso. Seus demais caches preexistentes permanecem.

Sem novo polling, serviço, scheduler, índice, leitura de diagnóstico ou credencial. O PWA volta ao consumo remoto anterior por decisão explícita: tipicamente3callables No Bolso (`status`, `rankings`, `produto`) e2HTTP AP1303 ao abrir um comparativo com produto, com custos de perfil/período descritos na seção5. A economia por cache da tabela anterior agora é **exclusivamente do caminho APK**; não se promete a mesma redução ao PWA. Combustível e módulos financeiros mantêm custos próprios anteriores.

Arquivos no No Bolso nesta correção: wrapper `SupermarketComparison.tsx`; `SupermarketComparisonWeb.tsx` recuperado da referência anterior; `SupermarketComparisonNative.tsx` com o código de cache já existente; centralizador `src/lib/platform.ts` e teste; testes de comparação/cache e documentação. Nenhuma modificação em pacote/lockfile, API, combustível, financeiro, regras ou caches anteriores. No AP1303, somente atualização deste relatório e verificações, sem alteração funcional.

Resultados: lint No Bolso aprovado; build web aprovado, com warning preexistente de chunk grande. Testes relacionados:45aprovados,11arquivos,0falhas (incluem referência renovada após15min, cache vencido/offline datado, PWA com cache preenchido, reabertura PWA e falha de API sem fallback novo). Testes existentes de dados públicos/combustível:8aprovados. Os arquivos `economy.js`, `fuel-publication.js`, `EconomizePage.tsx`, `query-client.ts` e `QueryProvider.tsx` foram comparados com a referência Git e estão inalterados. AP1303: lint/build web aprovados;137testes gerais aprovados/21condicionais ignorados;3testes de consulta/HTTP nos emuladores aprovados, preservando recusa de escrita e isolamento.

**Limitação real:** o No Bolso ainda não possui dependências Capacitor, configuração Capacitor nem projetos Android/iOS. A seleção foi preparada para a bridge oficial do futuro container, sem instalar SDK ou iniciar a próxima etapa. O caminho APK foi exercitado com bridge simulada nos testes, não em APK/aparelho do No Bolso. Não foi gerado APK novo. O APK do AP1303 da rodada anterior não foi modificado nesta correção. Sem deploy, migração, produção, commit, push, PR ou avanço para Script06.
