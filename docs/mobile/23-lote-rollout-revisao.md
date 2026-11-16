# Lote de rollout: inspeção e correção — 15/11/2026

Rodada da #9. Consulta remota somente de metadados; nenhum deploy ou gate alterado.

**Continuação concluída no roteiro24:** integrações revisadas, regras remotas comparadas e guarda adicional na central. O JSON desta rodada foi atualizado para 42 candidatas e novos hashes; as 30 citadas abaixo descrevem o inventário inicial, não o lote atual. Ver [resultado mais recente](24-integracoes-e-regras-remotas.md).

## Resultado da inspeção

As 62 entradas exportadas localmente têm uma correspondência remota ACTIVE. Isso confirma existência e localização, **não equivalência do código**. O manifesto `23-lote-rollout-revisao.json` registra as 30 candidatas existentes, regiões, identidades, tipo de acionamento e hashes das fontes locais/regras. É fotografia de revisão; mudanças posteriores exigem novos hashes e não deve ser executado como autorização de publicação.

Mantidas as regiões atuais: callables e dispararLembretes em us-central1; os sete alertas explicitamente regionais em southamerica-east1. alertaListaCompras executa em us-central1 com gatilho Firestore em southamerica-east1 — região de evento não é região de execução. Nenhuma realocação proposta. testarNotificacaoPush entrou no lote por usar o mesmo filtro de destinatários dos alertas. Registrar/remover dispositivo não envia mensagens e não ganhou mudança funcional nesta rodada.

As 11 Functions novas continuam sendo uma linha de base separada; ACTIVE não comprova que os módulos compartilhados estão na revisão local. Antes da publicação, conferir se precisam de atualização no mesmo conjunto. comprasApi, centralPrecos e emissores indiretos continuam como dependências a revisar; esta rodada não declara o rollout inteiro pronto.

## Correção no código e motivo

Além de noBolsoConsulta/comprasEstimativa já corrigidas, comprasRelatorio tinha o mesmo desvio: perfil ativo bastava para consultar dados de compras do grupo. Em functions/compras.cjs a entrada agora chama exigirConsultaCompartilhada antes da leitura do relatório e antes do retorno. Reutiliza a política de functions/compartilhamento.cjs: titular preservado, membro exige direito vigente e não suspenso; grupos em transição conservam comportamento anterior.

Por que no servidor? O Admin SDK das Functions ignora Security Rules. Bloquear a tela ou o acesso direto ao Firestore não protege uma Function callable. Por que duas verificações? Uma recusa quem já não pode consultar; a outra verifica novamente a autorização após a leitura. Isso reduz exposição durante suspensão concorrente, mas não transforma a resposta HTTP e mudanças futuras de acesso em uma operação atômica.

Teste novo invoca comprasRelatorio.run, a entrada callable, e cobre membro Free, pago, suspenso, expirado, titular Free e transição. Não acrescenta regras ao helper de relatório, pois ele também serve integrações internas com outros contextos de autorização. Essas integrações seguem revisão própria.

## Security Rules e ordem

Revisado o diff de firestore.rules: documentos comerciais privados negam acesso direto; leituras compartilhadas exigem vigência; criação/reativação que conta cota passa ao backend; histórico próprio de ponto e financeiro é preservado. O lote deve atualizar os handlers necessários antes de restringir as gravações do cliente, mantendo grupos em transição. Depois aplicar regras e validar cliente7/grupo dedicado; ativação é etapa posterior. Não alterar grupos principais para testar.

As regras locais foram carregadas na regressão de compartilhamento com Auth/Firestore emulados. Regras remotas ainda precisam de comparação de versão antes de publicar. Não foi feito rollback ou alteração de dados.

## Evidências

16 testes direcionados aprovados, zero falhas/ignorados: consultas de preços e compartilhamento, incluindo Security Rules. Logs output/rollout9-regressao.log. Sintaxe de compras.cjs e do teste aprovada. Metadados remotos e comparação em output/rollout9-functions-remotas.json e rollout9-comparacao.json. Lint aprovado; suíte geral: 380 aprovados, 67 ignorados, zero falhas. Logs rollout9-lint.log e rollout9-tests.log. Ignorados não equivalem a integrações executadas.

Sem deploy, nova versão Android, mudança IAM, ativação comercial ou cobrança. Próximo fechamento: integrações externas/centrais, comparação das regras remotas e composição versionada do lote completo; depois homologação funcional do grupo dedicado.
