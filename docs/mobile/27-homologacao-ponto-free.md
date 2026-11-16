# Homologação física do ponto Free — preparação, 16/11/2026

## Atualização: Free habilitado somente no grupo fictício

**Conferência após o titular informar concluído:** seleção salva pelo titular e confirmada pelo handler para func1/func2; ambos aguardam ENTRADA, sem jornadas abertas. Entretanto,0locais cadastrados e0referências locaisPermitidos em ambos. Foi orientado concluir Cadastro local e Salvar locais autorizados antes das marcações. Não tratar o retorno geral como prova do cadastro GPS; nenhuma escrita remota nesta conferência.

O titular confirmou todos os cadastros fictícios e escolheu func1/func2. Conferidos os nomes únicos ativos Teste func1/Teste func2 no grupo da conta informada. Em transação, revalidados titular, vínculo/perfil, administrador único, ausência de exclusão/assinatura/compras/entregas, gates desligados e ausência de jornada aberta. Atualizados somente assinaturasAtivas=true e revisaoConta no grupo exato. Nenhuma assinatura paga foi criada; terceiro funcionário e quatro contas preservados.

Pós-conferência somente leitura: plano resolvido Free, terminal habilitado,3funcionários/4membros preservados,0jornadas abertas, seleção ainda não confirmada e gates desligados. Consulta interna ao handler não é prova de login/teste físico. Evidências locais rodada27-ativacao-free.json e rodada27-free-depois.json. A referência histórica abaixo de nenhuma ativação descreve o estado anterior a essa confirmação.

**Passos no Android, pendentes:** entrar na conta separada; Gestão → Ponto, ajustes e locais; selecionar funcionário e cadastrar local fictício de teste com posição real usando Usar minha localizacao atual, raio adequado e Local ativo para validacao; autorizar esse local em Teste func1 e Teste func2 e salvar. Não publicar coordenadas no chat/Projects. No terminal do titular, abrir Funcionários autorizados para novas entradas, marcar apenas os dois e Confirmar seleção. Não arquivar Teste func3. Só então realizar sequência de marcações com intervalo e conferir resultado no backend.

O excesso de cadastro é intencionalmente preservado: não cria direito de iniciar jornada para o terceiro. Seleção do terminal limita novas entradas a dois; criação de novos cadastros continua bloqueada enquanto o uso excede a cota. Os demais membros deixam de ter acesso operacional compartilhado no Free; titular permanece autorizado. Isso ocorre só na fixture confirmada pelo titular, não no grupo principal ou no antigo demo_play_ap1303_v1.

Fonte: ponto-titular.cjs e PontoTitular.jsx já publicados na rodada26/Android interno7. Esta rodada prepara o cenário e os critérios; testes físicos e ativação continuam pendentes da identificação da conta separada.

**Conferência da conta recebida nesta rodada:** Auth ativo, vínculo ativo, grupo próprio, titular confirmado com role admin, sem perfil legado. Inventário somente leitura:3funcionários ativos (Free permite2),4membros,0listas/tarefas/lembretes,0jornadas abertas,0locais; sem documento de assinatura, compra ou entrega de assinatura. Gates privados desligados. UID/grupo e detalhes ficam apenas em output/rodada27-conta.json e rodada27-inventario-antes.json.

Foi solicitado confirmar que todos os cadastros são fictícios e indicar os dois funcionários do ensaio. Não arquivar/excluir o terceiro nem modificar vínculos automaticamente para caber na cota. Até esse retorno e definição do local, nenhuma ativação/escrita remota foi executada. O excesso pode ser aproveitado em teste específico de preservação pós-redução, mas deve ser registrado explicitamente; não alegar cenário inicial sem excedentes.

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
