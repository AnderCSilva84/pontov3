# Push de cuidados/ponto e prévia PDF — 26/10/2026

Rodada restrita, sem publicação, dados reais alterados, novo agendamento, serviço pago, commit ou push. Nenhum envio de teste a dispositivos de clientes. A ausência de erro no FCM não comprova entrega/apresentação.

## Produção efetivamente inspecionada

Projeto confirmado: `ponto-app-1c55a`. `alertaRegistroPonto` e `alertaRegistroPontoGrupo` ativos em `southamerica-east1`, respectivamente nos caminhos raiz e `grupos/{grupoId}/registros/{id}`. `registrarDispositivoPush`, `removerDispositivoPush`, `testarNotificacaoPush` e `dispararLembretes` ativos em `us-central1`. Um único job `firebase-schedule-dispararLembretes-us-central1`, habilitado a cada minuto, `America/Fortaleza`. Não foi executado manualmente nem duplicado.

Fontes baixadas do armazenamento da revisão publicada de ponto/grupo e cuidados: `push.cjs`, `push-contrato.cjs`, `lembretes.cjs` e `lembretes-cuidados.cjs` são idênticas às fontes locais. Scheduler apresentou respostas HTTP 200 em execuções recentes; gatilho de ponto/grupo apresentou HTTP 204. Consulta restrita de erros dos três serviços não encontrou erros no recorte de 48h; isso não demonstra ausência de falhas silenciosas ou entrega no aparelho.

Leitura pontual e limitada de grupos, perfis, inscrições, últimas ocorrências e três recibos recentes de envio: no grupo principal existem inscrições web de administrador/funcionária e um administrador habilitado sem inscrição. Não existe inscrição `fcm-android` nesse grupo no momento da consulta. A inscrição Android encontrada pertence a outro grupo. São contextos isolados: não redirecionar avisos entre grupos para fazer o teste passar. Confirmar no aparelho qual conta/grupo está em uso e sua ativação/permissão. Não mover token nem associar conta por suposição.

Foram encontrados recibos de aceitação FCM no dia 26/10 para cuidados e para a execução correspondente ao ponto; ocorrências também registram `enviado`, `fora_expediente` e conclusões posteriores. Há destinatários sem cadastro de dispositivo. Assim, falta de cadastro está demonstrada para parte dos destinatários, mas a causa da ausência de apresentação nos dispositivos web já inscritos ainda não foi reproduzida. Não foi observado código de rejeição FCM nesse recorte. Nenhum novo dado de paciente ou registro trabalhista foi criado para investigar.

### Contrato e etapas

- Ponto: somente `ENTRADA` e `SAIDA` válidas, por perfil funcionário ativo com vínculo correto; destinatários são administradores ativos do mesmo grupo com dispositivo cadastrado. Intervalos e revisão offline não disparam esse aviso; captura offline recebida não é confirmação de ponto. Evento/recibo mantém idempotência.
- Cuidados: ocorrência e versão, horários/recorrência existentes, UTC-3/Fortaleza; funcionário habilitado recebe dentro do expediente e administradores habilitados podem receber 24h conforme atribuição/supervisão. Não alterar horários ou destinatários reais nesta rodada. Uma ocorrência concluída não prova que o push foi exibido; examinar `notificacaoStatus` separadamente.
- Entrega: inscrições do grupo → resolução de perfis → `sendEach` → recibo somente em sucesso. Web usa payload data e worker com UID/grupo; Android usa payload data, plugin/serviço e filtros de contexto/expiração/permissão. Ambos podem descartar a apresentação mesmo após aceite FCM.

## PDF: causa confirmada e limite

O usuário relata que abrir PDF no Android não abre e trava o app; PWA funciona. A ação/módulo exatos e o aparelho com a versão instalada ainda precisam de confirmação. ADB retornou lista vazia nas tentativas desta rodada. Portanto não há logcat contemporâneo, comparação da versão realmente instalada, evidência de ANR/crash nem validação de leitor externo. Não atribuir o travamento a uma causa presumida.

O caminho local atual já gera o PDF fora da WebView, grava cache privado, fornece `content://` por FileProvider, MIME `application/pdf` e permissão temporária de leitura; abrir/compartilhar usam Activity externa e salvar usa seletor do sistema. Cache preserva arquivos ativos; limite de 20 MiB e mensagens de ausência de leitor existentes. Não alterados sem reprodução. A bridge já bloqueia ações concorrentes e não faz retry automático. Não houve limpeza de dados ou arquivos do usuário.

Causa visual confirmada: regra móvel definia painel com `100dvh` além do padding externo; mínimos do iframe e controles agravavam o estouro. Corrigido dimensionamento pela área útil, safe areas, cabeçalho/ações, área flexível e rolagem do documento. O leitor web mantém seu próprio zoom. Android mostra explicitamente que a abertura é externa e oferece salvar/compartilhar; não simula prévia embutida. Botões de abrir/salvar têm `type=button` e estado ocupado já existente. Conteúdo e cálculos do PDF não foram alterados.

## Verificações desta rodada

- 22 testes direcionados aprovados, zero falhas e zero ignorados: PDF/bridge, contratos push, worker, cadastro/isolamento Android em emulador e cuidados/destinatários. FCM simulado nos testes. `tmp/push-pdf-testes.log`.
- Lint de `PdfAcoes.jsx` e `android-release-preparar.mjs`, mais sintaxe do script: aprovados. Sem suíte geral.
- Fixture local com CSS real e PDF fictício multipágina: geometrias conferidas em 360×640, 640×320 e 1100×700. Painéis contidos, cabeçalhos e ações dentro dos limites. Trata-se de fixture de apresentação; não é teste completo da sessão PWA nem do Android. Captura de tela da fixture falhou na ferramenta; nenhuma captura foi anunciada como salva.
- PDFs fictícios curto (uma página) e multipágina já existentes foram preservados. Abrir/cancelar/voltar/reabrir/compartilhar/salvar fisicamente no Android continuam pendentes de aparelho conectado. A abertura do curto nesta rodada não foi validada visualmente devido à desconexão da aba de conferência.

## Candidato e deploys

Play consultada somente para leitura de versões: maior código enviado 1, versão 1.0.0. Preparação local mudou o candidato para código 2, mesma identidade e chave. AAB anterior copiado antes do build para `output/candidato-push-pdf-v2/`. Um build web release; a primeira tentativa Gradle parou na configuração por SDK não indicado e foi retomada com o SDK já instalado, sem repetir Vite. Resultado do empacotamento registrado ao concluir abaixo.

Deploy seletivo preparado: frontend PWA com componente/CSS da prévia; não publicar agora. Nenhuma correção de backend push confirmada que justifique deploy de Functions, regras ou índices. Não publicar só para tentar resolver apresentação. Candidato Android requer upload posterior autorizado; não foi enviado à Play.

Custos: diagnóstico fez leituras pontuais limitadas, download das fontes e leitura de logs/configuração autorizados; não constitui rotina. Alterações PDF não acrescentam Firestore/Functions, uploads ou serviço remoto. Nenhum listener, polling, agendamento ou infraestrutura recorrente adicionado. Mantidos os custos preexistentes; não prometer gratuidade.

Próximo ensaio: conectar Samsung com depuração autorizada, identificar pacote/versão/instalador sem alterar dados, reproduzir documento fictício na ação relatada com logs filtrados para processo/ANR/Activity/PDF e sem payload/base64; conferir permissões/canais e conta/grupo. Enviar somente a inscrição fictícia do dispositivo de teste autorizado, nunca a todos os usuários.

### Resultado do candidato

Build concluído: `output/candidato-push-pdf-v2/AP1303-1.0.0-code2.aab`, `br.dev.acstech.ap1303`, versão 1.0.0/código 2. SHA-256 `BA95C2D7B2D697215912AAF9A5AFDDB2D32CC638154AD0866B7A7A0CF94BE3F5`. `jarsigner -verify`: jar verified; certificado público corresponde à chave de upload local existente. Avisos normais do certificado autossinado/cadeia sem CA e ausência de timestamp registrados, sem substituir a chave. Manifest mesclado confirmou provider `br.dev.acstech.ap1303.pdfprovider`, não exportado e com concessão temporária, query MIME PDF, versão e pacote finais. O candidato não foi instalado fisicamente nem enviado. Release anterior preservado na mesma pasta pelo prefixo do hash original.

Arquivos funcionais alterados: `src/components/PdfAcoes.jsx`, `src/styles/admin.css`; preparação de versão: `android/app/build.gradle`, `scripts/android-release-preparar.mjs` e configuração local ignorada. Nenhuma modificação em worker/plugin/Functions de push ou plugin PDF sem causa física confirmada. Pendências: sintomas exatos por módulo, aparelho conectado, cadastro Android no grupo esperado e exibição real dos avisos nos destinatários de teste. Não declarar a falha nativa ou a ausência global de push resolvidas.

## Retomada física — Samsung conectado

Samsung SM-A057M autorizado identificado pelo ADB. Pacote instalado `br.dev.acstech.ap1303`, instalador `com.android.vending`, versão 1.0.0/código 1, instalado/atualizado em 25/10/2026. Candidato código 2 não instalado e assinatura Play preservada. Permissão `POST_NOTIFICATIONS: granted=false`, AppOps `POST_NOTIFICATION: ignore`: causa confirmada que impede a apresentação de avisos nessa instalação Android. Permissão global de notificações do Chrome está concedida, o que não comprova a permissão do site nem resolve o relato do PWA.

Leitores externos de PDF existem (incluindo Adobe, Drive e outros); ausência global de leitor descartada nesse aparelho. AP1303 aberto por seu componente declarado, sem limpar dados. Logs filtrados do processo não apresentaram código PDF/exceção contemporânea no período observado; não houve reprodução de abertura pelo usuário até esse registro. Erro antigo de processo sandbox da WebView sem correlação com a ação não foi atribuído ao AP1303. Sintoma exato/módulo e tentativa contemporânea continuam necessários para distinguir crash, ANR e loading/Activity externa.

Titular informa ausência de todos os avisos de ponto e cuidados desde sexta até 26/10. Pedido de ação assistida: ativar avisos pelo próprio aplicativo/permissão Android e abrir o PDF que falha. Não conceder permissão por ADB silenciosamente, não enviar a inscritos de clientes e não registrar ponto real. Nenhum teste de entrega física concluído ainda; aceites FCM permanecem evidência de transporte, não de apresentação. Nenhuma recompilação adicional nesta retomada.

### Após ativação pelo titular e tentativa de PDF

Permissão Android passou a `granted=true`. Callable `registrarDispositivoPush` respondeu HTTP 200 e foi cadastrada inscrição `fcm-android` no grupo principal às 13:40:42 UTC de 26/10. Isso corrige a ausência do cadastro dessa instalação; não comprova apresentação física nem explica sozinho o PWA.

Os dois testes estritamente destinados à conta fictícia do recibo anterior foram recusados: `messaging/registration-token-not-registered` nos dois canais. Nenhum aceite ou entrega. O recibo anterior identificava o mesmo hardware, mas era de outra instalação/conta anterior à instalação Play atual; não confundir com o token recém-cadastrado. Registro histórico não foi apagado por este diagnóstico. Nenhuma operação trabalhista foi criada.

Validação FCM `validateOnly=true`, sem entrega, das cinco inscrições do grupo principal: Android novo aceito; uma web recusada como não registrada; duas web e uma legada aceitas. Uma inscrição web expirada é evidência pontual, não explicação de ausência de todos os avisos nem prova de entrega das válidas. Nenhum recibo ou dado de domínio gravado. Conta real está aberta: solicitar exceção específica para dois avisos fictícios somente no Samsung, ou manter o teste numa conta fictícia, respeitando a restrição do titular.

Tentativas de abertura observadas às 10:41:08/10:41:26 locais entregaram `content://br.dev.acstech.ap1303.pdfprovider/...`, MIME `application/pdf` e grant temporário de leitura, respectivamente ao Acrobat e ao leitor `com.ezt.pdfreader.pdfviewer`. O registro `am_anr` de 10:41:48 identifica **esse leitor externo**, motivo ausência de janela focada; a Activity de anúncios do leitor estava em primeiro plano. Houve também ANR posterior do compositor Gmail, não do processo AP1303. Referências ao AP1303 na pilha de Activities do relatório não o tornam o processo responsável pelo ANR. Nenhum ANR/crash do AP1303 foi comprovado. Isso não valida o conteúdo do PDF nem inocenta todos os caminhos de abertura.

Titular relata PDF branco. Solicitado salvar a cópia por `Salvar PDF → Downloads` e comparar abertura no Drive/Acrobat, além de identificar o módulo, ainda não informado. Não trocar o leitor padrão, desinstalar aplicativos, abrir documento real adicional ou alterar PDF/plugin por suposição. Sem nova alteração funcional, build, deploy ou upload nesta retomada.

### Dois avisos autorizados na instalação Play atual — resultado físico

O titular confirmou que o PDF salvo em Downloads abriu pelo caminho alternativo. A falha observada permanece delimitada à abertura direta/leitor externo; não foi confirmado defeito no conteúdo nem ANR do AP1303. Módulo gerador ainda não informado.

Após autorização expressa para dois avisos fictícios à conta real exclusivamente no Samsung SM-A057M, confirmado no ADB e com launcher em primeiro plano, foram enviadas exatamente duas mensagens, sem retry, às 14:26:32 UTC de 26/10/2026. Destino: somente a inscrição Android cadastrada na ativação das 13:40:42.954 UTC; nenhum navegador ou outro dispositivo. FCM aceitou 2/2. O Android registrou duas notificações do pacote br.dev.acstech.ap1303 nos canais ponto e cuidados; o titular confirmou visualmente que ambas apareceram na central. Evidência mínima sem token em tmp/resultado-dois-samsung.json.

Versão física: Play 1.0.0/código 1. Este teste valida transporte e apresentação genérica depois de habilitar a permissão e cadastrar o aparelho; não executou evento trabalhista nem ocorrência real de cuidado e não comprova o ciclo automático futuro. Nenhuma escrita de negócio/recibo realizada pelo script. Leituras pontuais limitadas a até 15 grupos ativos e até 10 inscrições do grupo identificado; duas mensagens FCM. Sem listener, polling, scheduler ou serviço novo. Não houve deploy, upload ou build adicional.

PWA: uma inscrição expirada identificada; causa da ausência global e apresentação dos demais navegadores continuam pendentes. Não declarar todos os avisos corrigidos com base no ensaio Android. Candidato código 2 e ajustes responsivos da prévia continuam locais, sem publicação.

## Edição Android da loja sem cuidados — 26/10/2026

Decisão do titular: retirar efetivamente medicamentos, posologia, tratamentos, dados estruturados de pessoas cuidadas, confirmação de doses e avisos correspondentes da edição Play; preservar PWA, dados, ponto, compras, tarefas e gestão. Nenhum deploy, upload, mudança de declaração salva, migração, exclusão real, commit ou push nesta rodada.

### Separação e limites

`vite.config.js` centraliza a seleção de módulos por `mobile-release`; `edicaoBuild.js` fornece a constante de edição para rotas/controles. A edição completa é mantida nos builds web e demo. O build da loja substitui o módulo de Lembretes pela agenda geral existente, usa componente de notificações só de tarefas/ponto e não inclui os módulos originais de cuidados, PDF/ocorrências de cuidados ou Web Push. O guard do Rollup verifica os identificadores dos módulos e interrompe o build se esses módulos entrarem. A montagem de assets release omite worker e manifest PWA; não altera os arquivos web originais. Receitas culinárias preservadas usam uma lista fechada de operações, sem comandos de cuidados. Preferências web de cuidadores não são regravadas ao editar perfis pela loja.

`/lembretes` e subrotas antigas direcionam à agenda geral, sem consultar ocorrência ou parâmetros clínicos. A navegação da loja não oferece a aba de cuidados nem link de recuperação pelo PWA. O filtro de intents rejeita rota, canal ou tipo antigo de cuidados antes de qualquer consulta/confirmação. O código nativo release usa `CUIDADOS_DISPONIVEIS=false`, recusa esses avisos em recebimento/toque/leitura de pendência, remove o canal antigo de cuidados e apenas sua intenção pendente. Não apaga fila de ponto, documentos ou dados compartilhados. Debug mantém sua configuração anterior.

Servidor: `permiteEnvio` filtra todos os dispositivos persistidos como `fcm-android` para rotas/ações de cuidados antes da leitura de recibos e envio; abrange tokens antigos e novos, sem migração ou regravação. Inscrições web/legadas permanecem elegíveis conforme autorização. O deploy seletivo mínimo necessário para aplicar essa política ao agendamento existente é `dispararLembretes` em `ponto-app-1c55a/us-central1`, que incorpora o helper atualizado. Nenhum Scheduler novo. Não foi publicado: a produção ainda usa o comportamento anterior. Esse filtro vale para todos os tokens nativos Android identificados pelo contrato disponível, não depende de uma flag de edição fornecida pelo cliente.

Não há autenticação criptográfica da plataforma. Os contratos autorizados de cuidados permanecem no servidor para o PWA; a conta tem as mesmas permissões na base compartilhada. Retirar módulos do aplicativo não revoga permissões da conta em outros clientes. Campos livres, tarefas, documentos e compras de farmácia podem conter informação sensível; não certificamos ausência de tratamento de saúde em todo conteúdo possível e não alteramos registros reais para obter essa conclusão. As declarações ainda não devem afirmar ausência de saúde sem esclarecer esse limite.

### Validação executada

- 21 testes Node/emulador passaram, zero falhas e zero skips: `android-sem-cuidados`, `push-android-emulador`, `lembretes-cuidados-emulador`, `push-contrato` e `pdf-arquivos`. Firestore local, projeto `demo-edicao-android`, fixtures fictícias; FCM simulado. Testam tokens nativos antigos/novos bloqueados para cuidados, Web Push preservado, idempotência, ponto permitido, grupo vizinho intacto, rotas/intents por edição e PDFs. Log: `tmp/edicao-sem-cuidados-testes.log`.
- Porta 8877 indisponível nesta sessão; execução concluída em 19977 com configuração temporária, sem modificar as portas do app. Uma tentativa inicial de configuração temporária foi corrigida antes da execução dos testes; nenhuma tentativa usou produção.
- 6 testes JVM passaram (4 `PushFiltroTest`, 2 `PdfCacheSeguroTest`), zero falhas/erros. Log: `tmp/edicao-java-testes.log`. Release também compilou o código nativo com flag false.
- Lint dirigido aprovado. Builds Android/web aprovados. O primeiro guard Android detectou `services/push.js` importado por autenticação/exclusão e bloqueou corretamente; substituído pela ponte nativa restrita. O build posterior passou. PWA de conferência em `output/verificacao-pwa-sem-cuidados`, mantendo o módulo completo de Lembretes.
- Verificação do ZIP AAB: marker `android-sem-cuidados`, worker web ausente, 33 assets JavaScript, zero ocorrências dos marcadores de API/formulário de cuidados pesquisados (`acaoNotificacaoLembrete`, `consultarOcorrencia`, `salvarCuidado`, `listarCuidados`, `Nome do remédio`, `Posologia`). Isso valida a exclusão dos módulos específicos, não o conteúdo futuro dos campos livres.
- Samsung ausente no ADB nesta rodada. Nenhuma instalação, limpeza ou ensaio físico da edição reduzida executado. A validação física anterior foi na Play 1.0.0/código 1: dois avisos aceitos e apresentados, e PDF salvo abriu. Não transferir esse resultado ao novo candidato.

### Candidato e documentos

Play consultada em “Todos os pacotes de apps”: 1 versão, código 1, paginação 1–1 de 1. Próximo disponível confirmado: 2, sem presumir a partir de relatórios antigos. AAB candidato 1.0.0/código 2, pacote `br.dev.acstech.ap1303`, em `output/candidato-android-sem-cuidados/AP1303-1.0.0-code2.aab`.

SHA-256: `77D548D91F6E2E736DD7C7E39FFBB6465AB831EAD15C60BD4B46DB9C6C80073F`.

`jarsigner`: jar verified; certificado público corresponde à chave de upload existente. Avisos de certificado autossinado/cadeia e timestamp não foram ocultados. A versão anterior local código 2 permanece em `output/candidato-push-pdf-v2/`. O candidato novo não foi enviado. O wrapper de assinatura foi ajustado para não abortar no stderr informativo do Gradle/Windows PowerShell; exit code e guards continuam obrigatórios. Configuração local sem BOM. A aprovação antiga de documentos não foi reutilizada para a nova edição: `privacidadeAprovada=false` local; o build usou o modo já existente de artefato local e omitiu as cópias de páginas ainda não revisadas no Android. Não é autorização de distribuição.

Propostas preparadas nos documentos existentes `google-play/ficha-e-revisao.md`, `google-play/dados-e-permissoes.md` e `google-play/privacidade-rascunho.md`: ficha sem cuidados, instruções privadas de demonstração sem nova conta/senha, orientação de substituir screenshots clínicos, política distinguindo PWA/Android, tabela residual de dados e pergunta objetiva ao suporte sobre finanças. Nenhuma captura nova fabricada, declaração financeira removida ou promessa de aprovação. A classificação “Outro” continua proposta até esclarecer gestão administrativa de dinheiro; não declarar serviço bancário inexistente nem presumir isenção.

### Notificações, PDF e custos

A redução Android não corrige a falha de cuidados no PWA. Uma inscrição web expirada foi identificada; apresentação dos demais navegadores e ciclo automático completo continuam pendentes. Não houve causa adicional confirmada que justificasse alteração de worker ou backend de entrega. Ponto Android teve dois avisos fictícios apresentados após permissão/cadastro; não houve novo registro trabalhista para testar.

PDF: preservados os ajustes de prévia responsiva e ações externas. ANR observado era do leitor externo, e o usuário confirmou abertura da cópia salva. Não foi demonstrado crash do AP1303 nem correção universal do leitor. O candidato inclui o ajuste de prévia; permanece pendente ensaio físico abrir/voltar/repetir/compartilhar/salvar da nova edição.

Consumo adicional recorrente: zero consultas/Functions/listeners/schedulers novos para a separação. Rotas de cuidados não fazem consultas na loja. Quando o filtro de servidor for publicado, o agendamento mantém as leituras existentes de usuários/dispositivos, mas não consulta recibos nem envia FCM para tokens Android em cuidados; web mantém os custos anteriores. Ponto, compras, filas/idempotência e No Bolso mantêm o fluxo existente. Testes e builds geraram apenas consumo local; sem IA paga, upload de arquivo ou infraestrutura nova. Não prometer gratuidade.

## Finalização física e deploy seletivo — 26/10/2026

Samsung R9XXA0AHCEJ/SM-A057M conectado, pacote Play `br.dev.acstech.ap1303`, versão 1.0.0/código 1. Certificado do APK instalado obtido pelo apksigner é diferente do certificado da chave de upload local. Nenhuma tentativa de substituir por USB, desinstalação ou limpeza foi feita. O titular autorizou expressamente distribuir o código 2 somente no teste interno, sem enviar o teste fechado à revisão.

AAB existente de SHA-256 `77D548D91F6E2E736DD7C7E39FFBB6465AB831EAD15C60BD4B46DB9C6C80073F` selecionado manualmente após bloqueio de acesso a arquivos da extensão. Play confirmou código 2/1.0.0, publicado apenas na faixa interna `4701579709408729258`, disponível para testadores internos em 26/10 às 14:20 locais, não revisado. Sem submissão de teste fechado ou produção. Avisos não bloqueantes: ausência de desofuscação (release não usa minificação) e símbolos de depuração nativos. Screenshot em `capturas/push-pdf/play-interno-code2.png`. Link confirmado na aba Testadores: https://play.google.com/apps/internaltest/4701579709408729258 . Declarações globais, ficha pública e credenciais de revisão não foram alteradas.

### Filtro publicado

Destino confirmado: `projects/ponto-app-1c55a/locations/us-central1/functions/dispararLembretes`, serviço `dispararlembretes`. Pacote preparado a partir da geração publicada `1792887216491010`, alterando por comparação de hashes apenas `push.cjs` e `push-contrato.cjs`. Isso evita incluir as demais mudanças locais. Deploy exclusivo dessa Function concluído; revisão ativa `dispararlembretes-00010-pon`, updateTime `2026-10-26T17:14:20.635822585Z`, geração de fonte `1793034663500941`. Fonte baixada após deploy e hashes dos dois arquivos conferidos contra o pacote. Nenhuma regra, índice, PWA ou outra Function publicada.

Scheduler existente preservado: ENABLED, `* * * * *`, America/Fortaleza. Última tentativa conferida `2026-10-26T17:15:07.777057Z`, status sem erro. Amostra limitada de logs do disparador contém HTTP 200; isso não prova exibição do Web Push.

Teste pós-deploy direcionado ao pacote publicado, em projeto `demo-filtro-publicado`, Firestore local e FCM simulado: passou, zero falhas/skips. Dois tokens Android fictícios (antigo/novo) não recebem cuidados; web e legado fictícios continuam elegíveis; replay não duplica; ponto permanece para todos os quatro; grupo vizinho intacto; tokens não são removidos. Não enviadas mensagens a contas/dispositivos reais nesta rodada. Evidência em `tmp/filtro-publicado-testes.log`.

### PWA e PDF, investigação separada

Worker servido em produção respondeu HTTP 200 e SHA-256 igual ao local; Cache-Control `public,max-age=0,must-revalidate`; não houve CSP nesses dois recursos conferidos que explique bloqueio de carregamento. Nenhuma alteração no worker/PWA foi publicada. A amostra recente não trouxe falha HTTP do disparador, mas não houve evento recente de ponto nessa amostra que permita confirmar seu ciclo. Inscrição web expirada já identificada anteriormente; os demais aceites FCM não comprovam apresentação. Causa global continua não determinada sem ensaio no navegador afetado com conta/dispositivo fictício autorizado. Não usar o sucesso do filtro Android como evidência de correção PWA.

PDF continua com diagnóstico anterior: ANR do leitor externo e abertura da cópia salva confirmada pelo titular na versão 1. O novo código 2 ainda precisa ser instalado pela Play para conferir abrir/cancelar/voltar e uso do app com PDF fictício. Não reproduzir em dados de clientes nem transpor validação da versão 1 para a 2. Aguardar propagação/atualização interna sem limpar dados.

Custos: nenhum serviço, polling ou agendamento novo. Deploy usa o Cloud Build/armazenamento já existentes, sujeitos ao consumo normal. A filtragem mantém as consultas anteriores e evita FCM/recibos para Android em cuidados. Verificação de fonte/logs foi pontual; teste funcional não usou Firestore/FCM de produção. Sem commit/push.

Atualização do bloqueio físico após orientação de atualização pela Play: o Samsung deixou de aparecer no ADB (`no devices/emulators found`). Não foi possível confirmar instalação do código 2 nem executar nele os cenários de telas/ponto/compras/tarefas e retorno/cancelamento de PDF. Não desinstalado nem limpo. Próxima ação depende de atualizar pela Play e reconectar o USB, mantendo o app aberto. A distribuição interna já está disponível; não confundir essa disponibilidade com instalação/validação física concluída. Propostas exatas de declaração e pergunta financeira acrescentadas ao documento existente `google-play/dados-e-permissoes.md`; nada foi salvo nas declarações globais da Play e nenhuma mensagem de suporte foi enviada.

### Validação assistida concluída no Samsung — código 2

Após atualização pela Play, ADB confirmou novamente Samsung SM-A057M, pacote `br.dev.acstech.ap1303`, versão 1.0.0/código 2, instalador `com.android.vending`. Não houve desinstalação nem limpeza. O titular confirmou no aparelho: Ponto, Compras e Tarefas abriram, aba de cuidados ausente, abertura de PDF fictício, retorno e cancelamento da escolha do leitor mantiveram o AP1303 utilizável. Trata-se de validação visual/operacional assistida pelo titular, não automação visual nem captura de todas as telas pelo agente. Nenhum registro trabalhista ou compra real foi criado para o ensaio.

Conferência posterior do buffer de eventos Android, filtrada por instante de início do ensaio e por processos AP1303/leitores de PDF observados: nenhum `am_anr` ou `am_crash` encontrado nesse intervalo. Ausência de evento no buffer não prova inexistência universal de falhas. Não foi afirmada correção do leitor externo em todos os documentos/aparelhos. A versão 2, diferente da versão 1 anteriormente observada, agora teve retorno/cancelamento e navegação efetivamente confirmados no Samsung.

Esta validação substitui o bloqueio físico descrito acima. O filtro publicado e seus testes fictícios permanecem válidos. A falha de apresentação dos avisos PWA continua separadamente pendente; não foi resolvida por esta validação Android. Nenhuma nova submissão, mensagem de suporte, alteração de declarações, build, commit ou push após a confirmação.
