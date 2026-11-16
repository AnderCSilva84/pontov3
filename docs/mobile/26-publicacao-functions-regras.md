# Publicação coordenada de Functions e regras — #9

15/11/2026, America/Fortaleza. Fonte publicada: commit **681ac8a78724e88f307d6bde8cf546b0d06f24b6**, branch feat/rebrand-ta-no-ponto. O usuário solicitou avançar ao próximo passo após a preparação25. Esta rodada publicou backend/regras; não publicou frontend, nova versão Android ou cobrança.

## Resultado efetivo

1. Preflight local aprovado: 42 nomes únicos, 86 fontes, hashes normalizados e Git conferidos. Nenhuma modificação nas fontes Functions/regras antes do envio.
2. Reinspeção das 42 entradas remotas: regiões, identidades, gatilhos/retries e updateTime preservados desde a revisão. A API pode ordenar eventFilters diferentemente; a comparação ordena por atributo para não confundir ordem de JSON com mudança de configuração.
3. Deploy seletivo das **42 Functions concluído**, com 42 mensagens Successful update operation e saída zero. Nenhuma criação, exclusão ou realocação de Function. Runtime Node24 mantido.
4. Pós-deploy: todas ACTIVE e com updateTime novo; identidades/gatilhos/retries preservados; **30 callables retornaram 401 UNAUTHENTICATED** sem autenticação. As outras **20 Functions fora do lote conservaram updateTime**.
5. Consulta Cloud Logging de erros Cloud Run desde 16/11/2026 01:40 UTC, limite40: nenhum resultado na janela consultada. Isso não prova ausência de falha futura ou substitui teste autenticado.
6. Após os checks anteriores, deploy **somente firestore:rules concluído**. Release publicada às 01:46:50 UTC de 16/11 (22:46:50 de 15/11 em Fortaleza).
7. Fonte remota baixada e comparada: hash bruto e conteúdo normalizado iguais ao arquivo local. Dois documentos privados recusaram leitura REST sem autenticação com 403 PERMISSION_DENIED.
8. Revalidação de cobrança/retomada/inventário aprovada: gates desligados; grupo dedicado em transição; inventário preservado. Sem ativação, recibo real, cobrança ou migração efetiva.

Ruleset efetivo: **61c9fc1a-7710-4892-a938-23be3aafbf99**. SHA-256: **e04668110bd44ee9afbf2b2f4329a8dd2601035be293145d904ed4fc280d69c2**. Esse estado substitui a release de 03/11 citada nas revisões anteriores. O campo regrasPublicadas do manifesto23 permanece a fotografia anterior usada como base da revisão, não um monitor do estado atual.

## O que foi colocado em funcionamento e por quê

Agora os caminhos antigos recebem as guardas comerciais revisadas, não somente os endpoints novos. Inclui consultas de compras/No Bolso, gestão privada da central, cotas, ponto, contábil, compartilhamento e destinatários de push. Grupos em transição preservam a política anterior; publicar a validação não ativa automaticamente uma assinatura ou converte um grupo.

Functions usam Admin SDK e precisam de suas próprias verificações. Security Rules protegem o acesso direto feito pelo SDK do cliente. Essas camadas se complementam: apenas esconder uma tela ou publicar regras não protege um callable vulnerável.

Backend primeiro, regras depois: evita impor restrições novas ao cliente antes de os handlers estarem disponíveis. Se o deploy fosse parcial, o roteiro exigia parar antes das regras. A checagem sem autenticação confirma somente a barreira de entrada; cotas, permissões pagas e continuidade precisam de homologação autenticada dedicada.

## Verificador e observações da execução

Criado scripts/verificar-rollout-assinaturas.cjs. Recebe projeto explícito, compara capturas completas antes/depois e faz apenas chamadas sem autenticação. Usa pedidos fictícios de formato válido: algumas entradas devolvem 400 INVALID_ARGUMENT antes de verificar login; esse 400 não prova a barreira de autenticação. Os verificadores Play recebem apenas a string fictícia homologacao-sem-compra, sem compra real, e recusam por falta de autenticação antes de consultar a Play.

Durante a preparação do verificador, foi corrigida uma referência de variável na busca da captura anterior e ajustados os payloads de teste. A execução final aprovada é a registrada em rollout26-verificacao.json; falhas intermediárias do instrumento não foram tratadas como evidência de sucesso.

A CLI das Rules emitiu **10 avisos não bloqueantes** de Invalid variable/function name nos auxiliares legados (request/get/exists, linhas32–62), mas compilou e liberou as regras com sucesso. Essas linhas preexistem ao diff comercial. Avisos registrados para revisão futura; não justificar relaxar permissões por causa deles. Os testes emulados anteriores cobrem Rules, e os smoke reais desta rodada cobrem apenas recusas sem autenticação.

## Estado preservado e evidências

- Grupo demo_play_ap1303_v1: 1 funcionário, 2 listas, 9 tarefas, 1 lembrete; sem excedentes/jornadas abertas/bloqueios. assinaturaInventario igual à rodada25.
- Configuração comercial permanece desligada; assinaturasAtivas do grupo dedicado não é true. Retomada RTDN ENABLED, a cada15min. Nenhuma nova concessão IAM solicitada pelo agente.
- Lint e sintaxe do novo verificador aprovados. Regressão funcional da fonte publicada: 21 testes emulados aprovados e geral380/67 ignorados/0 falhas nas revisões anteriores; não repetir a suíte sem mudança funcional.
- Não houve push, deploy Netlify/PWA, envio Android, ativação de produtos, cobrança ou escrita de teste autenticada em grupos reais.

Evidências locais, ignoradas pelo Git: rollout26-deploy-functions.log, rollout26-functions-antes.json, rollout26-functions-depois.json, rollout26-verificacao.json, rollout26-smoke.log, rollout26-erros-runtime.json, rollout26-deploy-rules.log, rollout26-regras-antes.json, rollout26-regras-depois.json, rollout26-firestore-sem-auth.json, rollout26-backend-antes.json, rollout26-backend-depois.json, rollout26-inventario-depois.json e rollout26-lint.log. Como o comparador sobrescreve seus arquivos padrão, os arquivos rollout26-regras-antes/depois preservam ambos os resultados.

## Próximo passo

**Retorno físico recebido:** após esta publicação, o titular confirmou abertura normal de Compras/Tarefas/Lembretes/Gestão e conta ainda conectada. Evidência por relato no Android interno, sem leitura ADB ou verificação das operações específicas. Carregamento básico concluído; não equivale à homologação comercial.

Preparar cenário autenticado no grupo dedicado, revisar filas/locais/seleção do ponto e só então considerar ativação comercial de homologação e compra controlada. Verificações específicas de dados e fluxos continuam pendentes; não criar/excluir dados do grupo principal para ensaiar. Não marcar a #9 ou #7 concluída apenas pelo deploy ou carregamento das telas.
