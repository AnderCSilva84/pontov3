# Direitos no cadastro de membros — 14/11/2026

Etapa local da issue #9. Não ativa assinaturas, grupos, compras ou deploy.

`criarMembroGrupo` consulta os direitos privados e valida o novo membro na mesma transação que grava vínculo, perfil e funcionário. A política depende de `assinaturasAtivas: true`; grupos em transição mantêm o comportamento anterior.

- Somente o titular cadastra novas contas; administrador adicional é recusado.
- Free recusa novas contas compartilhadas, inclusive de consulta. O ponto no aparelho do titular depende de implementação própria, ainda pendente.
- Planos pagos aplicam a cota 5/15/50 ao criar funcionário com login. Documentos antigos sem `ativo` contam; `ativo: false` libera vaga. Titular sem cadastro de funcionário não consome vaga.
- Consulta não consome vaga de funcionário. Repetição de operação concluída não cria outra conta.
- A transação revalida vínculo do ator e exclusão de ambas as contas. Uma revisão no grupo serializa inclusões concorrentes. Recusa remove o login criado pela tentativa, sem apagar contas anteriores.
- Expiração impede novas contas pelo direito Free e preserva registros existentes.

## Validação

Testes em Auth/Firestore `demo-ap1303` cobrem Free e limpeza de login, administrador adicional, duas inclusões na última vaga, funcionário legado/inativo, consulta/idempotência, expiração e transição. Também foi executada a integração de grupos. Log: `output/assinaturas-membros-emulador.log`.

Suíte geral: 369 aprovados, 59 ignorados, nenhuma falha. O novo teste de integração é ignorado fora dos emuladores e executado explicitamente neles. Lint aprovado. Uma expectativa antiga da integração de grupos foi corrigida: o transporte de push já bloqueia envios em emuladores; o teste passou a exigir zero envios.

## Cobertura restante antes de ativar

Esta etapa cobre somente **novos membros pelo callable**. Falta migrar/proteger criação e reativação direta de funcionários e alteração de usuários nas regras; aplicar cotas de listas/tarefas/lembretes em todas as escritas; restringir compartilhamento de contas existentes, QR e Escritório; implementar ponto do titular e migração. Não habilitar `assinaturasAtivas` em produção com cobertura parcial.

Depois da cobertura completa: criar direito e confirmação privada de entrega atomicamente, configurar RTDN externo, publicar backend de homologação e testar compra/renovação/expiração pela loja. Produção continua conjunta com a versão completa.
