# Compras AP1303 — primeira etapa

Importação revisada de cupons, separação entre preços originais e total pago, reconhecimento de nomes e limitação da consulta automática: [CUPONS_FISCAIS.md](CUPONS_FISCAIS.md).

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

### Estimativa ao montar a lista

Listas abertas mostram uma previsão de gasto e o preço de referência por item. O padrão é o último preço válido registrado, com opção de média aritmética dos últimos dez registros (ou dos disponíveis). A referência considera o mesmo ID de produto, apresentação e unidade de compra, entre os supermercados cadastrados. Quantidades fracionárias são multiplicadas pelo preço unitário e arredondadas em centavos por item.

Itens sem histórico ficam identificados e fora do valor; a previsão é rotulada como parcial. Sem nenhum preço conhecido, não é exibido um total zero. Ao registrar compras, o total informado passa a compor a previsão junto com os pendentes estimados, sem contar o mesmo item duas vezes. Itens não comprados não entram na previsão. O botão Atualizar estimativa consulta novamente o histórico.

A função autenticada `comprasEstimativa` somente lê lista, itens e preços válidos; não grava estimativas como preços reais, não finaliza listas e não cria despesas ou lançamentos no No Bolso. Exclui preços de compras anuladas, embalagens diferentes e unidades incompatíveis. Os preços históricos originais das notas não antecipam descontos futuros. A API de compras e seus totais confirmados permanecem com o mesmo contrato.

Índice acrescentado sem remover os anteriores: `comprasPrecos(produtoId ASC, valido ASC, apresentacao ASC, unidadeCompra ASC, compradoEm DESC)`. Consulta limitada aos dez registros mais recentes por identidade de produto e até 200 itens por lista.

Publicado em 20/10/2026: função `comprasEstimativa` ativa no projeto `ponto-app-1c55a`, índice READY e interface Netlify `6ad79acd638178f6518d96ea`. Verificados autenticação (HTTP 401 sem login), preservação dos quatro índices anteriores, lint, build, 68 testes unitários e 34 de integração. Dados de estimativa dos testes ficam em um projeto de emulador separado para não interferir nas contagens dos demais testes.

Conferência visual com dados fictícios: três produtos com histórico e um sem preço, total parcial de R$ 39,00 pelo último valor e R$ 34,50 pela média. Após informar R$ 16,00 por um item comprado, a previsão passou a R$ 41,00 (R$ 16,00 informado + R$ 25,00 pendente estimado), sem duplicação. Tela de celular sem excesso horizontal. Nenhuma compra real foi criada na validação.

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

## Exclusão, marcas e medidas

Administrador pode abrir qualquer lista e usar Excluir lista, com confirmação explícita e verificação de versão. A transação remove itens e registros de preço (até 200 de cada), retirando a lista dos históricos e relatórios. Um marcador mínimo `status=excluida`, data e autor permanece para auditoria e idempotência; especialmente `legado-v1` não pode ser apagado fisicamente, pois bloqueia reimportação da lista antiga. API de detalhe retorna 404; paginação filtra marcadores excluídos preservando o cursor de leitura, podendo retornar página vazia com próximo cursor. Nenhuma exclusão real foi executada na validação.

Durante a compra, Registrar/Editar preço permite marca opcional (até 80 caracteres), unidade comprada un/kg/l/m, quantidade com até três casas decimais e preço por essa unidade. Trocar unidade limpa quantidade e preço no formulário. A unidade planejada é preservada separadamente. Marca e unidade efetiva são copiadas ao histórico na finalização e expostas nas consultas, sem dados de pessoas. Marcas distintas não geram variação percentual entre si; gráficos separam marca, apresentação e unidade. Melhor preço para um item sem marca definida pode escolher entre marcas, identificando a oferta; cada supermercado conta esse item somente uma vez. Itens comprados com marca definida só usam preços da mesma marca.

Validação da rodada: 40 testes unitários e 13 de integração passaram; lint/build passaram. Navegador local com dados fictícios: marca salva, troca de kg para litros, 1,25 L a R$ 10,00/L resultando em R$ 12,50, unidade planejada preservada e diálogo de confirmação conferido. Nenhuma despesa ou compra fictícia em produção.

Publicação: funções `comprasOperacao`, `comprasRelatorio` e `comprasApi` atualizadas e frontend Netlify `6ad286c1513e2220e00a98b1` publicado em 16/10/2026. Catálogo e dados existentes preservados.

## Ponte pessoal No Bolso

Pré-requisitos publicados em 16/10/2026: rota `/integracoes/no-bolso`, módulos no-bolso-bridge.cjs/no-bolso-functions.cjs integrados às funções existentes e índice comprasListas(finalizadaPor ASC, status ASC, finalizadaEm ASC) READY (`CICAgJjmiJEK`). Frontend `6ad2c4d3cca93dc2cbbfcbf2`. Corrigida a página para chamar `comprasOperacao`, nome real da callable. Validação: 41 testes unitários, 16 de integração, lint e build aprovados; página autenticada acessível e proteção sem autenticação confirmada. Alterações anteriores preservadas. Não ativado ENABLE_AP1303_PERSONAL nem criado vínculo real; contrato e próximos passos em API_COMPRAS.md.

## Autoria das listas

Cartões de listas abertas, histórico e cabeçalho da lista exibem criadaPorNome. O servidor define esse snapshot usando o nome do perfil autenticado, sem aceitar autoria informada pelo cliente. Lista legada agregada usa a indicação Importada por. Duas listas existentes receberam somente criadaPorNome a partir de criadaPor e do cadastro atual, com precondição de versão Firestore; itens, preços, catálogo e autoria por UID preservados. Nome não localizado é apresentado como indisponível, sem adivinhar identidade.

Correção de regressão em 17/10/2026: o pacote publicado em 17/10 às 01:28 UTC continha `compras.cjs` sem a gravação de `criadaPorNome`, embora a cópia de trabalho já tivesse a correção. Publicações da ponte também devem preservar essa gravação nas operações `criar` e `inicializar`. O teste de integração verifica o nome do perfil e rejeita autoria forjada pelo cliente; a repetição de `criar` pelo mesmo autor também recupera o campo ausente sem duplicar a lista. A correção de produção usa o pacote vigente com alteração restrita à autoria, preservando a ponte publicada.

Uma lista afetada teve somente `criadaPorNome` preenchido a partir do UID e do perfil, com precondição `updateTime`; a interface confirmou a autoria correta. Os 16 testes de integração passaram.

Frontend publicado: `6ad2c731c2d48b00a7b4b099`; função comprasOperacao atualizada. Lint/build e 16 testes de integração aprovados, incluindo rejeição de nome forjado. A configuração fictícia do piloto da ponte foi alinhada no teste, sem alterar permissões de produção. Histórico e detalhe conferidos no navegador com nomes reais; nenhuma lista criada para testar em produção.
# Colaboração, comprovantes e PDF — rodada local de 21/10/2026

Não publicada. Comprovantes no Escritório ficam em pastas mensais recolhidas, com contagem de recibos e documentos. A organização usa os meses já existentes e preserva links, datas e ações de abrir/compartilhar/apagar.

Todos os perfis ativos conhecidos (administrador, funcionário e consulta) podem criar e acrescentar produtos em listas em preparação. Consulta não monta itens após iniciar a compra; compra, preços e fechamento permanecem exclusivos do administrador. A remoção preserva a proteção anterior: administrador ou autor do item pendente. Contas inativas continuam bloqueadas. Não houve abertura de escrita direta no Firestore.

Itens novos recebem `solicitadaPor`, `solicitadaPorNome` e `adicionadaEm` no servidor. O cliente não escolhe a autoria. Registrar preços ou associar um item ao cupom preserva esse carimbo; novos itens importados recebem o autor da importação. Nos itens antigos com UID, a operação somente de leitura `autorias` resolve o nome sem retornar o perfil completo; nomes novos já salvos ficam disponíveis offline. Itens históricos sem informação suficiente são identificados como autoria anterior não registrada, sem atribuição ou data inventada.

Ao abrir uma lista, os itens das outras listas abertas são observados em tempo real. O aviso **Existente em outra lista** indica os nomes das listas, tanto na compra quanto no seletor de produtos, sem impedir adicionar. Usa o ID do catálogo para não confundir embalagens diferentes. Listas finalizadas/anuladas/excluídas e itens não comprados não entram no aviso. As assinaturas são encerradas ao sair/trocar de lista; não são criadas consultas aos preços nem novos índices para esse recurso.

O mesmo PDF usado para baixar e compartilhar inclui estimativa total/parcial, base escolhida (último preço ou média), quantidade sem preço e separação entre valor já registrado e pendentes estimados. A exportação tenta atualizar as referências; em falha/offline usa a referência disponível ou informa indisponibilidade, sem apresentar zero como previsão nem impedir o PDF. Preços continuam sujeitos a variação e a estimativa não cria despesa.

Validação: lint/build aprovados, 78 testes unitários e 47 de integração aprovados; o acréscimo da resolução histórica de autoria passou novamente no cenário de colaboração. PDF fictício de três páginas gerado, conteúdo conferido e primeira/última páginas inspecionadas. No navegador emulado, conferidos estimativa, aviso de outra lista, autoria, geração do PDF, abertura/fechamento das pastas e contagens 1/2; sem rolagem horizontal de página nas larguras verificadas de 390 e 1536 px. Nenhum dado real foi alterado e nenhum deploy foi realizado.

