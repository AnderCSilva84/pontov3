# Integrações, regras remotas e composição do lote — #9

Rodada iniciada em 15/11/2026 (America/Fortaleza). Inspeção das regras às 22:22 de 15/11, registrada pela API como 16/11/2026 01:22 UTC. Sem publicação ou alteração de dados remotos.

## Comparação efetiva das regras

O script somente de leitura `scripts/comparar-regras-remotas.cjs ponto-app-1c55a` consulta a release cloud.firestore e baixa sua fonte para output/rollout9-firestore-remoto.rules. Não usa o alias default, que aponta a outro projeto.

- Release remota: ruleset d9e1d2e3-ac07-41f7-be20-086978eb1bfe, atualizada em 03/11/2026 14:01:18 UTC.
- SHA-256 remoto: de4ae8eb4e763b702480672de471595f61d6e697e32573b25402903ec8045cfd.
- SHA-256 local: e04668110bd44ee9afbf2b2f4329a8dd2601035be293145d904ed4fc280d69c2.
- Remoto igual ao HEAD abfcd40, inclusive após normalizar quebras de linha. Local diferente: diff de 85 linhas adicionadas/54 removidas, correspondente às alterações comerciais já revisadas. Não são regras comerciais já publicadas.

Evidência em output/rollout9-regras-comparacao.json e resumo persistido no manifesto23. A releitura antes de publicar continua obrigatória para detectar mudanças posteriores.

## Resultado por integração

| Caminho | Autorização e dados | Decisão nesta rodada |
| --- | --- | --- |
| comprasApi /v1/listas, rankings, produto e melhor-preco | ID token Google com audience fixa e e-mail verificado de no-bolso-runtime@organizanderson.iam.gserviceaccount.com; destino legado derivado da migração; rejeita grupo/uid arbitrário por query; somente GET nessas rotas | Preservada autorização servidor-servidor existente. Não confundir a identidade da integração com um membro do grupo nem introduzir cobrança por plano |
| /v1/no-bolso/* | Mesma verificação do servidor precede o roteador; vínculo por código, escopo piloto, consentimento e revogação; status/resumo e ações de vincular/desvincular têm métodos e payloads próprios | Preservado. A API inteira não é somente GET: a exceção é o ciclo de vínculo, sem alterar compras |
| Resumo No Bolso | Verifica conta, perfil, vínculo reverso; busca apenas compras finalizadas por cada uid consentido; máximo 2 fontes e 300 compras; totais sem detalhe fiscal | Histórico próprio não recebe restrição comercial de compartilhamento nesta rodada; não concede consulta geral ao grupo |
| Central: produtos/consultar/historico | Perfil ativo, grupo resolvido no servidor; catálogo agregado com publicação mínima, paginação e limite por usuário | Continua disponível conforme definição dos planos; não exige assinatura paga |
| Central: configuração, revisão e lotes privados | Exigia somente perfil admin. Faltava conferir compartilhamento vigente no regime comercial | Corrigido localmente: guarda antes/depois da operação privada e dentro das transações de escrita |
| Eventos/lotes automáticos da central | Consentimento versionado, revisão de origem, retirada e recomposição; releitura transacional, idempotência e limite de tentativas | Mantidos. Suspensão de um membro não revoga consentimento do titular nem deve impedir retirada/reconciliação |
| Emissores de push | Chamadas de enviarPush/criarPush em index.js, lembretes.cjs e push.cjs | Já cobertos por dispararLembretes, oito alertas e testarNotificacaoPush do lote; registro/remoção de dispositivo não envia mensagens |

Esta revisão não substitui homologação real de serviços externos. A política aprovada em PLANOS-E-ASSINATURAS.md mantém central/No Bolso conforme disponibilidade e consentimento, sem exclusividade por plano.

## Código: o que mudou e por quê

Em functions/central-precos.cjs, as ações agregadas são identificadas explicitamente. As demais passam pela guarda de compartilhamento, preservando também a exigência de administrador. Ter role admin não basta quando o perfil perdeu acesso compartilhado. Titular Free e grupos em transição continuam autorizados conforme a política existente.

Nas alterações de consentimento, produto e local, a guarda é relida dentro da mesma transação das escritas. Se a suspensão ocorrer após a checagem inicial, a transação recusa a gravação. Para lotes disparados pelo usuário, uidAutorizado vem de request.auth.uid, é passado internamente à criação, aquisição da trava e processamento de cada fonte. Não é um campo aceito do cliente. Eventos internos continuam sem esse parâmetro e seguem a autorização pelo consentimento versionado. Uma suspensão não desfaz páginas que já foram processadas antes dela.

O teste comercial cobre titular Free, membro Free/pago/suspenso/expirado e transição. Um Proxy de teste suspende o membro antes da segunda transação: o aceite de contribuição é recusado e nenhum consentimento é gravado. O catálogo agregado permanece consultável. A guarda final de leitura reduz retornos após perda de acesso; não transforma resposta HTTP em transação atômica com futuras alterações de autorização.

## Lote candidato fechado para versionamento

O manifesto docs/mobile/23-lote-rollout-revisao.json agora contém **42 nomes únicos**: 30 entradas existentes da rodada23, centralPrecos e as 11 Functions novas já publicadas. As 11 entram para manter um snapshot coerente de dependências comerciais, não porque ACTIVE prova que a fonte é idêntica. Hashes das fontes e das regras atualizados após esta correção. As 42 usam nodejs24 remotamente e o pacote local declara Node24.

comprasApi não ganhou alteração funcional; os 14 gatilhos centralEvento* e centralExecutarLote também não: o novo uidAutorizado é opcional e só fornecido pelo handler autenticado. Mantêm a implantação anterior. Não publicar todas as Functions indiscriminadamente. Mudanças posteriores nesses caminhos exigem nova revisão do lote.

Ordem proposta: versionar o snapshot revisado; revalidar metadados/gates e assinatura dos hashes; atualizar as 42 Functions preservando nomes, regiões, identidades e retries; conferir saúde/autenticação; aplicar firestore.rules; testar cliente7 e grupo dedicado ainda em transição; só depois avaliar ativação comercial de homologação. O manifesto não executa nem autoriza deploy. Não restaurar regras antigas para contornar uma falha comercial sem avaliar a exposição causada.

## Validação concluída

- **21 testes aprovados, zero falhas/ignorados**, nos emuladores Firestore/Auth: central, ponte No Bolso, consultas e compartilhamento/Rules. Inclui suspensão concorrente. output/rollout9-integracoes-final.log.
- API externa/dominio: **11 aprovados, 1 ignorado** fora do emulador; o caso da ponte ignorado nessa execução foi executado na rodada emulada acima. output/rollout9-integracoes-unit.log.
- Suíte geral: **380 aprovados, 67 ignorados, zero falhas**. output/rollout9-integracoes-geral.log. Não contar ignorados como integrações verificadas.
- Lint e sintaxe de central-precos.cjs/comparar-regras-remotas.cjs aprovados. output/rollout9-integracoes-lint.log.

Revisão das integrações e comparação remota concluídas nesta rodada. Restam versionamento do conjunto, publicação coordenada e homologação funcional/comercial. Sem deploy, IAM, migração efetiva, cobrança, nova versão Android ou ativação de grupo nesta rodada. #9 continua aberta.
