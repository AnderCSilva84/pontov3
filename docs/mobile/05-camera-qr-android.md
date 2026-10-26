# Script 05 — Câmera e QR Code no Android

## Escopo e estado preservado

Branch `feat/ponto-operacoes-offline`, base `aabad8a5d08a634d0d4a3f82c997cbeb314bf952`. Árvore já continha alterações rastreadas/não rastreadas dos Scripts 02–04, cadastro e localização. Preservadas, sem checkout, reset, migração, commit, push, PR ou deploy. Documentos anteriores mantidos. Nenhum AGENTS.md aplicável encontrado. Somente demo/emuladores; produção e dados reais não foram usados.

## Fluxos encontrados e decisão

- Único uso ao vivo encontrado: `ImportarCupom.jsx`, chamado pelo módulo Compras. `getUserMedia` fornece vídeo a ZXing Browser. Uma alternativa local lê frames por `cupomImagem.js`, com ZXing/jsQR e recortes.
- Leitura de imagem existente é um helper de canvas usado nessa alternativa, não um seletor de arquivo visível. Não foi adicionado upload nem seletor novo. O helper foi preservado, com limite de 40 megapixels e liberação do canvas interno; frames alternativos são limitados a 1920px e os recortes a 2400px.
- Entrada manual permanece: colar link e/ou texto completo da nota. A interface existente **não oferece download automático**; QR preenche o link, abrir a SEFA é uma ação explícita, e o usuário cola o texto e pede revisão. Importação só ocorre após conferir produtos/filial e confirmar.
- Causa confirmada por inspeção: Manifest sem `android.permission.CAMERA`. O `BridgeWebChromeClient` instalado do Capacitor 8.5.3 mapeia VIDEO_CAPTURE para essa permissão em runtime. Isso explica um bloqueio concreto, mas não prova que toda falha histórica de leitura no PWA tinha essa causa.

Mantidos os decodificadores atuais; não foi instalado scanner nativo nem SDK de câmera. `@zxing/browser` 0.1.5 (MIT) e `jsqr` 1.4.0 (Apache-2.0) já estavam instalados, sem atualização. Capacitor core/Android/CLI 8.5.3 preservados. Uma ponte **local do próprio app**, `CameraQrPlugin`, usa a API de permissões já fornecida pelo Capacitor e abre apenas as configurações do próprio pacote. Não captura fotos nem decodifica QR; evita adicionar dependência externa só para distinguir recusa/bloqueio permanente. Não é `@capacitor/camera`, não adiciona serviço ou biblioteca de captura.

Alternativas consultadas: HTML5 QR Code adicionaria outro wrapper sobre a mesma captura web; o antigo scanner community consultado está arquivado. Não há evidência que justifique substituir ZXing antes de validar o caminho existente corrigido.

Fontes oficiais consultadas: [Capacitor v8 Android](https://capacitorjs.com/docs/android/configuration), [plugins Android/permissões](https://capacitorjs.com/docs/plugins/android), [implementação exata 8.5.3](https://github.com/ionic-team/capacitor/blob/8.5.3/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java), [ZXing Browser](https://github.com/zxing-js/browser), [jsQR](https://github.com/cozmo/jsQR), [HTML5 QR Code](https://github.com/mebjas/html5-qrcode), [scanner community arquivado](https://github.com/capacitor-community/barcode-scanner). Licenças/versões também conferidas nos pacotes locais.

## Adapter, permissões e ciclo de vida

`src/services/scannerQr.js` seleciona a plataforma; `src/utils/scannerQr.js` controla a leitura sem importar Firebase. Resultado: `{textoBruto, formato: 'QR_CODE', origem: 'web' | 'android-webview' | 'ios-webview'}`. Só se usa leitor QR, portanto o formato é conhecido. Android usa a mesma captura/decodificação web, precedida da checagem/pedido de câmera pelo plugin local. PWA não chama a ponte Android. iOS nativo permanece **não validado/pendente**; nenhuma configuração de privacidade iOS foi alterada nem seu suporte anunciado.

Permissão nova: CAMERA. Feature camera opcional, permitindo uso manual em aparelho sem câmera. As permissões de localização anteriores permanecem para ponto; escanear não as solicita. Sem microfone, armazenamento amplo ou localização em segundo plano. `audio:false` em toda captura. Permissão é solicitada somente ao abrir o leitor por botão. Estado denied não gera novo pedido; mensagem e botão de configurações orientam. Recusa, câmera inexistente/ocupada, restrições incompatíveis e falha genérica têm orientação e nova tentativa explícita. Cancelar durante a checagem impede um pedido posterior; uma solicitação já entregue ao SO pode continuar visível, mas sua resposta tardia não inicia vídeo.

O primeiro resultado para tracks/controles/timer antes de continuar. Resultado inválido também encerra captura e oferece tentar novamente. Nova leitura encerra a instância anterior. Tratados unmount, Cancelar, Voltar nativo (consumido antes de fechar o modal externo), navegação, visibilitychange, pagehide, app minimizado/bloqueado, logout e troca de grupo. Retomar não reinicia câmera sem novo gesto. Promessas tardias liberam streams/controles sem aplicar resultados. Listener Auth local existe só com scanner montado; não é listener Firestore. Contexto UID/grupo é capturado e novamente conferido antes de entregar resultado.

Há análise periódica **local de frames** enquanto a câmera está aberta, necessária à leitura contínua (ZXing e fallback serial de 1800ms). Não é polling de rede, fila ou conectividade. Não sobrepõe frames alternativos e não armazena imagens. Os temporizadores e listeners são removidos ao encerrar.

## Segurança e fluxo fiscal

O adapter aceita texto não confiável limitado a 4096 caracteres. O domínio fiscal reutiliza `normalizarQrCupom`, agora com tipo string e limite de 1000 caracteres. Aceita apenas os hosts oficiais PA já existentes, sem credenciais/porta, com payload v2/UF15 no formato esperado. Identificadores HTTP legados são convertidos em endereço HTTPS canônico, nunca consultados em HTTP. Não houve expansão de domínios ou regras fiscais. Outros QR são recusados nesta tela, embora o adapter não presuma conteúdo fiscal.

Nenhuma URL é aberta automaticamente, nenhuma imagem ou texto fiscal é logado/enviado pelo scanner. Não há credenciais adicionadas ao destino. `capacitor.config.json` não ganhou allowNavigation amplo. Backend mantém autorização, parser compartilhado, bruto/desconto/líquido e deduplicação por chave/rascunho. A função de consulta já existente valida URL HTTPS oficial, constrói endpoint fixo, usa `redirect:'error'`, timeout e limite de 2MiB; não é proxy arbitrário. Testes usam fixtures e fetch simulado, sem nota real.

Sem conexão, a leitura continua local; isso não implica consulta/importação bem-sucedida. Conferência remota mantém erros existentes, sem retry novo. Nenhuma alteração no contrato/API No Bolso ou permissões públicas.

## Arquivos desta rodada

- Novos: `src/services/scannerQr.js`, `src/utils/scannerQr.js`, `tests/scanner-qr.test.js`, `android/app/src/main/java/br/dev/acstech/ap1303/dev/CameraQrPlugin.java`, este documento.
- Alterados: `ImportarCupom.jsx`, `cupomQr.js`, `cupomImagem.js`, `cicloMobile.js` (pausa/Voltar cancelável), `dadosGrupo.js` (evento local de mudança), Manifest e MainActivity Android (registro do plugin), teste de ciclo mobile existente.
- Nenhuma alteração nova em dependências/lockfile, backend, regras fiscais, regras Firestore ou API. Os diffs anteriores desses arquivos continuam preservados.

## Testes automatizados

Lint aprovado. Suíte unitária: **155 testes, 136 aprovados, 19 condicionais ignorados, zero falhas**. Novos comportamentos: normalização, input perigoso/grande, primeiro resultado único com câmera já liberada, cancelamento com stream/controles tardios, contexto alterado, recuperação de câmera ocupada, permissões e cancelamento durante checkPermissions, seleção real do adapter Android/PWA, encerramento de instância anterior e remoção de listeners/cancelamento de ciclo.

Integrações relacionadas foram executadas em Auth/Firestore locais, apenas fixtures. Na execução ampla com compras/três-frentes/consulta: **34 testes contabilizados, 32 aprovados e 2 falhas contabilizadas** (um subteste e seu pai). A falha é no subteste preexistente de geração de código da ponte No Bolso: `getAuth().getUser(uid)` respondeu user-not-found antes da mensagem de reauth esperada. O projeto de teste alternativo/fixture Auth precisa de revisão; não se atribui ao scanner e a ponte não foi modificada para contornar isso. Os subtestes fiscais dessa mesma execução passaram: autorização antes da rede, revisão sem preço gravado, bruto/líquido, confirmação concorrente/replay, associação à lista, reconhecimento e deduplicação. Não se declara a suíte ampla integralmente aprovada.

Build web/mobile demo USB, Capacitor sync e Gradle debug aprovados. Warning preexistente de chunk >500kB mantido. Conferência final de artefato e testes físicos abaixo.

## Custos incrementais (estimativa por desenho, não medição de fatura)

| Ação | Scanner: Functions / leituras / escritas remotas | Fluxo existente |
|---|---|---|
| Abrir/cancelar | 0 / 0 / 0 | Nenhuma consulta de cupom |
| QR inválido | 0 / 0 / 0 | Recusa local |
| QR válido sem confirmar | 0 / 0 / 0 | Só preenche link; abrir SEFA explicitamente usa rede do site |
| Conferir texto / confirmar importação | 0 / 0 / 0 adicionais do scanner | Callables cupomPreparar/cupomConfirmar existentes, leituras/escritas variáveis pelos itens, aliases, contexto, transação e replay |

Adapter usa Auth já carregado e grupo em memória, sem leitura por frame/item. Listener local Auth não abre consulta Firestore. UI de compras mantém consultas preexistentes, separadas desta estimativa. Confirmar consulta automática no backend, se futuramente exposta, teria custo de Function/rede externa; não foi ativada nesta etapa. Sem serviços pagos, analytics, anúncios, IA, scheduler, índice, upload ou infraestrutura adicional. Câmera/decodificação usam CPU, memória e bateria locais. Não se promete custo zero para importação nem cota gratuita permanente.

## Roteiro físico Android/PWA

1. Iniciar os três emuladores demo conforme etapa 03, manter USB autorizado e reverse das portas 9098/8877/5007; instalar APK com `adb install -r` preservando dados.
2. Conta fictícia do demo: Compras → Importar cupom fiscal → Escanear QR Code. Na primeira vez negar; conferir orientação, tentar explicitamente, permitir durante o uso. Se bloqueado, abrir configurações do próprio app. Não conceder microfone/arquivos/localização para esse fluxo.
3. Apontar para QR fictício (`output/qr05/qr-ficticio.png`, gerado localmente da fixture): link preenchido uma vez, câmera desligada, nenhuma navegação automática. **Não abrir SEFA/importar essa nota fictícia.**
4. Reabrir, Cancelar; reabrir, Voltar; reabrir, minimizar/retomar; bloquear/desbloquear. Confirmar indicador de câmera desligado e novo gesto necessário.
5. QR arbitrário: erro claro, câmera liberada, tentar novamente. Testar câmera ocupada e entrada manual, sem concluir compra real.
6. Com leitura pendente, navegar/sair/trocar grupo ou usuário; resultado anterior não pode preencher a nova sessão. PWA deve continuar capturando pelo navegador sem ponte Android. iOS nativo exige rodada própria.

## Artefato e validação física

APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 9.961.258 bytes. SHA-256: `B491C1EA154562CB2692104D3820749123A50B3CB53F9792140B13BCF463760C`. Assinatura aprovada por `apksigner verify`. Manifest final conferido com aapt: CAMERA, INTERNET, COARSE/FINE e NETWORK_STATE preexistente; sem RECORD_AUDIO, armazenamento amplo ou localização de fundo. Ambiente embutido conferido: `demo-ap1303`, emuladores em `127.0.0.1` via USB; sem produção. Último Gradle debug aprovado, APK reinstalado com `install -r`, preservando dados. HEAD permaneceu igual ao inicial; diff check sem erros de whitespace, com avisos locais de conversão LF/CRLF.

Na conferência física foi descoberta e corrigida a ordem de registro do plugin: `registerPlugin(CameraQrPlugin.class)` precisa preceder `super.onCreate` neste Capacitor 8.5.3, pois o super constrói a bridge. Antes, checkPermissions retornava UNIMPLEMENTED; após recompilar/reinstalar, plugin disponível e checkPermissions respondeu prompt no aparelho. Isso foi detectado em execução, não apenas no build.

**Executado pelo agente no Samsung SM-A057M, conta demo fictícia:** recusa/cancelamento de permissão mostrou orientação sem captura; para continuar o teste foi concedida CAMERA **via ADB ao pacote debug**, não por validação do botão de concessão do diálogo do usuário. Após gesto no botão Escanear, WebView exibiu vídeo real com readyState4, largura1080 e track live, sem erro. Cancelar removeu vídeo e track ficou ended; nova abertura chegou a readyState4. Voltar nativo encerrou track e, após atualização React, removeu vídeo preservando o importador. Minimizar com Home, após completar a transição do SO, removeu vídeo e encerrou track; retomar manteve câmera desligada. Não foram capturadas/armazenadas imagens da câmera. Porta temporária CDP removida; reverse dos emuladores demo mantido.

**Informado pelo usuário:** após receber o QR fictício e o roteiro de leitura, respondeu “deu td certo”. É confirmação relatada de sucesso, separada dos testes instrumentados acima; não se afirma que a decodificação óptica do APK final foi observada pelo agente. O ajuste de ordem do plugin foi feito depois desse relato e validado no aparelho como descrito. Não houve importação de nota real pelo agente.

Pendentes físicos: fluxo completo de conceder permissão pelo diálogo Android (a concessão para o ensaio foi por ADB), bloqueio permanente/configurações pela UI, bloqueio de tela como caso separado de minimizar, câmera ocupada, troca de câmera, sessão/grupo durante captura e regressão PWA em navegador real. Esses casos têm proteção/testes automatizados onde descritos, sem alegar validação física integral. iOS nativo segue pendente.
