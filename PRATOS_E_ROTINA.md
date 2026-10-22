# Relógio, compras e prato do dia

Publicado em 22/10/2026 em https://ponto.acstech.dev.br. Deploy Netlify `6ada2e4246065c2dfab4bcbe`, com atualização seletiva de `lembretesOperacao`. HTML e bundle verificados em produção; autenticação obrigatória preservada.

- Ponto: relógio digital com segundos e identificação de horário atual, no fuso de Brasília. Os quatro registros efetivos do dia ficam no mesmo cartão, abaixo do relógio. Não altera marcações nem permite registro por administradores.
- Compras: descrição ocupa toda a largura no celular e as ações ficam abaixo, em duas colunas. Consulta e comparação compartilham autocomplete por nome, marca, apresentação e categoria, com filtro de categoria. Marcas, embalagens e unidades distintas continuam separadas.
- Lembretes: administradores cadastram pratos para uma funcionária, por data ou dias da semana. Receita, foto e link são opcionais. Todos os administradores do grupo visualizam; cada funcionária vê somente os pratos atribuídos a ela. O ponto apresenta a programação de hoje em uma seção expansível.
- Funcionárias sem habilitação de cuidadora acessam as receitas em Lembretes. Isso não libera os lembretes de cuidados nem suas operações no servidor.

## Dados e permissões

A coleção `pratosDia` usa o contexto de grupo existente e somente o callable `lembretesOperacao`. O servidor valida o responsável, autoria, programação, versões concorrentes e autorização. Arquivamento preserva o documento. Nenhum dado real foi modificado nesta rodada.

Fotos são reduzidas no aparelho para JPEG, até 180 mil caracteres de data URL, e armazenadas no documento. A listagem retorna apenas a indicação de foto; a imagem é buscada ao expandir o prato. Links aceitam HTTPS sem credenciais. Não há novo serviço de armazenamento ou notificações de horário para pratos nesta rodada.

## Conferência

1. Em Ponto, conferir relógio atual e registros do dia, incluindo uma jornada encerrada. Administrador continua somente leitor.
2. No celular, abrir lista em compra com nome longo: descrição deve aparecer acima das ações, sem uma coluna estreita de letras.
3. Em Consulta de preço e Preços, digitar nome ou marca, filtrar categoria e selecionar uma sugestão; conferir valores e gráficos da variante escolhida.
4. Como administrador, em Lembretes, cadastrar prato por data e outro semanal. Incluir, opcionalmente, preparo, foto e link. Conferir no Ponto no dia correspondente.
5. Como funcionária, conferir somente os pratos atribuídos à conta; outro grupo não deve enxergá-los.

Validação automatizada: lint, testes unitários, build e suíte de integração com emuladores (inclui autoria, foto, programação e isolamento de pratos). Revisão visual interativa pendente: nenhum navegador estava conectado nesta sessão.

Para publicar posteriormente: atualizar frontend e o callable `lembretesOperacao`. Não é necessária migração de contas ou alteração das regras de acesso direto ao Firestore.
