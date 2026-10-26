# Script 06 — PDFs no Android

Data da execução: 23/10/2026. Somente desenvolvimento/demo-ap1303. Sem deploy, migração, produção, commit, push ou PR. Nenhuma alteração no No Bolso nesta etapa.

## Arquitetura e escopo

Geração continua em jsPDF 4.2 e AutoTable 5, nos geradores existentes. Conteúdo, cálculos e identidade visual preservados. A nova camada apenas entrega o Blob/File gerado.

- `src/services/pdfArquivos.js`: seleção central Capacitor Android, registro do contexto UID/grupo/geração, validação antes/depois de awaits, limite de 20 MiB, escrita privada sob demanda e reutilização do arquivo. Uma operação externa por vez; toques repetidos na mesma ação são deduplicados. Outra ação concorrente recebe orientação para concluir/cancelar a anterior.
- `src/components/PdfAcoes.jsx`: Android usa Abrir/Salvar; PWA mantém links de download e abertura e preview existente. Compartilhar continua passando por `compartilharPdfNativo` com detecção de plataforma e feature detection web.
- `PdfArquivosPlugin.java`: ponte local registrada antes de `super.onCreate`, compatível com Capacitor 8.5.3. Não foram adicionadas dependências npm/Gradle, visualizador embutido, serviço externo ou permissões de armazenamento.
- Ponto e tarefas: no Android, seletor local oferece Abrir, Compartilhar ou Salvar após a geração; PWA mantém `pdf.save`.
- Compras, escala de cuidados e recibos financeiros: ações reutilizam o PDF já gerado. Financeiro não tenta renderizar iframe PDF no WebView Android; oferece leitor externo.

Referências oficiais consultadas: [plugins locais Capacitor v8](https://capacitorjs.com/docs/plugins/creating-plugins), [FileProvider](https://developer.android.com/reference/androidx/core/content/FileProvider), [Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files).

## Arquivos, segurança e ciclo de vida

O diretório é `getCacheDir()/ap1303-pdf/`. UUIDs sem nomes pessoais identificam os temporários. O seletor de salvamento sugere `AP1303.pdf`. O provider específico `.pdfprovider` só expõe `ap1303-pdf/`, não a raiz de armazenamento/cache. O provider anterior da câmera foi preservado.

Abrir usa ACTION_VIEW, compartilhar ACTION_SEND, MIME `application/pdf`, `content://`, ClipData e FLAG_GRANT_READ_URI_PERMISSION. Falta de leitor tem mensagem própria. Salvar usa ACTION_CREATE_DOCUMENT: o usuário escolhe destino, sem READ/WRITE_EXTERNAL_STORAGE ou MANAGE_EXTERNAL_STORAGE. Cancelar seletores resolve sem tratar a geração como falha; abrir o Sharesheet não comprova que houve envio ao destinatário.

A escrita valida assinatura `%PDF-` e limite de tamanho. Erros de leitura/escrita/salvamento são apresentados sem retry automático. Ausência de leitor permite salvar/instalar leitor. Voltar e retorno do segundo plano usam o ciclo de Activity existente. Não existe restauração automática de operação após morte do processo: é necessário gerar novamente.

O adapter captura UID/grupo antes da geração e impede entrega tardia após mudança de contexto. Eventos existentes de saída e mudança de grupo invalidam a ponte e a geração local. Arquivos já entregues a outro aplicativo ou salvos fora do cache não podem ser revogados pelo logout; nenhuma garantia contrária é feita.

Limpeza oportunista somente ao gravar: remove arquivos `.pdf` dessa pasta com mais de 24 horas; não há Scheduler/TTL/backend. Esse prazo é retenção local, não prazo garantido de disponibilidade: o Android pode limpar cache. Não se apaga imediatamente após compartilhar, pois o destinatário pode precisar ler o URI. Arquivos salvos pelo usuário não são removidos.

## URLs externas e PWA

Comprovantes cadastrados como URL não são tratados como PDFs locais. `ComprovanteLink` e `comprovanteExterno.js` abrem no navegador externo no Android, sem carregar destino arbitrário no WebView autenticado. São aceitos HTTP/HTTPS sem usuário/senha embutidos, preservando o contrato anterior que permite documentos em domínios diversos; não foi inventada allowlist incompatível. Esquemas javascript/file/content/dados e URLs com credenciais são rejeitados.

HTTP legado é delegado ao navegador externo: não houve relaxamento de cleartext ou alteração da política de rede release. Não se faz fetch autenticado, proxy, upload, cópia automática ou download ao listar comprovantes. Cookies do destino no navegador seguem as regras do próprio navegador; o AP1303 não encaminha token Firebase/cabeçalhos de autenticação.

No PWA, compartilhamento usa navigator.canShare/share e mantém fallback para download. Os PDFs privados não foram adicionados ao Service Worker; o cache shell anterior permanece restrito aos assets do build. iOS nativo não recebeu implementação própria nem validação; continua pendente de build e teste em iOS.

## Consumo estimado, não medição de faturamento

| Fluxo | Leituras / escritas / Functions adicionais | Rede / armazenamento |
|---|---|---|
| PDF com dados carregados | 0 / 0 / 0 | geração local; logo estático do pacote/cache web; Blob em memória |
| Abrir/compartilhar/salvar PDF gerado | 0 / 0 / 0 | primeira ação grava 1 temporário privado; ações seguintes reutilizam. Salvar cria cópia no destino escolhido |
| Compras sem referências disponíveis | consulta de estimativa existente: até 1 callable, leituras dependem dos produtos e implementação anterior; 0 escritas de negócio | não é chamada se referências autorizadas já carregadas |
| Escala sem consulta de cuidados compatível carregada | até 1 callable `listar`; leituras dependem do escopo autorizado; 0 escritas de negócio | consulta completa apenas se a tela ainda não dispõe do mesmo escopo ou escopo mais amplo |
| Ponto de período ainda não carregado | consulta existente por funcionário e intervalo: N documentos retornados, cobrança mínima/índices conforme Firestore; 0 escritas, 0 Functions novas | não busca histórico completo fora do período |
| Comprovante remoto | 0 chamadas adicionais ao Firestore/Functions pelo adapter | navegador consulta o destino após gesto; custos/tráfego do destino dependem do provedor |
| Aplicativo ocioso | 0 consultas/timers/listeners remotos adicionados por PDFs | arquivos só são processados por gesto |

Removida a reconsulta incondicional da estimativa de compras na exportação; escala reutiliza a consulta de cuidados já carregada quando cobre o escopo pedido e mantém o mesmo contexto. Consultas e polling preexistentes da tela de lembretes permanecem fora desta adaptação; não foram introduzidos nem ampliados pelo PDF. Cache local não substitui autorização do servidor. Não se promete custo zero geral nem permanência em cota gratuita.

## Testes e evidências

Automatizados: `tests/pdf-arquivos.test.js` cobre seleção Android/PWA, nome sem identificação pessoal, deduplicação, reutilização de temporário, mudança de UID/grupo durante operação, erro de leitura/escrita, ausência de leitor simulada, cancelamento resolvido, ações inválidas e protocolos/credenciais de URLs. Ponte recebe apenas dados locais; não contém operações Firestore/Functions. Testes anteriores de comprovantes e compartilhamento web preservados.

Fixtures exclusivamente fictícias em `output/pdf/script06/`: curto (1 página), multipágina (7), tabela com quebra (3), cuidados (1). Geradores reais de compras/cuidados usados; páginas renderizadas com PDF.js/canvas já disponíveis no ambiente e conferidas visualmente em mosaico, inclusive textos com acentos, margens, cabeçalhos, rodapés e tabela. Não houve alteração do layout para esta etapa. O mosaico mostra páginas paisagem reduzidas em célula retrato; os PDFs mantêm a orientação original.

Aparelho autorizado: Samsung SM-A057M, instalação via `adb install -r`, preservando dados. Ensaios por bridge com PDF fictício de sete páginas: escrita privada aceita; Sharesheet mostrou o PDF e destinos; cancelar retornou resolvido; seletor de documentos abriu e foi cancelado sem erro; salvar em Downloads produziu arquivo byte a byte idêntico ao original (comparação SHA-256); leitor externo `PDFViewerActivityHandleV2` foi acionado. Não houve envio a WhatsApp/email nem abertura de documento real pelo teste.

Esses ensaios da ponte não comprovam integralmente todos os botões dos módulos com dados reais. Pendentes físicos: fluxo completo de cada módulo com conta/fixtures demo adequadas, aparelho sem leitor, armazenamento cheio, morte do processo, troca real de conta durante o seletor e regressão em navegador PWA real. A proteção de sessão, falhas e fallback são cobertos por simulação automatizada; isso não é validação física desses cenários. iOS pendente.

## Executar e conferir

1. `npm run lint` e `npm test`.
2. `npm run build` (PWA).
3. `npm run build:mobile:usb` e `npm run cap:sync:android:usb` (demo-ap1303 / 127.0.0.1, sem fallback produção).
4. Definir ANDROID_HOME para o SDK local e executar em `android`: `.\gradlew.bat :app:assembleDebug --console=plain`.
5. `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
6. Na conta demo, abrir o módulo desejado, gerar PDF e testar Abrir, compartilhar/cancelar, salvar com destino escolhido e voltar. Não enviar arquivos sem intenção explícita do usuário. Para offline, usar dados já carregados; períodos ainda não consultados podem precisar de rede.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Não é release nem distribuição para loja.

## Decisões anteriores preservadas

Android AP1303 continua com integração somente de consulta ao No Bolso. Cache novo de supermercado exclusivo do APK do No Bolso. No Bolso pode consultar a API para renovar seu cache; PWA dos dois sistemas mantém os contratos anteriores. Nenhuma mudança nesses módulos ou no repositório consumidor nesta rodada.

Privacidade de logs: o código instalado do Capacitor (Bridge.java) registra methodData em verbose no modo debug padrão, incluindo base64. Foi configurado android.loggingBehavior=none para impedir esse logging de payloads do SDK no Android. Não foram criados logs de documentos/UIDs. Diagnósticos explícitos já existentes em JS não foram ampliados.


## Resultado final desta rodada

- Lint aprovado.
- Suíte: 168 testes, 147 aprovados, 21 condicionais ignorados, 0 falhas. Os ignorados dependem de emuladores/flags; não são apresentados como executados.
- Build PWA aprovado; build mobile demo e sincronização aprovados; Gradle `assembleDebug` aprovado. Avisos existentes de tamanho de chunks, flatDir e deprecações Gradle continuam sem atualização de dependências nesta etapa.
- APK final instalado preservando dados. SHA-256: `88369ECB5473F24329A303875928EE35E490EB96A0B8EE858BA4ACDB4A1C40E5`.
- No APK final, menu local exibiu Abrir/Compartilhar/Salvar e cancelou resolvendo a chamada.
- Ensaio offline limitado à bridge: WebView colocada offline por CDP, navigator.onLine=false, escrita local fictícia concluída. Rede restaurada no finally. Não equivale ao teste integral de geração em todas as telas offline.
- Invalidação explícita da bridge com seletor aberto: após voltar, retornou “A sessão mudou.”. Isso exercita o callback nativo; não foi feita troca real de conta do usuário.
- Porta temporária CDP e XML de inspeção da UI removidos. PDF fictício salvo em Downloads permanece como artefato do teste; nenhuma cópia do usuário foi apagada.

Arquivos desta etapa: `capacitor.config.json`; `android/app/src/main/AndroidManifest.xml`; `MainActivity.java`; `PdfArquivosPlugin.java`; `android/app/src/main/res/xml/pdf_paths.xml`; `src/services/pdfArquivos.js`; `src/services/comprovanteExterno.js`; `src/components/PdfAcoes.jsx`; `src/components/ComprovanteLink.jsx`; `src/components/ComprasModulo.jsx`; `src/pages/Financeiro.jsx`; `src/pages/Lembretes.jsx`; `src/pages/MeusComprovantes.jsx`; `src/utils/comprovantes.js`; `src/utils/exportarPdfPonto.js`; `src/utils/exportarPdfTarefas.js`; `tests/pdf-arquivos.test.js`; este relatório. Assets nativos do build/sync atualizados. As outras alterações locais anteriores foram preservadas.
