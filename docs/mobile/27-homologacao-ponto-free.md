# Homologação física do ponto Free — preparação, 16/11/2026

Fonte: ponto-titular.cjs e PontoTitular.jsx já publicados na rodada26/Android interno7. Esta rodada prepara o cenário e os critérios; testes físicos e ativação continuam pendentes da identificação da conta separada.

## Identificação antes de qualquer alteração

O titular informou que criaria uma conta separada. Foi solicitado e-mail ou UID, sem senha. Não presumir que a conta foi criada nem que pertence ao grupo demo_play_ap1303_v1. O cadastro criarGrupo usa g_UID; um usuário novo pode criar outro grupo de teste. Não transferir a titularidade do grupo antigo nem trocar vínculo para encaixar a conta em uma fixture.

Com a conta identificada, conferir por leitura: Auth ativo, vínculo ativo, grupo correto/ativo, titularUid igual ao UID, perfil admin único, ausência de solicitação de exclusão e de assinatura/cobrança paga. Confirmar que os dados são fictícios. Registrar UID/grupo somente em evidência local quando necessário; não publicar e-mail ou coordenadas no Projects. Se houver dados legados da conta, não migrar automaticamente.

## Preparação controlada (pendente)

1. Inventariar o grupo exato com scripts/inventariar-assinaturas.cjs. Conferir sem excedentes, jornadas abertas ou bloqueios e confirmar filas pendentes no aparelho antes de sair da conta principal. Não limpar dados ou filas.
2. Preparar dois funcionários fictícios sem login e um local autorizado usando a posição real do aparelho, raio definido e locaisPermitidos dos funcionários. Configurar jornada com intervalo para testar quatro marcações; não usar a fixture0,0 dos emuladores no Android físico.
3. Habilitar assinaturasAtivas somente no grupo de teste conferido. Sem criar recibo/assinatura paga, alterar direitos de outro grupo ou ligar gates Play/Mercado Pago. Free é resolvido pela ausência de direito pago válido. Confirmar autorização/transição novamente no instante da escrita e registrar antes/depois.
4. No Android, entrar na conta de teste, abrir o terminal do titular em Gestão e confirmar explicitamente a seleção dos dois funcionários. O servidor não escolhe automaticamente após ativação.

Sem identificação da conta, nenhum desses passos remotos foi executado. A autorização do titular abrange o ensaio no grupo dedicado, não uma ativação geral.

## Checklist de execução e resultados esperados

| Caso | Ação / resultado esperado | Evidência atual |
| --- | --- | --- |
| Disponibilidade | Titular ativo vê o terminal quando grupo está comercialmente habilitado e plano resolvido Free | Pendente no aparelho |
| Seleção | Selecionar dois funcionários; recarregar mantém seleção confirmada | Pendente |
| Confirmação individual | Marcação desabilitada até confirmar o nome exibido | Pendente |
| Jornada | Entrada → saída para intervalo → retorno → saída; próximos botões respeitam sequência | Pendente |
| Autor e relógio | Registros possuem funcionário escolhido, registradoPor=UID do titular, origem terminal_titular e autoria individual; horário/data calculados no servidor em Fortaleza | Pendente de conferência backend |
| Segundo funcionário | Sequência independente, sem misturar jornadas ou recibos | Pendente |
| Limite Free | Terceiro cadastro ativo recusado, permanecem somente dois; sem excluir dados para simular sucesso | Pendente |
| Local | Sem GPS autorizado não há envio; posição fora do raio gera rejeição sem registro de jornada | Pendente |
| Conexão | Sem internet o terminal informa que precisa conectar e não confirma marcação; não confundir com fila offline do ponto individual | Pendente |
| Repetição | Repetir a mesma tentativa pendente preserva operacaoId e GPS original; recibo impede duplicação | Pendente, só se ocorrer envio incerto ou em ensaio controlado |
| Escrita direta | Cliente não altera documentos privados/recibos; bloqueio já coberto por regressão, ensaio físico apenas em conta dedicada se necessário | Não validado fisicamente |
| Recursos Free | Escritório operacional, compartilhamento e importação QR permanecem bloqueados; histórico permitido preservado | Pendente |

O servidor pode devolver status rejeitada com HTTP de sucesso: conferir status/recibo e ausência de registro/dia alterado; não interpretar apenas HTTP200 como ponto confirmado. Capturar operacaoId e horário exibido, sem credenciais. Em rejeição, não editar registros manualmente. Ao terminar, encerrar as jornadas fictícias e inventariar novamente; documentar resultado real por caso.

## Por que essas checagens existem

O usuário autenticado é o titular, enquanto o funcionário é o destinatário da marcação. O servidor valida ambos e registra a autoria. O limite de cadastros e a seleção são verificações diferentes: caber na cota não substitui a confirmação de quem terá a jornada iniciada. Recibos transacionais tornam a repetição segura; guardar apenas o horário na tela não garante isso.

Revisão desta rodada foi de preparação baseada no código existente; sem alteração funcional, novo deploy, ativação remota ou testes físicos aprovados. Não repetir suites somente para preencher uma rodada de documentação. Evidências automatizadas anteriores continuam nos roteiros17/24/26.

## Próxima frente solicitada

Após esta rodada, priorizar **#16 — Melhorar visual e fluxo**. Issue consultada em16/11: notificação de refeição; simplificação de Planos/renovação/cancelamento; estado de carregamento; alinhamento/ícone em Compras; histórico contábil com5itens e carregar mais; repetição de escala semanal; PDF; cadastro completo de funcionário e acesso/data inicial da escala. Preservar todos os itens da issue e não marcar implementados neste registro. A pendência física da #9 não desaparece ao iniciar a #16.
