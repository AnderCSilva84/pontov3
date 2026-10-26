# Script 09 — exclusão efetiva da própria conta

23/10/2026 · branch `feat/ponto-operacoes-offline`. Implementação e ensaios somente locais, preservando as alterações dos Scripts 02–08. Sem produção, deploy, migração, commit, push ou PR. Nenhum recurso externo ou dependência foi adicionado nesta etapa. Android primeiro; nenhum trabalho iOS.

## Resultado e política adotada

A solicitação existente agora permite **confirmar e processar a exclusão da identidade Auth**, revogar acesso e integrações e emitir recibo mínimo. Solicitar, desativar acesso e excluir Auth são estados distintos. Não se anuncia apagamento integral dos dados.

Decisão expressa do titular nesta rodada: **o titular de cada grupo, com orientação contábil/jurídica, define a política de retenção e autoriza o descarte futuro dos históricos**. Não foi inventado prazo legal. Ainda é necessário definir prazo/critério de término, fundamento/finalidade de cada categoria e procedimento de descarte/restrição. O sistema preserva esses registros, marca as categorias retidas no protocolo e informa isso antes da confirmação. A ausência dessa definição não impede remover credenciais e acesso; impede anunciar expurgo desses históricos ou implementar uma cascata automática.

### Matriz de dados, controle e tratamento

A = credenciais/exclusivamente pessoal; B = compartilhado do grupo; C = histórico atribuído; D = terceiros; E = segurança/idempotência. Dados preservados **não foram anonimizados**: UID, nomes snapshot, texto livre, documentos, CPF e referências podem continuar identificando pessoas.

| Dado/local e classe | Proprietário/controlador operacional | Tratamento implementado e motivo | Dependência / retenção pendente |
|---|---|---|---|
| Authentication: UID, email, senha/provedor, metadados (A) | Conta do usuário, Auth gerenciado pelo Firebase | `deleteUser` efetivo depois das etapas Firestore; user-not-found é replay bem-sucedido | Conta de senha precisa reauth recente. Não se mantém senha. Sem período adicional escolhido |
| `vinculosUsuarios/UID`, `users/UID` e `grupos/G/users/UID` (A) | Usuário/grupo | Desativação transacional inicial; remoção do vínculo e perfil, inclusive cópia pessoal legada | Grupo vem do vínculo validado, não de parâmetro livre. Não é exclusão do grupo |
| `funcionarios/F`, CPF, endereço, salário, escala (C/D) | Titular do grupo, responsável pelo histórico trabalhista | Preservado identificável; acesso desativado somente para perfil de funcionário e sem outro usuário referindo F | Não desativar funcionário de terceiro porque admin legado aponta para ele. Prazo/tratamento: decisão do titular com orientação |
| `registros`, `dias`, ajustes e banco de horas (C/D) | Grupo / responsável trabalhista | Preservados sem cascata nem modificação de resultado | Incluem nomes, horários, amostras de localização e autoria conforme contrato existente; definir prazo e acesso após desligamento |
| `pontoOperacoes`, `pontoPendencias` (C/E) | Grupo / auditoria de ponto | Recibos, hash, payload original e estado remoto preservados | Não apagar deduplicação nem aprovar/rejeitar ponto ao excluir conta. Política de retenção técnica e dos payloads pendente |
| `folhasPagamento`, `financeiro`, `financeiroAuditoria`, `documentosTrabalhistas` (C/D) | Titular/grupo | Valores, recibos, folhas, URLs e autoria preservados | Definir retenção de documentos trabalhistas/financeiros. Não inferir prazo jurídico |
| Listas/itens, cupons/rascunhos, aliases, catálogo, categorias, mercados, preços (B/C/D) | Grupo | Preservados, incluindo autoria e nome snapshot | São compartilhados; não apagar preços nem listas dos demais usuários. Rascunhos contêm dados de compra e podem identificar comprador; titular define tratamento |
| Tarefas, rotina, conclusões, lembretes, ocorrências, pessoas de cuidado e pratos (B/C/D) | Grupo e responsáveis pelos cuidados | Preservados com destinatários/autoria; o login excluído perde acesso | Não apagar dados de crianças, idosos, pets ou cuidadores restantes. Definir revisão dos destinatários e retenção |
| Dispositivos `pushDispositivos` no grupo atual e legado (A/E) | Usuário/instalação | Removidos por UID em páginas; bloqueio transacional impede novos cadastros durante exclusão | Modelo atual: um vínculo de grupo por UID. Não há scanner global de grupos órfãos/inconsistentes |
| `pushInstalacoes`, `pushTokensNativos`, `pushTestes/UID` (A/E) | Instalação/usuário | Reservas pessoais removidas por UID; preferências do perfil eliminadas | Não apagar reserva pertencente a outro dono. Identidade SDK da instalação permanece para uso de outras contas, sem vínculo pessoal no backend |
| `pushEnvios`, `pushEventos`, notificações e `usuariosAuditoria` (B/C/E) | Grupo / segurança | Preservados: eventos podem envolver vários membros e recibos evitam duplicação | Não anonimizado; definir minimização, prazo e expurgo técnico |
| `noBolsoGrants/UID`, `noBolsoOwners/UID`, `noBolsoLinks` (A/E/B) | Conta AP1303 / destinatários No Bolso | Revoga códigos e origem pessoal, removendo somente esse AP UID da lista de origens | Mantém outra origem no mesmo vínculo e os preços compartilhados. Não exclui conta, despesas ou cache de outro sistema |
| `grupos/G`, membros, filiais, locais e configurações (B/D) | Titular/grupo | Nunca apagados automaticamente. Titular sem outros ativos pode confirmar encerramento de acesso, mantendo históricos | Com outros ativos, transferir para admin elegível. Grupo legado sem sucessor requer preparação/migração, não exclusão automática |
| `contaSolicitacoes/UID` (E/C) | Operação de conta / responsável técnico | Protocolo estável, etapas, contexto, categorias retidas e evidência Auth; sem senha/token/coordenadas novos | Definir prazo do recibo/auditoria. Não é consulta pública por UID |
| `contaExecucoes/UID_rodada` (E) | Processador servidor | Sinal de trabalho pequeno; removido ao finalizar o acionamento, inclusive quando outra execução tem a lease | Falha de remoção pode exigir limpeza operacional. Sem TTL ou Scheduler |
| Arquivos remotos e URLs (B/C/D) | Dono do arquivo e grupo que o referencia | Código atual usa URLs de comprovantes; não foi identificado upload proprietário para Cloud Storage nos serviços inspecionados. Nenhum arquivo remoto foi apagado por presunção | URLs não provam propriedade. Arquivo externo exige política e acesso verificados |
| IndexedDB `ap1303-ponto-v1` (A/C/E) | Conta e aparelho | Só UID original é limpo; capturas nunca enviadas exigem descarte explícito. Se surgir nova operação incerta durante exclusão, limpeza recusa apagá-la e emite aviso | Recebidas/confirmadas mantêm evidência no servidor. Outros aparelhos não são limpos remotamente |
| Auth persistido, rascunho de cadastro e preferências push (A) | Conta/aparelho | SignOut do dono; chaves exatas por UID/projeto e pushAndroid por UID removidas | Nunca limpar todo localStorage/IndexedDB nem sair de sessão que entrou depois |
| Firestore em memória, listeners, sincronizadores e caches estáticos (A/B/E) | Runtime/aparelho | Evento existente suspende tarefas; remount/guardas descartam callbacks antigos; após sucesso, recarrega `/conta` para liberar memória. Cache estático público preservado | SDK atual não habilita persistência Firestore em disco. Marcador de notificações lidas por funcionário é compartilhável entre sessões administrativas e não é apagado como dado pessoal exclusivo |
| PDFs temporários nativos (A/C/D) | Conta que gerou / cache do aparelho | Novos arquivos recebem prefixo inequívoco por UID e comprimento; exclusão limpa só esse prefixo | PDFs antigos com UUID sem dono não podem ser atribuídos com segurança: permanecem no cache; limpeza existente por idade ocorre ao gerar novos PDFs, sem garantia de prazo de expurgo. Requer decisão para legado |
| PDFs salvos/compartilhados/impressos externamente (C/D) | Quem recebeu/salvou | O app não pode revogá-los; informado na tela | Destinatário/titular define tratamento externo |

## Estados, etapas e retomada

1. `aguardando_analise`: solicitação registrada pelo fluxo anterior, sem remoção. O nome de estado foi mantido por compatibilidade; a tela explica que é preciso confirmar definitivamente. Motivo genérico politica_retencao deixou de bloquear todas as contas.
2. Confirmar (`acao: concluir`) exige confirmação, reauth até 5 minutos e resumo local verificável. UID é exclusivamente o da sessão. Transação revalida vínculo, perfil, grupo e responsabilidade administrativa, incluindo Auth ativo de um administrador remanescente quando necessário; desativa acesso e cria sinal durável de execução junto com o checkpoint.
3. `processando`: `dispositivos → dispositivos_legado (grupo) → instalacoes → tokens → integracoes → perfil → auth → recibo`.
4. `falha_recuperavel`: etapa/cursor ficam preservados; não significa conta excluída. Não há retry infinito. Se Auth ainda existe, a própria conta pode reautenticar e retomar pela tela Minha conta. Se Auth já saiu, o operador retoma no servidor pelo protocolo.
5. `concluida`: Auth removido e etapas obrigatórias concluídas. O recibo informa que os históricos descritos permanecem. Limpeza local incompleta é indicada separadamente, sem alegar apagamento integral.

Paginação: 25 documentos por página, ordenação por ID e cursor. Uma invocação executa no máximo 12 passos/páginas; se necessário, publica outro sinal `contaExecucoes` transacionalmente. Até 40 rodadas automáticas; depois exige retomada operacional explícita. Consultas sempre direcionadas ao UID e ao contexto congelado, sem collectionGroup/global scan e sem buscar históricos para contá-los.

Uma lease transacional de 120 segundos e um dono aleatório protegem cada checkpoint. Atualizações de progresso não disparam novas Functions: só criação de um sinal pequeno aciona o worker. O callable também tenta processar o primeiro lote para responder com recibo quando possível; se o worker já tem a lease, retorna estado real em processamento. O worker não é endpoint HTTP administrativo, tem retries automáticos desabilitados e não depende de sessão/senha do usuário.

Auth e Firestore **não compartilham transação**. Se Auth delete suceder e o checkpoint seguinte falhar, o próximo processamento aceita user-not-found e termina o recibo; não recria conta. Queda abrupta pode deixar lease até expirar e exigir retomada operacional. Sem Scheduler para procurar pedidos parados. Não há timeout que inventa conclusão.

### Responsabilidade administrativa e concorrência

A transação de início modifica a revisão do grupo e os documentos de acesso. A transferência existente lê os mesmos documentos e valida perfil/vínculo ativos e identidade Auth do destino. Uma exclusão do destino concorrente força conflito/revalidação. A exclusão administrativa existente também ganhou reserva transacional (desativa alvo antes de remover Auth, revalida ator/grupo/titular), evitando transferir para um administrador em remoção.

Só contas administrativas/titulares consultam outros membros para essa decisão, com limite de 101 documentos e bloqueio de revisão se exceder 100. Perfis legados sem ativo são tratados como ativos; não se ignora membro por falta desse campo. Funcionários/consulta não recebem esse bloqueio particular nem essa consulta. Último admin do conjunto legado sem sucessor não é removido automaticamente: cadastrar sucessor ou preparar migração. Não foi executada migração nesta etapa.

Cadastro nativo/web de dispositivos, geração/resgate de vínculo No Bolso e recriação de membros/grupos possuem barreira transacional por solicitação em processamento. Regras também impedem reativar o perfil pelo cliente durante o processo. Tombstone técnica impede replay de cadastro recriar a mesma identidade lógica excluída; novo cadastro exige nova operação/UID.

## Pendências e limpeza local

- Resultado online desconhecido ou captura já tentada: ação explícita reenvia **o payload original idempotente** e recebe o recibo na resposta, sem consulta prévia nem GPS novo. Lease local impede competir com outro envio; troca de sessão conserva resultado somente na fila original.
- Captura offline com zero tentativas: pode ser enviada pelo fluxo de ponto ou descartada por confirmação específica. Não se usa erro de rede como prova de que nunca foi enviada.
- Recebida pelo servidor, confirmada, rejeitada ou conflito com recibo: não exige aprovação administrativa inexistente para excluir a identidade. Auditoria remota é preservada.
- Se fila não pode ser lida, ou há tentativa de vínculo antigo não reconciliável, a confirmação definitiva é bloqueada com orientação. A solicitação inicial ainda pode existir.
- Nova captura incerta encontrada na limpeza final é preservada; recibo mostra limpeza pendente. Os demais dados pessoais locais ainda são limpos, sessão é encerrada e o usuário pode repetir a limpeza. Captura impossível de reconciliar após remoção Auth exige orientação operacional, nunca descarte silencioso.
- PDFs antigos sem identificação de dono e arquivos externos são limites explícitos. Não se promete limpeza de outro aparelho.

## Interface Android/PWA e caminho web externo

A rota compartilhada **`/conta`** abre sem APK e oferece login da própria conta, recuperação de senha, consequências, reauth, confirmação, transferência quando aplicável, protocolo, status manual e retomada. Não aceita excluir informando email/UID. Formulários não armazenam senha. Uma confirmação inicial só registra o pedido; a segunda é a exclusão definitiva.

Se o navegador impedir salvar o recibo na aba, ele é mantido em memória com aviso para guardar o protocolo; essa falha não impede SignOut. Nesse caso não há reload automático para não perder o recibo, e fechar a aba libera a memória. Não há polling nem listener de status por solicitação. Consulta ao abrir e por Atualizar status. Depois da conclusão confirmada, limpeza local e SignOut só atingem o dono capturado; runtime reinicia em `/conta`, com recibo mínimo da aba, sem nome/email/histórico. Sem sessão e sem conclusão confirmada, a tela diz que a conclusão ainda precisa ser conferida. Protocolo não concede acesso remoto. Para recuperação, o titular encaminha o protocolo ao operador autorizado; nunca senha.

**Nenhuma URL nova pública foi publicada ou anunciada como funcional.** Para disponibilizar: revisar política/contato de suporte e domínio final, publicar backend/regras e depois frontend/rota SPA, testar `/conta` em navegador limpo sem instalação, conferir login/recuperação e adicionar esse endereço verificado às informações da loja. O canal público de suporte e seus dados de contato precisam ser definidos antes dessa publicação; a orientação local atual é o responsável pelo grupo.

## Recuperação operacional (somente local nesta rodada)

Ferramenta `scripts/retomar-exclusao-emulador.cjs`: exige Auth e Firestore em loopback, projeto demo ou o projeto exclusivo de teste; recusa produção. Não existe botão administrativo para escolher livremente UID no cliente.

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8877'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9098'
$env:GCLOUD_PROJECT='ap1303-android-push-teste'
node scripts/retomar-exclusao-emulador.cjs <protocolo-ficticio> status
node scripts/retomar-exclusao-emulador.cjs <protocolo-ficticio> retomar
```

Conferir protocolo/contexto e checkpoint, corrigir a causa de indisponibilidade/inconsistência, aguardar lease expirar se houver execução interrompida e retomar uma vez. Só pedidos já autorizados com etapa persistida podem ser retomados; a ferramenta não transforma uma solicitação sem confirmação em exclusão. Não exige Auth existente e não recria login. Repetir status após resposta; se voltar a falhar, investigar em vez de automatizar loop. Não mover grupo nem alterar o payload histórico para forçar passagem.

Uma futura recuperação em ambiente final deve usar acesso de servidor auditado e mínimo, com configuração/identidade do projeto conferidas; a ferramenta desta rodada deliberadamente não funciona em produção. Verificar permissões Auth necessárias na identidade de runtime antes da futura publicação, sem embutir credencial no app.

## Custos — estimativas pelo código, não faturamento medido

Somente emuladores processaram dados nesta etapa. Foram observados resultados das operações; não houve medição de leituras faturadas, bytes, latência de cobrança ou consumo em produção. Auth/SDK e transações sob contenção podem acrescentar operações.

| Fluxo | Functions / leituras / escritas esperados |
|---|---|
| Solicitar pela primeira vez | 1 callable, 1 lookup Auth, ~4 leituras e 1 escrita; admin acrescenta queries limitadas existentes de até 2 admins/2 membros |
| Repetir solicitação | 1 callable, 1 lookup Auth, ~4 leituras, 0 escritas do pedido |
| Abrir/atualizar status | 1 callable, 1 leitura do pedido; fila somente local. Se concluído, limpeza local/signOut, sem varrer histórico |
| Confirmar e processar conta pequena de grupo | 1 callable, normalmente 1 acionamento de worker; autorização ~5 leituras/4 escritas. Processamento simples de funcionário, sem dispositivos/links, estimado ~26 leituras e ~17 escritas adicionais, incluindo deletes de documentos ausentes e checkpoints; sinal acrescenta 1 escrita + 1 exclusão e worker concorrente pode acrescentar ~2 leituras da lease |
| Responsabilidade de admin/titular | Na confirmação, consulta limitada aos outros membros (até 101). Reutiliza esse resultado para decisão de admin; não busca folha/ponto nem conta históricos |
| Dispositivos dependentes | Uma leitura e exclusão por documento correspondente + checkpoint por página; páginas vazias têm custo mínimo potencial. Reservas são consultadas por UID para não apagar outro dono |
| Integração No Bolso | Leitura do owner e até 2 links; remove código/owner e ajusta apenas links correspondentes. Sem consulta a preços, despesas ou ao outro app |
| Muitos dados dependentes | Um sinal/worker por lote de até 12 passos, páginas de 25; checkpoints/cursor evitam repetir páginas concluídas. Até 40 rodadas antes de intervenção explícita |
| Retomada após falha | 1 confirmação/reauth se identidade existir, ou invocação operacional servidor; lease/checkpoint e apenas etapas restantes. Delete Auth repetido pode retornar user-not-found; páginas já confirmadas não são varridas outra vez |
| Replay concluído no processador | 2 leituras do pedido/lease, nenhuma nova remoção Auth/escrita de negócio |
| Reconciliar ponto incerto | 1 callable por operação realmente pendente, resposta/recibo idempotente existentes; sem leitura remota extra para descobrir recibo antes. Nenhum envio quando fila não contém operação reconciliável |
| Estado ocioso | 0 chamadas/leituras adicionais deste fluxo. Listeners de sessão/perfil e demais módulos existentes mantêm seus custos próprios |

As estimativas de processamento excluem contenção, entregas duplicadas de eventos e recuperação de falhas. Deletes de caminhos já ausentes e consultas vazias também podem ser cobrados; não se promete custo zero/cota gratuita. Novos sinais técnicos e checkpoints têm armazenamento/escritas pequenos, necessários à recuperação. Não há índice composto novo, polling, Scheduler, TTL, backup ou serviço pago novo.

Comparação com Script 04: o pedido antigo tinha 1 escrita e nunca removia Auth. Agora só a confirmação definitiva inicia o custo de limpeza. A suspensão local após exclusão usa a confirmação já recebida do servidor e não chama removerDispositivoPush novamente. Logout normal mantém o comportamento anterior. Atualizações por etapa ficam no mesmo checkpoint e **não disparam Function por etapa**; uma coleção de sinais gera um acionamento por lote. Cadastros de push/vínculo acrescentam leitura transacional da barreira para impedir corridas com exclusão. A reserva na exclusão administrativa acrescenta aproximadamente 1 leitura e 1–2 escritas ao fluxo anterior, necessária para serializar transferência/remoção. Foram evitadas consulta prévia de recibo de ponto, consultas a todo histórico e listener permanente por protocolo. Validações de autorização existentes continuam; não foram removidas para economizar.

## Testes e limites de validação

Resultados finais e hash do APK estão registrados abaixo. Logs locais ignorados: `tmp/script09-*.log`; fixtures e helpers de aparelho em `tmp/`, sem senhas/tokens/payloads em logs rotineiros. Nenhum dado de produção foi lido/excluído.

Ensaios cobrem: Auth realmente removido, repetição/conclusão concorrente, falhas antes/depois do delete Auth e retomada sem login, alvo alheio recusado, último admin e transferência concorrente, reserva da exclusão administrativa, preservação de terceiros/financeiro/preços/ponto pendente, revogação de dispositivos/reservas/links, paginação/cursor, perfil sem ativo, descarte local protegido e troca de sessão durante reconciliação.

No Samsung SM-A057M/Android 15, o APK executou login de conta fictícia, senha incorreta recusada, criação de protocolo, cancelamento antes da confirmação definitiva, falha de conexão Auth simulada retirando somente o reverse 9098 e retomada após restaurá-lo. A confirmação real no APK terminou com Conta excluída e sessão encerrada; tentativa de novo login foi recusada. Inspeção do servidor confirmou Auth/perfil/vínculo ausentes e outro membro, grupo e histórico financeiro fictício intactos. Não houve força de exclusão por script em substituição à confirmação no aparelho.

Também no aparelho: bridge nativa gerou dois PDFs temporários fictícios com UIDs de prefixos semelhantes; limpar um removeu zero arquivos do outro. O primeiro verificador de linhas produziu resultado falso por erro de split no helper; corrigido somente o helper, repetição confirmou isolamento. Os PDFs fictícios do ensaio foram removidos. Arquivos UUID legados foram preservados.

Falha após delete Auth e concorrência/paginação foram ensaiadas nos emuladores por hooks internos de teste, **não como injeção física no aparelho**. Nenhum endpoint de injeção foi adicionado. Web: build e teste SDK/HTTP real dos emuladores sem APK; não houve publicação nem validação de uma URL final em navegador de produção. Recuperação hospedada de senha, provedores OAuth e regressão completa de ponto/PDF/compra no destino final continuam fora desta validação.

## Ordem futura de publicação — não executada

1. Titular define retenção/critério de descarte por categoria com orientação, e contato/canal público de suporte.
2. Fechar bloqueadores de conta/ponto/privacidade/distribuição no checklist Android; revisar identidade de runtime e permissões mínimas.
3. Em ambiente final de teste autorizado, publicar regras e backend (callable + worker), confirmar a recuperação operacional e repetir a bateria com dados fictícios.
4. Publicar frontend/PWA e distribuir APK/AAB de teste interno coordenadamente; verificar rota externa, recuperação e recibo, antes de anunciar URL/recurso nas lojas.
5. Somente após comando específico: publicação em produção/loja. Esta rodada não publicou nada e não declarou conformidade integral.

### Resultados finais automatizados e artefato

- Lint: aprovado, sem erros/avisos.
- Suíte JS: **188 testes: 163 aprovados, 25 condicionais ignorados, zero falhas**. Os skips não são apresentados como testes aprovados.
- Integração direcionada Auth/Firestore: **20 aprovados, zero falhas**, incluindo as regressões de conta, No Bolso e push Android. Testes com IDs demo isolados usam os mesmos emuladores locais; avisos de múltiplos projectIds são esperados e não habilitam recursos remotos.
- Teste SDK/HTTP real: **1 aprovado**, com callable, worker por evento, regras e impossibilidade de novo login. O observador de status usado apenas pelo ensaio é temporário e cancelado; não existe no produto.
- Builds web/mobile, sync Android e Gradle debug: aprovados. Permanecem avisos existentes de chunks grandes e depreciações Gradle.
- JUnit: **2 testes do filtro push aprovados**; o teste de template Android também passou (1), sem contabilizá-lo como cobertura de exclusão.
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 10.323.639 bytes; release continua bloqueado.
- SHA256 final: `A6B0DCA4283E5B39295D7450E024EFFAE95078381EF6A587E10FE396A62CA741`.

### Arquivos desta rodada

Backend: `functions/conta-exclusao.cjs` (novo), `functions/conta.cjs`, `functions/index.js`, `functions/grupos.cjs`, `functions/push.cjs`, `functions/push-dispositivos.cjs`, `functions/no-bolso-bridge.cjs`, `firestore.rules`.

Cliente: `src/pages/Conta.jsx`, `src/services/conta.js`, `src/services/pontoFila.js`, `src/utils/cicloConta.js`, `src/services/push.js`, `src/services/pushNativo.js`, `src/utils/pushAndroid.js`, `src/services/pdfArquivos.js`, `android/app/src/main/java/br/dev/acstech/ap1303/dev/PdfArquivosPlugin.java`.

Operação/testes: `scripts/retomar-exclusao-emulador.cjs`; novos `tests/conta-exclusao-emulador.test.cjs`, `tests/conta-exclusao-http.test.js`, `tests/conta-exclusao-local.test.js`; ampliados `tests/conta-client.test.cjs`, `tests/push-android.test.js`, `tests/push-lifecycle.test.js`.

Documentação: este documento, referência histórica no Script 04 e `docs/mobile/encerramento-android.md`. Vários desses arquivos já eram alterações locais não versionadas das etapas anteriores: foram ampliados, sem removê-los ou substituir o trabalho anterior. Nenhuma dependência ou arquivo iOS foi alterado por esta rodada.
A ferramenta operacional foi executada em processo separado no teste de falha após remoção Auth: retomou até concluída sem login e sem recriação. A revisão final também cobre resposta de status antiga chegando após entrar outra conta: nenhuma limpeza ou SignOut da conta nova é permitido.
