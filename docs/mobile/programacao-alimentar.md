# Programação alimentar em Prato do dia

Implementação local em 04/11/2026, usando a foto fornecida como referência de organização por refeição e horário. Nenhum plano nutricional foi prescrito ou transcrito automaticamente da foto. As sugestões e quantidades são preenchidas pelo administrador.

## Uso

Em Tarefas → Cardápio do dia e programação, a seção **Programação alimentar** permite criar um plano com 1 a 12 refeições. O formulário começa com seis linhas editáveis: café da manhã, lanche da manhã, almoço, lanche da tarde, jantar e ceia. Os horários também são editáveis. Cada sugestão aceita até 240 caracteres, para caber inteira no corpo da notificação.

Destinatários: todos os integrantes ativos ou uma seleção de 1 a 200 pessoas do grupo, incluindo administradores, funcionários e consulta. “Todos” é resolvido no momento do envio, abrangendo novos integrantes ativos. Fora do modo global, somente os selecionados recebem os avisos. Administradores gerenciam os planos; os demais consultam os destinados a eles. A visualização de hoje respeita início, término e dias escolhidos.

Repetição diária, semanal ou em uma data; término opcional. A lista mostra horário, nome da refeição e sugestão, em ordem cronológica. A edição preserva IDs das refeições. Arquivar preserva o plano, mas cancela atomicamente os próximos disparos. Nesta etapa não há interface de recuperação de planos arquivados.

## Entrega dos avisos

Reutiliza `lembretesOperacao` e o Scheduler existente `dispararLembretes`, sem novo agendamento. O plano fica na coleção do grupo `planosAlimentares` e cada refeição corresponde a um documento de `lembretes` com `dominio:alimentacao`. O processamento usa a consulta existente por próximo disparo, limitada a 100 documentos, reserva transacional de 90 segundos, identificador de evento estável e os recibos de deduplicação do envio já existente. Falhas parciais podem ser repetidas; avisos com mais de 15 minutos não são enviados retroativamente. Próximas ocorrências usam UTC−3 e respeitam o término do plano.

Ao salvar/editar/arquivar, plano e respectivos avisos mudam na mesma transação. Versão previne sobrescrita concorrente; identificador da tentativa e assinatura previnem duplicação após resposta incerta. Alvos são validados no grupo no servidor e contas inativas são excluídas no envio. Comandos de cuidados e lembretes gerais não gerenciam os novos avisos.

Push web mostra a refeição e sugestão e abre `/tarefas`. No Android, somente a categoria alimentação, na rota `/tarefas`, recebe título e corpo no payload e usa texto expandido. Outros avisos nativos continuam com seu conteúdo genérico, e cuidados continuam excluídos da edição reduzida. A interface em primeiro plano também mostra a refeição. Cada destinatário deve ativar avisos em seu próprio aparelho; no iPhone, usar o PWA instalado. O sistema operacional controla permissão e exibição, inclusive na tela bloqueada. Não se trata de alarme exato: o agendamento existente executa por minuto e a entrega depende do serviço push e do aparelho.

## Consumo e limites

Consulta de até 21 planos ativos (limite de 20 por grupo), sem listener ou polling adicional. Seleção de integrantes reutiliza `geralPessoas`, até 200 contas. Salvar grava o plano e até 12 avisos; edição pode cancelar refeições removidas. A entrega lê apenas refeições vencidas e destinatários do grupo. Não há migração de dados, novo serviço pago, bucket, índice composto ou Scheduler.

## Validação e situação

Testes de domínio e calendário, contrato push, seleção de destinatários, grupos, replay, alteração de plano, cancelamento, falha parcial e supressão de notificações antigas. Integração executada com dados fictícios, junto às regressões de pratos e cuidados. Lint, build PWA, build da edição Android sem módulos de cuidados e testes Java executados. Evidências em `output/alimentacao-*.log`.

Resultados finais: 15 testes locais aprovados, 17 testes de integração/regressão aprovados e reexecução direcionada da integração alimentar aprovada após o ajuste de cancelamento. Os 8 testes Java passaram. O build Android em `output/alimentacao-android-build` confirmou `modulosSaude:0`; é um build de verificação, sem atualização dos APKs distribuídos. Builds PWA e Android e lint finais aprovados.

Conferência visual na tela real com serviço fictício: cadastro para duas pessoas, edição para todos, dias da semana e preservação do conteúdo. Largura 390 px, sem rolagem horizontal. Capturas em `capturas/alimentacao/programacao-390.png` e `capturas/alimentacao/todos-semanal-390.png`.

Não publicado nesta rodada. Sem notificações a usuários reais, alteração de dieta real, instalação de APK, Play, commit ou push. Para publicar, atualizar `lembretesOperacao`, `dispararLembretes` e o PWA; o Android precisa de novo APK para incluir o texto expandido e abrir a nova rota. As mudanças de contrato push também são usadas pelo processo agendado implantado. Aprovação de publicação segue o roteiro inicial do usuário.

## Fotos dos destinatários — complemento antes da publicação

A programação mostra as fotos de perfil e os nomes de quem a receberá, acima da lista de refeições. Para várias pessoas, cada uma tem sua identificação; no modo global, aparecem os integrantes ativos atuais. Sem foto ou em caso de falha na imagem, o componente existente apresenta iniciais.

`alimentacaoListar` aceita `fotosInteracoes:true`, aproveitando o mesmo serviço privado de miniaturas das interações. Somente destinatários dos planos previamente autorizados são resolvidos; a resposta deduplica pessoas entre planos e não repete foto por refeição. As fotos não são copiadas para o plano ou para o push. A versão atual do perfil é consultada ao carregar, refletindo alterações posteriores sem reeditar a programação. Não foi criado listener por pessoa nem chamada individual pelo avatar.

Validação: 7 testes de integração de alimentação/fotos aprovados, lint e builds PWA e Android reduzido aprovados. A integração alimentar inclui ainda o caso de integrante do mesmo grupo sem programação, que recebe lista vazia e nenhuma foto. Conferência visual em 390 px: dois avatares ilustrativos carregados e iniciais para o terceiro destinatário; edição para uma única pessoa mostra apenas sua foto e nome, sem rolagem horizontal. Evidências em `output/alimentacao-fotos-*.log`; capturas `capturas/alimentacao-fotos/grupo-390.png` e `individual-390.png`. As capturas usam imagens ilustrativas e contas fictícias. Complemento ainda não publicado.

## Foto de cada refeição por URL

Cada refeição aceita `imagemUrl` opcional. O administrador pode colar o endereço HTTPS direto de uma imagem pública, ver a prévia, substituir ou remover a foto. A imagem aparece junto da sugestão no card da refeição, inclusive na visão de hoje. Links inválidos e destinos locais/IPs são recusados pelo validador existente de receitas. O servidor armazena somente a URL, sem baixar o arquivo, criar bucket ou buscar páginas. A disponibilidade da imagem depende do site de origem; uma página HTML ou bloqueio de acesso externo gera orientação na interface, sem esconder o texto da refeição.

O carregamento usa imagem com descrição acessível, lazy loading e política sem envio de referrer. A prévia só é solicitada ao clicar no botão, sem requisições a cada tecla; clicar novamente permite tentar carregar de novo. Planos sem foto continuam válidos. Remover salva a URL vazia. As fotos não são acrescentadas ao payload push: o aviso continua com o nome e as orientações da refeição, abrindo a programação.

Validação local: 4 testes de domínio/calendário e a integração alimentar aprovados, incluindo URL válida, protocolo/destino inválido, persistência e remoção. Lint e builds PWA/Android reduzido aprovados. Conferência da interface em 390 px: prévia, imagem salva, reedição, remoção e imagem indisponível. A demonstração substitui URLs de example.com por ilustração local, sem chamadas externas nem contas reais. Captura `capturas/alimentacao-url/refeicao-390.png`; evidências em `output/alimentacao-url-*.log`. Alteração ainda não publicada.

## Publicação autorizada — 04/11/2026

Após autorização do usuário (“Amos publicar”), a programação alimentar, as fotos dos destinatários e a foto de cada refeição por URL foram publicadas no PWA e no servidor. Esta seção substitui a situação de publicação pendente registrada acima.

- Firebase explícito `ponto-app-1c55a`, somente funções existentes: `lembretesOperacao` ACTIVE, revisão `lembretesoperacao-00018-sin`, atualizada às 21:49:09 UTC; `dispararLembretes` ACTIVE, revisão `dispararlembretes-00014-roc`, atualizada às 21:49:17 UTC. Nenhum novo Scheduler.
- Netlify existente `cf66ee21-9935-4013-8043-1471c62694e7`, deploy `6aeba88a31a6b3ddc77c01e8`, ready/publicado às 21:50:25 UTC (18:50 UTC−3). Endereço: https://ponto.acstech.dev.br.
- Verificação pública: 8 rotas e 22 arquivos iguais ao build local, incluindo Tarefas, scripts principais, worker e manifesto do shell. Callable de alimentação sem login recusada com 401. Sem acesso ou alteração de planos de usuários reais.
- APK assinado gerado em `output/Ta-no-Ponto-programacao-alimentar-2026-11-04.apk`, 10.344.789 bytes. SHA-256 `21BDB3403335C90601AAD497A0DB270F91EF87EAD1B2E1D1AF6DEB550C60BB45`. Assinatura verificada com apksigner; 51 arquivos internos conferidos contra o build Android. Pacote `br.dev.acstech.ap1303`, versão 1.0.0/código 2, minSdk24/targetSdk36, destino produção sem emuladores. Edição reduzida confirmou `modulosSaude:0`.

Build release concluído com a assinatura existente, sem criar chave, instalar APK ou enviar à Play. Não houve commit/push, migração de dados reais ou teste físico de recebimento no celular. Evidências em `output/alimentacao-publicacao-*`.

## Linhas de alimentos e coluna CHO — prévia local, não publicada

A pedido do usuário, cada refeição passa a ter uma tabela com **Alimento / opção** e **CHO (g)**. O editor permite adicionar e remover linhas, mantendo pelo menos uma e até 20 por refeição. CHO é opcional, aceita zero e até duas casas decimais, com vírgula ou ponto na entrada; valores vazios aparecem como traço, e a exibição usa vírgula decimal. O valor é informado pelo usuário: não há estimativa nutricional nem soma automática de alternativas.

O modelo armazena `opcoes:[{id,descricao,choGramas}]`, preservando ordem e identificadores das linhas. O servidor valida limites e valores antes da transação. O campo anterior `sugestao` continua como resumo de até 240 caracteres para notificações, incluindo o CHO preenchido. As linhas completas ficam preservadas no plano, mesmo quando o resumo precisa ser abreviado. Um cliente antigo que tentar modificar somente o texto de uma refeição estruturada recebe orientação para atualizar, evitando ignorar silenciosamente a edição.

Ao editar uma refeição anterior, o texto existente entra na primeira linha, com CHO em branco. Fotos, destinatários, datas e agendamento continuam preservados. Não houve alteração de dados reais. A consulta mostra a tabela dentro de um bloco de refeição com horário e nome destacados.

Validação: 6 testes de domínio/calendário e integração alimentar aprovados, incluindo persistência, remoção, replay, zero, decimais, ausência de CHO, limites, texto anterior e resumo de notificação. Lint e builds PWA/Android reduzido aprovados. A interface foi conferida em 390 px: adição de quarta linha com 12,75 g, gravação e remoção, sem rolagem horizontal. Capturas em `capturas/alimentacao-linhas/`; dados e valores CHO da demonstração são fictícios.

Esta rodada permanece **somente local**, conforme pedido expresso: nenhum deploy, APK distribuído, instalação, Play, commit ou push. Builds de verificação ficam em `output/alimentacao-linhas-*`. A prévia usa `http://127.0.0.1:5199/output/alimentacao-linhas-preview.html`, com serviço fictício e sem contas reais.

## Link de página no campo da foto — correção local

O usuário informou erro com `https://panelinha.com.br/blog/fleury/post/dicas-para-comecar-o-dia-bem`. A página retorna HTML, e o campo anterior usava esse endereço diretamente em uma imagem. O resolvedor já existente do servidor encontrou `https://i.panelinha.com.br/i1/228-bk-7824-blog-ayu1111.webp`; a imagem respondeu HTTP 200, MIME image/webp, 57.580 bytes. Não foi necessário alterar o backend ou criar serviço.

O campo agora aceita **link da foto ou da página** e oferece **Buscar foto**. Primeiro testa a imagem diretamente; se não abrir, chama `buscarImagemReceita` para extrair a imagem pública da página e confere seu carregamento no navegador. Somente a URL da imagem carregada é aplicada ao plano. Nenhuma requisição acontece a cada tecla. A consulta tem limite de tempo e cancelamento ao sair/remover a refeição. Durante a busca o salvamento fica suspenso; links editados ainda não aplicados bloqueiam o envio do formulário. A foto anterior permanece disponível se a busca falhar, com ação para mantê-la.

O processo reutiliza HTTPS público, restrições de endereços privados, DNS e redirecionamentos do buscador existente. Não promete abrir páginas protegidas, privadas ou hosts que bloqueiem imagens externas. Não há proxy de imagens, armazenamento adicional ou nova infraestrutura. Notificações e destinatários permanecem inalterados.

Validação: 15 testes locais (fluxo de imagem, receitas e alimentação) aprovados; lint e builds PWA/Android reduzido aprovados. O resolvedor real foi exercitado no endereço público enviado. Na interface real, o teste local usou a resposta de metadados previamente verificada e carregou a imagem verdadeira do Panelinha, com dados fictícios de programação e sem conta real. Conferiu o bloqueio de salvamento do link pendente e a preservação da imagem anterior. Evidências em `output/alimentacao-busca-foto-*`; captura em `capturas/alimentacao-busca-foto/`.

Mudança ainda **não publicada**, mantendo a solicitação de prévia local da rodada anterior. O link direto da imagem é utilizável no campo já publicado, antes de liberar a melhoria do buscador.

## Publicação de linhas, CHO e busca de foto — 04/11/2026

Autorizada pelo usuário após a revisão (“Perfeito! Vamos publicar”). As prévias de linhas de alimentos/CHO e de busca de foto a partir de páginas passam a estar publicadas; esta seção substitui a pendência registrada nas duas seções anteriores.

- Firebase explícito `ponto-app-1c55a`: somente `lembretesOperacao` atualizada, ACTIVE, revisão `lembretesoperacao-00019-tus`, às 22:22:48 UTC. O Scheduler existente já usa o resumo salvo da refeição e não precisou de nova publicação.
- PWA no site existente `cf66ee21-9935-4013-8043-1471c62694e7`: deploy `6aebb059fba52cb224a9ab45`, ready/publicado às 22:23:45 UTC (19:23 UTC−3), https://ponto.acstech.dev.br. Conferidos 8 caminhos e 22 arquivos contra o build local; callable sem login recusada com 401.
- APK `output/Ta-no-Ponto-refeicoes-CHO-fotos-2026-11-04.apk`, 10.346.829 bytes, SHA-256 `9ACEF6A699A90BFDCC084C8725B2C889A0BC5DFFB204015C9B47065A09253F2C`. Assinatura existente verificada, 51 arquivos internos iguais ao build Android. Pacote `br.dev.acstech.ap1303`, 1.0.0/código2, minSdk24/targetSdk36; destino produção, sem emuladores, edição reduzida com `modulosSaude:0`.

Lint/builds e testes direcionados anteriores aprovados; build release final concluído e artefato conferido. Sem instalação de APK, envio à Play, migração ou modificação de planos reais, commit/push, nova infraestrutura ou teste físico de recebimento. Evidências em `output/alimentacao-foto-cho-*`.
