# Pente-fino administrativo do catálogo — 04/11/2026

Solicitação: botão para verificar nomes parecidos no catálogo e permitir mesclar, somente para administradores. Continuidade da organização dos produtos e das correspondências.

## Uso e alcance

Compras → Catálogo → Revisar produtos parecidos. Disponível apenas para administrador na interface e nas operações do servidor. Não depende de selecionar duas filiais nem de haver compras/preços registrados.

Leitura de cem cadastros por chamada, com cursor por ID. Cada execução lê até vinte páginas (2.000 cadastros) e pode continuar do ponto salvo; se houver mais, a interface informa verificação parcial. Parar encerra leitura/análise local; resposta antiga em voo é descartada. Reiniciar refaz a leitura. Inclui produtos da classificação selecionada e cadastros antigos sem classificação explícita, sinalizados para conferência no servidor. Produtos de outra classificação comprovada e inativos não entram nas sugestões. Contagem de cadastros examinados inclui os documentos percorridos antes desses filtros.

Análise em Web Worker, para manter a tela responsiva. Índice local de termos, prefixos/sufixos, abreviações usuais, pequenos erros de escrita e GTIN válido quando disponível. Não faz matriz completa nem garante todos os pares possíveis: amostra de até duzentas entradas por termo/prefixo/sufixo, vizinhos de nomes idênticos e até três melhores candidatos por produto. Isso é uma triagem de possíveis duplicatas. Não mescla automaticamente. Pares iguais são deduplicados, cadastros já associados ficam fora e produtos sem unidade válida são sinalizados para correção. Campos conhecidos de marca, dose, embalagem, versão, unidade e GTIN distintos permanecem separados. Números e strings do mesmo GTIN válido são normalizados para equivalência.

Sugestões em lotes de dez. Conferir este par abre dados atuais do servidor, pendências e possíveis conflitos. Administrador escolhe principal e confirma os atributos antes de Mesclar estes produtos. Manter separados apenas oculta a sugestão nessa verificação. Nova análise após mesclar remove o membro associado e permite continuar a revisão. Desfazer última mesclagem restaura a família e permite outras reversões no histórico existente do Catálogo.

## Servidor e preservação

catalogoParecidosPagina na callable comprasOperacao: grupo resolvido pelo vínculo autenticado, perfil admin ativo, cursores validados e resposta com metadados de produto limitados. Sem leitura de notas/contas de outro grupo. Strings antigas inválidas sanitizadas na resposta de revisão. Ausência de tiposCompra não é tratada como classificação comprovada: a prévia exige cadastro explicitamente associado ou histórico válido na classificação escolhida, conforme regra existente.

catalogoMesclaPrevia/catalogoMesclaConfirmar reutilizam a confirmação de correspondências, agora também por dois IDs de catálogo, sem exigir observações de preço. Servidor lê todos os membros das famílias (até vinte), valida classificação, compara atributos entre todos e identidades confirmadas anteriores, exige confirmação explícita e prova do estado/versão. Tentativa identificada é idempotente. Consolida principal, vínculos, nomes aprendidos e identidade; mantém preços/notas/quantidades intactos. Operação auditada como mesclarProdutos, origem pente_fino. Desfazer restaura vínculos, identidades, nomes e aliases anteriores, com bloqueio para operação posterior incompatível. IDs dos cadastros afetados são retornados para restaurar corretamente a visão local mesmo após nova leitura do catálogo.

Atualização do catálogo visível usa a rotina existente. Sem listener, polling, tarefa agendada, dependência, coleção, índice, regra, função pública nova ou infraestrutura. Leituras somente após iniciar/continuar, abrir conferência e confirmar/desfazer. Nenhuma verificação ou mesclagem executada em produtos reais pelo agente.

## Verificação

17 testes direcionados aprovados: nome abreviado, typo, medida equivalente, GTIN, variações conhecidas excluídas, dados intactos, candidatos além da primeira página, restauração local de catálogo relido e regressões de comparação/importação. Três testes de integração aprovaram scanner, correspondência existente e mesclagens antigas; o teste administrativo foi reexecutado na versão final. Cobrem 201 documentos em três páginas, classificação/inatividade, cursor inválido, grupo isolado, funcionário/consulta/sem login recusados, prévia sem gravação, catálogo alterado invalidando prova, mesclar sem preços, repetição sem duplicar auditoria, nomes aprendidos, desfazer e incompatibilidade conhecida bloqueada.

Navegador em 390px, serviço fictício e Worker real: parar antes da primeira resposta, retomar sem duplicar contagem, percorrer 230 cadastros, dez sugestões iniciais e treze após carregar; mesclar reduziu principais 230→229 e pares 13→12; desfazer restaurou 230 e treze pares, notificando atualização da lista de produtos. Sem largura horizontal excedente. Captura capturas/pente-fino-catalogo/mobile.png. Sem homologação física nem dados reais.

Lint e build PWA aprovados; asset catalogoParecidos.worker emitido pelo Vite. Logs output/pente-fino-testes-final.log, pente-fino-integracao.log, pente-fino-integracao-final.log, pente-fino-lint-final.log e pente-fino-build-final.log. Prévia/emuladores encerrados. Sem APK/instalação/Play/commit/push. Publicação seletiva de comprasOperacao no Firebase ponto-app-1c55a e frontend Netlify ponto1303.

## Publicação concluída

04/11/2026 às 13:10 (UTC−3): comprasOperacao ACTIVE no projeto ponto-app-1c55a, revisão comprasoperacao-00032-pur, atualização 2026-11-04T16:08:26.076542959Z. Netlify deploy 6aeb58e71bdabe80c829c37d ready, publicado 2026-11-04T16:10:31.506Z em https://ponto.acstech.dev.br. Sete rotas e 17 arquivos públicos iguais ao build final, incluindo Worker; chamada administrativa sem login recusada HTTP401. Nenhum produto real foi analisado ou mesclado pelo agente. Evidências output/pente-fino-functions-deploy.log, pente-fino-servidor-verificado.json, pente-fino-netlify-deploy.json e pente-fino-publicado-verificado.json.
