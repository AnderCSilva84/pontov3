# Firebase compartilhado no Android final — 24/10/2026

## Configuração concluída

Destino confirmado pela configuração pública existente do PWA (`.env` e `src/services/firebase.js`): **ponto-app-1c55a**. Não foi usado o default do `.firebaserc`. SDK Web no WebView mantém a configuração pública do PWA para Auth/Firestore/Functions; FCM nativo usa o registro Android do mesmo projeto. Não há contas duplicadas, outro banco, migração ou credencial administrativa no aplicativo.

Antes do registro, `apps:list ANDROID --project ponto-app-1c55a` retornou lista vazia. Registro autorizado criado uma única vez:

- Nome AP1303; pacote `br.dev.acstech.ap1303`.
- Firebase appId `1:809643426461:android:7ab3ae41264ca9e5c0ca74` (identificador público).
- Versão final `1.0.0`, código `1`, sem incremento.
- SHA256 público da chave de upload cadastrado: `D000F2D0DF9AC8DF6D0F1B1BCF2EA8F01C09F53E9C3DCFC837C9437691156734`.
- Configuração pública baixada em `android/app/google-services.release.json` e copiada para o source set release; ambos ignorados no Git. Nenhuma chave privada enviada.

Não foi habilitada cobrança, Analytics, banco ou serviço adicional. A chave de assinatura de aplicativos do Google Play será definida pela Play no processo futuro; conferir seu certificado quando disponível, sem confundir com a chave local de upload.

## Separação local

`mobile-release` é o modo explicitamente autorizado para produção; exige projeto aprovado e configuração completa, recusa host/flag de emulador. `mobile` continua recusando produção. Prefixos de teste não são expostos no modo final; PWA preserva seus prefixos e fluxo.

`scripts/android-release-preparar.mjs` compila para `dist-android-release` e prepara somente `android/app/src/release/assets`, incluindo configuração Capacitor e registro de plugins já sincronizados. Não altera `dist`, assets demo ou instalação no Samsung. O SDK nativo usa `src/release/google-services.json`; debug conserva `android/app/google-services.json` do projeto de ensaio. Source sets de assets não herdam os arquivos demo em release. Nome/ID/versão são aplicados somente à variante final; namespace Java interno existente não é identidade de instalação.

A trava de push nativa foi ajustada: final exige pacote final + projeto compartilhado + ausência de emuladores; debug conserva projeto dedicado. Filtros de usuário/grupo/expiração e confirmação de ações permanecem. Nenhum push de produção enviado ou usuário real consultado para testar.

A integração Android No Bolso continua despachando somente `noBolsoConsulta`; o handler aceita status/rankings/produto e rejeita escrita/campos de outra conta antes de acessar o banco. Não houve alteração no repositório No Bolso, em seu cache ou no fluxo web existente.

## Build e bloqueios exatos

```powershell
# Node22 local no PATH
npm run android:release:preparar
# Entrada de credenciais somente em processo local; nao imprime senha:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/android-assinatura-local.ps1 -Acao release
# Somente quando todos os requisitos reais estiverem aprovados/homologados:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/android-assinatura-local.ps1 -Acao bundle
```

Build web final concluído; **AAB final não gerado**. Validação com credenciais da chave carregadas em memória aponta somente: URLs públicas de suporte/privacidade/exclusão/recuperação e aprovação dos documentos, homologação dos contratos Android finais e acesso fictício remoto de revisão. Esses flags não foram marcados por suposição. Gradle usa o mesmo validador para impedir tarefas release sem assinatura e requisitos finais. Não basta preencher JSON com dados inventados.

## Plano único posterior — nenhuma publicação autorizada nesta execução

Destino confirmado: **ponto-app-1c55a** e Netlify **ponto1303**, siteId `cf66ee21-9935-4013-8043-1471c62694e7`, domínio `https://ponto.acstech.dev.br`. Nunca usar o default do .firebaserc. Não usar deploy geral, não alterar grupos reais e não migrar dados. Capturar a revisão efetiva anterior dos recursos selecionados antes de publicar; as evidências anteriores não garantem que ninguém alterou produção depois.

| Ordem | Recursos seletivos necessários | Verificação e recuperação |
| --- | --- | --- |
| 1 | **Índices:** três índices de pontoPendencias: status/payload.jornadaData DESC; uid/payload.jornadaData DESC; uid/status/payload.jornadaData DESC. Manter índice dias funcionarioId/dataKey já conferido READY. Comparar esses índices com o destino e enviar só os ausentes; índices de compras já existentes não devem ser recriados sem necessidade. | Esperar READY; não remover índices existentes. Se falhar, parar antes de liberar o cliente. Demonstração usa documentos por ID, sem índice novo. |
| 2 | **Functions novas:** registrarOperacaoPonto, revisarPendenciaPonto, contaOperacao, processarExclusaoConta, noBolsoConsulta, acaoNotificacaoTarefa, acaoNotificacaoLembrete, **demonstracaoOperacao**. **Alteradas:** criarGrupo, criarMembroGrupo, excluirUsuario; registrarDispositivoPush, removerDispositivoPush, testarNotificacaoPush; alertaListaCompras, alertaComprasItem, alertaNotificacoes, alertaRegistroPonto e respectivas variantes Grupo; comprasOperacao, comprasRelatorio, comprasEstimativa; lembretesOperacao e dispararLembretes existente. | Publicar dependências junto dos handlers selecionados, preservar registrarPonto e contratos web. Conferir autenticação, isolamento, idempotência, consulta sem escrita, ausência de push no grupo demo e cadastro/retomada com contas fictícias. Não republicar comprasApi, salvarFolhaPagamento ou ajustarJornadaPonto sem diff necessário. Falha: interromper liberação; restaurar a revisão anterior do handler quando seguro, preservar recibos e contratos aditivos. Ações já aceitas não são desfeitas pelo rollback. |
| 3 | **Regras Firestore:** integrar somente restrições/compatibilidade exigidas por ponto idempotente/revisão, ciclo de exclusão e escopo de grupos das telas locais; proteger coleções operacionais contra escrita direta e preservar leitura autorizada de compras/tarefas/cuidados. demonstracaoPonto é exclusivamente servidor (negação já coberta/testada). | Comparar arquivo efetivo antes, validar clientes antigos e funções prontas antes de restringir escrita. Rules têm publicação por conjunto, não por linha: revisar o diff e guardar cópia anterior. Sem abertura temporária de permissões. Se incompatível, não publicar; recuperação deve preservar as validações e isolamento. |
| 4 | **FCM Android:** app final e SHA256 de upload já cadastrados no mesmo projeto. Configuração por variante já local, auto-init/Analytics preservados. Nenhum novo projeto, conta de serviço no APK ou scheduler. | Confirmar project/package e certificado Play quando disponível. Primeiro envio final somente a uma instalação de revisão explicitamente autorizada; nunca aos clientes. Transporte depende das Functions acima. Falha: suspender inscrição/entrega dessa instalação, manter web push e demo atuais. Não revogar credenciais globais. |
| 5 | **Grupo demonstrativo:** executar provisionador restrito uma vez com autorização futura explícita, ADC local autorizado e projeto exato; usar arquivo privado cifrado. Grupo demo_play_ap1303_v1 e duas contas exclusivas, sem vínculos reais. | Confirmar claims, grupo e fixtures; repetir é conservador e não sobrescreve alterações existentes. Se houver colisão, aborta. Falha parcial: não apagar contas/grupos automaticamente; revisar somente IDs reservados. Desabilitar acessos demo em caso de incidente, sem afetar outros grupos; retomada/recriação só com confirmação de escopo. |
| 6 | **Frontend:** artefato isolado com rota /demonstracao, banner restrito ao grupo demo e compatibilidade dos módulos que chamam os contratos acima. **Páginas:** /privacidade/, /suporte/, /excluir-conta/, com Anderson Costa e Silva / andersoncsilva84@hotmail.com. | Prévia antes de produção, testar login admin/funcionário, simulação sem GPS, compras, tarefas, lembretes e atualização sem limpar filas. Publicar páginas como definitivas somente após resolver retenção/aprovar textos; sua preparação não é aprovação final. Conferir HTTP e conteúdo sem login depois do deploy. Falha: restaurar deploy Netlify anterior conhecido (último deste trabalho: 6adcfcbdddb5fb6faf1dc507), mantendo backend aditivo e pendências. Não reinstalar/limpar dados. |

A lista acima substitui a lista anterior, não acrescenta um deploy geral. Nenhum consumidor No Bolso será alterado; seu cache e o fluxo web continuam com os contratos autorizados. Uma aprovação posterior deve identificar esse conjunto e os eventuais diffs ainda necessários antes de executar qualquer etapa. Build não equivale a homologação ou liberação da loja.

## Demonstração preparada localmente

Provisionador `scripts/preparar-demo-play.cjs`: grupo reservado, duas contas Auth, claims privadas `ap1303DemoGrupo`, perfis/vínculos, funcionário sem locais permitidos, tarefas fixas para cada dia e uma avulsa, catálogo, lista em preparação, duas compras fictícias finalizadas/observações de preços e cuidado/lembrete representativo. O provisionador não lê histórico global, não sobrescreve documentos existentes, não reseta simulações e não associa contas a outro grupo. Se encontrar conta não reconhecida ou vínculo incompatível, aborta em vez de substituir. Não permite produção por padrão: exige parâmetro e projeto explícitos; o wrapper de credenciais desta rodada é exclusivamente emulado.

`demonstracaoOperacao` exige claim servidor + grupo exato/ativo + whitelist de contas + vínculo/perfil ativo. Não aceita destino/UID/coordenadas do cliente. Conta funcionário avança por entrada/intervalo/saída fictícios; administrador apenas consulta. Registra somente em demonstracaoPonto, sem tocar registros, dias, folha ou geofence. Cada ID é idempotente; ciclo limitado a quatro passos, sem reset público. Repetição recupera o mesmo resultado. O banner e a tela informam claramente que não há GPS, registro trabalhista ou notificações. O ponto normal não foi liberado sem localização; locaisPermitidos fica vazio no fixture.

Notificações: envio central recusa o grupo reservado antes de consultar dispositivos; scheduler existente ignora esse grupo. Não se criam dispositivos/tokens no seed. Sem novo polling/listener/scheduler ou envio a clientes.

### Credenciais privadas e instruções da Play

Geradas com RNG local e guardadas cifradas com DPAPI em `C:\Users\ander\BackupsSeguros\AP1303\revisao-play\credenciais.dpapi`, ACL somente usuário/SYSTEM, fora do Git e dos relatórios públicos. Não reutilizam senhas pessoais. DPAPI dessa credencial é uma proteção local, **não backup portátil**; transferir para gerenciador seguro por intervenção local antes de depender de outro Windows. Não houve criação dessas contas no Firebase real. Não colocar o arquivo cifrado, senhas, tokens ou chaves administrativas no app, screenshots ou materiais públicos.

Para repetir o ensaio usando essas credenciais, gerar com `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/demo-credenciais.ps1 -Acao gerar`, iniciar Auth/Firestore/Functions no projeto `demo-ap1303-review`, portas 9104/8894/5014, configurar variáveis locais dos emuladores e executar `-Acao emulador`. O seed aceita JSON privado por stdin sem senha em argumentos. Para produção numa etapa futura autorizada, seu CLI exige simultaneamente `--producao-autorizada`, `GCLOUD_PROJECT=ponto-app-1c55a`, `AP1303_AUTORIZAR_DEMO=ponto-app-1c55a` e ausência das variáveis de emulador; credenciais chegam pela mesma entrada privada, com autenticação administrativa local fora do APK. Não executar isso nesta rodada.

Texto para o campo **privado** de acesso ao app na Play (preencher emails/senhas localmente a partir do arquivo privado, sem publicar):

> AP1303: use a conta administrativa demonstrativa e a conta de funcionário demonstrativo fornecidas nos campos privados. Ambas pertencem exclusivamente ao grupo “AP1303 — DEMONSTRAÇÃO FICTÍCIA”. Após entrar, o banner “DEMONSTRAÇÃO” permite abrir “Simular ponto sem GPS”; o funcionário avança até quatro marcações, o administrador consulta. São horários fictícios, sem registro de trabalho ou localização de cliente. O ponto normal mantém a validação de GPS e não é necessário para esta simulação. Em Compras, confira a lista em preparação, catálogo e histórico fictício; administradores podem comprar e funcionários colaborar conforme permissões. Em Ponto, o funcionário vê as tarefas do dia; na aba Tarefas, o administrador gerencia os exemplos. Em Lembretes, confira a pessoa fictícia e o cuidado de hidratação; os envios de notificações estão desativados para esse grupo. Não é necessário USB, rede do desenvolvedor, emulador ou endereço de cliente. Para novo ciclo demonstrativo, solicite preparação ao suporte; não há reset público. Os emails fictícios não recebem recuperação: credenciais/reinicialização são administradas pelo responsável antes da revisão.

Essa experiência torna possível revisar a rotina e a simulação de ponto à distância; não promete substituir todos os requisitos que a Play eventualmente exigir para avaliar GPS/push reais. A distribuição final e acesso remoto ainda precisam ser homologados após a etapa autorizada; não marcar acessoRevisaoValidado por antecipação. Não oferecer exclusão das duas contas compartilhadas no roteiro principal: testes destrutivos de exclusão devem usar contas adicionais descartáveis quando aprovados, para não bloquear o próximo revisor.

### Custos estimados (não medidos)

Seed: duas criações Auth/claims, leitura dos IDs reservados e uma transação limitada com cerca de 30 documentos; primeira execução grava somente fixtures ausentes. Repetição relê esses documentos e não os regrava. Sem consulta a perfis/históricos reais. Simulação: 1 callable, 4 leituras para funcionário, 5 para administrador; avanço novo acrescenta 1 escrita, replay 0. Documento tem limite de quatro marcações. Tela parada não consulta periodicamente; consultar/avançar é explícito. As demais telas mantêm seus custos existentes. O grupo pode acrescentar uma leitura à paginação do scheduler existente, mas é ignorado antes de consultar seus lembretes. Páginas públicas e frontend usam hosting/rede. Custos de Functions/Firestore/Auth/hosting dependem do uso; nenhuma promessa de gratuidade ou nova cobrança habilitada.

### Retenção e bloqueios

Contato e rotas preservados. A única lista de decisões de retenção permanece em [documentos públicos](documentos-publicos.md): não duplicar ou fixar prazos aqui. Código/fixtures, isolamento, roteiros privados e plano podem ser preparados agora. Publicação dos documentos como finais e envio da ficha de privacidade dependem dessas decisões/aprovação. Backend final, URLs publicadas, teste de revisão remoto, teste de push final autorizado, assinatura/artefato final e exigências da conta Play continuam pendentes; preparar build não resolve esses bloqueios. Backup externo da chave e conclusão de sua cópia portátil mantêm seu status específico.

## Checks afetados e custos

11 testes de ambiente/base/validador aprovados; lint direcionado aprovado; teste de recusa de comandos de escrita No Bolso aprovado (teste de integração com Firestore ignorado nesta execução, não declarando nova homologação). Três testes Java `PushFiltroTest` aprovados, incluindo seleção final/demo e filtros de sessão/grupo. Build debug aprovado após mudança nativa, sem instalar/limpar dados. Configuração pública e stamp final conferidos, ausência de marcador de chave privada/conta administrativa nos bundles verificada; isso não equivale a auditoria completa.

Build, consultas de configuração e registro do app não leem/escrevem documentos de negócio. Nenhum polling, Function, listener, índice ou serviço pago foi adicionado. Custos operacionais dos fluxos existentes permanecem; futuras publicações de backend serão avaliadas separadamente. Backup portátil continua sujeito à conclusão interativa documentada no relatório específico; não foi considerado concluído por esta decisão de Firebase.

Referências oficiais: [registro Android](https://firebase.google.com/docs/android/setup) e [configuração por variante do Google Services](https://firebase.google.com/docs/android/google-services-plugin-and-file).
## Resultado desta preparação demonstrativa

Ensaio HTTP real de callable em Auth/Firestore/Functions emulados, projeto demo-ap1303-review e portas 9104/8894/5014: aprovado. Cobriu criação/repetição conservadora das fixtures, login admin/funcionário, quatro passos e replay sem duplicação, consulta administrativa, recusa administrativa de marcar, recusa de conta externa e de claim sem vínculo, escrita direta negada, leitura de outro grupo negada, leitura de lista/catálogo/tarefa/cuidado e ausência de documentos em registros/dias/folha/pontoOperacoes. Envio demo retornou antes de consultar qualquer dispositivo. O teste usou senhas efêmeras em memória, não as credenciais privadas preparadas para futura revisão. Logs somente locais em tmp/demo-review-test-final.log; nenhum segredo de revisão foi impresso.

Lint dos arquivos afetados, parser PowerShell e build web isolado em tmp/demo-review-build aprovados. Não executada suíte completa, build Android nativo ou bateria física já realizada em outras etapas. UI nova teve compilação/lint, sem afirmar ensaio de navegação completo no APK final. Emuladores iniciados para este ensaio foram encerrados. Não houve deploy ou criação de conta/dado no projeto ponto-app-1c55a, migração, upload, cobrança, commit ou push.