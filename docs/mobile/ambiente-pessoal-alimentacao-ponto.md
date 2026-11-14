# Ambiente pessoal e acompanhamento de ponto — 05/11/2026

Implementação local, ainda não publicada.

## Escopo confirmado
A limitação do administrador aplica-se somente à tela de ponto da funcionária. Gestão, lembretes e permissões gerais permanecem como estavam.

- Nova rota autenticada `/alimentacao`, acessível por administradores, funcionários e usuários de consulta, sem depender de vínculo de ponto.
- A visão inicial mostra apenas planos atribuídos ao usuário conectado ou a todos. Administradores têm também “Criadas por mim”. A filtragem é feita no backend usando `visao`; chamadas antigas sem essa opção preservam a autorização anterior.
- Programação alimentar removida do ponto e do contêiner de pratos/receitas. Receitas existentes permanecem em Tarefas.
- Novas notificações alimentares abrem `/alimentacao`. Android reconhece também notificações antigas de alimentação para `/tarefas` e as encaminha à nova rota.
- No ponto, administrador seleciona explicitamente uma pessoa e consulta somente marcações e totais de horas (hoje, semana, mês e banco de horas). Rotina, tarefas, alimentação e ações de registro não são montadas nesse acompanhamento. Listeners de tarefas e notificações da rotina ficam restritos ao funcionário.
- Navegação mobile permite rolar horizontalmente quando há muitos atalhos, mantendo seus nomes inteiros.

## Validação
22 testes de rotas, contrato push, Android JS, calendário e worker passaram. Integração de alimentação e pratos: 2 testes passaram com Firestore/Auth emuladores, incluindo isolamento das visões e notificações. ESLint e builds web/mobile passaram. Gradle `:app:testDebugUnitTest`: BUILD SUCCESSFUL.

Tela de acompanhamento verificada em navegador desktop e viewport 390×844, com dados fictícios. Captura em `capturas/ambiente-pessoal/ponto-admin-mobile.png`. Essa prévia valida apresentação, não constitui teste com contas reais. Nenhum dado real alterado, notificação real enviada ou publicação realizada.

## Escala semanal clicável
Adicionada a escala cadastrada por dia no acompanhamento do administrador. Ao selecionar um dia, consulta somente as marcações da data correspondente na semana atual (domingo a sábado, preservando o padrão da escala existente). Mostra entrada, saída para intervalo, retorno e saída final; dias sem registros e erros têm estados explícitos. Ao trocar funcionária/data, o componente é remontado e respostas de consultas antigas são ignoradas. Consulta sob demanda, sem novo listener ou gravação.

Validação: ESLint e build web aprovados. Na prévia fictícia, clique em quinta exibiu 05/11/2026 e suas quatro marcações; segunda exibiu 02/11/2026 sem interações. Captura `capturas/ambiente-pessoal/escala-log.png`. Não publicado.

## CHO por alimento ou total da refeição — 05/11/2026
Cada refeição possui seletor “Como informar o CHO?”: por linha (padrão para cadastros existentes) ou total da refeição. No modo total, editor oculta os CHOs individuais e apresenta campo manual no final; consulta oculta a coluna e mostra rodapé com o total. Alternar modos preserva os valores de ambos. Não soma alternativas nem calcula informação nutricional.

Backend valida `choModo` e `choTotalGramas` (opcional, 0 a 10.000 g, até duas casas decimais), persiste e devolve os campos. Resumo de notificação usa somente o modo escolhido e reserva espaço para o total mesmo com descrição longa. Clientes antigos são impedidos de sobrescrever planos que contêm CHO total, evitando perda silenciosa.

Validação: 5 testes unitários passaram; integração com emulador passou (salvar, replay idempotente, leitura do destinatário, resumo do lembrete, preservação dos valores e bloqueio de cliente antigo). ESLint e build web aprovados. Editor e consulta conferidos no navegador com dados fictícios; captura `capturas/ambiente-pessoal/cho-total-editor.png`. Não publicado.

## Publicação autorizada — 05/11/2026
Após autorização “Vamos publicar”, as alterações desta rodada foram publicadas. Esta seção substitui as indicações anteriores de implementação somente local.

- PWA https://ponto.acstech.dev.br, site existente `cf66ee21-9935-4013-8043-1471c62694e7`, deploy Netlify `6aecfc2150949c689a935a36`. Envio manual sem commit/push.
- Firebase explícito `ponto-app-1c55a`: `lembretesOperacao` ACTIVE revisão `lembretesoperacao-00020-vid` (21:58:38 UTC); `dispararLembretes` ACTIVE revisão `dispararlembretes-00015-qak` (21:58:41 UTC). Sem novo Scheduler ou infraestrutura.
- Conferência pública: 9 rotas, incluindo `/alimentacao`, e 24 arquivos corresponderam por hash ao build local. Callable sem autenticação devolveu 401. Sem contas ou dados reais usados na validação.
- APK atualizado `output/Ta-no-Ponto-alimentacao-pessoal-CHO-total-2026-11-05.apk`: 10.352.585 bytes, SHA256 `0AE275883620761FC7570C9E001BF282D1D3B8576E1C208ABDC92A3EDD095801`. Assinatura v2 verificada; 66 assets internos conferidos contra os arquivos release. Build confirmou produção `ponto-app-1c55a`, sem emuladores, edição Android sem cuidados (`modulosSaude:0`). Chave de upload existente, sem nova chave, sem instalação ou envio à Play.

Inclui alimentação pessoal em aba própria, acompanhamento administrativo somente de ponto com escala semanal clicável e consulta de marcações, além de CHO por linha ou total manual da refeição. Evidências `output/ambiente-pessoal-publicacao-*`, `ambiente-pessoal-publicado-verificado.json`, `ambiente-pessoal-servidor-verificado.json` e `ambiente-pessoal-apk-verificado.json`.

## Refeição em destaque — ajuste local após publicação
A visão “Minhas refeições” mostra apenas uma refeição: a primeira ocorrência cujo horário ainda não passou há 30 minutos. Exemplo: lanche às 10h fica até 10h29min59s; às 10h30 passa ao almoço das 12h. Aos 30 minutos do almoço, passa à próxima. Após a última, mostra a primeira do próximo dia válido, respeitando início/término, data única e dias da semana. Se houver vários planos, seleciona a ocorrência mais próxima entre eles. Exibe a data da ocorrência para distinguir amanhã/semana seguinte. “Expandir plano completo e editar” abre todos os planos e suas ações de edição conforme as permissões existentes; a visão administrativa “Criadas por mim” mantém os planos completos.

Relógio local atualizado na virada do minuto e ao voltar ao app, sem nova consulta ao servidor por minuto. Removido o parágrafo do formulário iniciado por “Cadastre as orientações que deseja seguir”. CHO total permanece condicionado ao modo salvo em cada refeição; nenhuma conversão automática ou soma de alternativas. A verificação somente leitura do PWA anterior confirmou 9 rotas e 24 arquivos iguais ao build publicado; isso não comprova qual modo está salvo em uma programação real, nem qual versão está carregada num celular aberto.

Validação: 8 testes locais aprovados, incluindo transição exata de 30 minutos, 10h33, virada de dia, término, data única, dia da semana, início futuro e seleção entre planos. ESLint aprovado. Builds web/Android reduzido aprovados. Interface conferida com relógio fictício às 10h33: somente almoço, expansão mostra café/almoço/jantar e edição sem o parágrafo removido. Captura `capturas/ambiente-pessoal/refeicao-atual.png`. Este complemento ainda não publicado; nenhuma programação real alterada.

## Reaproveitar CHO antigo — complemento local
Cadastros sem `choModo` e com um único valor distinto de CHO nas linhas passam a ser apresentados como total da refeição, conforme orientação do usuário de que esses valores já eram totais. Valores repetidos iguais são deduplicados, nunca somados; zero é preservado. Não altera linhas originais nem modos explicitamente cadastrados. No editor, trocar de linhas para total reaproveita automaticamente o valor único se não houver total preenchido. Com valores distintos, botões “Usar X g” permitem selecionar um deles; não assume soma ou escolhe arbitrariamente. O modo/total é persistido no próximo salvamento normal e então atualiza o resumo dos avisos pelo backend existente. Nenhuma migração ou alteração direta em dados reais foi executada.

Validação: 4 testes de calendário/compatibilidade passaram, incluindo valor único, repetidos, distintos, decimal, zero, preservação de linhas e modos explícitos. Lint e build aprovados. Não publicado.

## Interações de ponto compactas — complemento local
Removido o card duplicado “Horários registrados hoje”. Um único card inicia com “Interações no ponto hoje”, data corrente e quatro marcações, incluindo estado sem registro. Botão “Expandir semana completa” mostra os registros semanais já carregados; “Mostrar somente hoje” recolhe. Sem nova consulta ao expandir. A seleção compacta é reiniciada ao trocar pessoa ou data. Escala clicável permanece.

Lint e build aprovados. Conferência visual fictícia: inicialmente somente 05/11; expandir acrescentou 04/11; recolher voltou apenas a 05/11, sem duplicação do card. Captura `capturas/ambiente-pessoal/ponto-hoje-expandir-semana.png`. Ainda não publicado.

## Publicação dos complementos autorizada — 05/11/2026
Após “Perfeito! Vamos publicar!”, publicados os complementos de refeição em destaque, expansão do plano, remoção do parágrafo do editor, reaproveitamento do CHO antigo e card único de ponto com expansão semanal. Imagens por URL permanecem nas duas visões de alimentação. Esta seção substitui a indicação “não publicado” dos complementos acima.

PWA https://ponto.acstech.dev.br, deploy `6aed2963ea717679a951d6fc`, site existente `cf66ee21-9935-4013-8043-1471c62694e7`. Verificação por hash: 9 rotas e 24 arquivos iguais ao build local; callable sem login recusada com 401. Nenhum novo deploy de backend necessário: os complementos são de interface e usam o suporte de CHO já publicado.

APK `output/Ta-no-Ponto-refeicao-atual-ponto-2026-11-05.apk`, 10.353.237 bytes, SHA256 `55B2DB1B8348882E0F1876B41B145314D89E955BA082569721FA936B6E5B45A5`. Assinatura v2 verificada e 66 assets internos iguais aos arquivos release. Produção explícita, sem emuladores, sem módulos de cuidados. Sem instalação, Play, commit/push ou alteração direta de programações reais. O reaproveitamento de CHO é persistido ao salvar normalmente a programação; não houve migração de banco.

Evidências `output/refeicao-atual-publicacao-*`, `refeicao-atual-publicado-verificado.json` e `refeicao-atual-apk-verificado.json`.

## Semana inicialmente recolhida — complemento local
A pedido do usuário, o histórico de ponto agora inicia apenas com o botão “Expandir semana completa”, sem título nem marcações do dia. Ao expandir mostra os registros da semana já carregados; “Recolher semana” volta a ocultar todos. Escala clicável e totais preservados. Lint/build aprovados. Conferência visual fictícia de abrir e recolher aprovada; captura `capturas/ambiente-pessoal/ponto-semana-recolhida.png`. Não publicado.

## Cuidados por pessoa/pet e cards independentes — publicado em 05/11/2026
As abas Pessoas/Pets listam os nomes dos cadastros autorizados e os destinos antigos encontrados nos lembretes já consultados. Selecionar um nome filtra ações, conclusões e gestão de lembretes para aquele cadastro. Identificadores distintos não são mesclados por homonímia; descrições antigas ficam em grupos separados. O filtro é local sobre consultas já autorizadas, sem ampliar permissões ou criar consultas/listeners adicionais. Cadastros sem lembrete continuam selecionáveis e mostram estado vazio. A aba Todos preserva a visão anterior. Cuidados realizados têm espaçamento, borda completa, fundo e faixa verde próprios, com avatares preservados.

Validação: teste de agrupamento aprovado (pessoas, pets, homônimos, nomes anteriores, sem lembretes e filtro por ID), ESLint e builds web/Android aprovados. Interface conferida com dados fictícios: Pessoas listou Ana/Bia; selecionar Ana mostrou somente 2 conclusões de Ana; Pets listou Greg e o filtro mostrou apenas seus 2 cuidados. Captura `capturas/ambiente-pessoal/cuidados-por-pessoa.png`.

Publicado após autorização explícita. Netlify site existente `cf66ee21-9935-4013-8043-1471c62694e7`, deploy `6aed2ccf1b2276a02ca6ee5e`, https://ponto.acstech.dev.br. Inclui também o complemento pendente de ponto com semana inicialmente recolhida. Verificação: 9 rotas e 25 arquivos iguais por hash ao build local; callable sem login 401. Sem necessidade de deploy de servidor e sem alteração de dados reais.

APK atualizado para o ajuste de ponto, mantendo edição sem cuidados: `output/Ta-no-Ponto-ponto-semana-recolhida-2026-11-05.apk`, 10.353.485 bytes, SHA256 `0BA28263C716CD83865A3E84355FD9A581CC1CDBCCA769979AD911AB4B5917BA`. Assinatura v2 verificada; 66 assets internos conferidos. Não instalado nem enviado à Play. Sem commit/push. Evidências `output/cuidados-atores-*`.
