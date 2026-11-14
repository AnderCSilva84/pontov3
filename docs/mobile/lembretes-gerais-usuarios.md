# Lembretes gerais entre usuários — 03/11/2026

## Resultado e escopo autorizado

Disponível no PWA e no APK final reduzido por Lembretes (/avisos). Qualquer usuário ativo dos perfis admin, funcionario e consulta cria um lembrete geral para outra pessoa ativa do mesmo grupo ou para si. Atribuídos a mim mostra apenas os recebidos; Criados por mim mostra apenas os de autoria da conta. Autor pode pausar/reativar; somente destinatário conclui, inclusive quando ambos são administradores. Cuidados do PWA continuam separados, com permissões e funcionamento anteriores; não foram reintroduzidos no Android. Escopo confirmado pelo titular nesta conversa.

Título, detalhes opcionais, data, hora e repetição (uma vez, diária ou dias da semana). Horários UTC−3. Criação muda para a visão de autoria após confirmação do servidor; autor e destinatário aparecem nos cards. Consulta paginada de 30 itens, carregamento adicional explícito. Ordenação visual dos itens carregados por criação/próximo aviso. Relógio local atualiza elegibilidade dos botões a cada 15 segundos, sem consulta de rede. Botão Atualizar, retorno ao app e navegação de notificação para a página buscam novamente (eventos próximos são deduplicados por um segundo); não há polling, listener por item ou nova assinatura de Firestore. Pessoas são carregadas sob demanda e reutilizadas enquanto a página permanece aberta.

## Contratos, autorização e idempotência

Reutilizada a callable lembretesOperacao, com operações geralPessoas, geralListar, geralSalvar, geralConcluir e geralPausar. Escopo de grupo é derivado da sessão/vínculo no backend, nunca de um grupo fornecido pelo cliente. Seleção de destinatários retorna somente id e nome, até 200 pessoas ativas. Escrita/consulta direta de lembretes pelo cliente continua bloqueada pelas regras existentes.

Documentos novos na coleção existente lembretes, com dominio: geral, sem dados médicos. ID de envio criado uma vez no formulário e assinatura do conteúdo no servidor impedem duplicação ou reaproveitamento silencioso de um envio com outros dados. Criação não aceita autor forjado. Gestão verifica autoria e versão; conclusão verifica destinatário, ocorrência e horário e é idempotente. Caminhos legados de cuidados não permitem alterar/concluir lembretes gerais. Contas/grupos inativos e usuários de outro grupo são recusados. Resposta tardia de outra sessão/grupo é descartada no cliente. Operações offline são recusadas sem gravar confirmação fictícia nem alterar filas existentes de ponto.

Limite de 100 lembretes ativos por autor. Pausar libera esse limite; histórico permanece consultável. Nenhuma migração/reescrita de lembretes antigos ou dados reais foi feita.

## Notificações e custos

Reutilizado dispararLembretes e seu agendamento existente de minuto em minuto. Nenhum novo job, serviço ou infraestrutura recorrente. Lembretes gerais são pessoais e podem avisar a qualquer hora; restrições de cuidados/expediente anteriores permanecem no módulo de cuidados.

Somente o destinatário recebe o aviso no horário configurado, conforme dispositivo cadastrado, conexão e permissão. Não há cópia automática para todos os admins. Reserva de processamento e recibos existentes evitam repetições; avisos atrasados mais de 15 minutos são registrados como expirados. Falha de envio é retomável. Uma vez enviado, a ocorrência pode ser concluída na tela, inclusive se o aviso não pôde ser entregue por falta de dispositivo.

Web usa tokens, worker e permissões existentes. Android usa o canal existente tarefas, rota /avisos e mensagem data-only; abre a lista pessoal e preserva revalidação da sessão/grupo. Não usa o canal/tipo/rotas de cuidados nem expõe dados médicos. Sem nova permissão ou canal. Avisos físicos em segundo plano/tela bloqueada não foram homologados nesta rodada.

Consumo incremental: uma callable por consulta, retorno à página/app ou ação, página de até 31 documentos mais validações de sessão/grupo; seleção de até 201 perfis somente ao abrir o formulário. Criação e conclusão usam transações e ocorrências privadas. O processador compartilha o lote limitado a 100 vencidos do job existente; envios usam dispositivos limitados ao destinatário. Não se promete custo zero nem gratuidade. Sem listener novo/polling e sem mudança de regras/índices.

## Arquivos desta rodada

- functions/lembretes-gerais.cjs — validação, operações, consultas e processamento.
- functions/lembretes.cjs — despacho das operações e processamento geral; proteção das operações antigas.
- functions/lembretes-cuidados.cjs — exclui lembretes gerais da visão de cuidados.
- functions/push-contrato.cjs — rota /avisos na mensagem Android.
- src/pages/Avisos.jsx — formulário, recebidos, criados, confirmação e notificações.
- src/services/avisos.js — callable com guarda de conectividade/sessão/grupo.
- src/utils/avisosSequencia.js e src/utils/lembretesSequencia.js — cálculo de agenda puro compartilhado, sem cuidados no bundle da loja.
- src/App.jsx, src/utils/rotas.js e src/components/BottomNav.jsx — acesso para todos e separação visual Cuidados/Lembretes.
- src/utils/pushAndroid.js — validação de destino /avisos.
- public/firebase-messaging-sw.js — fallback offline do shell da rota nova, sem renomear caches.
- index.html, vite.config.js, public/apple-touch-icon-ta-no-ponto-v1.png e public/_headers — nova referência Apple, precache e revalidação dos metadados/ícones.
- tests/lembretes-gerais-emulador.test.cjs — criação/autoria, isolamento, envio/contrato e conclusão idempotente.

Alterações locais anteriores foram preservadas. Nenhum commit/push. O PWA publicado incorpora também o rebranding local da rodada anterior.

## Testes e evidências

- Lint e git diff --check aprovados.
- 29 testes direcionados aprovados, 1 condicional ignorado; zero falhas (domínio, sequência, push, guards web/nativo, perfis e shell). Não repetida a suíte completa.
- 21 testes de integração aprovados nos emuladores demo-ap1303; zero falhas. Incluem preservação de cuidados e fluxo geral de admin, funcionário e consulta; sem flag de cuidados para destinatários gerais. A primeira execução revelou uma fixture com habilitação médica desativada antes do teste da proteção legada; ajustada a fixture e repetida somente essa integração.
- Chrome/demo: Admin A criou para Admin B, consultou Criados por mim, saiu preservando pendências; Admin B entrou, consultou Atribuídos a mim e concluiu ocorrência fictícia. Ação de conclusão saiu da agenda e mostrou Concluído. Nenhum usuário real, push real ou dado de produção utilizado nesses testes.
- Capturas em capturas/lembretes-gerais/: criados-admin.png, atribuidos-admin.png, concluido-admin.png, atribuidos-celular.png. Override celular mediu clientWidth=scrollWidth=469, sem estouro horizontal. Override restaurado. Não equivale a iPhone/Samsung físico.
- Build PWA e build web Android reduzido aprovados; edicao-build.json confirmou android-sem-cuidados e modulosSaude:0. Extração do cálculo puro de agenda preservou o guard contra módulos médicos na loja.
- APK release compilado; apksigner verify aprovado e certificado comparado à configuração da chave existente (confere). Sem instalação, Play ou mudança de chave.
- Em produção: consulta sem login recebeu 401; três formatos de consulta Firestore foram aceitos em um caminho de verificação sem dados, sem nenhuma escrita ou alteração de índice.

Logs direcionados em output/lembretes-*.log e verificações em output/lembretes-publicacao-verificada.json.

## Publicação concluída

Autorizada pelo titular nesta rodada.

- Firebase: somente lembretesOperacao e dispararLembretes, ambas us-central1, projeto explícito ponto-app-1c55a. Atualizações confirmadas; nenhuma outra Function, regra, índice ou agendamento novo publicado.
- Netlify: ponto1303, site cf66ee21-9935-4013-8043-1471c62694e7.
- Deploy: 6ae9e2ff76cc9fcf4d28ad59, ready.
- PWA: https://ponto.acstech.dev.br ; /avisos, /ponto, /conta, /lembretes e /tarefas retornaram HTTP200 com shell idêntico ao build local. Manifesto, ícones Apple, icon-192, worker e manifesto do shell conferidos por SHA-256 com o build. As verificações HTTP foram feitas sem sessão. Na abertura visual, o navegador apresentou uma sessão já autenticada; nenhuma ação foi feita sobre seus dados e a captura não foi mantida.

## APK atualizado

output/Ta-no-Ponto-lembretes-gerais-2026-11-03.apk

- Nome Tá no Ponto; applicationId br.dev.acstech.ap1303 preservado.
- Versão local 1.0.0/código 2, sem presumir disponibilidade desse código na Play. O Console não foi consultado, pois não há submissão nesta rodada.
- Backend ponto-app-1c55a; sem emuladores; edição sem cuidados.
- 10.312.614 bytes.
- SHA-256 260A917A491DD3DB90CFFECE1BC0D3BCBC5365D68F5EE67398B244BF4A9996A8.
- Chave de upload existente, sem substituição. Assinatura válida não comprova compatibilidade com uma versão instalada pela Play, cuja chave pode ser a de Play App Signing. Não instalar, desinstalar ou limpar dados para contornar conflito. Atualização física sobre a instalação existente continua pendente.

## Ícone no iPhone

Nova marca publicada nos caminhos existentes e em apple-touch-icon-ta-no-ponto-v1.png. index.html aponta para a nova referência Apple de 180px. Manifesto, Apple icons e caminhos antigos usam revalidação HTTP; id, start_url e scope do PWA foram preservados, assim como contas, sessões e armazenamento local.

Isso disponibiliza a imagem nova ao iOS, mas não permite prometer troca imediata do ícone já gravado na tela inicial: o site não controla a atualização desse atalho pelo sistema. É necessário conferir no iPhone após fechar completamente e reabrir o PWA conectado. Não orientamos apagar a instalação nem limpar dados, pois podem existir pendências locais. Não há homologação física nem confirmação de troca do ícone nesta rodada.

Referências oficiais: [Ícones e manifestos para apps na tela inicial](https://webkit.org/blog/13878/), [Configuração Apple Touch Icon](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## Evolução local — lista, adiamento e novidades — 03/11/2026

Esta seção descreve a rodada seguinte, ainda **não publicada**. O deploy e o APK apresentados acima continuam correspondendo à rodada anterior. Nenhuma Function, regra, PWA ou APK foi distribuído nesta evolução; nenhuma conta ou dado real foi usado para teste.

### Interface

- Cuidados usa coração com cruz; Lembretes mantém sino. Ícones diferentes na navegação lateral e inferior.
- Avisos apresentados como uma única lista sem duplicar o mesmo lembrete em agenda e card. Título e estado na primeira linha, data/hora em destaque, autoria secundária, descrição indentada e ações agrupadas no rodapé.
- Pendente/Adiado: amarelo; Atrasado: vermelho; Concluído: verde; Pausado: neutro. Texto e ícones acompanham a cor. Verde depende de confirmação persistida. Em recorrências, o card informa o próximo aviso e volta a atrasado quando a próxima ocorrência vence.
- Adiar oferece 5, 15, 30 ou 60 minutos; Adiar e Concluir são liberados quando o aviso é devido, preservando a validação anterior do horário. Somente o destinatário realiza essas ações. O adiamento não altera o horário original da recorrência nem permite ultrapassar outra ocorrência já agendada.
- O botão Lembretes pulsa suavemente e mostra o número de novidades recebidas desde a última consulta à área Atribuídos a mim. Ao abrir essa visão, o cliente confirma o marcador visto. Uma confirmação antiga não apaga a chegada de um lembrete posterior. Não é um contador de tarefas pendentes nem uma confirmação de conclusão.
- prefers-reduced-motion elimina a animação, preservando destaque, número e texto acessível. O indicador possui contraste corrigido também na lateral azul-marinho.

### Backend, notificação e sincronização

- Novas operações geralAdiar e geralLidos na callable já existente; validações no servidor, idempotência por operação/ocorrência e autoria derivada da sessão.
- O destinatário recebe aviso de uma nova atribuição; o autor recebe aviso de conclusão, com destino /avisos. Os envios são enfileirados atomicamente com a criação/conclusão e processados pelo agendamento existente, normalmente na próxima execução de minuto. Não há novo job nem canal Android; continua o canal tarefas. Entrega física depende de permissão/dispositivo/conexão e não foi homologada.
- Fila privada avisosEnvios dentro do grupo, limitada a 100 registros pendentes por execução, com reserva de processamento e recibos idempotentes do transporte já existente. Confirmação repetida não enfileira outro aviso ao autor. Falha de envio concorrente não desfaz uma conclusão confirmada.
- Documento privado lembretesEstado/{uid}, no mesmo escopo de grupo/legado, armazena revisões recebidas/lidas e de conclusões do autor, sem texto de lembretes. Um único listener por sessão observa o documento do próprio usuário; não há polling nem listener por lembrete. A lista recebida acompanha novas atribuições e a lista criada acompanha conclusões enquanto abertas.
- As regras locais concedem somente get do próprio documento, com conta/grupo ativos; list e escritas de cliente continuam negados. Admin também não pode ler o indicador alheio. Na publicação futura, conferir as alterações locais acumuladas contra o ruleset publicado antes de enviar regras; os acréscimos desta rodada são apenas os matches de lembretesEstado na raiz e no grupo.
- Nenhuma migração, limpeza de armazenamento, mudança de assinatura ou de identificadores técnicos. Sem avisos retroativos de criação para documentos anteriores ao recurso.

### Consumo desta evolução

Esta etapa substitui a descrição anterior de ausência de listeners novos: acrescenta **um documento observado por sessão**, com uma leitura inicial e atualizações somente quando há mudança relevante, além das verificações das regras. Criação incrementa o estado do destinatário e registra um envio. Conclusão incrementa o estado do autor e registra um envio. Consultar recebidos pode confirmar uma revisão vista. A fila adiciona uma consulta limitada por grupo à execução do agendamento existente e as leituras/escritas necessárias aos envios; não há novo serviço ou infraestrutura recorrente. Não se promete custo zero.

### Arquivos da evolução

functions/lembretes-gerais.cjs, functions/lembretes.cjs, firestore.rules, src/App.jsx, src/components/BottomNav.jsx, src/components/ui/index.jsx, src/components/AvisoLinha.jsx, src/components/AvisosNovosProvider.jsx, src/context/AvisosNovosContext.js, src/pages/Avisos.jsx, src/utils/estadoAviso.js, src/styles/avisos.css, src/styles/nav.css, tests/estado-aviso.test.js e tests/lembretes-gerais-emulador.test.cjs.

### Verificação e evidências

- Lint e git diff --check aprovados.
- 26 testes de integração aprovados em demo-ap1303; zero falhas. Incluem cuidados preservados, operações por perfil, adiamento/recorrência, confirmação idempotente, fila, leitura concorrente, atualização para o autor, regras reais de acesso via SDK e corrida de falha de envio com conclusão.
- 11 testes direcionados de domínio/contratos aprovados; 1 teste condicional ignorado; zero falhas.
- Builds PWA e web Android reduzido aprovados. edicao-build.json confirma android-sem-cuidados e modulosSaude:0. Não houve nova compilação nativa, instalação ou envio à Play nesta rodada.
- Chrome: componentes reais em prévia explícita com dados fictícios; estados pendente, atrasado e concluído, ícones distintos e indicador de novidades inspecionados. Larguras CSS 469 e 1901, sem overflow horizontal. Capturas em capturas/lembretes-gerais-lista/lista-celular.png e lista-desktop.png. Os botões da prévia são demonstrativos; o comportamento persistido foi testado nos emuladores, sem push real. Override de viewport restaurado.
- Logs: output/avisos-lista-integracao.log, avisos-lista-testes.log, avisos-lista-lint.log, avisos-lista-pwa-build.log e avisos-lista-android-web.log.
- Pendente: publicação seletiva desta nova rodada, validação da entrega de push em aparelhos reais e eventual novo APK. Não declarar esses itens concluídos pelos testes locais.

## Publicação da evolução autorizada — 03/11/2026, 11h03 (UTC−3)

O titular autorizou “Vamos publicar”. Esta seção substitui o estado não publicado da evolução acima.

- Antes do deploy, o ruleset ativo 77a40f58-9888-4d6d-a3d4-7fdb8f096068 foi lido pela API de regras, sem dados de usuários. Removendo os dois novos matches de lembretesEstado do arquivo local, o restante era idêntico ao publicado, normalizando apenas quebras de linha. Portanto não foram incluídas outras alterações de regras acumuladas.
- Publicados somente firestore:rules, functions:lembretesOperacao e functions:dispararLembretes no projeto explícito ponto-app-1c55a. As duas Functions us-central1 confirmaram atualização bem-sucedida. Nenhum índice, outro handler, canal, permissão nativa ou agendamento novo publicado.
- Ruleset ativo após deploy: d9e1d2e3-ac07-41f7-be20-086978eb1bfe. Conteúdo conferido com o local: idêntico.
- Site Netlify ponto1303, cf66ee21-9935-4013-8043-1471c62694e7; deploy 6ae9e985149956249028ae2c, ready, publicado em https://ponto.acstech.dev.br.
- /avisos, /ponto, /conta, /lembretes e /tarefas: HTTP200 com shell idêntico ao build local. Dez arquivos, incluindo entrada, tela/estilos de Avisos, manifesto e worker, conferidos por hash: nenhuma divergência. Operação geralLidos sem login: HTTP401, sem escrita.
- Lint, diff check e builds PWA/Android reduzido aprovados. Reutilizados os 26 testes de integração e 11 testes direcionados já aprovados; nenhuma repetição de suíte geral sem necessidade.

APK correspondente: output/Ta-no-Ponto-avisos-lista-2026-11-03.apk, 10.314.082 bytes, SHA-256 CA31168DDC9C56A39CCC8B707047383479D956ED63A225B9C658EBA45477E288. apksigner verify aprovado; certificado confere com a configuração da chave de upload existente. Pacote br.dev.acstech.ap1303, nome Tá no Ponto, 1.0.0/código 2 local, backend ponto-app-1c55a e modulosSaude:0. Não instalado, enviado à Play nem tratado como candidato com versionCode disponível. Compatibilidade de atualização sobre uma instalação Play continua dependendo da assinatura da versão instalada e de validação física; não remover o app ou limpar dados para contornar conflito.

Nenhum commit/push, envio manual de notificação, conta real de teste ou alteração de registros de usuários foi realizado. Entrega física de push e comportamento em aparelhos permanecem sem homologação nesta rodada. Logs de deploy e verificações: output/avisos-lista-firebase-deploy.log, avisos-lista-netlify-deploy.json, avisos-lista-regras-publicadas.json, avisos-lista-publicacao-verificada.json e avisos-lista-apk-verificado.json.

## Evolução local — arquivamento e lixeira pessoal — 03/11/2026

Implementada após a publicação da lista; **esta nova evolução ainda não foi publicada**. O deploy 6ae9e985149956249028ae2c e o APK acima permanecem como os artefatos da etapa anterior.

### Comportamento

Em Atribuídos a mim e Criados por mim há os filtros Minha lista, Arquivados e Lixeira. Arquivar move para a pasta pessoal de arquivados. Excluir pede confirmação e move para a lixeira pessoal, com possibilidade de Restaurar. Não há purga irreversível ou exclusão de ocorrências/documentos compartilhados nesta ação. Somente o autor ou o destinatário podem organizar o item, cada um exclusivamente para si; nem outro administrador pode alterar essas pastas.

A organização de um participante não remove o lembrete da lista do outro, não modifica confirmação, autoria, versão ou recorrência, nem marca como concluído. Quando o autor também é destinatário, a organização pessoal vale para suas duas visões. Para cancelar o agendamento também para o destinatário, o autor deve usar Pausar; excluir da própria lista não equivale a cancelar o lembrete compartilhado.

Arquivados e lixeira silenciam os envios destinados àquela pessoa (novas atribuições, avisos no horário e avisos de conclusão). O processador revalida a pasta pessoal antes do envio e reconhece registros antigos da fila sem lembreteId. Mensagens já entregues ao transporte/sistema não são retiradas retroativamente. Enquanto o destinatário está com o item silenciado, o agendamento avança sem disparar; restaurar preserva os horários e o histórico, sem reagendar avisos antigos. Um lembrete restaurado pode continuar atrasado e ser concluído normalmente, conforme a ocorrência disponível.

O limite existente de 100 lembretes ativos por autor permanece relacionado ao agendamento ativo: arquivar ou excluir pessoalmente não libera esse limite se o aviso da outra pessoa continua ativo. O autor pode pausar o agendamento antes de organizar sua lista.

### Implementação e consumo

- Nova operação geralOrganizar na callable existente, com pasta entrada/arquivado/excluido, autenticação e verificação de participação no backend. Alteração repetida para a mesma pasta é idempotente.
- Mapa organizacao no próprio lembrete, limitado aos participantes autorizados. Cada resposta lista somente a pasta da conta atual, sem expor a organização da outra pessoa.
- Revisão organizacao em lembretesEstado/{uid} reutiliza o listener privado existente para sincronizar outras sessões da própria conta. Não há novo listener, polling, serviço, job, regra ou índice.
- Consulta continua limitada a até 31 documentos brutos por página, com filtro pessoal e cursor sobre os documentos examinados. Uma página filtrada pode ficar vazia com Carregar mais disponível; o cursor não perde os registros posteriores. Interface informa esse caso sem afirmar incorretamente que toda a pasta está vazia.
- Cada mudança real de pasta atualiza o lembrete e a revisão da conta. O processador da fila passa a ler o lembrete para conferir participação e silêncio antes de enviar. Esses custos são adicionais às operações existentes; não se promete custo zero.

Arquivos: functions/lembretes-gerais.cjs, functions/lembretes.cjs, src/pages/Avisos.jsx, src/components/AvisoLinha.jsx, src/components/AvisosNovosProvider.jsx, src/context/AvisosNovosContext.js, src/styles/avisos.css e tests/lembretes-gerais-emulador.test.cjs. Alterações locais anteriores preservadas; sem commit ou push.

### Verificação

- 28 testes de integração aprovados nos emuladores demo-ap1303, sem falhas. Incluem isolamento, administrador terceiro recusado, arquivar/excluir/restaurar em ambas as visões, preservação do histórico da outra pessoa, silêncio dos três tipos de envio, compatibilidade com fila antiga, idempotência e paginação após página inteiramente filtrada. Cuidados anteriores continuam cobertos.
- 11 testes direcionados aprovados, 1 condicional ignorado; lint e git diff --check aprovados.
- Builds PWA e web Android reduzido aprovados; modulosSaude:0. Não houve nova compilação nativa/instalação/Play nesta evolução.
- Prévia local com componentes reais e dados explicitamente fictícios: Arquivar removeu o item da lista, a pasta Arquivados exibiu Restaurar e Excluir, e a confirmação de envio à lixeira foi exibida. Captura: capturas/lembretes-organizacao/arquivados-desktop.png. O estado final após a confirmação não foi inspecionado devido a falha de foco da automação; a persistência e restauração foram verificadas nos testes de integração. Prévia não usa contas nem dados reais e não equivale à homologação física.
- O servidor inicial respondeu somente em IPv6 e a navegação precisou de uma nova aba após reinício em IPv4. Nenhuma configuração de rede ou permissão do navegador foi alterada.

Logs: output/avisos-organizacao-integracao.log, avisos-organizacao-testes.log, avisos-organizacao-lint.log, avisos-organizacao-pwa-build.log e avisos-organizacao-android-web.log. Publicação seletiva, eventual APK correspondente e validação física ficam pendentes desta evolução.


## Evolução — anexos e publicação de 03/11/2026

Autor e destinatário podem anexar links HTTPS, PDFs e imagens JPEG/PNG/WebP pela opção Anexos de cada lembrete geral. O painel abre também após criar um lembrete. Ambos consultam os originais e enviam respostas vinculadas ao documento anterior, sem substituir o original. Cada pessoa pode remover somente o que enviou. Arquivados permitem consulta; a lixeira pessoal impede acesso até restaurar. Organização pessoal e anexos não alteram cuidados nem reintroduzem saúde no APK reduzido.

PDF para GOV.BR: baixar o original, assinar no serviço externo https://assinador.iti.br/ e anexar a devolução como resposta. Não há integração com credenciais GOV.BR nem validação automática da assinatura. Bytes são preservados, com SHA-256 conferido no servidor e no cliente. Imagens podem ser abertas no visualizador do aparelho para imprimir; no PWA há Abrir/Imprimir e Baixar original. No Android a ponte privada existente foi ampliada para imagens, com MIME correto e seletor de salvar/compartilhar. A impressão depende do visualizador e serviço de impressão disponíveis no aparelho.

### Armazenamento autorizado e acesso

O titular autorizou explicitamente o bucket privado ponto-app-1c55a-lembretes-anexos, no projeto de produção confirmado, região US-CENTRAL1, classe STANDARD, uniform bucket-level access e public access prevention enforced. A conta de execução 809643426461-compute@developer.gserviceaccount.com recebeu roles/storage.objectAdmin apenas nesse bucket. Não foram criados usuários públicos, URLs permanentes de download ou novo agendamento. Há cobrança por armazenamento, operações e tráfego conforme uso.

Limites transacionais por lembrete: 5 MiB por arquivo, 10 arquivos ativos, 25 MiB de arquivos e 10 links HTTPS. Tipos e cabeçalhos são verificados no backend; nomes não viram caminhos públicos. A nova callable lembretesAnexos autentica, resolve o grupo e restringe acesso aos dois participantes ativos; ser administrador do grupo não concede acesso a anexos de terceiros. Arquivos ficam no Storage privado, metadados no Firestore. Não há acesso direto de cliente às subcoleções de anexos. A versão do estado dos anexos reutiliza o listener privado existente; listagem só ao abrir, alterar ou atualizar o painel, sem listener por arquivo, polling ou download automático de imagens/PDFs.

Retries usam ID e assinatura de conteúdo estáveis, reserva atômica de quota, lease e gravação GCS com ifGenerationMatch:0. Remover oculta o anexo para os participantes e substitui seu conteúdo por um marcador vazio privado no mesmo caminho: isso impede um upload atrasado de recriar os bytes após exclusão. O marcador vazio e metadados mínimos permanecem para idempotência; a quota do conteúdo é liberada uma única vez após confirmação. Em falha de remoção, o conteúdo permanece inacessível pela callable, a quota segue reservada e o remetente pode repetir a remoção. Cópias já baixadas não são revogáveis. Notificações de novos anexos vão somente ao outro participante pela fila e pelo agendamento já existentes, respeitando a pasta pessoal.

### Verificação desta rodada

25 testes de integração aprovados em Firestore/Auth emulados, incluindo lembretes gerais e compatibilidade de compromissos. Cobertura: autoria/grupos/perfil ativo, preservação binária, resposta separada, link seguro, limites concorrentes, reenvio idempotente, mudança de contexto, corrupção, remoção repetida e corrida com upload atrasado. 16 testes de cliente e regressão aprovados: SHA no download, contexto antes/depois de await, offline explícito e ponte Android com bytes/MIME corretos. Testes unitários nativos aprovados, incluindo reconhecimento e prazo de cache de JPEG/PNG/WebP.

Probe no bucket real utilizou exclusivamente PDF sintético temporário: bytes preservados, GET anônimo HTTP403, IAM sem público e exclusão do objeto de teste confirmados. Não foram usados lembretes ou contas reais. Regras Firestore locais idênticas ao ruleset publicado d9e1d2e3-ac07-41f7-be20-086978eb1bfe; não é necessário publicar regras nem índices nesta rodada.

Conferência visual com componente real e serviços simulados em prévia local: modal em 390×844 e desktop, original/resposta separados, seleção de resposta e inclusão de link fictício confirmadas. Capturas em capturas/lembretes-anexos/. Isso não equivale à homologação de assinatura GOV.BR, impressão, seletor físico de arquivos ou atualização do ícone em iPhone real. O Chrome apresentou timeouts e a conferência foi concluída pelo navegador integrado, sem mudar permissões.

A primeira execução dos emuladores foi impedida pela revisão automática devido a token de sessão revogado; na retomada a autorização voltou a funcionar e as verificações foram concluídas. Não houve contorno de aprovação.

Logs e evidências: output/anexos-integracao-final.log, anexos-regressao.log, anexos-android-testes.log, anexos-storage-verificado.json e anexos-rules-verificado.json. Publicação e assinatura final registradas abaixo após a verificação do resultado.

### Publicação concluída e artefato final

- Firebase ponto-app-1c55a: lembretesAnexos criada; lembretesOperacao e dispararLembretes atualizadas seletivamente, todas ACTIVE em us-central1. A callable nova usa a conta de execução autorizada, 512 MiB, timeout 120s, concorrência 4, máximo 2 instâncias e mínimo 0. Nenhum novo agendamento.
- Netlify ponto1303: deploy 6aea41b9eceb9318df881197, estado ready, publicado em 03/11/2026 às 17:19 (UTC−3), https://ponto.acstech.dev.br. Hashes do shell em seis rotas e onze assets/documentos/worker/manifest iguais ao dist final; callable sem login retorna HTTP401. Evidências: anexos-publicado-verificado.json e anexos-functions-verificado.json.
- Lint final sem erros nem avisos; builds finais PWA/Android concluídos. Git diff --check sem erros de whitespace (avisos existentes de CRLF preservados). Android: oito testes unitários aprovados; integração adicional de imagens JPEG/PNG: doze testes aprovados no arquivo de anexos.
- APK final: output/Ta-no-Ponto-anexos-2026-11-03.apk, pacote br.dev.acstech.ap1303, nome Tá no Ponto, versão 1.0.0, código 2. Assinatura criptográfica válida e certificado igual à chave de upload existente. SHA-256: 44CA1F725C834B4B91E9DBFBCC61D84A6126C4134B790D1A79F1D8DD287D1C5A. Não instalado, não enviado à Play e não apresentado como atualização de loja; não foi verificado um novo código disponível no Console. Nenhuma desinstalação ou limpeza de dados.
- Conferência física de seleção de imagens/PDFs, GOV.BR, impressão e notificações reais permanece para os aparelhos do titular. Não foram usadas contas reais. A mudança de ícone de um PWA já instalado no iPhone depende do iOS e não pode ser forçada pela publicação.
- Alterações locais anteriores preservadas; sem commit/push e sem alterações no No Bolso.


## Evolução local — feedback de conclusão e hierarquia de ações

Ao tocar em Concluir, o destinatário abre uma janela com mensagem opcional de até 500 caracteres, identificação de quem poderá ler e confirmação explícita. Cancelar mantém o lembrete pendente. O campo não é obrigatório. Durante o envio a janela impede confirmação repetida e fechamento; uma falha mantém o texto para nova tentativa.

A mensagem é validada no backend (tipo, tamanho e controles), normalizada e persistida na ocorrência e no resumo ultimaConclusao. Autor e destinatário consultam o feedback no próprio card com autoria e data. A última conclusão permanece visível mesmo após a próxima ocorrência ou pausa; cada ocorrência mantém seu registro. O primeiro envio confirmado prevalece em retries e conclusões concorrentes. Clientes antigos podem concluir sem o campo. A notificação existente de conclusão é preservada e seu texto não inclui o feedback. Não houve novo listener, consulta por card, índice, função ou agendamento.

A página foi reorganizada: Novo lembrete como ação principal; Atualizar lista como ação auxiliar; Atribuídos a mim/Criados por mim num grupo de consulta; pasta em seletor compacto. Explicação de pastas e notificações ficam recolhidas, e notificações têm área própria ao final da lista. No card, Concluir e Anexos são as ações visíveis; Adiar tem seu próprio controle, e pausar/reativar, arquivar/restaurar e lixeira ficam em Mais opções. Apenas um menu do card permanece aberto. Preservadas identidade azul/branco/vermelho, cores semânticas e permissões existentes.

Verificação: 19 testes de integração em emuladores aprovados, sem falhas, cobrindo feedback opcional e sem mensagem, limite e tipos inválidos, autorização, consulta do autor, nova ocorrência, pausa, retries e concorrência, além dos lembretes gerais anteriores. Três testes direcionados de estado/identidade aprovados. Prévia local com componente real e operações simuladas confirmou preenchimento e envio, consulta em Criados por mim, arquivamento pelo novo menu e consulta pelo seletor de pasta; menus exclusivos e diálogo em 390×844 conferidos. Capturas em capturas/lembretes-feedback/. Não houve teste com contas ou mensagens reais.

Arquivos principais: functions/lembretes-gerais.cjs, src/pages/Avisos.jsx, src/components/AvisoLinha.jsx, src/components/ConcluirAviso.jsx, src/styles/avisos.css e tests/lembretes-feedback-emulador.test.cjs. Política local de privacidade passou a descrever o feedback. Logs: output/feedback-avisos-integracao.log, feedback-avisos-regressao.log, feedback-avisos-lint-final.log, feedback-avisos-pwa-final.log e feedback-avisos-android-final.log.

Esta evolução é local. Não foi feita publicação PWA/Functions, assinatura de novo APK, instalação ou envio à Play nesta rodada; o último APK entregue na rodada visual anterior ainda não inclui este feedback. Uma publicação posterior exige atualizar a callable lembretesOperacao e o frontend correspondente. Não há necessidade de alterar regras/índices para este campo. Alterações locais anteriores preservadas, sem commit/push.
Fechamento da verificação local: lint final sem erros/avisos; builds finais do PWA e do web Android reduzido aprovados; diff direcionado sem erros de whitespace (somente aviso de normalização CRLF existente). Nenhum módulo de saúde reintroduzido no bundle Android.


## Fotos nas interações — rodada de 03/11/2026

Cards dos lembretes gerais exibem foto junto ao nome do autor, destinatário e de quem concluiu, mesmo sem feedback. Os anexos mostram a identidade de quem enviou. Em Cuidados no PWA, autoria aparece nos lembretes atuais e cadastrados; Cuidados realizados reúne as ocorrências concluídas do dia e a última conclusão disponível, com autor, realizador e data. A abertura de cuidado pela notificação também identifica autor/conclusão. Registros antigos sem UID de autoria usam identificação disponível/iniciais, sem atribuir a ação a outra pessoa. As conclusões novas guardam UID e nome obtidos da sessão no servidor. Fotos são atuais, não cópias históricas persistidas no lembrete.

### Permissões e consumo

As miniaturas são agregadas apenas após autorizar e filtrar os registros, na resposta da callable já existente. Em lembretes gerais, somente autor e destinatário recebem os respectivos registros e suas fotos; em cuidados, valem as permissões existentes de administrador/cuidadora e atribuição da pessoa/pet. Não foi aberto endpoint genérico para listar fotos de colegas, nem foram alteradas regras para leitura direta. A consulta genérica de foto continua restrita ao titular/administrador; participantes recebem somente as fotos referenciadas na interação autorizada. Nomes e fotos não são retornados de outros grupos. Perfil ausente/inativo ou foto removida usa iniciais. Política de privacidade e aviso no editor foram atualizados para essa exibição contextual.

O opt-in fotosInteracoes:true foi adicionado às consultas de tela; clientes antigos e consultas de PDF sem esse parâmetro não recebem fotos nem geram essas leituras adicionais. O helper deduplica UIDs e faz leituras em lotes de até 100 perfis, lendo fotos somente de perfis ativos com temFotoPerfil. Custo adicional por consulta com fotos: uma leitura de perfil por ator único e mais uma leitura de miniatura por ator com foto. Cada foto tem até 24KB binários, retornados em base64. Não é custo zero. Não há consulta, listener ou polling por avatar. A consulta periódica já existente da tela de cuidados permanece; ela também recarrega as fotos quando a opção está ativa. Caches/resultados já obtidos não são revogados retroativamente.

PessoaInteracao e AvatarPerfil exibem a miniatura fornecida com o registro, sem nova chamada por componente. Android continua na edição sem saúde/cuidados; os componentes de fotos são compartilhados, mas a tela e os recursos de cuidados não são reintroduzidos no bundle reduzido.

### Verificação

27 regressões de lembretes gerais, feedback, compromissos e fotos de perfil passaram na rodada combinada. Os seis testes específicos de avatares passaram na reexecução final: foto do autor para o destinatário sem acesso genérico ao perfil, ausência de fotos de terceiros/outros grupos, inativos/remoção, conclusão sem feedback, abertura por notificação e deduplicação das leituras. A primeira rodada acusou somente diferença de protótipo entre um mapa vazio e {} na asserção; a asserção passou a conferir as chaves e a fixture recebeu os vínculos de grupo completos. Não foi flexibilizada autorização para passar testes.

Lint e builds PWA/Android reduzido aprovados. Prévia local com componentes reais, nomes e imagens sintéticos conferida em celular 390×844 e desktop: papéis de criação/atribuição/conclusão, feedback e cuidados concluídos. Capturas: capturas/avatares-interacoes/. Nenhuma conta, foto, cuidado ou mensagem real foi usada. Homologação física e comprovação da causa exata da falha anterior de foto em celulares permanecem pendentes.

A publicação desta rodada inclui as evoluções antes locais: feedback opcional, hierarquia das ações e correção do preparo/salvamento de foto. Evidências e artefato final registrados após a verificação da publicação.

### Publicação e artefato confirmados

- Firebase ponto-app-1c55a: lembretesOperacao e acaoNotificacaoLembrete atualizadas seletivamente em us-central1, ambas ACTIVE. Requisições sem login recusadas com HTTP401. Nenhuma nova função, agendamento, regra, índice ou infraestrutura. Conta/foto utilizam o backend existente; normalização e confirmação de foto são alterações do cliente.
- PWA https://ponto.acstech.dev.br: Netlify ponto1303, deploy 6aea68557caa17083ed2ab5c, ready, publicado em 03/11/2026 às 20:04 (UTC−3). Seis rotas e catorze arquivos/worker/manifest/documento de privacidade conferidos por hash contra o build final.
- APK output/Ta-no-Ponto-fotos-interacoes-2026-11-03.apk: Tá no Ponto, br.dev.acstech.ap1303, 1.0.0/código2. Assinatura válida e certificado igual à chave de upload existente. SHA-256 2C470DDE4B9F90B01D58DD24C2B56954CECE6AF333D0DFD02BB478FB7375B5E2. Os 60 assets embarcados correspondem aos assets de release preparados; edição reduzida sem saúde/cuidados preservada. Não instalado, não enviado à Play; sem declaração de novo código disponível ou compatibilidade com assinatura Play.
- A rodada publica também feedback opcional e organização de ações dos lembretes, além da correção local de foto documentada na revisão visual. Registros históricos de pendência local das rodadas anteriores ficam superados por esta publicação. A causa exata da falha de foto nos celulares do titular e a homologação física permanecem pendentes.
- Evidências: output/avatares-interacoes-seguranca-final.log, avatares-interacoes-integracao.log, avatares-interacoes-lint-final.log, avatares-interacoes-pwa-final.log, avatares-interacoes-android-web.log, avatares-interacoes-functions-verificado.json, avatares-interacoes-publicado-verificado.json, avatares-interacoes-apk-verificado.json e avatares-interacoes-apk-assets-verificado.json. Capturas fictícias em capturas/avatares-interacoes/.
- Alterações locais anteriores preservadas; sem commit/push, instalações, limpeza de dados ou uso de contas/fotos reais.
