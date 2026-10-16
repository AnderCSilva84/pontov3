# Compras AP1303 — primeira etapa

Implementação de 15/10/2026. A API REST e a conexão com o No Bolso permanecem para a segunda etapa; os endpoints externos ainda não foram criados.

Publicado em https://ponto.acstech.dev.br/lista-compras, deploy Netlify `6ad174067c82d047a79240e2`. Funções `comprasOperacao`, `comprasRelatorio` e `alertaComprasItem`, regras e índices publicados no projeto `ponto-app-1c55a`. O índice do histórico ficou READY; os índices anteriores foram preservados. As duas funções callable recusaram chamadas sem autenticação (HTTP 401). A primeira abertura por um administrador executará a migração autenticada.

## Uso

1. O administrador abre Compras. A função `inicializar` importa uma vez os pedidos pendentes da coleção antiga, prepara as categorias e amplia o catálogo preservando os IDs. Não gera preços para itens antigos marcados como comprados.
2. Em Listas, criar uma lista e adicionar produtos, quantidade e apresentação. Apenas o administrador cria ou edita o catálogo. Outra embalagem deve ser outro produto; a apresentação/unidade fica protegida depois do primeiro histórico.
3. Iniciar compra, selecionar o supermercado padrão e registrar cada item com quantidade efetiva, preço por unidade indicada e estabelecimento/filial. O supermercado pode variar por item.
4. Finalizar e confirmar as pendências não compradas. O servidor grava lista, itens e preços em uma transação, calcula totais em centavos e impede duplicação. Não mostra sucesso antes da confirmação.
5. Consultar o histórico mensal, preços e rankings. Apenas o administrador pode anular com motivo. A anulação preserva os registros e os exclui dos relatórios.
6. Administrador e funcionário podem criar listas e adicionar produtos. Apenas o administrador inicia a compra, cadastra supermercados, registra preços e finaliza. A permissão antiga `realizarCompras` é ignorada, inclusive no servidor; não existe mais delegação de compra na interface. Consulta permanece somente leitura.

O compartilhamento continua por PDF dos itens pendentes, incluindo quantidades e apresentações. O segundo toque abre a folha nativa do celular; o download atende navegadores sem compartilhamento de arquivos.

## Dados e segurança

- `categoriasCompras`: identificador, nome, ícone, ordem.
- `catalogoCompras`: coleção existente ampliada com categoriaId, apresentação, unidadeCompra e ativo. Nome inclui a marca quando necessário.
- `supermercados`: nome, filial e cidade. ID derivado da identificação normalizada para evitar cadastros idênticos.
- `comprasListas`: cabeçalho, status, responsáveis, timestamps, versão, contagens e total confirmado.
- `comprasListas/{id}/itens`: snapshot de produto/apresentação/unidade, quantidades, situação, preço, supermercado e versão do item.
- `comprasPrecos`: observação imutável de cada item comprado. ID determinístico por lista/item; apenas backend lê/escreve. `valido=false` em anulações.

As novas coleções têm leitura autenticada por perfil ativo e escrita somente por `comprasOperacao`. Os preços são consultados por `comprasRelatorio`, com retorno sem dados de pessoas. Atualizações verificam versões para detectar conflitos entre celulares. Depois da migração, a coleção antiga continua preservada e somente leitura: celulares com a interface antiga precisam reabrir o app.

Estados da lista: rascunho, em_compra, finalizada, anulada. Estados do item: pendente, comprado, nao_comprado. Apenas finalização gera histórico. Não há confirmação offline nem fila local que aparente sucesso; o app sinaliza ausência de conexão. O modo PWA de produção e seus avisos continuam existentes.

## Relatórios

- Gráfico de barras: último preço por supermercado/unidade dentro do período, com data da observação.
- Gráfico temporal SVG: observações individuais por supermercado; não preenche datas sem compra. Tabela acessível apresenta todos os valores.
- Mais comprados: número de listas finalizadas válidas distintas por produto.
- Maiores variações: primeiro/último preço no mesmo supermercado e unidade; percentual absoluto define ordem. Cada produto aparece uma vez, com seu maior movimento, preservando sinal, datas e valores.
- Maiores preços: maior entre os últimos preços por supermercado no período, por produto. Nunca usa o total comprado.

Períodos da interface: 30, 90 e 365 dias. Endpoint interno limita a um ano e 5.000 observações (ultrapassar exige reduzir o período, sem truncar resultados silenciosamente). Limite de 200 itens por lista. Quantidades positivas até 10.000, com três casas decimais; preços positivos em centavos inteiros. Unidade de compra explícita: un, kg, l, m.

Índice novo: comprasListas(status ASC, finalizadaEm DESC). O arquivo de índices também passa a declarar os dois índices existentes de ponto, preservando-os. Não há agregações permanentes nem serviço externo de gráficos.

## Testes e revisão

- `npm test`: testes de domínio, dinheiro, rankings, rotas e permissões, além dos testes existentes do sistema.
- `npm run test:compras:integracao`: Firebase CLI e Java 21; usa apenas o projeto fictício `demo-ap1303`, emuladores Auth/Firestore e regras reais. Testa migração idempotente, isolamento, permissões, versão antiga, fechamento atômico, duplo toque, snapshots, apresentação protegida e anulação.
- `npm run lint` e `npm run build`.
- Navegador: conta fictícia no emulador, início de compra, registro de 1,375 kg a R$ 6,99 (total R$ 9,61), fechamento com pendências, gráficos, rankings e histórico.
- Uso real no celular confirmado pelo usuário em 15/10/2026: tudo funcionando.

## Ajustes após o uso real

- Compra exclusiva do administrador, com teste de rejeição para funcionário mesmo quando há uma permissão antiga salva.
- Criação de listas por funcionário e administrador mantida.
- Viewport com escala fixa, gestos de pan sem pinch e campos com fonte mínima de 16px em telas de toque para evitar zoom automático.
- Indicadores nativos de expansão substituídos por ícones circulares de abrir/recolher, preservando teclado e semântica de `details/summary`.

Para revisão local: iniciar `firebase emulators:start --project demo-ap1303 --config firebase.compras-emulator.json --only firestore,auth,functions`, executar `scripts/seed-compras-demo.cjs` com GCLOUD_PROJECT=demo-ap1303, FIRESTORE_EMULATOR_HOST=127.0.0.1:8877 e FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9098, e executar Vite com `--mode compras-test --host 127.0.0.1 --port 5179`. Esse modo só funciona em desenvolvimento, usa configuração fictícia e não registra notificações. A conta e senha de demonstração estão no script e não são credenciais reais.

## Integração No Bolso

API de leitura e consultas no No Bolso implementadas. Administrador e usuários autorizados individualmente podem consultar listas, rankings e melhores preços históricos. Contrato, autenticação entre servidores e limites em [API_COMPRAS.md](API_COMPRAS.md).

## Categorias e PDF

Administrador do AP1303 pode criar categorias em Compras → Categorias, escolhendo entre 32 ícones. O servidor valida nome, duplicidade, ícone e acesso; produtos aceitam categorias cadastradas no banco. Funcionários não podem cadastrar categorias. Pet, Geladeira, Despensa e Jardinagem foram criadas em produção em 16/10/2026. Inicialização idempotente repõe padrões ausentes e preserva categorias existentes.

PDF de compartilhamento usa o ícone AP1303, azul/branco/vermelho, título da lista, data e numeração em todas as páginas. Revisão: `node scripts/revisar-pdf-compras.mjs` gera exemplo e lista extensa; renderizar com PDFium/Poppler para verificar margens e quebras.

Publicado em 16/10/2026: função `comprasOperacao` e frontend Netlify `6ad2138aab9026d61c4b4608`, incluindo reconhecimento da rota de categorias e restrição de navegação ao administrador. Validação: 38 testes unitários passaram; integração separada com 12 testes passou; lint/build passaram; exemplo de uma página e lista longa de oito páginas renderizados e revisados visualmente.

## Catálogo independente

Compras → Catálogo permite ao administrador cadastrar e editar produtos sem abrir nem criar lista. Nome, apresentação, categoria e unidade usam o mesmo formulário e backend existentes. Produtos cadastrados ficam disponíveis em Adicionar produtos de qualquer lista, sem inclusão automática. Funcionários podem consultar o catálogo. O cadastro não gera preços, compras nem lançamentos; teste em emulador verifica isso e a restrição de escrita ao administrador.

Catálogo publicado em 16/10/2026: Netlify `6ad278fdb88483af2ea05264`. Testes: 38 unitários e 12 de integração passaram, assim como lint/build. Conferência em produção: rota independente abriu o catálogo, busca filtrou produtos existentes e formulário Novo produto abriu sem lista; nenhum produto fictício foi gravado.
