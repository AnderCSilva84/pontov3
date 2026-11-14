# Correspondências dentro da comparação — 04/11/2026

Solicitação aceita: revisão de possíveis correspondências em lotes de dez, produto principal com vários nomes, equivalência de medidas, aprendizado para próximas importações, tratamento de campos ausentes e desfazer. Continuidade da melhoria de Preços com publicação autorizada.

## Interface e sugestões

Compras → Preços, após selecionar filiais ou carregar listas, exibe Possíveis correspondências. Mostra até dez pares e acrescenta dez por botão. Cada lado apresenta descrição original, filial, marca, embalagem, unidade e data. Conferir este par consulta a prévia atual do servidor. Administrador escolhe nome principal e confirma explicitamente marca, versão, embalagem e unidade, incluindo os dados ausentes. Os demais perfis consultam sugestões, mas não confirmam.

Sugestão não faz associação automática: índice local de termos das observações carregadas, abreviações usuais, candidatos com sobreposição de termos e sem conflito conhecido. Até três candidatos por observação; termos muito comuns têm amostra limitada a cem entradas por termo. Não é busca exaustiva de todo o catálogo. Observações mais recentes representam cada variante; pares já comparáveis não são sugeridos. Campos vazios aparecem como pendência; peso, marca, versão ou unidade conhecidos e diferentes continuam bloqueados. Não correspondem apenas oculta a sugestão nesta consulta.

Normalização compartilhada reconhece 1 litro, 1litro, 1L e 1000ML como 1000 ml, preservando unidade de preço. Não converte preço por embalagem em preço por kg/litro. As sugestões são memorizadas durante a conferência para não recalcular a busca a cada marcação.

## Confirmação, nomes e histórico

correspondenciaPrevia e correspondenciaConfirmar são operações na callable existente comprasOperacao. Somente administrador ativo no grupo. IDs de duas observações validadas da classificação escolhida; produtos/membros lidos pelo servidor, até vinte cadastros. Compara pares de todos os catálogos e das duas observações, além das identidades confirmadas anteriores; um principal com dados ausentes não pode encobrir conflitos conhecidos entre membros.

Prévia inclui versão das associações e hash do estado lido; alteração de identidade no catálogo invalida a confirmação mesmo sem mudança de versão do mapa. ID de operação e hash de pedido garantem repetição idempotente. Em repetição de resposta com mapa, devolve mapa atual do grupo para não substituir a tela por uma versão antiga.

Confirmação registra família canônica no mapa existente, identidade explícita e nomes alternativos no principal (limite existente de vinte). Notas, observações de preço, quantidades e valores permanecem intactos. comparação usa identidade confirmada para completar apenas atributos ausentes; nunca sobrescreve divergência conhecida. Alias fiscal já existente continua apontando ao membro original, resolvido pelo mapa nas próximas notas. Reconhecimento local de nome alternativo exige correspondência exata, única e compatível no catálogo carregado; não reconhece por semelhança automaticamente.

Interface reaplica o mapa retornado aos registros carregados, preserva seleção das filiais e recalcula os preços sem consulta por produto. Desfazer última confirmação usa a operação existente e restaura vínculos, nomes, identidades e aliases anteriores. Outras operações permanecem no histórico do Catálogo. Desfazer é bloqueado se houver mesclagem posterior envolvendo os membros. Mesclagens manuais antigas invalidam metadados de identidade anteriores e restauram-nos ao desfazer, evitando reaproveitamento indevido.

Auditoria usa tipo mesclarProdutos com origem comparacao, compatível com consumidores existentes. Nenhum serviço, índice, regra, agendamento, bucket ou dependência nova. Leituras adicionais somente ao abrir a prévia e confirmar/desfazer; sugestões e paginação locais. Sem alteração de contas, compras ou produtos reais durante validação/publicação.

## Validação

Quatorze testes unitários direcionados aprovados: sugestões de abreviações, dados faltantes sem associação, conflitos reais recusados, conversão textual de medidas, observação mais recente, reaplicação e desfazer de mapa, nome aprendido único/ambíguo e unidade incompatível, precisão fiscal e regressões de comparação/importação/catálogo. Três testes de integração passaram no emulador: fluxo novo, associações legadas e relatório/comparação. Cobrem grupo/role/login, prévia sem gravação, alteração de catálogo invalidando prova, repetição sem duplicação, preço original intacto, próxima nota reconhecendo alias, identidade confirmada para um único cadastro, aliases restaurados ao desfazer e conflito/invalidação recusados.

Navegador com serviço simulado e dados fictícios a 390px: dez sugestões iniciais, vinte após carregar; abrir par, confirmar, falha fictícia retendo conferência, nova tentativa, comparáveis de três para quatro e desfazer voltando a três. Sem largura horizontal excedente. Captura capturas/correspondencias-produtos/conferencia-mobile.png. Persistência e permissões testadas separadamente no emulador. Sem homologação física.

Lint completo e build PWA aprovados. Evidências output/correspondencias-testes-final.log, correspondencias-integracao-final.log, correspondencias-lint-final.log e correspondencias-build-final.log. Prévia e emuladores encerrados. Sem APK/instalação/Play/commit/push. Publicação seletiva: comprasOperacao e comprasRelatorio no Firebase ponto-app-1c55a, frontend no Netlify ponto1303.

## Publicação concluída

04/11/2026 às 11:45 (UTC−3): comprasOperacao ACTIVE (comprasoperacao-00031-loy), comprasRelatorio ACTIVE (comprasrelatorio-00010-ceg), projeto ponto-app-1c55a. Netlify deploy 6aeb44f4a7de06eebde4b218 ready, publicado 2026-11-04T14:45:22.799Z em https://ponto.acstech.dev.br. Sete rotas e 12 arquivos públicos iguais ao build final; consulta sem login recusada HTTP401. Sem associação real executada: as confirmações serão feitas pelo administrador na interface. Evidências: output/correspondencias-functions-deploy.log, correspondencias-servidor-verificado.json, correspondencias-netlify-deploy.json e correspondencias-publicado-verificado.json.

Pente-fino por catálogo, sem depender de compras registradas, publicado em 04/11/2026: ver [pente-fino-catalogo.md](pente-fino-catalogo.md).
