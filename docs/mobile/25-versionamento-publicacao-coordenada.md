# Snapshot e preparação da publicação coordenada — #9

Rodada de 15/11/2026, retomada após revisão24. Objetivo: registrar em Git o conjunto acumulado de assinaturas e preparar a publicação seletiva. Publicação, push e ativação não fazem parte desta preparação.

## Unidade de versionamento

Um commit reúne backend, regras, testes, cliente PWA/Android e documentação acumulados, incluindo jornadas semanais já revisadas. Esses arquivos têm contratos entre si: registrar somente handlers e esquecer novos módulos ou clientes não produziria uma versão reproduzível. A seleção é explícita, gerada a partir dos arquivos modificados/novos e conferida por escopo. Não usa git add . ou inclui output, builds, .env, arquivos de assinatura e configurações locais.

O commit pode ser identificado com `git log -1 --format="%h %s"`. Antes desta rodada a base era abfcd40. O hash do próprio commit não é escrito dentro dele, pois isso criaria uma referência circular; o resultado é registrado na issue9 do Projects.

## Verificador local

Executar na raiz: `node scripts/validar-lote-assinaturas.cjs`.

Ele não chama a nuvem. Confere projeto, 42 nomes únicos, regiões permitidas, inventário completo de fontes, hashes normalizados e presença em Git, incluindo manifesto e verificador. Recusa mudanças não incluídas no commit no backend/regras/manifesto. Antes do commit, a recusa por arquivos ainda não versionados foi verificada.

O manifesto23 guarda o hash dos bytes originais e um hash com LF normalizado. Git no Windows pode converter CRLF/LF ao gravar e abrir arquivos. O hash normalizado permite conferir o conteúdo da fonte sem confundir uma mudança de quebra de linha com mudança de lógica. Ainda é preciso revisar código e configuração: hash igual não prova ausência de defeitos.

## Sequência preparada para a próxima publicação

1. Confirmar branch/commit, executar o verificador local e assegurar que não há alteração posterior nos arquivos selecionados. Guardar hash do commit e logs da execução.
2. Reconsultar Functions, gates, job RTDN, inventário do grupo demo_play_ap1303_v1 e regras ativas. Usar projeto explícito ponto-app-1c55a. Parar se nomes/regiões/identidades/retries mudaram ou se houve ativação não prevista. O inventário não autoriza migração.
3. Publicar somente as 42 Functions do manifesto, preservando identidades, regiões e triggers; conferir sucesso de cada uma, autenticação e logs. Falha parcial interrompe a sequência: não aplicar regras nem ativar grupos para mascará-la.
4. Publicar somente firestore:rules após a saúde do backend ser verificada. Não incluir indexes, hosting, Netlify ou versão Android por conveniência.
5. Validar o cliente7 e o grupo dedicado com dados fictícios, primeiro em transição. Compras e direitos comerciais de teste precisam de uma etapa própria; não ativar grupos reais ou simular recibos.

Comandos preparados abaixo são roteiro manual da publicação futura, **não foram executados nesta rodada**:

```powershell
node scripts/validar-lote-assinaturas.cjs
node scripts/verificar-homologacao-backend.cjs ponto-app-1c55a
node scripts/inventariar-assinaturas.cjs --project ponto-app-1c55a --grupo demo_play_ap1303_v1
node scripts/comparar-regras-remotas.cjs ponto-app-1c55a

# Somente na rodada de publicação: seleção lida do manifesto versionado.
$loteAssinaturas = Get-Content -LiteralPath docs/mobile/23-lote-rollout-revisao.json -Raw | ConvertFrom-Json
$alvosAssinaturas = @($loteAssinaturas.entradasCandidatas | ForEach-Object { 'functions:' + $_.nome })
firebase deploy --project ponto-app-1c55a --only ($alvosAssinaturas -join ',')

# Somente após verificar a implantação e saúde de todas as Functions.
firebase deploy --project ponto-app-1c55a --only firestore:rules
```

Não usar `firebase deploy` sem seleção. O alias default aponta a outro projeto. Validar metadados do lote completo: o verificador de homologação existente cobre as seis Functions de cobrança, não substitui a inspeção das outras 36.

## Verificação e recuperação

Suite da revisão24: 21 testes emulados aprovados, geral 380 aprovados/67 ignorados/0 falhas. Nesta rodada, lint e build web são revalidados para fechar o conjunto integrado. Logs output/versionamento25-*.log, seleção exata em output/versionamento25-arquivos.json.

O estado anterior dos metadados está em output/rollout9-functions-remotas.json; a fonte das regras ativas em output/rollout9-firestore-remoto.rules. Não presumir que o commit-base corresponde exatamente a todas as fontes remotas: esses snapshots não são um pacote completo de rollback. Se houver falha, manter gates desligados e grupos em transição, registrar endpoints afetados e corrigir o lote; não apagar filas/recibos nem relaxar regras para forçar acesso.

Nenhuma cobrança, migração efetiva ou publicação de produção está comprovada por este commit. Permanecem homologação física funcional, compra controlada, Mercado Pago/PWA, concessão do criador e critérios da #7.
