# Cadastro de funcionários com cota — 14/11/2026

Continuação da #9. Implementação local, sem deploy ou ativação de assinaturas.

## Entrega

- `cadastrarFuncionario` resolve o grupo pela sessão e revalida perfil, vínculo, exclusão e grupo dentro da transação.
- Operações `criar`, `garantir` (cadastro correspondente a usuário existente) e `reativar`; aceita somente operação e identificação, sem plano, grupo ou cota enviados pelo cliente.
- Em grupos com assinaturas ativas, somente o titular usa o cadastro; cotas 2/5/15/50 resolvidas pelo documento privado verificado. Expiração retorna ao limite Free.
- Funcionários sem campo `ativo` contam; somente `ativo:false` libera vaga. Revisão compartilhada do grupo serializa cadastros, inclusive com `criarMembroGrupo`.
- Identificação mantida na tentativa da interface evita duplicação ao repetir pedido após perda da resposta. Cadastro já concluído retorna sem consumir nova vaga.
- Novo funcionário no Escritório e garantia do cadastro na edição de acesso usam a Function. Edição de dados existentes continua no fluxo atual.
- Regras de grupos com assinaturas ativas recusam criação/exclusão direta e reativação direta. Titular pode editar dados e arquivar, preservando histórico. Grupos em transição mantêm suas permissões anteriores.

## Validação

Lint e build web aprovados. 20 testes passaram nos emuladores Auth/Firestore `demo-ap1303`, abrangendo verificação/RTDN, cadastro de membros, grupos e o novo fluxo. O cenário novo disputa três cadastros por duas vagas Free, testa repetição, edição/arquivamento, reativação via servidor, bloqueio de escrita direta, dados de grupo forjados, usuário inexistente e transição.

Logs locais: `output/assinaturas-funcionarios-emulador.log`, `output/assinaturas-funcionarios-build.log`, `output/assinaturas-funcionarios-suite.log`.

## Pendências

Não habilitar `assinaturasAtivas` em produção. Ainda faltam cotas de listas/tarefas/lembretes, gestão de acesso de usuários pelo servidor, compartilhamento existente após expiração, restrições de QR/Escritório, ponto do titular e migração. A política de cadastro não torna a seção Escritório disponível no Free; seu bloqueio integral depende da etapa de permissões.

Depois: entrega atômica dos direitos e confirmação privada, RTDN externo e homologação pela loja. Publicação deve incluir frontend e backend compatíveis, junto da candidata completa; o frontend novo depende de `cadastrarFuncionario` publicado no mesmo ciclo.
