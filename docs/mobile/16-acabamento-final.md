# Script16 — acabamento APK/PWA e retenção preparada

24/10/2026. Alterações locais anteriores preservadas. **Versão para revisão visual de Anderson, não aprovação automática nem liberação Play.** Sem produção, deploy, limpeza real, commit, push, PR, Apple ou mudança no No Bolso.

## Entrega revisável

- APK atualizado e instalado com `adb install -r`, sem desinstalar/limpar dados: `android/app/build/outputs/apk/debug/app-debug.apk`. Pacote demo `br.dev.acstech.ap1303.dev`, ambiente dedicado de teste com Auth/Firestore/Functions locais. A identidade final/APK demo continuam separados.
- SHA256 do APK: `FD4E74661502957AE256A8213E6C9DB4627E7E565D8D87D91FB7389F9FEBB99C`.
- PWA local: **http://127.0.0.1:5190** com Vite em modo mobile, mesma base/estilos do APK e mesmos emuladores de teste. Reiniciar quando necessário: `node_modules\node\bin\node.exe node_modules/vite/bin/vite.js --mode mobile --host 127.0.0.1 --port 5190 --strictPort`. Não é URL publicada. Usar somente contas fictícias do grupo demonstrativo; os emuladores precisam estar disponíveis. Credenciais privadas da etapa anterior continuam cifradas fora do repositório.
- Build web de conferência separado em `tmp/script16-web-build`; não usar artefato de produção para testar contas reais. Não houve limpeza de IndexedDB/filas nem alteração do SW publicado.

## Problema → correção → ambiente acessado

| Tela/família | Lacuna e correção | Evidência atual |
| --- | --- | --- |
| Modais de produto/categoria | Fora do escopo `.page-shell`, herdavam controles/cores antigos; estilo compartilhado agora cobre `.compras-dialog`, campos, ações e cabeçalho | [APK categoria](capturas/16/apk-categoria-modal.png), [PWA categoria](capturas/16/pwa-categoria-modal.png), [produto](capturas/16/apk-produto-modal.png) |
| Ícones e texto longo | A inspeção do primeiro APK revelou sobreposição na grade após o estilo geral de labels; linhas com altura mínima, alinhamento e legenda próprios corrigidos | Grade real final conferida no Samsung e PWA; sem selecionar/salvar categoria |
| Conta e titularidade | Checkbox/alinhamento e agrupamento herdavam estilos avulsos; controles24px com label de toque44px e seções/foco padronizados | [Conta APK](capturas/16/apk-conta-form.png), [PWA](capturas/16/pwa-conta-form.png); sem solicitar exclusão/transferir |
| Pendências de ponto | Fieldset com borda nativa sem hierarquia; borda, espaços, legendas e controles integrados aos tokens | [Revisão APK](capturas/16/apk-revisao-ponto.png); consulta de grupo fictício, sem decisão |
| Folha e cadastro/local | Agrupamento, controles e estados disabled padronizados sem mexer em cálculo ou persistência | [Folha APK](capturas/16/apk-folha-form.png), [PWA](capturas/16/pwa-folha-form.png), [Gestão/local](capturas/16/apk-local-e-usuarios.png); folha aberta após selecionar funcionário fictício, sem salvar/fechar |
| Receita e cuidado | Fieldset, ajuda, datas/horários, textarea e botões compartilham acabamento | [Receita APK](capturas/16/apk-receita-form.png), [PWA](capturas/16/pwa-receita-form.png), [cuidado APK](capturas/16/apk-lembrete-form.png) |
| Login/cadastro/recuperação | Login independente conserva semântica, borda/fundo/placeholder/foco nos tokens; cadastro inicial inválido inspecionado sem criar conta | [Cadastro inicial](capturas/16/pwa-cadastro-inicial.png), [validação](capturas/16/pwa-cadastro-invalido.png), [teclado real](capturas/16/apk-teclado.png) |

Código concentrado em `src/styles/forms.css`, importado na mesma entrada `main.jsx` de APK/PWA. Sem cópias de telas por plataforma, fonte externa, remoção global de appearance ou novos !important. Seletores nativos úteis de data/hora/arquivo e validação do sistema preservados. Nova especificidade resolve a chegada posterior do CSS das rotas lazy nos contêineres afetados; não foi usada limpeza de cache como correção. Azul/vermelho e ícone oficial permanecem; não foram alteradas as classes semânticas Pendente vermelho/Comprado verde.

## Inspeção e limites

PWA: nove telas carregadas (ponto, compras, tarefas, lembretes, gestão, escritório, conta, cadastro no estado já autenticado e recuperação) em360/768/1366px, sem overflow horizontal da página; capturas360/1366. Cadastro inicial sem sessão também acessado. Modais e formulários foram abertos de fato; screenshots iniciais que pegaram somente loading não foram considerados prova da tela. Algumas execuções de QA precisaram corrigir esperas/seleção de funcionário; não foram tratadas como falhas funcionais do app.

APK final no Samsung: login fictício, modais de categoria/produto, receita, cuidado, gestão/locais, revisão, folha, conta e recuperação acessados; largura384px sem overflow da página nos estados medidos. Teclado real confirmado por input_method e screenshot do Android; PIN não alterado. Protetor e preferência de manter tela ligada foram temporariamente ajustados para o ensaio e restaurados a1/0. Nenhuma marcação GPS, compra, pagamento, merge, exclusão ou envio push real foi executado.

Foco por Tab e viewport equivalente a zoom200% (683px/DPR2, com texto ampliado) conferidos em Compras no PWA: [captura](capturas/16/pwa-zoom-foco.png). Isso não certifica todas as combinações de zoom/teclado/tema ou controles de todas as plataformas.

**Ainda não inspecionados integralmente nesta rodada:** todas as subabas financeiras (13º/férias/rescisão/filiais), confirmação destrutiva de cada módulo, todos os filtros/estados de mesclagem, perfil consulta e combinações de acesso/tema, todos os seletores nativos, paisagem física e PWA instalado em outros aparelhos. Relatório Script12 foi reutilizado para o que já tinha sido aprovado; isso não transforma telas novas não acessadas em validadas. O scanner, compartilhamento de PDFs e ações push não tiveram nova bateria física porque não mudaram funcionalmente.

**Offline:** a tentativa de emulação de rede pelo DevTools da WebView não apresentou o erro esperado em28s; a condição não foi contada como validação de erro offline, e a rede emulada foi restaurada. A captura `apk-carregando-offline.png` é somente evidência do estado observado, não confirmação de captura/sincronização offline. A revisão manual desse estado fica pendente; não foi presumida causa de domínio nem alterado timeout para fazer o ensaio passar. Vazio e carregamento foram observados nas telas/consultas; não foram gerados mocks de interface para substituir capturas do app.

## Testes e custos

- Lint completo aprovado. Primeira tentativa incluiu bundles gerados de dist-android-release: corrigido o ignore dessa pasta, sem enfraquecer regras de fontes.
- Builds web/mobile, sync e assembleDebug aprovados; APK final reinstalado preservando dados. Sem AAB final por bloqueios já documentados.
- 39 testes direcionados de fila, scanner, PDF e push aprovados. São verificações automatizadas, não nova certificação física desses serviços. Mesclagem/autorizações não tiveram código de domínio alterado; seus testes/baterias anteriores foram preservados, sem repetir suíte completa.
- 2 testes de retenção (guarda e cenário emulado) aprovados; guarda de produção/host emulado revalidada após endurecimento. Dados fictícios exclusivamente em Firestore emulado, sem limpeza para medir custo.
- Acabamento visual: nenhuma leitura/escrita/Function/listener/polling novo. Custos de uso existentes permanecem. Rotina manual limitada tem estimativa separada na matriz, sem serviço recorrente novo ou promessa de custo zero.

## Retenção e documentos

A [matriz vigente e única lista A/B de decisões](google-play/documentos-publicos.md) foi atualizada no documento existente. Contém categoria, finalidade, responsável, prazo/marco proposto, mecanismo, exceções e status.90dias/30dias/24h/12meses são propostas operacionais, não prazos legais aprovados. Saúde, ponto, folha, comprovantes, documentos empresariais e recibos de integridade ficam sujeitos à análise específica. Não foi publicado prazo proposto nas páginas de privacidade/suporte/exclusão.

`functions/retencao-coordenadas.cjs` prepara apenas lote administrativo limitado/dry-run da projeção de coordenadas legadas: grupo/titular validado, limite20, cursor, política versionada aprovada e expiração explícita, exceções preservadas, transação/idempotência. Não altera contratos/amostras do ponto; payloads/recibos modernos são preservados. Não é callable exportada; execução real permanece bloqueada (exige projeto demo e host Firestore emulado em loopback). Não acrescenta TTL, Scheduler, índice ou campo em registros reais. Dados de outras categorias não ganharam um motor genérico de limpeza.

PDFs privados reconhecidos já tinham limpeza oportunista24h, preservando compartilhamento ativo: mecanismo existente reutilizado e não refeito. Backups Firestore/ciclo não foram verificados; não confundir backup da chave Android com backup dos dados. Não prometer apagamento de cópias/restauração: controle de descartes anterior à reabertura de uma base restaurada ainda precisa ser definido/homologado. Essa é outra razão para não liberar execução real.

Responsável Anderson Costa e Silva, contato andersoncsilva84@hotmail.com e rotas /privacidade/, /suporte/, /excluir-conta/ preservados. As páginas continuam preparação local, não política definitiva publicada.

## Antes do congelamento / AAB

Anderson precisa revisar e aprovar o visual; concluir os estados manuais acima conforme risco. Permanecem decisões A/B de retenção, páginas finais aprovadas/publicadas, etapa seletiva de backend/regras/índices/FCM e grupo demo remoto homologados, acesso de revisão real e artefato assinado final. O [plano único](google-play/firebase-compartilhado.md) continua vigente; nenhum deploy desta rodada foi executado. A matriz e o build não resolvem todos esses bloqueios automaticamente.
### Complemento — logo interna, conta e usuários (24/10/2026)

- Logo interna centralizada em `src/assets/ponto1303.jpeg`, inclusive login. Inspeção visual confirmou AP1303; o SHA-256 é idêntico ao de `ap1303.jpeg` (22C6D7ED490A3807F07AEB29BA25C0E7EF78BFAC0B3AE12C83150AB33731DE46). O bundler pode deduplicar os arquivos e manter o nome ap1303 no asset gerado. Ícones de instalação preservados.
- Minha conta usa ícone existente, rótulo acessível, foco e alvo mínimo de 48px; painel com espaçamento e controles padronizados.
- Usuários cadastrados inicia recolhido, com aria-expanded e conteúdo desmontado. Consulta paginada adiada até expansão, reutilizada nas seguintes; sem listeners novos nem consulta de contagem. As consultas de funcionários necessárias a outros recursos permanecem.
- Foto **não implementada**: não há serviço Firebase Storage, regras Storage ou fluxo de arquivos privados configurados no código/firebase.json. Um storageBucket na configuração não comprova armazenamento provisionado/autorizado. Não foi habilitado serviço, cobrança, upload público ou imagem base64 no Firestore. Fallback por iniciais preservado. Depende de armazenamento privado autorizado e regras/ciclo de exclusão, antes de oferecer seleção/salvamento.
- Lint completo aprovado. Build mobile, sync e assembleDebug aprovados. Instalação `adb install -r` no Samsung R9XXA0AHCEJ concluída sem desinstalar/limpar dados. APK: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 7D8D9167BBFEEF8CADD91C5D33BEA8768E5A2DE77AA94F680B75E7D1F8F01F02.
- Conferência direcionada com conta fictícia no PWA local e WebView do Samsung: imagem carregada, seção inicialmente ausente/recolhida, expandir/recolher e painel Minha conta. Capturas inspecionadas: `capturas/16/pwa-logo-final.png`, `pwa-usuarios-recolhidos.png`, `pwa-conta-final.png`, `apk-logo-final.png`, `apk-usuarios-recolhidos.png`, `apk-conta-final.png`. A navegação foi conferida por rota; clique físico no ícone não foi ensaiado separadamente. Não houve validação de foto/upload, pois bloqueados.
- Consumo novo em repouso: nenhuma chamada/consulta. Expandir usuários: consulta existente limitada a 21 documentos (20 exibidos); novas expansões reutilizam a página enquanto a tela permanece montada. Fotos: nenhum consumo adicionado. Sem produção, deploy, commit ou push.

### Correção de alinhamento após foto do aparelho

Causa visual confirmada: o acesso Minha conta estava em nav global fora do page-shell/cabeçalho, ocupando uma linha inteira; a demonstração também ficava fora dos estilos dos controles. Removido nav isolado e criado AccountButton compartilhado no cabeçalho junto à marca/Voltar. Ações de notificações agrupadas em grade responsiva; margens dos cards e largura do painel uniformizadas. Aviso de demonstração mantém identificação explícita, com botão estilizado.

Checks direcionados no PWA local e Samsung: centro vertical da logo e conta com diferença menor que 2px; ausência de nav isolado e overflow horizontal; clique no ícone abre Minha conta; usuários continuam recolhidos/expansíveis. Capturas pwa-conta-final.png e apk-conta-final.png atualizadas e inspecionadas. Lint dos quatro arquivos JSX alterados, build mobile, sync e assembleDebug aprovados. Instalado com install -r, dados preservados. SHA-256 atual: 18248251EA13B51120EA1809CBE73F8A662BD72DCC3548A44A49310520C61F54. Sem alterações de banco, permissões ou consumo de rede. Nenhum deploy/commit/push.


### Atualização concluída — 25/10/2026: cabeçalho, acesso e histórico

- Sobreposição reproduzida no Samsung: Minha conta [863,137–1004,278] e notificações [900,137–1035,278]. Causa: regra antiga de tarefas posicionava notificacoes-wrap absolutamente. Override restrito ao cabeçalho mantém os dois controles no fluxo flexível, inclusive após carregar Tarefas.
- Login: Criar minha conta e grupo e Esqueci minha senha usam os botões secundários existentes, alvos de pelo menos 48px e espaçamento consistente.
- Conectado como mostra a identidade do perfil da sessão já carregado via contexto, separado da funcionária cujo ponto o administrador consulta. Nenhuma leitura de perfil adicional; permissões e atribuição do ponto preservadas.
- Histórico: total do período, subtotais de supermercado/farmácia e cartões mensais separados; datas brasileiras, meses sem gasto sem barras vazias, pastas mensais preservadas, filtros e exportação coerentes. Estado de carregamento evita exibir zero transitório. Reutiliza o listener existente limitado a 501 documentos por período; sem consulta/listener/polling adicional e sem alterar compras/valores/API.
- Checks: lint direcionado; três testes de compras/farmácia; builds PWA/mobile/release e sync aprovados. PWA local e publicado conferidos em 320,390,768,1366px: sem sobreposição/overflow, sessão correta, botões estilizados, soma dos subtotais igual ao total fictício R$11,50, filtro farmácia e meses vazios corretos. Não repetida suíte completa.
- Samsung: debug e release instalados com install -r, sem limpar dados. Debug: login, histórico e cabeçalho; release: sessão fictícia preservada, ícones separados e identidade visível após atualização. Preferências temporárias do protetor de tela e permanência da tela restauradas; forward de inspeção removido.
- Capturas: capturas/16/pwa25-publicado-login.png, pwa25-publicado-cabecalho.png, pwa25-publicado-historico-meses.png, apk25-login.png, apk25-historico-meses.png, apk25-release-cabecalho.png.
- Publicação específica autorizada após bloqueio inicial de revisão automática: Netlify ponto1303, site cf66ee21-9935-4013-8043-1471c62694e7, deploy 6addfb9a8ec83003a4a5c61b em https://ponto.acstech.dev.br. Arquivos publicados conferidos byte a byte; teste autenticado fictício aprovado. Nenhum novo deploy de backend nesta atualização. Políticas propostas excluídas do artefato público.
- AAB assinado atual: android/app/build/outputs/bundle/release/app-release.aab, 5.622.162 bytes, SHA-256 38C49DCF494EE05FEDE1AB412AD95B4DAE34D7D3554D1B5AC676BC3BC1EAFC20. AP1303 / br.dev.acstech.ap1303 / 1.0.0 / versionCode 1. Substitui o hash anterior somente como artefato local; assinatura verificada. APK debug: android/app/build/outputs/apk/debug/app-debug.apk; release: android/app/build/outputs/apk/release/app-release.apk.
- Sem upload à Play, commit/push ou limpeza de dados. Permanecem aprovação documental/retenção, cópia externa do backup portátil e ciclo físico completo de GPS offline conforme relatório específico. Foto privada permanece bloqueada por armazenamento adequado não configurado. A bateria física FCM e os deploys seletivos anteriores estão registrados em encerramento-android.md; não foram repetidos por alteração visual.
- Consumo adicional desta UI: zero novas operações remotas. Mantêm-se consultas/listeners e custos existentes, incluindo os dados fictícios de demonstração/QA preservados; não é promessa de custo zero do sistema. Nenhum serviço pago ou rotina recorrente nova.
