# Auditoria do sistema de ponto

Data da revisão: 13/09/2026

## Resumo executivo

O aplicativo atende aos fluxos centrais, mas o crescimento concentrou responsabilidades em duas páginas muito grandes. As prioridades são modularizar o Admin e o Ponto, reforçar validações no servidor e substituir a navegação manual por um roteador com proteção declarativa de rotas.

## Prioridade alta

1. **Dividir páginas grandes**: `Admin.jsx` tem mais de 2.200 linhas e `Ponto.jsx` mais de 1.000. Separar usuários, jornada, locais, ajustes e relatórios em componentes e hooks reduz regressões e melhora a manutenção.
2. **Validar operações sensíveis no backend**: marcações, ajustes e lançamentos financeiros não devem depender apenas da interface e das regras do Firestore. Funções transacionais devem validar perfil, valores, sequência de ponto e autoria.
3. **Restringir melhor as regras de atualização**: a regra de `listaCompras` permite que qualquer usuário autenticado atualize qualquer campo. Aplicar comparação campo a campo, como já ocorre em tarefas.
4. **Adicionar testes automatizados**: cobrir sequência de ponto, cálculo de banco de horas, feriados, recorrência semanal, permissões e recibos. Hoje não existe script de testes no projeto.
5. **Auditoria financeira imutável**: adicionar estorno/cancelamento com motivo em vez de edição destrutiva; registrar autor, data e valores anteriores.

## Prioridade média

1. **Roteamento**: trocar `pushState` e condicionais em `App.jsx` por React Router, com rota desconhecida (404), redirects e guardas por perfil.
2. **Camada de dados única**: mover chamadas Firestore das páginas para serviços/repositórios. Há leituras e normalizações repetidas em páginas e exportadores.
3. **Paginação e índices**: consultas administrativas carregam coleções inteiras. Usar filtros por período, `orderBy`, `limit`, paginação e índices compostos.
4. **Calendário de feriados**: os feriados nacionais estão calculados localmente. Acrescentar configuração de feriados estaduais/municipais de Salvador e uma tela para exceções.
5. **Consistência textual**: revisar mensagens sem acentos e termos inconsistentes (`funcionario`, `Nao`, `Ola`) para melhorar a percepção de qualidade.
6. **Estados de interface**: padronizar carregamento, erro, confirmação e feedback de sucesso; incluir confirmação antes de excluir rotinas.

## Prioridade baixa

1. Carregar módulos de PDF sob demanda para reduzir o bundle inicial.
2. Remover componentes/utilitários não usados após confirmar dependências, como o dashboard alternativo e o exportador legado de tarefas.
3. Adicionar monitoramento de erros, métricas de desempenho e trilha de navegação.
4. Automatizar testes de acessibilidade, contraste e navegação por teclado.

## Fluxo recomendado

- Funcionária: login -> pendências do dia -> registro de ponto -> resumo -> calendário semanal.
- Admin: visão geral -> atalhos para pessoas, ponto, tarefas, financeiro e configurações -> telas focadas por domínio.
- Ações destrutivas: confirmação -> motivo -> registro de auditoria -> opção de estorno quando aplicável.

## Melhorias já aplicadas nesta entrega

- Calendário mensal de tarefas fixas, com feriados nacionais e domingo não útil.
- Visualização do calendário para funcionária e gestão para admin autorizado.
- Pendências no topo do ponto, amarelas e pulsantes no dia, vermelhas quando atrasadas.
- Controle financeiro exclusivo do admin, com transporte, salário e vale/adiantamento.
- Recibo com pagante, recebedora, endereço, logo, crédito e link da ACS Informática.
- Regras do Firestore para as novas coleções.
- Atualizações da lista de compras limitadas aos campos e ao usuário autorizado.
- Tratamento de rota inexistente com página 404 e normalização de URLs.
- PDFs carregados sob demanda, reduzindo o JavaScript inicial do aplicativo.
- Testes automatizados para feriados, dias úteis e permissões de perfil.
- Listagem de usuários paginada no Firestore em blocos de 20 registros.
- Operações financeiras transferidas para Cloud Functions com validação de administrador.
- Exclusões financeiras preservadas em uma coleção de auditoria antes da remoção.
- Resumo visual do ponto extraído para um componente independente.

## Próxima etapa recomendada

- Extrair gradualmente as demais seções de `Admin.jsx` e `Ponto.jsx` para componentes e serviços menores.
- Levar a sequência de marcação do ponto e a auditoria financeira para funções transacionais no backend.
- Adicionar paginação às demais consultas administrativas e testes de integração com o emulador do Firestore.
