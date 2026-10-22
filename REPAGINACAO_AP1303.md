# Repaginação AP1303 — implementação local

**Não publicada.** A folha em andamento e todas as demais alterações locais anteriores foram preservadas. Esta rodada modifica interface e organização; não adiciona dependências, serviços, migrações ou novas regras de acesso.

## Telas e estrutura

- `src/styles/redesign.css`: tokens do briefing, fonte existente Manrope/sistema, fundo #F5F7F8, branco, verde-petróleo #126B60, contraste, foco, áreas de toque, movimento reduzido e comportamento responsivo. Importado por último em `src/main.jsx` para unificar os estilos existentes sem descartar componentes dos módulos.
- `src/components/ui/index.jsx`: marca oficial reutilizada, ícones SVG de contorno, cabeçalho, badge, controle segmentado, etapas, resumo financeiro, estado vazio e informação honesta de conexão. Os componentes existentes de cartão, campo e botões usam os tokens compartilhados.
- `BottomNav`: Gestão no destino administrativo; destinos e permissões preservados. Barra branca com área segura no celular e navegação lateral em tablet/desktop; estado ativo também no Escritório Contábil.
- Ponto: saudação pelo perfil real; situação e ação derivadas da jornada existente, relógio local, progresso, registros do dia e tarefas. Banco de horas, escala e resumo mensal recolhidos. Impede toque repetido e ação antes da leitura da jornada. A informação de conexão não afirma sincronização sem confirmação. GPS, confirmação de registro administrativo e fluxo do servidor preservados.
- Tarefas: `AgendaTarefas` abre em Hoje e oferece Semana/Mês, data, progresso real, grupos por período, conclusão diária e detalhes. O mês usa dias/indicadores e seleciona a agenda, evitando textos em colunas estreitas. Reutiliza `conclusoesRotina` e as tarefas avulsas existentes. Formulários e gestão de recorrências continuam acessíveis. O editor recebe foco, prende Tab e fecha com Escape (`useDialogFocus`).
- Lembretes: Todos/Pessoas/Pets sobre dados autorizados; a ação pendente e a próxima continuam em destaque, respeitando a sequência diária já implementada. Responsáveis, testes de notificação, gestão e PDF ficam em seções secundárias. Identidade e autor da conclusão preservados.
- Compras: marca/cabeçalho, navegação e três etapas visuais. Ações de importação, compartilhamento, anulação e exclusão ficam em opções secundárias. Catálogo, marca, embalagem, estimativa, totais, cupom/QR, PDFs, preços, histórico, rankings e API permanecem conectados ao módulo original.
- Gestão: lista inicialmente aberta, busca e filtro por perfil, criação em formulário recolhível e ações por usuário no menu. Situação textual ativa/inativa. Escritório Contábil permanece claramente identificado no destino Gestão.
- Escritório: resumo da competência e líquido previsto; Valores → Revisão → Fechamento com grupos de proventos/descontos, ajustes recolhidos, resumo discriminado e observação. Navegar entre etapas não fecha nem paga. Os campos persistem ao avançar/voltar, o rascunho continua salvável e somente a confirmação final chama o fechamento existente. Pagamento continua separado. Revisão e ações usam colunas no desktop.

## Validação

- `npm run lint`: sem erros ou avisos.
- `npm test`: 71 testes aprovados; testes que dependem de emuladores são pulados neste comando.
- `npm run test:compras:integracao`: 43 testes aprovados no Firebase emulado, incluindo permissões, compras, ponte/API, estimativas, doses, destinatários e folha/pagamento idempotente.
- Navegador com projeto `demo-ap1303`: navegação dos seis módulos, conclusão de tarefa de 6/20 para 7/20, Semana/Mês, modal e Escape, filtros e menus administrativos, cuidado atual, lista com produto real do catálogo fictício, folha nova/salva/revisada/fechada, preservação ao voltar e ausência de pagamento ao fechar.
- Folha fictícia: 0,55 hora = 33 minutos; salário de teste 2.500 + bônus 100, desconto de horas 6,25 e líquido 2.593,75. Após confirmar: `pronta_pagamento`, versão 2, zero lançamentos financeiros. Valores exclusivamente de teste, não originados do mockup nem de contas reais.
- Ponto conferido em expediente, intervalo, encerrado (ação desabilitada) e sem marcações. Não houve registro real de ponto ou solicitação de GPS real nos testes.
- Perfil de funcionária: sem Gestão, sem criação de lembretes e sem acesso à folha; abrir endereço administrativo mostra a rota autorizada, conforme o comportamento atual.
- Larguras verificadas: 360, 390, 430, 768 e 1280 px em Ponto, Tarefas, Lembretes, Compras, Gestão e Escritório; também valores e revisão da folha. A grade mensal apresentou overflow inicialmente e foi corrigida. Nenhuma rolagem horizontal de página nas verificações finais.

## Diferenças necessárias e limites da verificação

- Não há botão Adiar: o modelo não oferece adiamento. A sequência que oculta doses concluídas continua funcionando como solicitado anteriormente.
- A barra mostra apenas os destinos permitidos ao perfil; a funcionária mantém os acessos atuais, sem ganhar permissões administrativas por causa do mockup.
- A busca de usuários respeita a paginação atual e está explicitamente rotulada como busca nesta página, sem carregar toda a base.
- A marca compacta usa o JPEG oficial existente, exibindo o conteúdo central sem distorcer letras ou redesenhar o símbolo. Não foi criada uma marca substituta.
- O fechamento mantém a confirmação existente e exige primeiro salvar a folha em andamento. Fechada não aparece como paga.
- A conexão indica disponibilidade do navegador; não afirma que todos os dados estão sincronizados. Notificações, câmera, GPS, teclado virtual e áreas seguras devem receber a conferência habitual em aparelho físico; as validações desta rodada usaram Chrome responsivo e dados fictícios.
- Capturas de página inteira podem mostrar a barra fixa no ponto de rolagem em que foram obtidas; o conteúdo tem reserva inferior para que o último controle seja alcançável.

## Prévia

Galeria de capturas: `output/redesign/index.html`. Capturas de cada módulo em `output/redesign/`.

Prévia de desenvolvimento: `http://127.0.0.1:5175` com `--mode compras-test`, conectada aos emuladores. Não é produção. A folha da rodada anterior ainda exige publicar backend, regras e frontend em conjunto quando houver autorização; nenhuma dessas publicações foi executada.
