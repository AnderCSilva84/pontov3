# Script 12 — revisão visual, marca Android/PWA e imagens de receitas

23/10/2026, America/Fortaleza. Branch `feat/ponto-operacoes-offline`. Alterações locais anteriores preservadas. Sem produção, deploy, migração, commit, push ou PR; sem implementação Apple. APK continua debug e ambiente exclusivo de teste, Auth/Firestore/Functions locais.

## Identidade e sistema compartilhado

Original disponível: `src/assets/ap1303.jpeg` (1024×1024); marca AP1303 branca/vermelha em azul, distinta da ACS Tecnologia. Paleta medida por mediana RGB de pixels amostrados a cada 4px, selecionando azul (B > 1,3R e > 1,1G) e vermelho (R > 1,8G/B): **#2B529D** e **#E5383E**. O JPEG tem variações de compressão/fundo; são valores representativos medidos, não a alegação de um manual de marca vetorial. Azul forte #203E77 e superfície #EDF2FC são derivados para interação/contraste, não cores extraídas.

Azul nas ações, navegação, foco e seleção. Vermelho como detalhe da marca; ações destrutivas mantêm texto e vermelho semântico próprio. Pendente vermelho e Comprado verde preservados; positivos/negativos e alertas continuam semânticos. Gráfico de farmácia usa roxo com hachuras, supermercado azul, ambos com rótulo e valor, sem mudar cálculo.

Tokens centralizados em `src/styles/redesign.css`: marca, semântica, superfícies/texto, tipografia do sistema, espaços 4/8/12/16/24, controles 48px, raios 12/16 e sombras leves. Removida a importação Google Fonts. Não há fonte/CDN nova nem framework visual novo. Escala principal: título28px, seção19px, subtítulo17px, corpo/controles16px, legenda12–14px; relógio com fonte monoespaçada/tabular. Valores financeiros tabulares. Ajustes feitos também nas regras de origem de App/login/admin/tarefas/compras/lembretes; a camada de overrides preexistente foi preservada onde necessária, sem nova substituição global de verde.

Botões comuns azuis, secundários brancos com borda, destrutivos identificados. Formulários, cards, grupos de ações e cabeçalhos padronizados. Campos16px evitam zoom automático por fonte pequena; viewport permite ampliação por acessibilidade e touch-action permite pinch. Foco visível e preferência de movimento reduzido preservados. Sem novo tema escuro (o app existente usa color-scheme light).

Contrastes calculados pela luminância relativa sRGB: azul/branco7,51:1; texto principal/branco16,29:1; texto secundário/branco6,36:1; Pendente6,80:1; Comprado6,49:1. São pares conferidos, não certificação automática WCAG de cada pixel/estado. Vermelho de marca é decorativo; não foi usado como fundo de texto pequeno branco sem análise.

## Inspeção e correções

Capturas reais do app com grupo/contas fictícias, não maquetes substitutas:

| Família | Antes/depois e resultado |
|---|---|
| Ponto | Relógio, identidade, registros e leitura administrativa; perfil funcionário conferido no Samsung sem criar marcação |
| Compras | Cards, autoria longa, Supermercado/Farmácia, navegação, status; ações existentes mantidas |
| Tarefas | Agenda vazia, filtros, cadastro recolhido; ações azuis, dias úteis/feriados semânticos preservados |
| Lembretes/receitas | Carga/vazio, filtros, criação e edição, link inválido, foto preservada, seletor Android e teclado real |
| Gestão | Usuários, filtros e acesso à revisão offline; atalhos/controles compartilhados |
| Escritório | Funcionário, abas, competência e vale-transporte; nenhuma mudança nos cálculos ou fechamento |
| Conta | Sessão/exclusão e avisos de retenção; nenhuma exclusão executada nesta rodada |
| No Bolso | Contrato e telas existentes preservados; Android continua consulta, PWA mantém autorização web |
| Cadastro | Estado autenticado que preserva grupo; formulário inicial de novo titular não inteiramente ensaiado |
| Recuperação | Formulário de email; não enviado email real |

Rotas PWA verificadas em **360,390,412,768,1024,1440 CSS px** (60 combinações), com capturas390/1440. O primeiro diagnóstico só comparava scrollWidth com innerWidth; a inspeção física revelou um caso aberto de receita que não estava coberto. Corrigida a origem: trilhas implícitas `auto` em `.pratos-dia` e conteúdo aumentavam a largura mínima. Agora `minmax(0,1fr)`, resumos flexíveis e campos limitados mantêm o formulário aberto em **384px de clientWidth/384px de scrollWidth** no Samsung. Não foi mascarado com overflow:hidden.

Teclado: primeiro ensaio acionou o seletor nativo, registrado separadamente; repetição focou texto e Android confirmou teclado aberto. Após a correção de grade, campo de nome visível acima da navegação/teclado, sem corte horizontal. Paisagem física: viewport779×360, scrollWidth779; orientação original restaurada. PWA: layout equivalente a1440px em200% (viewport lógico720px, DPR2), fonte raiz200%, movimento reduzido e foco por Tab conferidos em Compras, sem overflow; não equivale a testar toda tela com toda combinação de acessibilidade.

Evidências:

- [Ponto antes](capturas/12/before/ponto-390.png) / [depois](capturas/12/after/ponto-390.png).
- [Compras antes](capturas/12/before/compras-390.png) / [depois](capturas/12/after/compras-390.png).
- [Gestão desktop](capturas/12/after/gestao-1440.png), [escritório](capturas/12/after/financeiro-390.png), [conta](capturas/12/after/conta-390.png).
- [Receita final APK](capturas/12/detalhes/apk-receita-final.png), [teclado](capturas/12/detalhes/android-teclado.png), [seletor](capturas/12/detalhes/android-select.png), [paisagem](capturas/12/detalhes/apk-paisagem-final.png).

Lacunas honestas: não foram inspecionadas todas as subabas de funcionários/locais/filiais/comprovantes, todos os formulários de folha/13º/férias/rescisão ou cada confirmação destrutiva em todos os perfis. Estilos compartilhados os alcançam, mas isso não substitui inspeção individual. Perfil consulta e variantes reais de tema/launcher/PWA instalado em outros aparelhos permanecem manuais. Scanner, PDF e push não tiveram código funcional alterado por estética; testes automatizados de regressão passaram, sem repetir toda bateria física anterior de cada serviço. Não se declara revisão integral de estados não acessados.

## Ícone oficial e splash

Derivado do original, sem redesenhar ou distorcer: recorte técnico x112,y400,800×176 contém toda a marca, com escala proporcional e respiro. Gerador reproduzível `scripts/gerar-icones-ap1303.mjs`; usa canvas de desenvolvimento já disponível no renderer local, selecionável por AP1303_CANVAS_MODULE. Não foi adicionada dependência ao aplicativo. O original não foi modificado.

Android: recursos comuns/redondos mdpi48,hdpi72,xhdpi96,xxhdpi144,xxxhdpi192; camadas adaptativas equivalentes a108dp e marca contida na área central segura. Camada monocromática derivada dos elementos brancos do original, sem substituir a marca por símbolo inventado. XML adaptativo comum/redondo referencia foreground e monochrome corretos; referências do Manifest permanecem efetivas. Recursos Capacitor vetoriais antigos sem uso removidos. Splash nas densidades/orientações existentes passa a AP1303 em fundo neutro. Ícone de notificação `ic_notificacao` continua recurso monocromático próprio, não recebe o ícone colorido do launcher. Cores do tema nativo ajustadas, sem alterar notificações sensíveis.

Orientação técnica: [ícones adaptativos Android](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive) e [AOSP](https://source.android.com/docs/core/display/adaptive-icons). Camada monocromática preparada; ícone temático com paleta de wallpaper não foi ativado/testado fisicamente.

PWA: manifest com192/512 reais, `any` e `maskable` separados, respiro central; favicon48 e apple-touch180. Nome AP1303, cores de tema/fundo coerentes. id,scope,start_url,display,SW e comportamento de instalação preservados. Referenciar apple-touch-icon é compatibilidade do PWA, não início de projeto iOS.

Samsung SM-A057M Android15 identificado, instalação via `adb install -r`, sem limpar dados/desinstalar ou mudar applicationId/assinatura. Gaveta e informações do app mostraram AP1303, sem Capacitor. Usuário adicionou o atalho à Tela inicial; encontrado na segunda página e capturado. Não foi limpo cache/dados do launcher. Capturas limitadas ao próprio ícone/cabeçalho, excluindo outros apps e notificações:

- [Tela inicial](capturas/12/detalhes/android-home-icon.png).
- [Gaveta](capturas/12/detalhes/android-drawer-icon.png).
- [Informações do app](capturas/12/detalhes/android-info-app.png).

Instalações PWA existentes podem manter ícone antigo até atualização pelo navegador. Não se deve remover PWA/limpar armazenamento com pendências locais: primeiro reconciliar e conferir decisões/recibos. Se o navegador não atualizar o ícone, eventual recriação da instalação deve ser feita somente após resolver pendências; não se promete preservação automática de IndexedDB numa remoção. Cache de launcher Android também não deve ser resolvido apagando dados do app.

## Imagem de receita pelo link — funcionalidade adicional autorizada

Fluxo atual preservado (pratos dedicados à funcionária e visíveis a admins, foto inline opcional). Novo botão **Buscar imagem do link** em criação/edição, prévia antes de salvar, remoção/substituição e alternativa do dispositivo. Busca é explícita, deduplicada por formulário em voo, sem retry automático. Falha ou ausência de metadados preserva foto/URL anterior; alterar link sozinho não apaga imagem. URL escolhida persiste em `imagemUrl`, campo aditivo; clientes antigos omitem e o servidor preserva valor existente. Foto escolhida no dispositivo limpa URL e vice-versa. Autoria/destino/permissões continuam validados no servidor.

Reutilizada `lembretesOperacao`, operação `buscarImagemReceita`, autenticada e somente admin no grupo atual. Justificativa: CORS impede depender da leitura direta de páginas arbitrárias no PWA. Não foi criado endpoint proxy aberto ou nova função provisionada; retorna somente URL de metadados, nunca HTML/imagem binária. Sem cookies/credenciais para sites. HTTPS/porta443, sem userinfo/IP literal/domínios locais; DNS IPv4 público conferido e endereço fixado em lookup do socket HTTPS, preservando validação TLS/hostname. IPv6-only não é suportado nesta implementação. Redirecionamentos relativos/públicos validados a cada salto (máximo2); resposta de redirecionamento encerrada sem baixar corpo. Total8s, cabeçalhos16KiB, HTML256KiB, sem compressão, tipos HTML/XHTML somente. Sem executar scripts/HTML, sem contornar403/CAPTCHA.

Prioridade: og:image → twitter:image → Recipe em JSON-LD. Entidades e URLs relativas resolvidas contra a URL final; nada de fallback para anúncios/img arbitrário. DNS da imagem também validado, sem baixá-la no backend. Parser limitado a HTML256KiB e travessia JSON de profundidade12/1000 objetos. O servidor não transmite credenciais do usuário aos destinos. API [HTTPS/lookup do Node](https://nodejs.org/api/https.html).

Exibição por URL persistida, loading lazy, proporção16:9 reservada, referrerPolicy no-referrer e crossOrigin anonymous. Essa política evita credenciais cruzadas, mas exige CORS da imagem; hotlink/CORS/expiração/erro mostram placeholder. Não há garantia de disponibilidade permanente e não se copia imagem para Storage. A listagem inclui URL para não criar leitura por imagem; foto inline anterior conserva seu carregamento sob demanda existente.

Testes com fixtures: OG/Twitter/Recipe, URL relativa e entidades, ausência de imagem/anúncio, URLs perigosas/IPs especiais/DNS privado ou misto, imagem interna, redirecionamento público/privado/limite, falha de rede e autorização. Emuladores: persistir, preservar ao trocar link, remover, negar imagem privada e isolamento entre grupos. PWA real: tentativa privada devolveu erro seguro sem apagar foto atual. Uma consulta pública a Panelinha foi recusada por resposta indisponível/não suportada; não se contornou bloqueio. Caminho de sucesso validado com transporte fixture, não se afirma sucesso nesse site. Prévia/placeholder implementados para ambos os clientes; nova validação em URLs reais escolhidas pelo usuário permanece recomendada.

## Validação, custos e limites de distribuição

- Lint aprovado. Testes gerais204:176 aprovados,28 condicionais ignorados,0 falhas. Integração de pratos em emuladores demo:1 cenário amplo aprovado com persistência/remoção/isolamento; testes de segurança da imagem fazem parte da bateria geral.
- Build web/mobile e Capacitor sync aprovados. Gradle testDebugUnitTest e assembleDebug aprovados (5 testes Java). Avisos anteriores de chunks, imports dinâmicos mistos, flatDir e Gradle deprecated permanecem; não são novos erros.
- CSS web passou de69,75kB para aproximadamente72,94kB; gzip15,14→15,79kB. Chunk principal aproximadamente548,80→549,85kB (gzip164,77→165,12kB). Pequeno acréscimo de componente/estilos; renderer canvas não integra bundle. APK aproximadamente10,32MB; hash e tamanho finais registrados ao concluir instalação.
- Visual/ícones: **0 novas chamadas Functions, leituras/escritas Firestore, listeners ou consultas externas de fonte**. Acrescentam bytes locais e recursos de imagem. Não alterados contratos/cache No Bolso, geofence, fila, Auth, exclusão ou cálculos financeiros.
- Busca de metadados por gesto:1 invocação do callable existente, estimadas4 leituras no fluxo de grupo (vínculo, grupo, perfil no contexto e perfil para papel admin; a repetição segue o contrato atual, não foi acrescentado cache de autorização),0 escritas. Até3 requisições HTTPS de página com redirecionamentos + DNS; salvar usa a operação de prato já existente com poucos bytes extras. Abrir/renderizar não faz nova busca de metadados; imagem pode gerar GET do navegador ao servidor terceiro, conforme cache HTTP. Sem Storage, IA, scheduler, TTL, serviço pago novo ou polling de imagem. Polling de programação de pratos já existente permanece, sem alteração nesta rodada; não se promete app inteiro ocioso sem consumo.
- Custos do ponto permanecem os documentados nos Scripts02/11: online8 leituras/3 escritas/1 chamada com um local; replay4/0/1; primeira sincronização offline6/2/1; fila ociosa0 adicionais. São estimativas do código, sem medição de fatura, podendo variar por transação/listeners/regras. Cache local não substitui autorização. Não se promete custo zero/cota gratuita.

APK: `android/app/build/outputs/apk/debug/app-debug.apk` (debug, teste). **Não é AAB/candidata de produção nem versão aprovada na loja.** Alertas moderados de dependências, conflitos específicos de revisão, URLs/suporte/recuperação final, política de retenção e assinatura/distribuição continuam no checklist. Próxima etapa: fechar essas pendências e a regressão final do destino, sem publicar por causa do redesign.

Artefato final: 10324249 bytes; SHA-256: 44B125C534F68B64AA4141F3CC809EAA2A985907C915EC335B50539B8AF924E1. Instalação final com -r concluída no Samsung, sem limpeza de dados.

Encerramento: sessão fictícia finalizada; protetor de tela restaurado para 1, manter acordado por USB para 0 e rotação para 0 (valores anteriores). PIN não alterado. Recortes do próprio ícone mantidos; XMLs temporários de UI removidos. Emuladores preexistentes preservados.

## Rodada 29/10/2026 — Escritório profissional (local, não publicado)

Referência: imagem desktop/mobile entregue pelo titular. Git conferido antes da edição; alterações funcionais anteriores mantidas. Não houve deploy, instalação, envio à Play, commit ou push. As capturas abaixo são de dados fictícios em `demo-ap1303`, não de contas de clientes.

### Implementação e diferenças justificadas

- `src/styles/redesign.css` consolidado como sistema visual: tokens de cores, fonte do sistema, espaçamento, dimensões, raios, controles, cards, tabelas, abas, estados, modais e foco. Sidebar marinho de 220px a partir de 1024px; área clara, superfícies brancas, bordas/sombras discretas, ações azuis e ativo vermelho. Navegação inferior no celular preserva as entradas autorizadas de cada perfil.
- `nav.css` refeito; `App.css`, `admin.css`, `compras.css`, `funcionaria.css`, `tarefas.css` e `carregando.css` perderam gradientes/vidro e decoração excessiva. Formulários de cadastro/recuperação compartilham agora o espaçamento de `forms.css`, sem depender do carregamento prévio do CSS de Compras.
- Componentes compartilhados `ui/index.jsx`, `BottomNav` e carregamento usam a logo original `ponto1303.jpeg`, SVGs consistentes e identidade da sessão já carregada. A marca mantém proporção e recorte somente do fundo vazio; ícones de instalação não mudaram. Sem foto fictícia: iniciais e papel do usuário, nenhuma implantação de upload.
- Ponto, Tarefas/cardápio, Lembretes, Financeiro e Login receberam ajustes pontuais de ícones/hierarquia. Catálogo usa `CategoriaIcone.jsx`: representa os identificadores existentes por SVG, sem regravar categorias. O editor mantém compatibilidade com os identificadores personalizados anteriormente aceitos; seu campo continua disponível. Etiquetas de compras continuam com texto Pendente/vermelho e Comprado/verde.
- Não foi criado o dashboard ilustrativo da referência: contagens, fotografias e indicadores não disponíveis não foram inventados. As páginas e ações reais foram preservadas. Cardápio mantém programação/arquivados e separa data, prato e responsável. Administração de usuários continua recolhida por padrão.

### Conferência real em navegador

Prévia navegável: http://127.0.0.1:5178/tarefas (Chrome, sessão fictícia de administrador). Vite em modo `compras-test`; Auth 9098, Firestore 8877 e Functions 5007 locais, projeto `demo-ap1303`. Não usa grupos reais. A prévia depende desses processos locais continuarem ativos.

- Ponto, Tarefas, Compras, Gestão, Minha conta e Cuidados: medidas no navegador em **360, 390, 768, 1024 e 1440px**, sem rolagem horizontal da página.
- Catálogo, histórico, Central de Preços e escritório contábil: medidas adicionais em 360/1024px, sem rolagem horizontal. Estados vazios preservados, sem preenchimento com dados de outra categoria.
- Cadastro e recuperação conferidos no celular; senha divergente exibiu erro antes de cadastrar. Mostrar/Ocultar do login alternou corretamente o tipo do campo. Nome extenso fictício não rompeu o formulário.
- Produto em modal a 360px: janela 336×768 dentro da altura de 800px, rolagem interna e Fechar acessível. Receita expandiu com preparo/autoria separados. Folha fictícia foi preenchida e revisada, **sem salvar ou fechar pagamento**.
- Usuários cadastrados permaneceram recolhidos. PDF fictício da escala de cuidados foi gerado, com baixar/abrir/compartilhar acessíveis. Esta rodada não redesenhou o conteúdo dos PDFs nem testou leitores Android externos.
- Ampliação de texto/zoom não homologada: o atalho do navegador não alterou a escala e o controle da janela nativa não conseguiu ativá-la. Não apresentar o teste por largura como equivalente à ampliação de texto. Teclado, paisagem e áreas seguras em Samsung ainda exigem conferência física; nenhum APK foi instalado.

Capturas reais:
- [Desktop — Ponto](capturas/escritorio-profissional/ponto-1440.png)
- [Desktop — Tarefas e cardápio](capturas/escritorio-profissional/tarefas-1440.png)
- [Celular — Ponto](capturas/escritorio-profissional/ponto-390.png)
- [Celular — Tarefas](capturas/escritorio-profissional/tarefas-390.png)
- [Cadastro](capturas/escritorio-profissional/cadastro-390.png)
- [Login](capturas/escritorio-profissional/login-390.png)
- [Modal de produto](capturas/escritorio-profissional/modal-produto-360.png)
- [Folha](capturas/escritorio-profissional/folha-360.png)
- [Cuidados e ações PDF](capturas/escritorio-profissional/cuidados-pdf-390.png)

### Checks e consumo

Lint e `git diff --check` aprovados. Testes direcionados: **25 aprovados, 1 condicional ignorado, 0 falhas** (perfis, guardas web/nativo, datas/senhas/cardápio, calendário, etiquetas/farmácia, PDF e edição sem cuidados). Não repetida a suíte completa.

Build PWA aprovado (`npm run build`). Bundle Android reduzido aprovado (`vite build --mode mobile-release`): `edicao-build.json` informa `android-sem-cuidados`, `modulosSaude:0`, verificado. PWA mantém módulo Lembretes e sua exportação; Android mantém a substituição por LembretesGerais e o serviço culinário separado. Aviso pré-existente de import misto de pushNativo no PWA permanece, sem erro de build. Sem alteração do No Bolso, regras, contratos, fila ou dados reais nesta revisão.

**Consumo adicional da revisão visual: 0 consultas, escritas Firestore, chamadas Functions, listeners, polling ou serviços novos.** Nome e iniciais reutilizam sessão/perfil já disponível. Fonte local do sistema, SVGs no código, sem biblioteca/dependência nova. Fluxos visitados mantêm suas consultas sob demanda e custos anteriores; isso não significa custo zero do app.

Build nativo adicional concluído: `:app:assembleRelease`, com os guards e assinatura de upload existentes, sem nova chave. Primeira tentativa encontrou SDK ausente no ambiente; segunda usou `ANDROID_HOME=C:\Users\ander\AppData\Local\Android\Sdk` e JBR do Android Studio e passou. `apksigner verify` aprovado. APK local: `output/AP1303-escritorio-profissional-local.apk`, pacote `br.dev.acstech.ap1303`, versão 1.0.0/código 2, Firebase de produção, edição sem cuidados. SHA-256: `EE7CEF69E26687A6B3C35153BBD545E8AEE3ABE252BE4946EA91A2C59235A8EE`. É somente artefato para revisão local: não instalado, não enviado à Play, nenhum novo AAB gerado. Não instalar sobre a versão Play sem conferir assinatura e pendências; a chave de upload pode diferir da chave de distribuição. Warnings existentes de flatDir e recursos Gradle depreciados permanecem.

### Publicação autorizada — 29/10/2026: atalhos e textos do ponto

- Atalhos Escritório contábil/Ponto, ajustes e locais com SVG e texto, área de toque de 48px. Expandir/recolher ponto mantém a ação e informa aria-expanded. Atualizar produtos/Atualizar categorias são botões secundários com ícone de atualização, sem adicionar consultas. Texto sobre autoria das batidas retirado; seletor e autorização permanecem. Legenda Brasília · UTC−3 retirada do relógio, sem alterar cálculo/fuso.
- Artefato publicado isoladamente em `output/visual-publicacao`, partindo das fontes da Central já publicada e aplicando o visual. Preservados os contratos publicados de folha, exportação de cuidados, importação e pratos. Vales parcelados/PDF alterado e novo arquivamento de pratos continuam locais nesta publicação: exigem rodada funcional própria, não foi feito deploy de backend. Fontes de trabalho completas preservadas.
- Lint do projeto e das fontes efetivas de publicação aprovados; 9 testes direcionados aprovados. Builds web e Android reduzido aprovados; `assembleRelease` e `apksigner verify` aprovados. Avisos anteriores de import misto pushNativo/flatDir/Gradle permanecem.
- Netlify site **ponto1303**, `cf66ee21-9935-4013-8043-1471c62694e7`; Firebase configurado **ponto-app-1c55a**. Deploy frontend **6ae359b5d380b67e9d3d302f**, production/ready, https://ponto.acstech.dev.br. Nenhuma Function/regra/índice implantado. Rotas /ponto, /tarefas, /admin, /lista-compras/catalogo e /lembretes HTTP200; shell manifesto **f4cf107a2a5d08de346c**, JS/CSS conferidos byte a byte. Ponto publicado abriu sem a legenda/aviso removidos, em leitura, sem marcar ponto ou alterar dados.
- Captura fictícia dos botões: [Gestão com ícones](capturas/escritorio-profissional/atalhos-gestao-publicacao.png). Formas, avisos offline, cuidados PWA e restrições Android preservados. Não houve limpeza de storage/filas, commit ou push.
- APK: `output/AP1303-visual-atualizado-2026-10-29.apk`, 5.980.307 bytes; SHA-256 **B6B6D751942222957F0F6A28A3F8B098457F4F67A87E080D90DBE6948FA2378F**. Release local, assinatura de upload existente, br.dev.acstech.ap1303 / 1.0.0 / código2, Firebase produção, edição sem cuidados. Nenhuma instalação/Play/nova chave/AAB. Validação física pendente; assinatura de upload não garante atualização direta sobre pacote distribuído pela Play.

## Revisão local final — 30-10-2026

Sem publicação, deploy, instalação, Play, commit ou push. Alterações anteriores preservadas.

### Comparação com a referência e checklist

| Item | Estado | Evidência e limite |
| --- | --- | --- |
| Azul-marinho, superfícies claras e hierarquia | Concluído nas telas inspecionadas | Comparada a imagem aprovada com Gestão desktop, Tarefas/cardápio celular, Ponto tablet, compras e Escritório contábil. Mantidos tokens, fontes do sistema e navegação existente. Não foi criado um novo dashboard nem reproduzidos dados/fotos ilustrativos da referência. |
| Ícones | Parcial | Navegação, botões, painel, categoria e estados usam SVG. Retirados emojis das opções de categoria na revisão da nota e triângulos do botão de usuários. Identificadores/customização de ícones existentes preservados. Não se declara revisão de todos os textos e estados internos. |
| Formulários, tabelas, modais e telas internas | Parcial | Inspecionados formulário manual de preço, revisão de nota, Gestão, Conta, Tarefas e entrada do Escritório. Estilo compartilhado preservado; não foram abertos todos os formulários contábeis, PDFs ou combinações possíveis. |
| Foto real de perfil | Pendente/bloqueada | Iniciais funcionam. Upload, troca, remoção, referência privada e integração da imagem à exclusão NÃO existem. Não há serviço/regras de armazenamento privado configurados em firebase.json. Campo legado fotoUrl não comprova privacidade ou upload. Não houve provisionamento, cobrança, URL pública ou base64 de perfil. Requer armazenamento privado autorizado, regras por usuário/grupo e ciclo seguro de substituição/exclusão. |
| Zoom Android | Parcial | MainActivity desabilita supportZoom, builtInZoomControls e displayZoomControls somente na WebView. Não altera textZoom/fontScale, metatag do PWA, orientação ou interceptação de toque/rolagem. Compilação nativa aprovada; pinça, duplo toque, teclado e fonte ampliada ainda sem ensaio físico. |
| Painel de notificações | Concluído no navegador | Componente real em dialog modal: até 680px desktop/tablet, margens de 12px no celular, altura disponível com safe areas, rolagem somente na lista, título/ações fixos, ícone SVG, mensagem e data. Testados vazio e 30 avisos longos. Fechar por botão, Escape e toque externo; foco devolvido ao botão de origem. Integração do sino em Ponto testada. Mesmos dados/ações/listener existentes; sem nova paginação ou consulta. |
| Abertura | Parcial | Ícone oficial icon-192 estático; somente SVG do relógio gira. Confirmado no DOM: marca animation none, relógio ap1303-relogio. Sem espera artificial, consulta ou timer de rede. Ação de reabrir disponível sem limpar pendências. CSS reduz movimento e pausa relógio ao receber evento offline. Boundary existente interrompe carregamento em erro de renderização. A splash nativa não foi prolongada nem recebeu outra animação. Offline real, preferência de movimento reduzido e transição splash/WebView não homologados fisicamente. |
| Conclusão na importação | Concluído localmente | Nome, quantidade/preço e requisitos locais conferidos antes de habilitar confirmação por item. Selecionar produto ou preencher campo não conclui. Assinatura transitória em memória invalida ao editar, inclusive linhas fiscais repetidas afetadas; não há campo persistido novo. Verde suave, borda, SVG e “Concluído na revisão”, com “Aguardando envio da compra. Ainda não salvo.”. Durante envio: “Aguardando envio”, sem aparência de sucesso definitivo. Confirmação global continua usando servidor e contrato atuais. |
| Conclusão manual/salva | Concluído localmente | Derivada de comprado e campos obrigatórios válidos, somente após resposta existente/snapshot. Sem preço não conclui. Identificação transitória da operação em andamento retira verde e mostra espera. Edição por modal, erro de preço e repetição preservaram quantidade/marca; preço obrigatório vazio impediu gravar. Opacidade do card = 1; nenhuma reordenação ou mudança de status de negócio para estilização. |
| PWA completo/Android reduzido | Concluído no build, parcial físico | Cuidados permanecem no PWA, rota Lembretes inspecionada inicialmente; build Android confirmou modulosSaude:0. No Bolso e contratos não modificados. |

### Testes e capturas realmente realizados

- 20 testes unitários dirigidos (5 de estados por categoria, 15 de cupom/revisão), lint completo e builds PWA/mobile-release aprovados.
- Integração de entrada manual e importação nas cinco categorias: servidor recusou dados inválidos, preservou ausência de escrita parcial e confirmou entradas válidas; edição posterior retirou conclusão. Tudo em projeto demo isolado. Estado de espera/falha também coberto pelos helpers; interface interativa exercitada em Supermercado, não em todas as cinco categorias.
- Chrome local com emuladores Auth/Firestore/Functions demo-ap1303: revisão de nota de 3 linhas, conferência explícita, exclusão de campo obrigatório, sinalização aguardando envio e compra importada finalizada; entrada manual inválida, correção, gravação e edição posterior. Nenhuma conta/compra real usada.
- Painel testado em viewport celular 390x844 (também 312x675), tablet 768x1024 e desktop 1536x695; painel 680px no desktop/tablet, dimensões dentro da tela e rolagem interna. Tarefas celular: clientWidth=scrollWidth=375, sem estouro horizontal. Gestão/Escritório vistos em 1280x900. Não se declara que todo fluxo foi testado em toda resolução.
- Revisão visual feita com a skill computer-use. Ao tentar iniciar o ensaio offline com ferramentas do navegador, a automação foi interrompida por não conseguir confirmar a página ativa. Nenhuma ação de desligar rede foi confirmada; teste offline permanece pendente. Não se alterou configuração de movimento do sistema. Não houve instalação no Samsung, por restrição desta rodada; teclado, zoom e fonte do Android permanecem pendentes.
- Capturas reais em capturas/visual-final-2026-10-30/: notificacoes-desktop.png, notificacoes-tablet.png, notificacoes-celular.png, notificacoes-vazio.png, ponto-painel-real-tablet.png, abertura.png, tarefas-celular.png, gestao-desktop.png, financeiro-desktop.png, cuidados-pwa-desktop.png (estado inicial), conta-desktop.png, importacao-conferida-celular.png, compra-importada-concluida.png, manual-falha-preserva-campos.png e manual-concluido-celular.png. Algumas capturas isolam componentes reais com fixtures locais, identificadas na própria tela; não são mockups nem homologação física.

### Arquivos e custos

Novos componentes PainelNotificacoes e EstadoConclusaoCompra, estilos painel-notificacoes.css e helper conclusaoCompra.js; integração em Ponto, ComprasModulo e ImportarCupom. Atualizados carregamento, Admin (SVG de expansão), compras.css e MainActivity. Testes conclusao-compra.test.js e visual-compras-emulador.test.cjs.

Nenhuma leitura/escrita Firestore, Function, listener, polling ou serviço adicional para os efeitos visuais. Referências e ações existentes reutilizadas. Ícone de abertura é asset estático local/cache; pode ter uma requisição de arquivo se ausente no cache do PWA. Escritas de QA ocorreram somente nos emuladores. Fotos não geram consumo novo porque não foram implementadas. Sem novas dependências.

Documentação Android consultada: https://developer.android.com/reference/android/webkit/WebSettings (supportZoom/builtInZoomControls), e implementação Capacitor 8.5.3 instalada (Bridge.java), sem setTextZoom/fontScale novo.

### Artefato de revisão local

Build Android assembleRelease aprovado, assinatura existente verificada por apksigner. APK: output/AP1303-visual-final-local-2026-10-30.apk, 5.976.235 bytes. SHA-256: 5A88CF3C711BDD40B269C27BF8B3E4F561552B5F15419ED08D4077B71D18FD5E. Pacote br.dev.acstech.ap1303, 1.0.0/código2, Firebase produção ponto-app-1c55a, edição sem cuidados. Não instalado e não enviado; assinatura de upload não comprova compatibilidade com versão Play. Warnings já existentes de import misto pushNativo, flatDir e Gradle depreciado permanecem. A geração do APK não resolve as pendências de foto ou homologação física.

### Publicação posterior autorizada — 30-10-2026

Publicado somente frontend no site Netlify ponto1303 (cf66ee21-9935-4013-8043-1471c62694e7), https://ponto.acstech.dev.br. Deploy 6ae4f775e732a2fe090887c9, ready; shell ece4bc177ffcc3bf3c25. Build de produção e cinco testes de conclusão por categoria rechecados; lint, integração e build Android aprovados na preparação anterior. Rotas /ponto, /lista-compras/catalogo, /tarefas, /lembretes, /admin e /conta HTTP200 com shell atual; manifesto e sete arquivos JS/CSS conferidos byte a byte.

Sem deploy de backend, regras ou índices; sem dados alterados, instalação, Play, commit ou push. APK local AP1303-visual-final-local-2026-10-30.apk permanece disponível e não instalado. Zoom Android depende desse APK, não da publicação PWA; zoom do navegador preservado. Permanecem os bloqueios e limitações do checklist (foto privada, offline/movimento reduzido e homologação física), sem declarar conclusão integral.

### Foto privada, logo no acesso e zoom do PWA instalado — 30-10-2026

Esta rodada substitui a pendência anterior de foto: Minha conta agora oferece seleção do dispositivo, prévia, salvar, trocar e remover. JPEG/PNG/WebP são conferidos por assinatura e decodificados, reduzidos a 192px/24KB e reencodificados sem EXIF. A miniatura binária fica em fotosPerfis/{uid}, separada do perfil, sem URL pública nem base64 persistido no usuário. Callable exige sessão e grupo; somente o titular altera, titular/administrador do grupo consultam. Remoção da conta e exclusão administrativa removem o arquivo e referência correspondente. Sem Storage provisionado, dependência ou serviço novo.

Consumo estimado, não medido em faturamento: consulta sem cache até 6 leituras/1 callable; salvar/remover até 7 leituras e 2–3 escritas/1 callable. Referência e versão reutilizam perfil carregado. Cache em memória deduplica consultas e é limpo na troca de sessão; sem listener adicional, polling ou leitura por renderização. Documento binário limitado a 24KB/pessoa. Não se promete gratuidade.

Login /ponto e Login exibem o ícone oficial. Captura: capturas/foto-zoom/login-logo.png. Editor de foto foi inspecionado no navegador. Seleção automatizada de arquivo bloqueada pela extensão (acesso a arquivos locais desativado); não alteramos permissões da extensão. Upload completo pelo seletor e uso no iPhone ainda precisam de conferência física.

PWA instalado (display-mode standalone ou navigator.standalone) recebe viewport e bloqueio de gestos de pinça; navegador normal conserva zoom. Rolagem de um dedo e configuração de fonte do sistema preservadas. APK mantém WebSettings já existente. Testes simulados não comprovam comportamento no iPhone real: fechar/reabrir o PWA e conferir. Nenhum dado/pendência é apagado.

Validação: lint e build PWA aprovados; build web Android reduzido aprovado, sem cuidados. Dois testes de interação instalada; dois de foto/autorizações no emulador; onze de exclusão/recuperação aprovados. Segurança: sem edição de foto alheia, sem leitura entre grupos; exclusão própria e administrativa verificadas com dados fictícios. Nenhum APK instalado ou envio à Play nesta rodada. O APK visual anterior não contém estes novos ajustes.

Deploy seletivo necessário: contaOperacao, processarExclusaoConta e excluirUsuario, em ponto-app-1c55a (contaOperacao/excluirUsuario em us-central1; processarExclusaoConta em southamerica-east1); frontend ponto1303. Sem regras/índices, IAM ou outras Functions alterados pela publicação desta rodada. Página de privacidade descreve a miniatura opcional e privada.


Resultado da publicação: três Functions atualizadas com sucesso (contaOperacao e excluirUsuario/us-central1; processarExclusaoConta/southamerica-east1). Consulta de foto sem autenticação em produção: HTTP401 UNAUTHENTICATED, sem escrita. Netlify deploy 6ae4fdb39aadcaf3afed527e, ready/publicado em https://ponto.acstech.dev.br. Rotas /ponto, /conta, /lembretes, /tarefas e /lista-compras/catalogo HTTP200 com shell igual ao build local; ícone e manifesto HTTP200; parágrafo de foto na privacidade conferido. Nenhuma foto/conta real usada na homologação. iPhone instalado e seletor físico de fotos continuam pendentes. Sem Play, instalação, commit ou push.


## Diagnóstico e correção local de foto de perfil — 03/11/2026

Relato do titular: em celulares o seletor abre, a imagem aparece na prévia e, após tocar em Salvar foto, não há confirmação nem alteração aparente. Não foi usada conta ou foto real para reproduzir.

### Evidências e limites do diagnóstico

A callable contaOperacao de ponto-app-1c55a está ACTIVE; fonte implantada em 30/10/2026. Os arquivos foto-perfil.cjs e conta.cjs implantados foram comparados com os locais e eram idênticos. O arquivo temporário de fonte foi removido após a comparação. A consulta de logs operacionais não encontrou entradas ERROR no período; uma chamada POST recente retornou HTTP400. Foram vistos somente data/status, sem corpo, UID, foto ou perfil. HTTP400 é compatível com rejeição de entrada, mas não identifica a ação nem prova o motivo do problema no celular.

O salvamento, troca, leitura privada, remoção, exclusão e isolamento passaram no emulador. Um caso concreto reproduzido: JPEG válido com segmento EXIF aparece como imagem, mas é rejeitado pela validação privada do servidor. Não foi possível comprovar que esse é o arquivo gerado pelos aparelhos do titular. A causa exata no aparelho real permanece pendente; não se anuncia homologação física ou diagnóstico definitivo.

### Correções

- O JPEG produzido pelo canvas é normalizado antes de virar prévia: remove APP1–APP15 e comentários e normaliza marcadores de cabeçalho, preservando os dados da imagem. Resultado confirmado pela mesma validação estrita do servidor. Limites de 192px/24KB e privacidade foram preservados. Fallback inesperado do encoder para outro formato agora gera erro explícito antes da prévia. Sem dependência nova.
- Operações de foto usam a callable existente com prazo de 25s, verificação de conta/grupo/geração de sessão antes/depois da resposta e rejeição de resposta sem confirmação. Offline e timeout têm mensagens acionáveis, preservando a prévia. Timeout significa resultado ainda não confirmado; não promete que o servidor deixou de processar. Não há retry automático nem novo listener/polling.
- Após sucesso confirmado, a foto própria entra no cache da versão retornada, e o editor mantém a imagem enquanto o perfil existente sincroniza. Evita desaparecer imediatamente para iniciais. Versões posteriores do perfil prevalecem sobre esse estado transitório. Cache e respostas tardias são invalidados ao sair/trocar contexto.
- Editor distingue Foto atual e Nova foto selecionada, informa que a prévia ainda não está salva, destaca Salvar foto no perfil, mostra progresso e posiciona sucesso/erro perto da foto. Bloqueia toques repetidos e evita aplicar resultado de edição na conta seguinte. Todas as ações têm type=button.

### Validação local

13 testes aprovados nos emuladores/cliente, sem falhas ou skips: normalização/rejeição de JPEG, gravação de foto normalizada no Firestore emulado, permissões, remoção/exclusão, confirmação, timeout/offline, cache e trocas de contexto. A checagem final do cliente repete os cinco testes focados após a última proteção de leitura do cache.

Prévia com componente real, seletor normal e imagem sintética azul: seleção e processamento, falha controlada com prévia preservada, repetição bem-sucedida com resposta validada no servidor local e foto atualizada, remoção confirmada. Serviços da prévia usam somente memória local; persistência/autorização reais foram verificadas separadamente no emulador. Captura: capturas/foto-correcao/salva-mobile.png. Teste em viewport 390×844 não substitui teste físico em iPhone/Android.

Evidências: output/foto-perfil-correcao-integracao.log, foto-perfil-client-final.log, foto-perfil-correcao-lint-final.log, foto-perfil-correcao-pwa-final.log e foto-perfil-correcao-android-final.log. Consulta operacional resumida: foto-perfil-logs-resumidos.log e foto-perfil-requests-resumidos.log.

Somente alterações locais nesta rodada; sem publicação PWA/Functions, novo APK assinado, instalação, Play, commit/push, infraestrutura ou escrita em perfis reais. A evolução de feedback dos lembretes da rodada anterior continua local e preservada. Uma publicação posterior do frontend incluirá ambos os ajustes. Não é necessária alteração da função ou das regras para esta correção de foto.

### Publicação posterior das correções de foto e fotos nas interações

As correções de foto anteriormente locais foram incluídas na rodada de fotos nas interações: PWA deploy 6aea68557caa17083ed2ab5c ready em 03/11/2026 às 20:04 (UTC−3), e APK output/Ta-no-Ponto-fotos-interacoes-2026-11-03.apk, SHA-256 2C470DDE4B9F90B01D58DD24C2B56954CECE6AF333D0DFD02BB478FB7375B5E2. Detalhes de permissões contextuais, testes e entrega em lembretes-gerais-usuarios.md, seção Fotos nas interações. A prévia com seletor e imagens sintéticas passou, mas a causa exata no aparelho real do titular continua sem confirmação. Sem instalação/Play/contas reais.
