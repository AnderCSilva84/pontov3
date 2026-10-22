# Revisão visual — 19/10/2026

Categorias: coleção ampliada com Oficina, Carro, Moto, Combustível, Pneus, Bateria e Bicicleta. O administrador pode buscar um ícone ou usar um emoji único do teclado. Prévia de nome/ícone antes de salvar. Categorias existentes permitem editar somente o ícone, conservando ID e nome. O servidor valida um grafema emoji de até 32 unidades UTF-16, rejeita texto, múltiplos símbolos, HTML e URLs; autorização administrativa preservada.

Marca: o registro manual já oferecia o campo e continua disponível. A revisão da nota passa a aceitar marca opcional de até 80 caracteres. A sugestão recupera a marca do item planejado quando há correspondência única; a confirmação permite editar ou limpar explicitamente e conserva a marca anterior para clientes antigos que omitam o campo. Cada item e registro de preço conservam o valor informado. A marca não é inferida do nome fiscal nem altera a identidade global do catálogo.

Layout: diálogos com largura incluindo borda/padding, cabeçalho visível ao rolar e botão de fechar com área de toque de 44px. Coleção de ícones com rolagem própria e busca. Ajustes de quebra de texto e contenção de campos nas compras. Correções de acentuação nos rótulos de usuários do Escritório.

Validação: lint, build, 59 testes unitários e 23 de integração aprovados. Conferência visual no navegador em viewport de celular, incluindo Ponto, Tarefas, Escritório, Contábil/Comprovantes, categorias, registro manual, importação, preços e acesso aos rankings. Nas telas medidas e nos diálogos de categorias/importação, largura de conteúdo igual à largura visível, sem overflow horizontal. Dados fictícios exclusivamente em `demo-ap1303`: criação de Oficina, criação de Carro com emoji personalizado, edição do ícone e importação de uma compra com marca propagada às linhas repetidas. Nenhum cadastro ou compra de teste gravado em produção.

Evidências: `output/categorias-icones-celular.png` e `output/cupom-marca-celular.png`. A consulta automática à SEFA continua fora desta publicação.

Publicado: backend `comprasoperacao-00016-kes` confirmado ACTIVE; frontend Netlify `6ad66c4dd54b852c30e332fb` em `https://ponto.acstech.dev.br`. A fonte publicada foi preparada sobre o pacote vigente, com mudanças restritas à operação de categoria, validação de emoji e marca na importação.
