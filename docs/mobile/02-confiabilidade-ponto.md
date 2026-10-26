# Script 02 — Confiabilidade do ponto e captura offline pendente

## Estado da entrega

Implementação local de 22/10/2026, na branch `feat/ponto-operacoes-offline`, baseada em `aabad8a5d08a634d0d4a3f82c997cbeb314bf952`. O diagnóstico `01-diagnostico-publicacao.md`, que já estava não rastreado, foi preservado. Não havia mudanças funcionais posteriores ao commit-base no início desta rodada.

Não houve deploy, migração, commit, push ou PR. Nenhuma conta, coordenada, horário ou registro de produção foi utilizado ou alterado. O endpoint de teste push apontado no diagnóstico não foi corrigido. Capacitor, cobrança e aprovação administrativa ficam fora deste script.

## 1. Arquitetura implementada

| Parte | Arquivo | Responsabilidade |
|---|---|---|
| Endpoint novo | `functions/index.js`: `registrarOperacaoPonto` | Callable autenticado, timeout de 30s, mínimo de instâncias 0 e máximo 2 |
| Transação e contrato | `functions/ponto-operacoes.cjs` | Validação estrita, contexto confiável, hash canônico, replay e gravação atômica |
| Domínio preservado | `functions/ponto-validacao.cjs` | Mesma máquina de estados, sequência, geofence e cálculo do ponto oficial |
| Fila substituível | `src/services/pontoFila.js` | IndexedDB transacional, limite, isolamento e lease entre abas |
| Envio/reconciliação | `src/services/pontoSincronizacao.js` | Mesmo ID/payload, sessão antes de cada envio, classificação de resultado e limite de tentativas |
| Integração React | `src/components/usePontoOperacoes.js` | Eventos, ciclo de sessão, resposta e temporizadores únicos de retry |
| Captura e apresentação | `src/pages/Ponto.jsx`, `PontoOperacoes.jsx`, `src/utils/pontoOperacao.js` | Botão explícito de captura pendente, mensagens distintas, recibos e bloqueio da transição dependente |
| Calendário do ponto | `src/utils/dataPonto.js`, `src/services/ponto.js` | America/Fortaleza centralizado para data operacional e calendário da tela |
| Localização | `src/utils/localizacao.js` | Preserva latitude, longitude, precisão e timestamp da amostra do gesto; mantém fallback/timeout |
| Sessão | `src/services/auth.js` | Avisa antes de sair com pendências; preserva a fila e suspende novos envios naquela sessão |
| Shell | `vite.config.js`, `public/firebase-messaging-sw.js`, `src/services/appShell.js`, `src/App.jsx` | Manifesto de assets do build, precache mínimo, fallback de navegação e convivência com worker de mensagens |
| Regras | `firestore.rules` | Novas coleções sem leitura/escrita direta pelo cliente, inclusive para admin |

A fila não importa Auth/Firestore e o sincronizador recebe dependências explícitas. Isso permite substituir o adapter na futura versão nativa sem duplicar regras de marcação. Não foi criada uma plataforma genérica de filas para os outros módulos.

## 2. Contrato imutável v1

O payload contém exatamente estes campos; campos extras são recusados:

```js
{
  versao: 1,
  operacaoId: 'UUID v4 gerado uma única vez',
  uid: 'UID proprietário',
  contexto: { tipo: 'grupo', id: 'ID do grupo' }, // ou { tipo: 'legado' }
  funcionarioId: 'identificador do funcionário',
  tipo: 'ENTRADA', // SAIDA_INTERVALO | ENTRADA_INTERVALO | SAIDA
  modalidade: 'online', // ou offline_pendente, escolhida explicitamente
  jornadaData: 'YYYY-MM-DD', // data operacional conhecida
  capturadoEmMs: 0, // instante declarado pelo aparelho, não autenticado
  fuso: 'fuso declarado pelo aparelho',
  offsetMin: 180, // convenção de Date.getTimezoneOffset()
  amostra: {
    latitude: 0,
    longitude: 0,
    precisaoMetros: null, // null somente se indisponível
    instanteMs: null // timestamp do sensor, quando disponível
  }
}
```

Os valores ilustrativos acima não constituem uma operação real. Latitude/longitude são obrigatórias e limitadas aos intervalos geográficos; precisão e instante têm formato/limites próprios. UID, grupo, funcionário, modalidade, tipo, data, tamanho do fuso e versão são validados. O payload é reconstruído em ordem explícita antes do SHA-256, inclusive contexto e amostra: ordem diferente das chaves JSON não muda o hash.

Metadados mutáveis ficam fora do payload: `status`, `tentativas`, `tentativasCiclo`, `proximaTentativaMs`, `ultimoErro`, `atualizadaEmMs`, `pausada` e `resultado`. Senhas, tokens de autenticação, folha, cuidados e perfis completos não são gravados na fila.

Um timeout de modalidade online continua sendo uma tentativa online com o mesmo ID. Não há conversão automática para captura offline, substituição de coordenadas ou criação de outra operação pelo retry.

## 3. Autorização, atomicidade e coleções

### Operação online

`registrarOperacao` abre uma única transação que lê o vínculo global do UID, resolve o grupo e lê seu estado/perfil. O contexto do payload é uma condição de consistência, não uma escolha confiável de banco. Para legado, verifica ausência de vínculo e manutenção. Não faz uma consulta prévia repetida com `bancoDoUsuario`.

Exige perfil ativo `funcionario` com o funcionário correspondente. Então verifica o recibo. Se existir com o mesmo hash/UID, devolve exatamente o resultado anterior, sem recalcular hora, reler jornada/locais ou criar efeitos. ID existente com outro conteúdo produz `already-exists`/conflito.

Para operação inédita, valida funcionário ativo, ausência de pendência para a jornada, data compatível, local autorizado e sequência usando o domínio atual. A hora oficial continua sendo a hora do servidor capturada uma vez por invocação; o timestamp de commit também é preservado. O instante do aparelho não define a hora oficial.

Gravações na mesma transação:

1. `dias/{funcionarioId}_{dataKey}`: resumo oficial, como antes.
2. `registros/{uid}_{operacaoId}`: log oficial determinístico, autoria e amostra/declaração originais.
3. `pontoOperacoes/{uid}_{operacaoId}`: UID/contexto, hash e resultado original.

Nos grupos, todos esses caminhos ficam sob `grupos/{grupoId}/`. O mesmo vale para a coleção de pendências. Nenhum recibo é publicado por leitura direta: replay autenticado do payload original retorna o resultado após validar o contexto atual.

Recusas de negócio após autorização e leitura do recibo também são resultados transacionais: gravam somente um recibo `rejeitada` (ou `conflito` de jornada pendente), sem marcação oficial. Isso é necessário porque lançar um erro após ler “recibo ausente” não impediria outra chamada concorrente de concluir o commit. O recibo da recusa serializa esse caso e mantém o replay consistente. Erros de autenticação/contexto anteriores à consulta do recibo não permitem concluir ausência de uma marcação prévia.

### Captura offline

Operações `offline_pendente` não executam `aplicarAcao`, não gravam `dias`, `registros`, folha ou notificações de ponto. Após verificar identidade, contexto e funcionário ativo, criam:

- `pontoPendencias/{funcionarioId}_{jornadaData}` com payload original, UID/contexto, `status: aguardando_analise`, `recebidoEm` do servidor e `localizacaoValidada: false`.
- O recibo `pontoOperacoes/{uid}_{operacaoId}`, com resultado `recebida` e `recebidoEmMs`.

A captura é uma declaração para análise, não uma presença/geofence aprovada. Não foi adotada janela definitiva de retroatividade, tolerância de relógio ou nova política trabalhista. Coordenadas continuam sujeitas a adulteração pelo dispositivo; o código não promete antifraude de GPS.

O ID determinístico da pendência limita a uma pendência por funcionário/jornada também no servidor, inclusive entre aparelhos. Replay do mesmo ID devolve o recibo; outro ID para a jornada pendente é recusado. O novo fluxo online também recusa aquela jornada enquanto existir a pendência, mas isso não afeta dias futuros.

### Inatividade e alteração do vínculo

- Replay confirmado, com acesso ainda válido: devolve resultado original sem nova marcação.
- Operação inédita de funcionário/perfil inativo: recusada.
- Perfil inativo tentando replay: também recusado, sem revelar o recibo e sem nova gravação. Esta é a política conservadora desta versão; não há exceção de acesso histórico por perfil desativado.
- Vínculo alterado/inativo ou grupo inativo: recusa antes do recibo; não busca o contexto anterior por solicitação do cliente.
- Falha de transporte/desconhecida: preserva incerteza local e não supõe rejeição de negócio. Autorização negada antes de consultar o recibo também não prova ausência de uma gravação anterior: o cliente preserva incerteza e pausa.

`pontoOperacoes` e `pontoPendencias` têm negação explícita de leitura/escrita nas regras tanto na raiz quanto sob grupos. Não foi necessário índice composto novo, listener novo de recibos ou acesso direto a registros. O índice existente de `dias` por `(funcionarioId, dataKey)` é reaproveitado pelo resumo mensal.

## 4. Estados, ordem, retenção e isolamento local

| Estado local | Significado | Consequência |
|---|---|---|
| `pendente` | Commit local concluído, ainda sem resultado remoto | Não é ponto confirmado |
| `enviando` | Lease adquirida e tentativa em trânsito | Não oferece outra transição dependente |
| `incerta` | Resposta não recebida ou erro não conclusivo | Reenvia o mesmo payload/ID; pode ficar pausada |
| `confirmado` | Recibo de marcação oficial recebido | Não depende de sucesso da consulta de resumo |
| `recebida` | Servidor recebeu declaração offline | Aguarda análise; não compõe banco de horas/folha |
| `conflito` | ID/conteúdo incompatível, contrato inválido ou jornada já pendente | Bloqueia a jornada e pede orientação |
| `rejeitada` | Recibo transacional de recusa de sequência/local/condição, sem registro oficial | Exibe motivo; não transforma a tentativa em sucesso |

A lease local usa uma transação envolvendo operações e leases, por UID/contexto. Duas abas não adquirem simultaneamente a mesma lease ativa. Ela dura 60 segundos; o callable do cliente tem timeout de 25 segundos e o servidor, 30. Uma operação deixada `enviando` é recuperável após expiração. Não há heartbeat/polling permanente.

Mesmo após um timeout, uma requisição já recebida pode continuar no servidor; a idempotência transacional protege contra execução duplicada quando houver reenvio. Não se promete que o transporte físico de rede seja exatamente uma vez.

Há, no máximo, uma operação não resolvida por UID/contexto/funcionário/data na inserção local. Envios são serializados por proprietário/contexto. Uma confirmação cuja jornada ainda não apareceu no snapshot também bloqueia a transição antiga, evitando oferecer novamente a ação recém-confirmada.

Retentativas usam backoff exponencial com jitter: base 2 segundos, teto-base 5 minutos, multiplicador entre 0,75 e 1,25. No máximo cinco tentativas automáticas por ciclo, contadas persistentemente. Depois, a operação fica `incerta` e pausada; somente ação explícita de reconciliar inicia outro ciclo, sem trocar ID/payload e sem zerar o contador total. Falta de autenticação pausa antes do limite.

Retomada por abertura/login válido, retorno à aba, reconexão e resposta de outra aba via BroadcastChannel sem payload pessoal. Temporizadores são únicos e vinculados a operações concretas com retry/lease pendente; não consultam conectividade ou recibos periodicamente. Fila vazia, `recebida` ou apenas históricos finalizados não invocam Functions. Não há execução/sincronização garantida com app encerrado.

Limite local: 200 operações por UID/contexto, incluindo históricos. Ao atingir o limite, há erro explícito. A interface pagina a apresentação em blocos de 10 e permite limpar somente históricos locais `confirmado`/`rejeitada` por confirmação. Pendências, conflitos e tentativas incertas não são descartados silenciosamente. Os recibos do servidor não são apagados por esse comando.

No logout, o usuário pode cancelar ou sair preservando pendências. A sessão local suspende novos envios antes de encerrar o push/Auth. Antes de cada transmissão, UID/contexto e vida do componente são conferidos; uma resposta tardia pode persistir na fila do dono original, mas não atualiza a interface da nova sessão. Cada conta/grupo só lista/processa seu escopo. IndexedDB não é uma criptografia contra alguém com acesso ao perfil do navegador: usar um aparelho confiável e não compartilhar o perfil é uma limitação relevante.

**Retenção remota adotada:** sem TTL/expurgo automático de recibos e pendências nesta etapa. Isso preserva deduplicação de reenvios antigos, mas acumula armazenamento e índices automáticos. Qualquer política futura precisa garantir que um ID apagado não volte a ser uma operação inédita; não ativar TTL supondo gratuidade. Pendências offline recebidas permanecem sem aprovação nesta versão; no dia afetado o novo fluxo fica bloqueado e é necessário contato administrativo. Dias posteriores continuam disponíveis.

## 5. Calendário e contexto offline

`dataPonto.js` fixa America/Fortaleza para a data operacional e oferece um Date de calendário para a tela. O serviço de ponto e as derivações de “hoje”/dia da semana da tela passam a usar esse calendário, sem alterar a data dos módulos de compras ou cuidados.

Uma captura offline só é oferecida após uma jornada daquela data ter vindo de snapshot confirmado pelo servidor na sessão atual. O listener diário existente usa `includeMetadataChanges` para distinguir a primeira cópia de cache da confirmação remota, sem adicionar uma consulta separada. Funcionário, identidade/grupo e ação precisam estar conhecidos; a localização é obtida no gesto com `maximumAge: 0` e metadados preservados. Sem contexto ou GPS, não salva uma captura inventada.

Virada durante o gesto é recusada com orientação. Uma operação online inédita cuja data de captura/jornada não seja a data do servidor é recusada; replay de uma já confirmada continua recuperando o resultado antigo. Não foi introduzido suporte a turno atravessando meia-noite.

Reabrir offline após encerrar o app pode recuperar o shell e Auth local, mas não necessariamente o vínculo/perfil/jornada, pois não foi habilitada persistência global de Firestore. Sem recuperar esse contexto com segurança, não há nova captura offline nessa abertura. O login explica a limitação; a fila já persistida é preservada para reconciliação ao voltar online à mesma conta/grupo. Não foi armazenado um perfil completo para contornar autorização.

## 6. App shell e atualização do PWA

O worker de mensagens foi preservado e ganhou o shell estático. O build emite `app-shell-manifest.js`, com hash do HTML, dependências estáticas de entrada, assets associados, ícones e manifest. Imports dinâmicos de recursos opcionais não são precacheados indiscriminadamente. O PDF já importado estaticamente pela aplicação faz parte da entrada atual; não se refatorou esse módulo para reduzir o bundle nesta etapa.

O worker:

- Precacheia o conjunto necessário para inicializar a interface; falha de instalação não ativa um conjunto incompleto.
- Reutiliza arquivos de hash já presentes em caches próprios e evita novo download se a mesma versão já está completa. Arquivos de raiz sem hash não vêm de uma versão antiga.
- Usa rede para navegação, com fallback para o HTML da versão instalada somente em falha de rede.
- Não armazena respostas autenticadas, API, Auth, Functions ou documentos Firestore. Fetches externos/POST e caminhos fora da navegação/assets não são interceptados.
- Não força reload, mesmo durante marcação/sincronização. Versões anteriores de assets são preservadas se há clientes abertos; quando uma ativação ocorre sem clientes antigos, limpa somente caches `ap1303-shell-*` anteriores. Isso evita quebrar chunks de abas ainda abertas, mas pode manter cópias locais temporariamente.
- Registra/atualiza o worker em eventos de abertura/sessão, com fila local de registro compartilhada com push. Logout pode revogar a inscrição e reinstalar o shell sem UID. Uma falha de rede ao atualizar não impede usar a versão instalada.

Não há suporte offline prometido na primeira visita, nem precache de credenciais. O shell não garante funções opcionais que dependem de rede/imports dinâmicos ou contexto que não foi recuperado. Push continua sujeito ao comportamento do navegador e não ganhou suporte nativo.

## 7. Consumo operacional e comparação

Não foram criados serviço externo, scheduler, TTL, backup recorrente ou listener por item. O novo callable usa a infraestrutura de Functions já existente, com `minInstances: 0`; isso não é promessa de custo zero, pois invocações, execução, rede, artefatos, logs e armazenamento dependem da cobrança/configuração do projeto. A alternativa seria sobrecarregar o endpoint antigo com dois contratos; optou-se pelo endpoint novo para preservar integralmente clientes antigos e permitir publicação progressiva. Ambos compartilham o domínio de validação.

### Quantidades por fluxo do novo handler

Condição da tabela: grupo ativo, um local permitido consultado, sem contenção/reexecução da transação. Os testes instrumentam chamadas `get` e `create/set` contra Firestore emulador e confirmam **contagem de operações do código**, não leituras faturadas nem custo monetário medido em produção.

| Fluxo | Functions | Leituras de documentos no handler | Escritas | Observação |
|---|---:|---:|---:|---|
| 1. Marcação online aceita | 1 | 8 | 3 | Vínculo, grupo, perfil, recibo, funcionário, pendência da jornada, local e dia; grava dia/log/recibo |
| 2. Replay do mesmo ID/payload | 1 por reenvio necessário | 4 | 0 | Vínculo, grupo, perfil e recibo; nenhum local/jornada extra, nenhuma nova notificação de ponto |
| 3. Sincronização de captura offline | 1 | 6 | 2 | Vínculo, grupo, perfil, recibo, funcionário e pendência da jornada; grava pendência/recibo |
| 4. App aberto sem atividade, fila vazia/finalizada | 0 adicionais deste fluxo | 0 adicionais de Firestore por fila/recibo | 0 | IndexedDB local e eventos; não há timer consultando fila/conectividade/servidor |

Com `L` locais percorridos, o fluxo online faz `7 + L` leituras no handler. Consultas a locais param no primeiro autorizado. Contexto legado usa a leitura de manutenção no lugar do documento de grupo. Reexecuções concorrentes da transação podem aumentar leituras; chamadas de replay evitam novas escritas. Contenção e interceptações de rede não foram convertidas em estimativa de faturamento.

O fluxo antigo, em grupo, fazia aproximadamente `6 + L` leituras no handler de marcação: três na resolução prévia de contexto e depois perfil, funcionário, locais e dia na transação. Com um local: 7 leituras e 2 escritas, mas sem recibo/idempotência. O novo aceita com cerca de **uma leitura e uma escrita adicionais**: o recibo dá recuperação exata e o documento de pendência impede avançar uma jornada já pendente. A validação do contexto foi trazida para a transação, removendo leituras repetidas de grupo/perfil antes dela.

Uma tentativa antiga repetida não recuperava o resultado: relia os controles e falhava na sequência. O replay novo lê apenas autorização atual e recibo. Offline não tinha equivalente anterior. O log novo também preserva a declaração original, aumentando seu tamanho; não se descartou autoria/amostra para reduzir armazenamento.

### Leituras de interface e efeitos preexistentes

- Foi removida a releitura de dia/banco de horas disparada diretamente depois de toda tentativa. A confirmação fica no recibo; o snapshot diário já existente atualiza a jornada. Erro ao carregar resumo não muda esse recibo.
- `calcularBancoHorasMes` deixou de buscar todo o histórico do funcionário para filtrar em memória. A consulta agora restringe funcionário e intervalo mensal usando o índice já declarado; reduz aproximadamente de todo o histórico para até os documentos daquele mês, conforme os dados existentes.
- O carregamento do banco atual/anterior ainda faz uma leitura de funcionário em cada chamada mensal. Essa repetição permanece, assim como a consulta mensal do resumo e os listeners antigos de tarefas/cadastro/jornada. Não foi reescrita a tela inteira para unificá-los; não se afirma que todos os custos da tela foram eliminados. Conexão inicial, documentos de dependência das regras e alterações notificadas aos listeners podem gerar outras leituras.
- O módulo `PratosDia`, já exibido no Ponto antes deste script, ainda possui atualização periódica a cada minuto no código preexistente. Portanto **o AP1303 inteiro aberto não tem consumo remoto zero**. A nova fila não adiciona polling nem Functions ociosas; remover a atualização periódica de pratos/cuidados e otimizar os demais módulos é uma revisão separada para preservar seu comportamento nesta entrega.
- Uma marcação oficial nova ainda aciona o gatilho de aviso de ponto preexistente. Seus controles, leitura de dispositivos/usuários e recibos de push não estão nos números do handler da tabela. Replay não cria novo `registros`, portanto não cria um segundo evento de ponto confirmado. Captura offline tampouco cria esse evento.
- Inicialização/atualização do shell usa rede da hospedagem para manifest/arquivos estáticos; reaproveita hashes em cache. Há armazenamento local para assets e fila. As chamadas de negócio usam os mesmos tokens Auth do SDK; tráfego de renovação de token não é contado como leitura Firestore do handler.

Conferência do artefato final em disco: 10 arquivos de precache, total bruto de 2.643.814 bytes, todas as referências estáticas de entrada do HTML presentes; chunks opcionais de jsQR/html2canvas fora do precache. Isso é medição de tamanho de arquivos locais, não de transferência/fatura. Compressão HTTP, cache do navegador e reaproveitamento de hashes mudam o tráfego real. A maior parte desse conteúdo já pertence à entrada da aplicação atual; otimização adicional dos imports/imagens pode ser feita separadamente sem comprometer o shell.

Não foram criados índices compostos para recibos/pendências, pois todo acesso é por ID. Os índices automáticos e o volume retido têm custo potencial de armazenamento; medir uso em produção depois de uma publicação autorizada é necessário antes de estimar reais/mês ou afirmar cobertura pela cota gratuita. Nesta rodada, as quantidades de código foram conferidas em emulador; não houve medição de fatura.

## 8. Verificações realizadas

### Automatizadas

- `npm run lint`: aprovado.
- `npm test`: 122 testes contabilizados, 107 aprovados, 15 condicionais ignorados, nenhuma falha.
- `npm run test:compras:integracao`: 75 aprovados, nenhuma falha/ignorado, somente projetos `demo-*` e emuladores Auth/Firestore, incluindo recusa concorrente com recibo estável.
- `npm run build`: aprovado; manifesto estático gerado e nenhum pacote Capacitor adicionado.
- `git diff --check`: sem erro de whitespace; avisos locais de conversão LF/CRLF não são falhas de lógica.

Novos testes: `ponto-operacoes-emulador.test.cjs`, `ponto-fila.test.js`, `ponto-shell.test.cjs`. A suíte foi ampliada, sem afrouxar regras. O teste de localização passou a conferir também precisão/timestamp que agora fazem parte do resultado.

Cobertura: payload concorrente/recibo único, replay após resposta descartada e em outro dia, ordem das chaves, conflito de conteúdo, pendência sem efeito em jornada/folha/notificações, uma pendência por jornada e disponibilidade de dias futuros, isolamento UID/grupo, inatividade/admin/consulta, data/local inválidos, regras contra leitura/escrita direta, caminho antigo, lease entre conexões, recuperação de `enviando`, falha de armazenamento, troca de conta antes/depois do envio, payload preservado, retries limitados, nenhuma Function com fila vazia/recebida, data de Fortaleza, limpeza de caches e exclusão de rotas de API do shell.

`fake-indexeddb` foi a única dependência adicionada, apenas de desenvolvimento/teste. Seus testes de transação/fechamento não foram apresentados como persistência física de navegador.

### IndexedDB real no Chrome

Com harness local em `127.0.0.1:5177`, sem Auth/Firebase/GPS e somente dados fictícios:

1. Criada operação `offline_pendente` e adquirida lease na primeira aba.
2. Segunda aba recusou aquisição concorrente enquanto a lease estava ativa.
3. Ambas as abas foram fechadas; nova aba recuperou o mesmo ID, modalidade e estado `enviando`.
4. Avanço explícito do relógio de teste simulou expiração; recuperou o mesmo ID com contador incrementado.
5. Consulta com outra identidade local retornou zero operações.

Evidência: `output/ponto-offline/indexeddb-reabertura.png` (arquivo local ignorado no Git). Isso comprova IndexedDB real entre aberturas de abas/conexões no Chrome, não encerramento completo do navegador/SO ou PWA instalado em iPhone/Android.

### Alertas e verificações ainda necessárias

O npm informou quatro alertas altos na cadeia já existente de Firebase/Firestore/compat/grpc. `npm audit --json` confirmou esses pacotes; o lockfile mudou somente para a dependência de teste adicionada. Não se aplicou `audit fix`, atualização ampla ou alteração de SDK fora do escopo. Avaliar remediação/impacto antes de uma publicação futura; teste passando não elimina esses alertas.

Roteiro manual pendente, sempre em ambiente demonstrativo:

1. Primeiro acesso online e instalação completa do shell; fechar o PWA e reabrir sem internet. Conferir shell e aviso quando perfil/jornada não puderem ser recuperados. Primeira visita offline não deve parecer suportada.
2. Com jornada conhecida, cortar a rede, obter GPS no gesto e escolher captura pendente. Confirmar que não aparece ponto oficial nem avanço de sequência; restaurar rede e verificar “recebida”, sem alteração de folha.
3. Cortar apenas a resposta depois de commit real de emulador; recuperar mesmo ID pelo app, sem segunda ação. Testes automatizados já cobrem o contrato/backend e falha de resposta simulada do cliente, mas não um corte físico de rede do aparelho.
4. Encerrar completamente navegador/PWA/processo/SO com operação em trânsito; reabrir após lease e conferir recuperação. Testar armazenamento bloqueado/cheio no aparelho, sem anúncio falso de salvamento.
5. Validar logout/login de outra conta, retorno da mesma, troca de grupo, permissão GPS negada e virada de data com fuso do aparelho diferente.
6. Publicar duas versões apenas no ambiente de teste, manter aba antiga em marcação/sincronização e conferir que atualização de worker não força reload nem elimina chunks necessários.
7. Confirmar avisos web após a mudança compartilhada de registro de worker, com contas fictícias e envio de teste autorizado em rodada específica. Nenhum push real foi enviado neste script.

Não foi declarada validação física Android/iPhone nem implementação de persistência nativa.

## 9. Publicação futura e reversão sem perda

Nada abaixo foi executado nesta etapa:

1. Resolver a avaliação de dependências/pendências de teste que forem impeditivas para a publicação pretendida.
2. Validar explicitamente destino/projeto; o default de `.firebaserc` continua sendo outro projeto. Nunca usar deploy sem projeto explícito do AP1303.
3. Publicar primeiro o novo `registrarOperacaoPonto`, mantendo `registrarPonto` e demais exports. Sem migração/TTL e sem deploy geral que remova funções.
4. Publicar/conferir regras compatíveis de negação nas coleções novas e o índice mensal existente se ainda não estiver disponível no destino. Não há novo índice composto deste script.
5. Publicar frontend, worker e `app-shell-manifest.js` gerados juntos pelo mesmo build. Não publicar `public/` isolado nem manifesto de outra versão.
6. Validar em conta demonstrativa o fluxo novo e compatibilidade antiga antes de ampliar uso. Medir invocações/leituras/armazenamento e comparar com as estimativas, sem usar dados de trabalho reais para testes destrutivos.

Clientes antigos continuam enviando a `registrarPonto` o contrato anterior, com validações preservadas e **sem idempotência nova**. Eles não entendem a fila/pêndencia deste frontend e não devem ser usados para contornar uma jornada pendente. Não há fallback automático do endpoint novo para o antigo quando ocorre erro.

Reversão operacional: publicar correção para frente que suspenda novas capturas se necessário, preservando o código de listagem/reconciliação de operações já salvas e o endpoint de recibos. Manter IndexedDB, registros, recibos e pendências; nunca limpar a fila ou voltar a tratar um ID antigo como inédito. Não excluir a Function nova, as coleções ou as regras de proteção para “desfazer” a versão. Se o backend ficar indisponível, a UI deve manter incerteza e pausar/reconciliar, sem reenviar pelo endpoint antigo. Uma eventual migração futura de grupo precisa considerar operações ainda ligadas ao contexto original; esta versão as recusa quando o vínculo mudou e não as move silenciosamente.

## 10. Próximo script

A base permite iniciar o Script 03 de empacotamento em desenvolvimento: contrato de servidor, adapter local e estados explícitos estão separados. O Script 03 deve substituir/validar durabilidade nativa, toolchain e ambientes; não deve presumir que IndexedDB do Chrome garante persistência de WebView iOS. A aprovação administrativa das pendências, turno noturno, push nativo e planos continuam fora da entrega.

Isso não significa versão publicada nem pronta para lojas. Os testes físicos e os alertas de dependências acima continuam sendo pendências de validação/remediação.
