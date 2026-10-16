# Lista de compras

Histórico da primeira repaginação. O módulo atual de listas, preços e rankings está documentado em [MODULO_COMPRAS.md](MODULO_COMPRAS.md).

Atualização publicada em 13/10/2026 em https://ponto.acstech.dev.br/lista-compras, deploy Netlify `6acea71f8fc7e727596d4557`.

- Compras abre uma tela dedicada para administração e funcionária, sem redirecionar a funcionária para os números do ponto.
- A lista inicial destaca pendências por categoria. Os cartões de totais foram removidos; busca e filtros ficam recolhidos.
- Montar lista abre o catálogo para solicitar itens. Novo item no catálogo e confirmação de comprado são exclusivos do administrador. A funcionária não pode retirar solicitações de outra pessoa nem alterar nome/categoria de uma solicitação existente.
- Compartilhar prepara um PDF com todos os itens pendentes, independentemente da busca ou do filtro exibido. O PDF não inclui nomes de funcionários nem dados pessoais de quem solicitou.
- Compartilhar PDF abre o compartilhamento nativo; também existe Baixar PDF para anexar manualmente. O segundo toque mantém a interação exigida pelo navegador depois da geração assíncrona.
- A geração usa os dados já carregados da lista; não consulta a coleção restrita de funcionários.

Verificação: 26 testes, lint e build passaram; a rota pública e o bundle publicado foram conferidos. Ainda falta confirmação visual e compartilhamento real pelo usuário no iPhone.
