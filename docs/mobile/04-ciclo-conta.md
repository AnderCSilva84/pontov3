# Script 04 — Ciclo de conta e pendências no logout

> Registro histórico desta etapa. Continuação: Script 09 — [exclusão efetiva de conta](09-exclusao-conta.md), implementada e validada localmente em 23/10/2026. As limitações abaixo descrevem o estado do Script 04.

Implementação local em 22/10/2026, branch `feat/ponto-operacoes-offline`. Scripts02/03, correções do cadastro e localização preservados; `04-localizacao-android.md` não foi sobrescrito. Sem deploy, commit, push, PR, migração ou dados de produção. Mantido `demo-ap1303`, emuladores Auth9098/Firestore8877/Functions5007 e APK debug USB. Nenhuma dependência ou serviço pago adicionado.

## 1. Validação anterior informada pelo usuário

O roteiro do usuário informa validação manual no Android físico de: cadastro/criação única de grupo, localização nativa, marcação dentro do local permitido, captura offline como pendência, persistência após fechar/reabrir, sincronização sem duplicação e isolamento ao trocar conta. Estes são resultados **informados pelo usuário, não executados novamente nem certificados nesta rodada**. Não equivalem a garantia de durabilidade sob toda condição de SO/armazenamento do IndexedDB, conforme etapas anteriores.

## 2. O que foi entregue e limite da exclusão

Implementados: recuperação de senha pelo Auth SDK; tela Minha conta; confirmação de identidade/senha atual; solicitação durável idempotente de exclusão; consulta manual de status; transferência de titularidade para outro administrador ativo do mesmo grupo; logout com contagens por situação e preservação de fila; proteção de callbacks e avisos na troca de sessão/grupo.

**Não há exclusão automática de Auth, perfil ou histórico nesta etapa.** Todas as solicitações ficam `aguardando_analise`, inclusive uma credencial sem cadastro completo. A ausência de perfil/vínculo não prova ausência de referências históricas na estrutura legada e não existe política aprovada para decidir quais dados podem sair. O roteiro permite entregar solicitação durável quando retenção impede conclusão automática segura. Essa alternativa foi adotada conservadoramente, sem chamar desativação de exclusão, sem dizer “conta excluída”, sem cascata e sem inventar prazo legal.

Isso deixa **pendente o caso de conclusão automática da conta comprovadamente sem dependências** e não conclui o requisito de exclusão das lojas. O próximo processamento precisa de decisão de retenção e prova segura de ausência de dependências. Não foi criado um scanner genérico do banco para tentar demonstrar ausência por força bruta. A solicitação já pode ser registrada/acompanhada sem depender de uma ferramenta administrativa de aprovação de ponto ainda inexistente.

## 3. Inventário identificado antes do fluxo destrutivo

| Classe | Dados/locais existentes | Decisão nesta rodada |
|---|---|---|
| A — identidade/acesso | Auth UID/email/provedor/senha gerenciada pelo Firebase; `vinculosUsuarios/UID`; `users/UID` legado ou `grupos/G/users/UID`; titularUid | Preservados enquanto aguardam análise; reauth não armazena senha. Não remover grupo ao remover acesso |
| B — dados pessoais potencialmente removíveis | Nome/email/permissões/fcmToken do perfil; dados cadastrais de funcionário, CPF/endereço/contato; tokens `pushDispositivos` por grupo | Definir campos removíveis/anonimizáveis e responsável pela execução. Nenhuma remoção declarada |
| C — histórico e dados compartilhados | `registros`, `dias`, banco de horas, `pontoOperacoes`, `pontoPendencias`; `folhasPagamento`, `financeiro`, `financeiroAuditoria`, recibos/PDFs/comprovantes e cadastros referidos por funcionarioId | Preservados. Decidir retenção, acesso restrito, anonimização e preservação da deduplicação antes de apagar |
| C — autoria/compartilhamento | Compras/listas/itens/preços/cupons/catálogo/categorias: criadaPor/solicitadaPor/finalizadaPor e nomes snapshot; tarefas e conclusões; cuidados/lembretes/pratos e destinatários/autoria | Não apagar compras, preços, documentos de terceiros ou autoria por cascata. Decidir se substituir identificação mantendo vínculo auditável |
| C — notificações/auditoria | `pushEventos`, `pushEnvios`, notificações, auditoria de usuários, referências da ponte No Bolso | Inventariados para política, sem expurgo automático/TTL |
| D — grupo/terceiros | `grupos/G`, outros membros, funções administrativas, locais e ativos compartilhados | Preservados. Transferir titularidade somente para administrador ativo do mesmo grupo |
| Local | IndexedDB `ap1303-ponto-v1` (payload, leases, recibos), Auth persistido pelo SDK, rascunho de cadastro isolado por UID/projeto; caches estáticos | Fila nunca apagada por logout/pedido. Memória de sessão desmontada por UID/grupo. Nenhuma promessa de recuperação após apagar a identidade |

O inventário usa a estrutura/serviços existentes, não uma busca irrestrita de todos os documentos reais. Políticas pendentes: quais campos/documentos eliminar ou anonimizar, quais registros reter e por qual critério, quem processa/acompanha a análise, como comprovar conclusão, como tratar vínculos legados/contas sem cadastro e como manter recibos de idempotência. Nenhum prazo legal foi presumido.

## 4. Recuperação de senha

Rotas `/recuperar-senha` e botões Esqueci minha senha nos logins Ponto/Gestão. Validação de formato/tamanho, trava durante envio e resposta neutra para conta existente/inexistente. Rede indisponível, limite de solicitações e erro genérico têm mensagens próprias. Não há consulta Firestore para descobrir email nem Function de recuperação.

`sendPasswordResetEmail` sem ActionCodeSettings customizado usa o fluxo hospedado padrão. O usuário redefine a senha na página Firebase e volta ao app/PWA para entrar normalmente. Não foram alterados templates, domínios autorizados ou projetos de produção; sem deeplink novo. No teste, sendPasswordResetEmail gerou código no Auth Emulator, foi lido apenas em memória pelo teste, validado e aplicado com confirmPasswordReset. Link/token/email não foram impressos no log. Nenhum email real foi enviado.

## 5. Solicitação e administração

`contaOperacao`, callable autenticado com mínimo de instâncias0/máximo2, resolve UID exclusivamente do token. Campos extras como UID/grupo do cliente são recusados. Para solicitar/transferir, exige `auth_time` recente (até5min), confirmação explícita e conta Auth ativa; contexto/perfil/grupo são conferidos no servidor/transação. O cliente reautentica com EmailAuthProvider/reauthenticateWithCredential e renova o ID token. Esse é o provedor atualmente implementado no app. Outros provedores são bloqueados com mensagem honesta até existir reauth apropriada, sem downgrade de segurança.

`contaSolicitacoes/UID` é o protocolo estável, criado uma vez em transação. Não há payload pessoal, senha/token/GPS: guarda UID/contexto, status, motivos, contagens declaradas de pendências e timestamps. Repetição/resposta perdida retorna o mesmo protocolo sem outra escrita. Status só é consultado ao abrir a tela/Atualizar status. Não há listener permanente/polling. Regras negam leitura/escrita direta de solicitações, inclusive por administradores; o callable oferece somente o próprio status, nunca um UID escolhido pelo payload. Mesmo perfil removido pode consultar o próprio pedido se ainda tiver uma sessão Auth válida; não ganha acesso aos dados do grupo.

Se faltar acesso ao armazenamento local, o pedido ainda pode ser registrado com `fila_local_nao_verificada`, sem assumir que a fila está vazia. As contagens do cliente são declarativas e **não autorizam exclusão de histórico**. Conta/vínculo inativo é recusado nas operações sensíveis; acompanhar o protocolo ainda autenticado não permite reativar perfil.

### Último administrador

Na solicitação administrativa, consultas limitadas verificam até2 admins ativos e até2 membros. O pedido sinaliza último administrador/titularidade. A tela orienta cadastrar outro administrador pelo fluxo Gestão existente e selecionar o sucessor (consulta limitada a21, apresentação até20). Transferência só para outro UID com perfil admin ativo e vínculo ativo no mesmo grupo; não promove funcionária silenciosamente, não muda seus registros nem apaga dados. Exige nova confirmação/senha e fica na mesma transação a alteração do titular e a evidência no pedido. Replay da mesma transferência recupera o resultado, sem transferir outro grupo. Motivos de ponto/capturas permanecem após a transferência. Se o titular estiver inativo/indisponível, recuperação administrativa precisa de decisão operacional; a solicitação permanece acompanhável, sem deixar terceiros sem admin por exclusão automática.

### Falhas parciais

Reauth falha → nenhum pedido. Auth confirma identidade e Firestore falha → conta continua ativa; repetir/consultar status não cria nova identidade. Commit seguido de resposta perdida → status ou mesma operação recupera pedido existente. Fechar o app → ao abrir Minha conta, consulta pontual encontra o pedido. Não existe atomicidade entre Auth/Firestore: **não foi iniciada remoção de credencial nesta rodada**. Uma futura conclusão exigirá fases/recibo recuperável, revogação e tratamento do caso Auth removido/Firestore ainda pendente; isso não é anunciado como implementado.

## 6. Fila, logout e avisos

Resumo diferencia: online sem resultado conhecido; offline não enviado; recebido pelo servidor; conflito; confirmado. Logout com operações relevantes apresenta quantidades e confirmação Cancelar/Sair preservando. Cancelamento mantém sessão/fila. Falha de leitura da fila exige confirmação para sair sem apagar. Sem conexão, logout continua disponível; não há reconciliação forçada para poder sair. Somente a sessão original pode retomar; o protocolo do Script02 e suas guardas permanecem.

Antes de sair, suspende o sincronizador e limpa rascunhos de cadastro em memória; o signOut só atinge o UID que iniciou a saída, mesmo se houver resposta tardia. Observadores anteriores são cancelados/guardados por geração e as telas remontam por UID/grupo. Troca de vínculo entra em carregamento e não apresenta os dados antigos como se fossem da próxima sessão.

No navegador, logout bloqueia notificações por um marcador booleano local no cache `ap1303-push-sessao` e mensagem ao worker, inicia unsubscribe e unregister local. Não espera rede de FCM/Function para permitir logout. Remoção remota do dispositivo é tentada uma vez apenas se houver token e conexão; falha/offline pode deixar cadastro remoto antigo, que não é prometido como removido. Nova ativação valida UID/grupo e substitui a inscrição da sessão. Worker/foreground também filtram contexto de grupo além do UID, sem novas consultas remotas. Android continua sem push nativo. O marker não guarda perfil/coordenadas e os caches/fila do PWA não são apagados.

Pedido de exclusão pendente **não revoga acesso nem push automaticamente**: a conta não foi excluída/desativada, justamente para acompanhar e reconciliar. Logout faz revogação local; uma futura exclusão efetiva deverá remover tokens remotos e revogar credenciais por fases. Não se promete fila local acessível depois de remover a identidade nem se descarta uma captura sem ação explícita. Não foi oferecido botão de descarte nesta etapa.

Publicação futura precisa coordenar backend e worker/frontend por causa do novo campo grupoId nos avisos. Clientes de grupo sem a versão correspondente podem deixar de exibir avisos durante a transição; o filtro falha fechado. Nada foi publicado nesta rodada.

## 7. Custos incrementais

Estimativas pelo código, não fatura/leituras faturadas. Contenção pode reexecutar transações. SDK Auth tem limites próprios; não há promessa de cota gratuita.

| Fluxo | Consumo adicional |
|---|---|
| Recuperação | 1operação Auth por envio aceito no cliente;0Functions/0Firestore deste fluxo |
| Logout sem/com pendências | Leituras IndexedDB/cache locais;0Firestore/Functions novos. Web com token online pode chamar uma vez removerDispositivoPush existente (aprox.4leituras/1delete no grupo), sem bloquear logout; Android0push |
| Abrir/atualizar Minha conta | 1callable status,1leitura do próprio pedido + fila local; não há leitura por item/novo listener Firestore |
| Pedido novo, conta de grupo não administrativa | 1lookup Auth Admin +1callable,4leituras Firestore e1escrita |
| Pedido administrativo | Mesmo acima + queries limitadas até2admins/2membros: até8leituras de documentos,1escrita; queries vazias também podem ter cobrança mínima |
| Repetir pedido | 1lookup Auth Admin,4leituras/0escritas; sem queries de membros após encontrar o pedido |
| Escolher administrador | 1lookup Auth Admin,4leituras de contexto/pedido + query limitada a21admins; somente por ação explícita |
| Transferência | 2lookups Auth Admin (solicitante/destino),6leituras/2escritas; replay1lookup Auth +4leituras/0escritas. Lookup do destino pode repetir se a transação sofrer contenção |
| Conclusão de exclusão | Não implementada; não existe cobrança de limpeza/desativação em segundo plano |
| Tela ociosa | 0consultas/chamadas adicionais do ciclo de conta; Auth local e listeners preexistentes continuam com seus custos próprios |

Reauth/renovação de token acrescentam operações Auth somente nas ações sensíveis. Não há scheduler, TTL, backup, integração paga, índice novo ou varredura de histórico. `contaSolicitacoes` retém uma entrada por UID, com armazenamento/índices automáticos potenciais. Nenhum trigger foi criado para pedidos; gatilhos preexistentes de perfil/grupo mantêm seus efeitos normais, não medidos em fatura aqui. O tratamento de push acrescenta campo de contexto ao payload/cache local, sem leitura remota extra por mensagem.

Comparação: recuperação inexistente agora usa só Auth; logout antes podia aguardar ativação/revogação remota, agora não aguarda rede; nenhum envio de ponto é introduzido ao sair. Consulta de status tem1leitura explícita, sem polling. O carregamento de administradores não busca o grupo todo nem histórico. As consultas antigas de outros módulos não foram reescritas.

## 8. Arquivos, testes e validação

Novos: `functions/conta.cjs`, `src/services/conta.js`, `src/utils/cicloConta.js`, `src/pages/Conta.jsx`, `RecuperarSenha.jsx`, `tests/ciclo-conta.test.js`, `conta-client.test.cjs`, `conta-emulador.test.cjs`, `conta-callable.test.js`, este documento. Alterados: `functions/index.js` (export novo), regras (coleção nova), App/estilos/entrada nos logins, auth/push/worker e testes do worker. Não foi alterada a exclusão administrativa existente nem o domínio do ponto/geofence. `functions/push.cjs` só acrescenta grupoId ao payload para filtro entre grupos.

Validações automatizadas desta rodada:

- Lint aprovado, sem erros/avisos após ajustes.
- Unitários:146contabilizados,127aprovados,19condicionais ignorados,0falhas.
- Integração conta em Auth/Firestore demo:6aprovados,0falhas/ignorados; confirmação/reauth/UID do payload, concorrência/replay, ausência de cascata, último admin/transferência de grupo, conta sem cadastro, fila não verificável, conta inativa/removida e vínculo alterado. Destinatário sem Auth ativo também é recusado.
- Teste pela rede real dos emuladores:1aprovado. Código de recuperação só do Auth Emulator, senha antiga recusada após redefinição, reauth errada sem solicitação, payload alheio recusado, pedido/status/replay por callable HTTP e regras recusando leitura direta.
- Testes de logout/callback tardio, isolamento/retries da fila e worker/avisos passaram na suíte unitária. Sem envio de notificações reais.
- Builds web/mobile e sync Android aprovados. Aviso de chunk>500kB permanece; não houve refatoração de outros módulos para escondê-lo.

### Roteiro manual Android/PWA

1. Iniciar Auth/Firestore/Functions em demo, conectar/reverse e instalar APK debug conforme documento03.
2. No login, Esqueci minha senha: email inválido, solicitação neutra, botão bloqueado em andamento, falta de rede. Abrir link do Auth Emulator sem compartilhá-lo em logs; voltar ao app e entrar com a nova senha.
3. Minha conta: conferir contagens, abrir e voltar sem solicitar; senha errada não pode registrar pedido; confirmação+senha correta cria um protocolo único. Fechar/reabrir e Atualizar status recuperam o mesmo pedido.
4. Último admin com outros membros: preservar grupo, cadastrar outro admin, confirmar transferência e repetir após eventual resposta perdida. Não usar contas/dados reais para esse ensaio.
5. Com pendência online/offline/recebida: cancelar logout mantém a sessão; sair offline preserva fila. Entrar com outra conta não mostra/envia dados anteriores. Retornar à mesma sessão/grupo mantém operações originais.
6. No Android, testar teclado, Voltar e reabertura; no PWA testar marcador de push/logout entre duas sessões sem enviar aviso real nesta rodada.

Resultado físico desta rodada e hash do APK são registrados ao concluir a conferência abaixo. iOS, clientes de loja e reauth de provedores OAuth não foram testados. Publicação nas lojas continua bloqueada por política/processamento efetivo de exclusão, tratamento Auth/Firestore parcial, infraestrutura/privacidade/identidade de produção e demais pendências anteriores. Nenhuma configuração externa futura foi executada.

### Android físico nesta rodada

Instalado APK debug via install-r no Samsung SM-A057M, mantendo dados e ambiente demo USB. Foi exercitada a tela Minha conta da WebView real: senha incorreta recusada sem pedido; conta fictícia dedicada `Conta Android Demo` confirmada com senha correta; estado **Solicitação registrada · Aguardando análise** exibido. Voltar nativo retornou ao Ponto sem encerrar sessão. App encerrado com force-stop e reaberto: Minha conta recuperou o status registrado. Evidência local ignorada: `output/ciclo-conta/solicitacao.png`. Não houve exclusão de credencial/dados da conta, alteração de produção ou envio de email/push real.

Não foram executados fisicamente nesta rodada: modo avião/logout com pendência, todas as combinações de fila, recuperação de senha pela página hospedada no navegador Android, teclado em todas as resoluções, transferência pelo aparelho ou push web entre perfis. Esses caminhos tiveram testes automatizados onde descrito e permanecem no roteiro manual, sem atribuir a eles os resultados informados pelo usuário anteriormente.

### Artefato final

APK: `android/app/build/outputs/apk/debug/app-debug.apk` (9.961.258 bytes).
SHA-256: `118716870F83231C09F9816BD5EF6D308EC528652BFE60096B9F83F2BE75937C`.
Assinatura conferida por `apksigner verify`. Assets conferidos: `demo-ap1303`, destino emuladores, host `127.0.0.1`; sem fallback para produção. Manifest mantém localização durante uso (COARSE/FINE), sem BACKGROUND_LOCATION. Build final Gradle aprovado; lint, build web/mobile e sync aprovados. Integração final repetida: 6 testes aprovados. `git diff --check` sem erros de whitespace (somente avisos locais de conversão LF/CRLF). Nenhum deploy, commit ou push.
