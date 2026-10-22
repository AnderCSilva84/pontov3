# Correções de importação, ponto e compras — 21/10/2026

Implementação validada e **publicada em 21/10/2026, após comando do usuário**. As alterações anteriores do repositório foram preservadas. Planos, lojas de aplicativos, criação/exclusão de contas e isolamento por grupo não foram implementados nesta rodada.

## 1. Importação de nota

O erro mostrado no print era `Unidade fiscal não suportada: GF.`, lançado por `unidadeFiscal()` no parser compartilhado. Não era uma falha de impressão/PDF. A unidade GF passa a ser tratada como embalagem contada (`un`), preservando a unidade fiscal original, quantidade e preço. Uma garrafa não é convertida implicitamente em litros.

Validação: nota fictícia com GF preparada, revisada e confirmada no Firestore emulado; compra finalizada com bruto de R$ 53,56 e líquido de R$ 50,00. Produtos repetidos continuam gerando linhas fiscais separadas. Nova confirmação da mesma importação não duplica a compra. Não foi utilizada a nota real do print, cujo texto completo não foi fornecido.

Como conferir: importar o texto ou consultar uma nota com GF, revisar os itens e confirmar. Quantidades e preços devem permanecer iguais aos da nota; o total líquido fica na compra e os preços originais no histórico.

## 2. Ponto

O cabeçalho usa o cadastro da funcionária, e não o nome da sessão administrativa. O administrador consulta as funcionárias vinculadas a contas de funcionário, com atualização em tempo real do dia. Não há UID ou nome de Joseane fixado no código.

Somente o perfil `funcionario`, ativo e vinculado ao mesmo `funcionarioId` solicitado, pode executar `registrarPonto`. O registro guarda o UID real do autor e o nome do cadastro funcional. As verificações de localização, sequência e transação foram preservadas.

Administradores não recebem botão de marcação nem ações de editar/excluir horários. Os manipuladores administrativos também recusam alterações. As regras bloqueiam toda escrita direta do cliente em `registros`, `dias` e `ajustesPonto`; a função validada continua gravando pelo servidor. Ajustes históricos permanecem legíveis. Registros antigos não foram reatribuídos ou apagados.

Como conferir: entrar como administrador e abrir Ponto: deve aparecer o nome da funcionária e “Somente leitura”, sem botão de marcação. Entrar como funcionária: o botão da próxima ação deve aparecer. Uma chamada administrativa direta deve retornar `permission-denied`; tentar marcar por outro `funcionarioId` também deve falhar.

## 3. Comprado sem preço

Em uma lista em compra, o administrador pode escolher **Marcar comprado sem preço**, ou **Registrar preço** como antes. O estado `comprado_sem_preco` não contém preço/total fictício, mantém a autoria do item e continua participando da estimativa histórica. A marca continua disponível no formulário de preço individual.

Depois, usar **Mais opções da lista → Importar e comparar cupom**, associar cada linha ao item correspondente e confirmar. O item recebe os valores fiscais; linhas repetidas seguem o comportamento anterior, com uma linha por lançamento fiscal. Alternativamente, **Preencher preço** mantém o lançamento manual.

O fechamento manual fica impedido enquanto houver comprado sem preço, inclusive no servidor. Um item já marcado como comprado não pode desaparecer silenciosamente durante a importação: precisa ser associado ou corrigido antes. Preços só entram no histórico após a finalização; nenhuma despesa foi criada automaticamente.

Como conferir: marcar um item sem preço, recarregar a lista e verificar a indicação de preço pendente e o botão de finalizar desabilitado. Importar uma nota associando esse item e conferir a compra finalizada. Em outra lista, marcar sem preço, preencher o preço manualmente e finalizar normalmente. Funcionários continuam montando listas, mas não registram compras.

## Arquivos desta rodada

| Frente | Arquivos |
| --- | --- |
| Parser fiscal | `functions/cupom-dominio.cjs`, `tests/cupom.test.js` |
| Identidade e permissões do ponto | `functions/index.js`, `firestore.rules`, `src/pages/Ponto.jsx`, `src/pages/Admin.jsx` |
| Compra sem preço e fechamento | `functions/compras.cjs`, `functions/compras-dominio.cjs`, `src/components/ComprasModulo.jsx`, `src/styles/compras.css` |
| Associação fiscal e estimativas | `functions/cupom-operacoes.cjs`, `functions/compras-estimativa.cjs`, `src/components/ImportarCupom.jsx`, `tests/compras-estimativa-emulador.test.cjs` |
| Integração e execução | `tests/tres-frentes-emulador.test.cjs`, `package.json` |
| Registro da rodada | `CORRECOES_PONTO_CUPOM_COMPRAS.md` |

## Validação e publicação futura

- `npm run lint` e `npm run build` aprovados.
- `npm test`: 78 aprovados; testes dependentes de emulador são pulados nesse comando.
- `npm run test:compras:integracao`: 53 aprovados, incluindo o cenário completo desta rodada.
- Após os últimos ajustes, repetidos os cenários de ponto, importação/compra e estimativa: 7 aprovados.
- Interface local conferida com contas fictícias: identidade da funcionária, administrador somente leitura, marcação sem preço, estimativa preservada e formulário manual. Largura de celular de 390 px sem rolagem horizontal de página.

## Publicação autorizada

Em 21/10/2026, às 14h05 (America/Fortaleza), publicada a versão no site https://ponto.acstech.dev.br. Deploy Netlify `6ad8f0ddad5ee7496f23feb5`, estado `ready`. Backend: 14 funções atualizadas no projeto explícito `ponto-app-1c55a`, incluindo `registrarPonto`, compras, lembretes e folha; regras do Firestore compiladas e liberadas. Os cinco índices necessários já existiam; nenhum índice foi criado ou removido. Os quatro gatilhos de alertas existentes foram preservados, sem recriação ou mudança de região.

Conferência após publicação: página e bundle com HTTP 200, SHA-256 do bundle servido igual ao build validado e deploy ativo confirmado na Netlify. Chamadas sem sessão a `registrarPonto`, `comprasOperacao` e `comprasEstimativa` retornaram HTTP 401 com `UNAUTHENTICATED`. Não foram criadas compras, despesas ou marcações reais nos testes de produção. A validação funcional completa continua sendo a dos emuladores com dados fictícios; não foi simulada uma marcação real pela conta da funcionária.
