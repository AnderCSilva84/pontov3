# 13 — Rebranding Tá no Ponto

## Inspeção e plano — 03/11/2026

Branch: feat/rebrand-ta-no-ponto. Checkout com alterações acumuladas; nenhuma descartada, commitada ou enviada.

- Comercial: textos React, páginas públicas, título/metadados, manifesto, nomes Android, mensagens de notificações/PDFs e logomarcas serão atualizados.
- Técnico: applicationId release br.dev.acstech.ap1303, namespace/debug br.dev.acstech.ap1303.dev, Firebase ponto-app-1c55a, URLs, rotas, canais/tokens, source AP1303 da integração, variáveis VITE_AP1303, eventos, chaves/cache/IndexedDB e worker permanecem compatíveis.
- Histórico: documentos anteriores, assets antigos não utilizados e atribuição histórica da base municipal permanecem.
- Imagens: derivar tamanhos da imagem original fornecida, sem redesenhar. Logo completa nas telas/PDFs; símbolo do relógio recortado da fonte para ícones pequenos e área segura adaptativa.
- Splash nativa estática azul; relógio animado apenas React, sem atraso e com movimento reduzido.
- Sem mudanças de regras/índices, lógica de negócio, dados reais, deploy, instalação ou Play.

## Validação

Implementação local realizada. Publicação e homologação física pendentes. Nenhum deploy, instalação, Play, commit ou push executado.

| Verificação | Resultado real |
|---|---|
| Lint final | Aprovado. Um diretório intermediário de build fora das exclusões provocou erros sobre JS gerado; movido para output, sem alterar regras do lint. |
| Suíte existente + regressão de marca | 276 testes: 230 aprovados, 46 condicionais ignorados, zero falhas. Logs: output/rebrand-tests-final.log. |
| Ajustes nos testes | Nome seguro do PDF passa a Ta_no_Ponto.pdf. Dois testes VM receberam window/Event simulados, acompanhando o código local anterior. Nenhuma lógica Auth alterada. |
| Integração Auth/Firestore demo-ap1303 | 26 aprovados, 4 falhas contadas (inclui um teste pai). Compras: fixtures sem associação comprovada à categoria; grupos: espera Arroz A onde o código atual retorna ARROZ A. Não corrigidos fora do escopo da marca. Ponto/idempotência e demais cenários aprovados constam no log output/rebrand-integracao.log. |
| Build PWA final | Aprovado: output/rebrand-pwa-build.log. Não publicado. |
| Web Android reduzido | Aprovado: output/rebrand-android-web-build.log e output/rebrand-android-web/edicao-build.json; android-sem-cuidados, modulosSaude:0, verificado:true. Build não acessa dados reais. |
| Capacitor Android | Sincronizado pelo script existente em ambiente de teste com emuladores; configuração Firebase final preservada. |
| Android assembleDebug | Aprovado. Nome inspecionado no APK: Tá no Ponto Teste; pacote br.dev.acstech.ap1303.dev, código 1, versão 0.1.0-dev. Não é um candidato Play nem atualização da instalação final. |
| PDFs | Compras, gastos e escala: amostras fictícias geradas pelos geradores reais, renderizadas com Poppler e inspecionadas; logo e rodapés legíveis. Ponto/Tarefas receberam logo e rodapé nas margens existentes; não gerados ponta a ponta com dados reais. Recibos usam nova imagem quadrada PNG. |
| Visual local | Chrome: acesso ao ponto, cadastro e carregamento real observados. Desktop e overrides celular/tablet; larguras CSS medidas 469 e 941, sem overflow horizontal. São simulações, não aparelhos físicos. Override restaurado. |
| Diff | git diff --check aprovado. |

## Arquivos desta etapa

Os arquivos abaixo incluem alterações locais anteriores quando já estavam modificados. Esta lista delimita a intervenção de marca, não atribui todo o diff acumulado ao rebranding.



- `android/app/src/debug/res/values/strings.xml`
- `android/app/src/main/java/br/dev/acstech/ap1303/dev/PdfArquivosPlugin.java`
- `android/app/src/main/java/br/dev/acstech/ap1303/dev/PushEstado.java`
- `android/app/src/main/java/br/dev/acstech/ap1303/dev/PushNativoPlugin.java`
- `android/app/src/main/res/drawable/ic_notificacao.xml`
- `android/app/src/main/res/values/ic_launcher_background.xml`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/release/res/values/strings.xml`
- `capacitor.config.json`
- `functions/no-bolso-bridge.cjs`
- `functions/no-bolso-consulta.cjs`
- `functions/no-bolso-functions.cjs`
- `functions/push.cjs`
- `index.html`
- `public/excluir-conta/index.html`
- `public/firebase-messaging-sw.js`
- `public/manifest.json`
- `public/privacidade/index.html`
- `public/suporte/index.html`
- `scripts/gerar-icones-ap1303.mjs`
- `scripts/gerar-marca-ta-no-ponto.ps1`
- `src/components/CarregandoGatinho.jsx`
- `src/components/ImportarCupom.jsx`
- `src/components/NotificacoesAndroid.jsx`
- `src/components/NotificacoesAndroidLoja.jsx`
- `src/components/PontoOperacoes.jsx`
- `src/components/PontoRevisao.jsx`
- `src/components/ui/index.jsx`
- `src/pages/CadastroGrupo.jsx`
- `src/pages/Conta.jsx`
- `src/pages/Demonstracao.jsx`
- `src/pages/Login.jsx`
- `src/pages/NoBolsoConnection.jsx`
- `src/pages/NoBolsoConsulta.jsx`
- `src/pages/Ponto.jsx`
- `src/services/pdfArquivos.js`
- `src/services/push.js`
- `src/styles/carregando.css`
- `src/styles/nav.css`
- `src/styles/redesign.css`
- `src/utils/cicloConta.js`
- `src/utils/exportarPdfGastosCompras.js`
- `src/utils/exportarPdfLembretes.js`
- `src/utils/exportarPdfListaCompras.js`
- `src/utils/exportarPdfPonto.js`
- `src/utils/exportarPdfTarefas.js`
- `src/utils/exportarReciboFinanceiro.js`
- `src/utils/localizacaoNativa.js`
- `src/utils/scannerQr.js`
- `tests/auth-perfil-carregando.test.js`
- `tests/conta-client.test.cjs`
- `tests/pdf-arquivos.test.js`
- `tests/rebranding.test.js`
- `vite.config.js`

## Imagens e geração

- Fonte intacta: src/assets/ta-no-ponto.png (imagem enviada, 1254×1254).
- Logo completa: public/marca-ta-no-ponto.png (512), icon-192/512, icon-maskable-192/512 e apple-touch-icon (180).
- Símbolo recortado do relógio: favicon (48), ic_launcher/ic_launcher_round em cinco densidades. Foreground e monochrome adaptativos usam área central segura (50% do canvas de 108dp). Nome dos drawables mantido.
- Splash estática em todos os drawable*/splash.png existentes, com proporção preservada e fundo azul. Android 12 usa o ícone compacto; React apresenta logo completa e relógio animado, sem espera artificial e com prefers-reduced-motion.
- Gerador: powershell -NoProfile -File scripts/gerar-marca-ta-no-ponto.ps1. A entrada scripts/gerar-icones-ap1303.mjs encaminha para o novo gerador e não restaura a arte antiga.
- Assets antigos não referenciados permanecem para histórico; nenhum asset importado ativo usa a logo antiga.

## Compatibilidade e operação

PWA mantém id /, scope / e start_url /ponto. Worker, nomes de caches e armazenamento não foram renomeados; logo completa adicionada à lista existente de precache. Nenhuma migração/limpeza de banco ou fila. appId, namespace, applicationId de release, URLs, user-agent técnico, protocolo source AP1303, IDs de canais e controles de autorização preservados. Novos nomes de canais são apenas rótulos; IDs não mudam. Chaves e assinatura de upload não acessadas ou modificadas. Firebase/regras/índices não alterados nesta etapa. Custos: nenhum novo serviço, listener, polling, consulta ou escrita de negócio. Nova logo é asset estático local/cache.

Mensagens de backend foram preparadas no código, mas continuam aguardando autorização de deploy seletivo. Templates/configurações externas de email Auth e ficha da loja não foram modificados. Documentos já emitidos e atribuição histórica da base municipal não foram reescritos.

## Artefato local

output/Ta-no-Ponto-rebranding-debug-2026-11-03.apk. SHA-256 CD5A0086CCF91A090896CB9E0BE3578E8334848619DC5BAF5443EC5136C17136. Edição de desenvolvimento/teste, não o bundle reduzido final da Play. Não instalar sobre a versão Play, não desinstalar nem limpar dados para contornar assinatura. Nenhum release assinado/AAB foi gerado nesta etapa.

## Evidências

Capturas em capturas/rebranding/: ponto-desktop.png, ponto-celular.png, cadastro-celular.png, cadastro-tablet.png e carregamento-real.png. Amostras fictícias em output/rebrand-compras.pdf, output/rebrand-gastos.pdf e output/rebrand-escala.pdf e PNGs correspondentes. Não são comprovantes reais nem homologação física.

## Pendências e critérios físicos

- Resolver/atualizar fixtures de integração de compras/grupos em trabalho próprio, sem contornar validações de categoria. Não declarar integração integral aprovada.
- Validar login/logout, recuperação, seleção de funcionários, marcações/intervalos/saldos/histórico, importação, PDFs e isolamento no fluxo completo com contas de teste. Há cobertura automatizada, mas nem todos foram repetidos pela interface nesta rodada.
- Aparelho: GPS, teclado, fonte ampliada, splash, ícones adaptativos/monocromáticos, leitor de PDF, notificações aberto/segundo plano/tela bloqueada. Nenhum envio real de push realizado.
- PWA instalado: atualização sobre versão anterior, nome/ícones (inclusive cache do sistema/iOS), persistência da sessão/fila e sincronização após reconexão. Não remover instalação nem limpar dados para testar a marca.
- Android final: assinatura compatível e atualização real por cima da versão Play permanecem sem homologação. Não confundir sucesso debug com atualização de produção.

## Publicação futura — somente após autorização específica

1. Conferir estado atual da avaliação e maior versionCode no Play Console; não reutilizar o código local antigo.
2. Atualizar nome público e materiais da ficha para Tá no Ponto, mantendo ACS Tecnologia e o aplicativo existente. Não criar outro aplicativo/pacote.
3. Preparar AAB release reduzido com br.dev.acstech.ap1303, novo código disponível e a chave de upload existente. Não alterar flags de homologação para contornar pendências.
4. Validar assinatura e atualização com dados/fila preservados na trilha de teste autorizada antes de distribuir. A assinatura usada pela Play pode ser diferente da chave de upload; APK debug não é prova de compatibilidade.
5. Submeter apenas à trilha fechada autorizada e conferir formulário/revisão. Nenhum lançamento público está autorizado. Netlify e Functions também exigem autorização separada.

Referências oficiais: [Atualizar aplicativo](https://support.google.com/googleplay/android-developer/answer/9859350?hl=pt-BR), [Compatibilidade de atualizações e assinatura](https://developer.android.com/google/play/app-updates).

## Publicação posterior — 03/11/2026

O rebranding local foi incluído na publicação autorizada junto com os lembretes gerais. PWA Netlify 6ae9e2ff76cc9fcf4d28ad59 (ready); APK final local atualizado com a marca, sem cuidados e com assinatura existente. Functions de lembretes publicadas seletivamente. Os resultados, SHA-256 do APK e limites físicos estão em [Lembretes gerais entre usuários](lembretes-gerais-usuarios.md). Esta publicação substitui o estado “não publicado” descrito na preparação acima; não significa instalação/homologação física nem submissão à Play.


## Acabamento da identidade visual — 03/11/2026

Solicitação: melhorar a apresentação para acompanhar a logomarca e publicar PWA/APK atualizados. Alterações locais anteriores preservadas. O azul principal compartilhado passa a #082783, o mesmo do manifest e ícone, com branco nas superfícies e vermelho #ff1825 nos detalhes de marca. Navegação lateral azul, seleção mobile em azul claro, divisórias de cabeçalho com detalhe vermelho e login com assinatura azul. Mantidas as cores semânticas de pendência, atraso e conclusão. Botões de conclusão ficam verdes; os demais botões primários usam azul.

Painel de anexos: cabeçalho azul com a marca e detalhe vermelho, cards brancos com ícones de PDF/imagem/link, separação de autoria e resposta, botões brancos contornados/azuis, campos sem aparência bege e seletor de arquivos com botão azul. Ajustados contraste, espaçamento, foco, rolagem interna e larguras de celular/desktop. Lista de lembretes recebeu acabamento de bordas e sombras, preservando indicações e organização pessoal. Sem novas dependências ou chamadas de dados.

Verificação: 18 testes direcionados de identidade, estado de avisos e arquivos/apontadores passaram; lint sem erros/avisos e diff direcionado sem erros de whitespace. Prévia local com componentes reais e dados fictícios conferida em 390×844 e desktop, cobrindo anexos, controles de envio, lista e navegação. Capturas: capturas/visual-marca-lembretes/anexos-mobile.png, anexos-desktop.png, lista-mobile.png e lista-desktop.png. Não é homologação física de aparelhos. Logs de build/publicação e artefato final registrados abaixo após a verificação.

### Entrega confirmada

- PWA https://ponto.acstech.dev.br: Netlify ponto1303, deploy 6aea44066692cd3e27412fd1, ready, publicado em 03/11/2026 às 17:29 (UTC−3). Seis rotas e onze assets/documentos conferidos por hash contra o build final.
- APK output/Ta-no-Ponto-visual-marca-2026-11-03.apk: assinatura válida, certificado igual à chave existente, nome Tá no Ponto, pacote br.dev.acstech.ap1303, versão 1.0.0/código 2, SHA-256 07F7A93948C86539116CBD8792E0900F4C263BCDFB5C236E98FA811478FBAAA7. Os 58 assets públicos embarcados correspondem aos assets finais preparados para release. Sem instalação ou envio à Play; não houve verificação de novo código disponível no Console.
- Logs: output/visual-marca-lint.log, visual-marca-testes.log, visual-marca-pwa-final.log, visual-marca-android-web.log, visual-marca-apk-build.log, visual-marca-netlify-deploy.json, visual-marca-publicado-verificado.json, visual-marca-apk-verificado.json e visual-marca-apk-assets-verificado.json.
- Sem alteração de backend, dados, contratos, infraestrutura ou dependências nesta rodada; nenhuma nova publicação de Functions/regras/índices. Sem commit/push. Homologação física permanece pendente; o refresh do ícone de PWA já instalado no iPhone continua sob controle do iOS.
