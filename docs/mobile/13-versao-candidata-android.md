# Script 13 — validação final e preparação da candidata Android

Iniciado em 23/10/2026 e consolidado em 24/10/2026, America/Fortaleza, conforme contexto do titular. **Entrega local para revisão/teste; submissão ainda bloqueada.** Sem produção, deploy, migração, commit, push, PR, Google Play ou início de Apple.

## Estado preservado e identificação

Branch `feat/ponto-operacoes-offline`, HEAD `aabad8a5d08a634d0d4a3f82c997cbeb314bf952`, com alterações locais rastreadas e não rastreadas dos Scripts02–12 e associações. HEAD sozinho **não identifica o conteúdo do APK**: há trabalho sem commit. O inventário de fontes e o manifesto de artefatos em `google-play/` registram hashes do estado local relevante, sem incluir credenciais/configurações locais. Não foi criado commit para fingir uma revisão limpa.

Foram lidos os relatórios de mobile, encerramento e `docs/compras-associacoes.md`. Validações anteriores informadas pelo usuário (Samsung/PWA) e execuções registradas nos Scripts05/06/08/09/10/11/12 são **evidência histórica**, não reexecuções desta etapa. GPS real em área aberta, ação push com aparelho bloqueado e salvamento integral de PDF com igualdade de hash pertencem àquelas rodadas.

## Correções comprovadas desta etapa

1. **Escala no tablet:** a grade deixava campos de hora/carga comprimidos junto à barra lateral em768px. Entre641–1100px, o dia passa a ocupar uma linha própria, preservando três campos legíveis abaixo. Início/fim também receberam rótulos acessíveis. Não alterados horários, cálculos, geofence ou dados.
2. **Perfil Consulta de grupo:** Gestão chamava `listarFuncionarios()` apesar de as regras negarem leitura trabalhista global a esse papel. A reprodução gerava promises rejeitadas em consultas a `funcionarios`. Agora a tela evita essa leitura para Consulta de grupo, preserva o fluxo legado e o acesso administrativo; falha de carga administrativa recebe mensagem e resposta tardia não atualiza tela desmontada. Regras do servidor não foram abertas. Após correção, trace e nova matriz Consulta não geraram exceções. Teste de autorização de UI acrescentado.
3. **Dependências:** Zod transitivo do lint4.3.6→4.6.7 e body-parser transitivo do backend1.20.8→1.20.9, dentro das faixas compatíveis dos pais. Corrigidos os dois alertas altos detectados, sem `audit fix --force`, troca major de Capacitor ou atualização geral. Removido `app-ponto-3: file:..` do pacote Functions: não tinha import/require e referenciava fonte fora da pasta de deploy. Nenhum deploy foi feito para testar isso.
4. **Isolamento dos assets mobile:** `import.meta.env` embutia também variáveis públicas web, embora o resolver usasse o projeto de teste. O `envPrefix` mobile agora aceita somente `VITE_AP1303_`, `VITE_EMULATOR_` e `VITE_TEST_`. No PWA o prefixo anterior `VITE_` permanece. Inspeção dos assets sincronizados confirmou ausência de `VITE_FIREBASE_API_KEY` web e presença da configuração de teste; sem chave administrativa detectada. Não foi habilitado destino mobile de produção.
5. **Harness de testes:** cinco arquivos de integração tinham cliente fixo nas portas9098/8877 enquanto o CLI isolado usava9099/8878. Isso gerou falhas de permissão e Auth divergente na execução ampla. Corrigidos os testes para usar os hosts fornecidos pelo CLI; mantidas as verificações de negação, autoria, estado e isolamento. A repetição ampla passou. Nenhuma regra foi enfraquecida para acomodar teste.

## Inspeção visual: cobertura real e limites

Matriz no navegador local do PWA, com contas/dados fictícios, em larguras de ensaio **360,768,1440 CSSpx**. A largura útil pode ser menor pelo scrollbar; foi comparado `documentElement.scrollWidth` com `clientWidth`, não com `innerWidth`.

18 caminhos por perfil: ponto; listas; catálogo; histórico; consulta; preços; rankings; categorias; tarefas; lembretes; Gestão; escritório; conta; cadastro; recuperação; No Bolso; meus comprovantes; inexistente. Foram54 combinações Administrador,54 Funcionária e54 Consulta. O perfil Consulta teve uma primeira matriz com erros e foi repetido após correção: o relatório final da repetição não detectou overflow ou exceções. Rotas restritas exibiram o redirecionamento/estado de acesso correspondente; o pathname digitado não significa que o usuário viu o módulo proibido.

Mais **21 estados em três larguras (63 combinações)**: preparar/revisar folha; avulsos/13º/férias/rescisão; cadastro; filiais; comprovantes/arquivamento; novo usuário; Adm Ponto; jornada; locais; ajustes; revisão offline; exclusão/formulário de identidade; importação; mesclagem; novo produto. Nenhum salvamento de folha/pagamento/ajuste real foi realizado. Abrir o resumo de importação não é importar uma nota; câmera foi ensaiada separadamente no APK.

Capturas estão em `capturas/13`. A automação percorreu e registrou os estados; foram examinadas individualmente amostras prioritárias de telas estreitas, formulários financeiros, locais, revisão, conta, No Bolso, importação e teclado. Não se declara revisão pixel a pixel de cada captura nem todas as combinações possíveis de conteúdo/permissão. Estilos e regras preservam azul/vermelho, logo, Pendente vermelho e Comprado verde. A revisão não é novo redesign.

Exemplos de evidência: [13º](capturas/13/financeiro-decimo-360.png), [rescisão](capturas/13/financeiro-rescisao-360.png), [arquivar comprovante](capturas/13/financeiro-arquivar-360.png), [revisão offline](capturas/13/revisao-offline-360.png), [conta](capturas/13/admin-_conta-360.png), [teclado real](capturas/13/apk-teclado.png), [offline](capturas/13/offline.png). Algumas capturas mostram estado de carregamento; isso não é evidência de sucesso da consulta posterior.

## Regressão e smoke tests

| Execução | Resultado e alcance |
| --- | --- |
| Lint final | Aprovado |
| Testes gerais finais | 210 testes:181 aprovados,29 condicionais ignorados,0 falhas |
| Bateria ampla Auth/Firestore isolados | 296 testes incluindo subtestes:289 aprovados,7 condicionais ignorados,0 falhas; após alterações de backend e do perfil Consulta |
| Guards mobile após última alteração de prefixos | 9 aprovados,0 falhas/ignorados; complemento à bateria ampla anterior, não soma como uma execução única |
| HTTP real dedicado | 2 aprovados: exclusão efetiva de conta fictícia/negação de acesso e aprovação administrativa/regras protegidas |
| Java Android | 5 aprovados (4 testes de cache PDF/filtro push e1 exemplo gerado),0 falhas |
| Build PWA/mobile e sync | Aprovados, sem publicação |
| Gradle testDebugUnitTest/assembleDebug | Aprovados; advertências de flatDir/depreciação e chunks permanecem melhorias posteriores |
| Release local | Validador falha por configuração ausente; `bundleRelease` falhou em `preReleaseBuild`: “Release desabilitado nesta base de desenvolvimento.” Resultado esperado, não falha ignorada |

A bateria ampla cobre cadastro/retomada idempotente; isolamento; exclusão/transferência e dados de terceiros; ponto online/replay/resultado incerto, fila offline/persistência/reconciliação; revisão/aprovação/rejeição e conflitos de folha/jornada; compras/farmácia/autoria/status/QR e importação; quatro preços únicos/mesclagem/desfazer/alias/correção pontual; PDFs/cancelamento/limpeza por simulação e Java; ações push/limites de sessão; imagem de receita e SSRF; consulta/ponte No Bolso. Os sete condicionais restantes são testes HTTP de ambientes/flags específicos; dois fluxos HTTP críticos foram executados separadamente no projeto dedicado. Não se apresenta handler direto como entrega push ou GPS real.

Primeira execução ampla teve9 falhas contabilizadas (subtestes e pais) causadas pelos endpoints fixos divergentes do harness. O comando inicial Windows também falhou antes de executar testes por separador de caminho; foi refeito com Node22 no PATH. Ambos foram investigados e corrigidos, sem transformar falhas em skips.

## Aparelho real nesta rodada

Samsung **SM-A057M, Android15**, mesmo dispositivo autorizado. Instalação final por `adb install -r`: sucesso, sem desinstalar/limpar dados ou trocar package/certificado. Contas fictícias e backend emulado.

* Formulário de produto abriu com384px úteis e384px de conteúdo. Teclado real confirmou `mInputShown=true`; campo visível acima do teclado/safe area. Dois gestos Voltar encerraram teclado/modal sem erro nem produto salvo.
* Câmera do scanner abriu com vídeo `readyState=4` e trilha `live`. Ao **Cancelar leitura**, vídeo foi removido e a mesma trilha ficou `ended`. Sem salvar imagem/áudio ou consultar SEFA. Decodificação de um novo QR físico não foi repetida nesta rodada; a validação anterior e testes automatizados estão discriminados.
* PDF gerado pelo fluxo da lista fictícia de farmácia: menu **Compartilhar PDF** abriu `com.android.intentresolver.ChooserActivityLauncher`; cancelamento voltou ao app sem erro. O fluxo Salvar foi acionado/cancelado, mas a observação de foco nativo foi inconclusiva (`mCurrentFocus=null` na coleta); não se anuncia novo salvamento concluído ou entrega externa. Salvamento com hash e leitor externo estão no histórico do Script06. Nenhuma mensagem foi enviada a WhatsApp/email.
* No Bolso no APK final: a consulta autenticada retornou os quatro produtos/preços fictícios do próprio grupo e avisou que são históricos. Não houve ação de importação/sincronização financeira; o contrato externo conserva os IDs antigos, conforme a decisão de não alterar o consumidor/cache nesta rodada.
* O novo APK contém as alterações de fonte/estilo e de seleção de variáveis; não foi repetida toda bateria física depois de cada recompilação sem mudança nos plugins. A inspeção específica de configuração foi feita sobre os assets finais.

Na retomada, o USB estava sem reverses: o demo permaneceu em carregamento até restaurar9098/8877/5007. Os três endpoints locais estavam acessíveis e a tela abriu após reconectar, sem limpar dados. Isso confirma a dependência do **demo**, não uma configuração aceitável para lançamento.

Não foram repetidos GPS real com recepção externa, push físico fechado/bloqueado, cada destinatário de PDF ou toda confirmação destrutiva, pois os módulos correspondentes não mudaram nesta etapa. Permanecem pendentes no **destino assinado final**, que ainda não existe. Transferência/exclusão efetiva foram cobertas por emuladores e HTTP, não novas exclusões de contas reais/aparelho. Estados de recusa de permissão, perda de resposta e imagem indisponível têm cobertura automatizada; não se afirma ensaio físico de todas as variantes.

## Pacote, bibliotecas e assinatura

APK final: `android/app/build/outputs/apk/debug/app-debug.apk`, **10.324.249 bytes**. SHA-256: `2371CE888DE72E647246E809164C40C45C3A96E9D2D393C5B910C6B191CF27AD`.

Ambiente: `destino=teste`, projeto `ap1303-android-push-teste`, Auth9098/Firestore8877/Functions5007 locais em127.0.0.1; FCM dedicado conforme configuração existente. Depende de reverses USB no ensaio. **Não é AAB de loja nem app independente pronto para revisores remotos.**

`aapt dump badging` confirmou package `br.dev.acstech.ap1303.dev`, versionCode1, versionName0.1.0-dev, minSdk24, target/compile36. `apksigner verify --print-certs` confirmou `CN=Android Debug`; fingerprint SHA-256 público do certificado `6a4b3f5f402f9e72415f5aa50511d408651152c3e1a01880b3ad790ed461ea06`. Nenhuma chave definitiva gerada/substituída. Nenhum AAB produzido nesta rodada.

RuntimeClasspath examinado: Firebase Messaging25.0.1, Capacitor8.5.3, App8.1.2 e Geolocation8.2.4, com DataStore1.1.7 transitivo. O APK contém `libdatastore_shared_counter.so` nas quatro ABIs; não foi presumida ausência de NDK só porque o código próprio é Java. `zipalign -c -P 16 -v 4` passou. Cabeçalhos ELF das duas bibliotecas64bits (arm64-v8a/x86_64) têm segmentos PT_LOAD alinhados em16.384bytes. O Samsung informa PAGE_SIZE4096; **execução em dispositivo/emulador16KB ainda não ocorreu**. Repetir análise no AAB/APKs finais e ensaiar ambiente16KB antes de afirmar conformidade completa.

Manifest/config atuais mantêm backup desabilitado, mixed content negado, providers/serviços não exportados conforme função e ausência de server.url remoto. Cleartext permitido por host somente no debug de emuladores. O pacote demo necessariamente contém endereços de teste; os guards impedem chamá-lo de release. Nenhuma credencial administrativa foi copiada para os materiais de revisão. Uma futura versão final deve ser inspecionada novamente, não inferida do debug.

Auditoria final: raiz3 moderados/0 altos/0 críticos; backend10 moderados/0 altos/0 críticos. Restam cadeias uuid/xcode/CLI e uuid/google-gax/Storage, mais ts-deepmerge de testes. Não aplicar downgrade/override major proposto pelo audit sem validar os pais. Alertas não são prova de exploração, mas continuam pendência de análise/remediação antes de distribuição. Fontes e alcance anteriores estão no Script11; novos advisories corrigidos: [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) e [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828).

## Configuração e materiais de publicação

Preparados em [google-play/README.md](google-play/README.md): exemplos de configuração, assinatura por variáveis/arquivo ignorado, instruções de guarda/backup da chave, rascunhos de privacidade/exclusão/suporte/Segurança dos dados, ficha e limites/imagens, permissões e declaração de saúde, acesso para revisores e roteiro específico de implantação/recuperação.

O validador `npm run android:release:validar` não faz rede nem libera produção. Ausência/mistura de identidade, Firebase, assets, URLs ou assinatura gera erro claro. `release-signing.gradle.example` não foi aplicado. O projeto ainda não implementa destino mobile de produção autorizado; não basta preencher JSON para gerar AAB.

Nome AP1303 é proposta existente; applicationId/versão/Firebase finais, URLs públicas, responsável/contatos, retenção/base legal, público-alvo/declarações e assinatura exigem decisão externa/do titular. Não foi usada a identidade `.dev` por acidente como final. Acesso para revisores não pode depender de USB/endereço residencial nem de bypass público de geofence. Lembretes de medicamento exigem avaliação da declaração de saúde conforme fontes oficiais, sem afirmar dispositivo médico ou conformidade jurídica.

## Custos e consultas

Esta etapa não adicionou produto/infraestrutura, serviço pago, scheduler, índice, listener permanente, upload de PDF ou polling. Validador/compilação/checksums e estilos são locais, sem leituras/escritas de negócio. A correção Consulta elimina a tentativa indevida de uma consulta de funcionários a cada montagem da Gestão nesse papel; não há cache de autorização novo. Auditoria npm acessa metadados públicos do registry, não dados do usuário.

Estimativas do ponto mantidas dos Scripts02/11, com um local e sem retry transacional: online aceito8 leituras/3 escritas/1 Function; replay4/0/1; primeira sincronização offline6/2/1; fila ociosa0 operações adicionais. São estimativas do código, não fatura medida. App inteiro ocioso pode manter listeners e rotinas preexistentes (incluindo programação de pratos); não confundir isso com fila sem polling. Metadados de receita só por gesto e cache/exportações mantêm políticas anteriores. Cache Firestore não significa leitura gratuita.

Lançamento depende de Auth/email, Firestore/índices, Functions/triggers/programações existentes, FCM, hosting/domínios e ambiente de revisão. Quotas, runtime Node24 declarado no backend, cobrança e custos do destino final precisam de conferência; testes de handlers/emuladores em Node22 não homologam um deployment Node24. Não foi habilitada cobrança e não se promete custo zero.

## Checklist de encerramento

| Classificação | Item/evidência | Próxima ação concreta |
| --- | --- | --- |
| Concluído e validado | Correções visual/Consulta, guards, testes e APK demo instalado | Manter regressões; revisar pacote local |
| Implementado, pendente de teste final | GPS, push, PDF, exclusão, câmera e recursos anteriores no destino distribuível | Repetir passagem crítica no artefato/ambiente assinados finais, sem apagar filas |
| Implementado, cobertura visual parcial | Rotas e subabas percorridas; nem todos os conteúdos/diálogos foram examinados individualmente | Completar fixtures reais de revisão com dados fictícios e revisar capturas finais |
| Configuração externa | Identidade Firebase Android final, URLs, email/retorno, assinatura e Console | Titular definir valores; desenvolvimento validar, sem reutilizar `.dev` |
| Decisão do titular | Responsável, suporte, retenção/descarte, dados sensíveis/menores, público e declarações | Aprovar documentos com orientação jurídica/contábil |
| Defeito/limitação bloqueadora do recurso completo | Revisão que exige ajuste/reabertura não conclui a pendência automaticamente (Script10) | Definir política e implementar vínculo transacional; não contornar folha fechada/afastamento |
| Pendência de segurança | 3/10 moderados restantes, sem correção major justificada nesta rodada | Revisar alcance e solução compatível antes de distribuição |
| Configuração/teste externo | Acesso demonstrativo remoto e execução16KB | Definir ambiente/contas de revisão e testar libs no pacote final |
| Melhoria posterior | Chunks grandes/Gradle/flatDir e ampliação de QA em outros aparelhos | Otimizar com evidência, sem atualizar toda a stack |

**Conclusão: pronto para teste interno local com APK demo; ainda bloqueado para submissão Google Play.** O pacote revisável não é promessa de Android finalizado. Nada foi publicado; No Bolso e seu cache não foram alterados, e Apple não foi iniciado.

## Arquivos alterados nesta etapa

Interface: `src/pages/Admin.jsx`, `src/styles/admin.css`, `src/utils/roles.js`. Ambiente/build: `src/utils/ambiente.js`, `vite.config.js`, `scripts/android-release-validacao.mjs`, `android/release-signing.gradle.example`, `.gitignore` e comando em `package.json`. Dependências: locks da raiz/Functions e `functions/package.json`. Testes: `admin-consulta.test.js`, `android-release-validacao.test.js`, `mobile-base.test.js` e hosts nos testes de folha, grupos, lembretes, ponto-operações e três-frentes. Documentação: este relatório, encerramento e `google-play/`. Nenhum código do No Bolso alterado; demais diffs são preexistentes e foram preservados.
