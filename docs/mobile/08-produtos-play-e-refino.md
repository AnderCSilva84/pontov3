# Produtos Play e primeiro refino visual

Rodada de 14/11/2026, issues [#12](https://github.com/AnderCSilva84/pontov3/issues/12) e [#13](https://github.com/AnderCSilva84/pontov3/issues/13). Integra a candidata #7, após homologação da #9.

## Cadastro confirmado na Play Console

| Produto | ID real | Plano-base | Brasil / mês | Estado |
| --- | --- | --- | --- | --- |
| Tá no Ponto Prata | ta_no_ponto_prata | mensal | R$ 14,90 | Rascunho |
| Tá no Ponto Ouro | ta_no_ponto_ouro | mensal | R$ 29,90 | Rascunho |
| Tá no Ponto Diamante | ta_no_ponto_diamante | mensal | R$ 49,90 | Rascunho |

Todos autorrenováveis a cada mês; somente Brasil selecionado, sem entrada automática de novos países. Mantidos carência de 7 dias e suspensão automática de 53 dias, troca com cobrança na próxima data e reativação permitida. Esses parâmetros ainda precisam de homologação na reconciliação da #9: carência concede direitos apenas se confirmada pelo provedor; suspensão não concede direitos pagos.

Nenhum plano-base ativado, cobrança, compra, deploy ou lançamento público executado. A lista do Console mostrou os três produtos e zero planos ativos. IDs coincidem com a lista permitida do plugin Android e do cliente; verificação de recibos/mapeamento do backend ainda não implementados.

O formulário inicial Prata retornou erro genérico ao salvar. O titular autorizou descartar e recriar o formulário, preservando o produto. Em nova sessão de edição, os três planos foram salvos com os preços exatos. A edição regional direta evita o arredondamento da ferramenta em lote (que sugeriu 14,99). Não tratar formulário preenchido como configuração salva: a confirmação usada foi a página Editar plano básico, estado Rascunho e botão Ativar.

Pendências #12: benefícios dos produtos, perfil/recebimento e verificações pelo titular, testadores de licença, acesso mínimo à Developer API, notificações em tempo real e ativação para teste somente quando o backend estiver preparado. Não aceitar termos ou cadastrar dados bancários pelo titular.

## Refino implementado localmente

- Planos: cartões com cabeçalho, preço, funcionários, recursos incluídos/ausentes e cotas em áreas distintas. Selo do plano atual somente com consulta confirmada, sem inferir Free para grupos em transição. Preço Android continua vindo da loja, sem fallback para preço web.
- Escritório contábil: lista semântica de parcelas com descrição, número da parcela e valor separados; total de descontos destacado. Valores e cálculos existentes preservados. Transporte com valor e texto de orientação em hierarquia própria. Ajustes de toolbar, abas, foco e quebra de conteúdo restritos ao módulo.
- Componentes e estilos: `PlanosCatalogo.jsx`, `Adiantamentos.jsx`, `planos.css`, `escritorio.css`; integração em Planos/Financeiro.

## Validação

Lint e build web aprovados. Prévia local usa os componentes reais de catálogo e parcelas, dados fictícios, sem consulta/gravação em produção. Conferidos desktop, 768, 390 e 320 px; sem rolagem horizontal nos tamanhos medidos. Em 320 px, parcela/valor empilham para preservar a leitura; em 390 px, valores ficam em coluna própria. Estado Android sem ofertas mostrou indisponibilidade nos três planos pagos, sem preço ou contratação fictícios.

Limites: a prévia não substitui a tela Financeiro autenticada nem os testes no Android/PWA instalados. Teclado, navegação inferior, recortes/safe areas, aumento de texto, contraste completo e aceite do titular continuam pendentes. Nenhuma alteração visual foi enviada à Play/produção; AAB 6 é anterior a este refino.

## Revisão visual seguinte

1. Validar Planos e Escritório contábil nas instalações reais e obter aceite do titular.
2. Após esse aceite, revisar Gestão/cadastro de funcionários, navegação e Minha conta; depois Ponto, Compras, Tarefas, Alimentação e Lembretes nas edições disponíveis.
3. Registrar por tela os estados vazio, carregando, erro, conteúdo longo e teclado antes de ampliar o padrão. Não declarar o app inteiro refinado com base nessas duas telas.
