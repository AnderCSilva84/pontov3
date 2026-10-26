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
