# Compartilhamento e acessos — 15/11/2026

Entrega local da segunda etapa da #9: núcleo de compartilhamento e gestão de acesso após expiração. Não houve deploy, ativação de grupos/planos, exclusão de identidade real ou cobrança.

## Gestão pelo servidor

`gerirAcesso` substitui a alteração direta de perfil em Gestão. A transação revalida administrador/titular, grupo, vínculo de ator e destinatário, exclusão de conta e direito comercial. Não aceita grupo, funcionário escolhido pelo cliente, plano ou campo arbitrário de perfil.

- Em grupos com assinaturas ativas, somente o titular gerencia acessos; não pode demitir seu próprio papel de titular nem criar administrador adicional.
- Habilitar/alterar conta de terceiro exige plano com compartilhamento. Suspender continua permitido no Free, para reduzir acesso.
- `acessoCompartilhado:false` impede novas operações sem desativar Auth, perfil ou vínculo. Histórico próprio continua com as regras anteriores. Suspensão não equivale à exclusão da conta.
- Converter consulta em funcionário cria o cadastro faltante na mesma transação, aplicando a cota e a revisão compartilhada do grupo. Não reativa funcionário arquivado implicitamente.
- Permissões são delimitadas pelo papel. Identificação estável/marcador privado impedem repetir efeitos, e a auditoria registra operador, destinatário, operação e data.
- Regras recusam alteração direta de papel, permissões, vínculo funcional e suspensão em grupos habilitados. Atualização pessoal de token FCM permanece delimitada.
- A antiga exclusão administrativa de login recusa grupos com assinaturas ativas e orienta suspensão, preservando identidade/histórico. Solicitação de exclusão pela própria pessoa permanece no fluxo separado de conta.

## Operações compartilhadas

`compartilhamento.cjs` valida o estado privado atual dentro das transações. Titular mantém recursos próprios do Free; membro precisa de compartilhamento pago vigente e não suspenso. Cancelamento ainda vigente/carência verificada seguem o direito atual. Grupos em transição e conjunto legado mantêm o comportamento anterior.

Proteções integradas a compras/associações/correspondências, tarefas/ações de notificações, cuidados/lembretes/avisos/anexos, programação alimentar e pratos. Regras protegem também as gravações diretas e a leitura operacional dessas coleções; consultas do próprio ponto e dos próprios documentos/folhas permitidos continuam disponíveis.

Seleção de destinatários do transporte de push usa a mesma política: não seleciona membro expirado ou suspenso para novos envios operacionais. O transporte real continua bloqueado nos emuladores. Envio real e configuração externa de notificações ainda dependem da homologação prevista.

O frontend confirma compartilhamento antes de montar os módulos operacionais, preservando Minha conta, Planos, ponto próprio e comprovantes. Perfis suspensos não montam também os importadores/módulos pagos. A tela de bloqueio oferece caminhos de histórico e conclusão de jornada. Isso complementa a proteção no servidor.

## Continuidade e offline

As duas APIs de ponto recusam nova entrada individual sem compartilhamento. Uma jornada própria já aberta no servidor pode receber intervalo/retorno/saída, respeitando sequência e localização existentes. A exceção não cria outra entrada. Replay mantém o recibo original, sem novo efeito.

Captura offline recebida sem capacidade comercial é preservada como pendência, sem gravar jornada. O recebimento grava prova privada sobre a autorização comercial daquele momento, separada do relógio declarado pelo aparelho. Uma captura recebida com autorização verificável pode ser conciliada após expiração; sem essa prova, uma nova entrada do regime comercial continua pendente e não ganha autorização apenas por revisão ou pelo horário declarado. Rejeição explícita continua sendo decisão auditada do fluxo existente.

## Evidências

- Bateria ampliada: 112 testes de integração aprovados nos emuladores Auth/Firestore `demo-ap1303`, cobrindo módulos alterados, ponto/revisão, compras, regras, contábil e cotas.
- Após as últimas verificações de vínculo e otimizações das regras: 33 testes direcionados repetidos e aprovados, incluindo API anterior do ponto, recebimento offline, suspensão, histórico próprio e conversão concorrente na última vaga.
- Suíte geral: 374 aprovados, 64 ignorados, zero falhas. Quatro novos testes de política incluem a seleção operacional de destinatários. Lint e build web aprovados.
- Teste de leitura nova após expiração usa REST autenticado para não confundir dados previamente autorizados em cache/listeners do SDK com uma nova autorização. A documentação de [Timestamp.toMillis](https://firebase.google.com/docs/reference/rules/rules.Timestamp#toMillis) fundamenta a normalização de vigência nas regras; números/Timestamps foram exercitados nos emuladores.
- Leitura redundante do grupo no ponto foi evitada usando o snapshot da mesma transação. Testes anteriores de contagem de leituras/escritas permaneceram aprovados.
- Logs: `output/compartilhamento-final-emulador.log`, `output/compartilhamento-fechamento-emulador.log`, `output/compartilhamento-final-suite.log`, `output/compartilhamento-final-lint.log`, `output/compartilhamento-final-build.log`.

## Antes de habilitar em produção

- Conferir telas autenticadas e notificações no Android/PWA; estes testes não comprovam aceite físico.
- Implementar ponto no aparelho do titular no Free, seleção de funcionários após redução, proteção de jornadas abertas contra arquivamento e migração das contas atuais.
- Adequar transferência de titularidade do fluxo de exclusão ao administrador único: o fluxo atual procura outro administrador existente, enquanto a regra comercial impede criar administradores adicionais. Definir também a continuidade da identidade de cobrança na transferência. Não considerar essa combinação homologada ou ativar grupos antes de resolvê-la.
- Concluir concessão Diamante do criador, cobrança e homologação completa. Revisar permissões de integrações externas na migração; contas/perfis antigos não devem ganhar acesso automaticamente.

A #9 permanece em implementação. Publicação de frontend, Functions/regras e Android deve ocorrer no ciclo da candidata completa #7, sem ativação parcial de `assinaturasAtivas`.
