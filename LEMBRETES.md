# Lembretes e resumo de tarefas

O administrador habilita `Babá/Cuidadora` em Escritório → Usuários cadastrados → Editar acesso. A funcionária habilitada vê a aba Lembretes; somente o administrador cadastra, edita, pausa e exclui. A funcionária confirma a realização dos próprios cuidados.

Para administradores, o mesmo editor de acesso tem a opção `Receber lembretes — disponível 24 horas`, persistida em `lembretesHabilitados`. Administradores habilitados podem ser responsáveis por lembretes próprios e também recebem os avisos dos lembretes da funcionária. A confirmação do cuidado permanece única; não é necessário duplicar o cadastro para avisar o administrador.

A funcionária só recebe avisos se o horário previsto e o momento do envio estiverem dentro da escala cadastrada em `funcionarios/{funcionarioId}.escala`, no fuso UTC−3. Dia sem escala, funcionário inativo ou escala inválida não gera aviso para ela. Jornada que atravessa a meia-noite usa também a escala do dia anterior. A expiração do aviso é limitada ao fim da jornada. Administradores habilitados não têm essa restrição. Sem escala, os avisos aos administradores continuam funcionando.

Os cuidados identificam criança, idoso, adulto, cão ou gato e podem guardar o nome. Pets exigem nome. Consultas usam a mesma programação por data e dias, sem exigir medicamento ou posologia. Remédios de pets mantêm as doses e confirmações individuais.

## PDF da escala

O PDF é uma escala do que deve ser realizado, com medicamento/cuidado, posologia/orientações, horários ordenados, dias da semana e data de início. A pessoa ou pet pode ser selecionado; ao exportar todos, cada um começa em uma nova página. Não é relatório de administrações concluídas. Lembretes pausados e ocorrências únicas de datas anteriores não entram na escala.

A exportação reutiliza a leitura autenticada dos lembretes e a logo do AP1303, com azul, branco e vermelho. Há opções de baixar, abrir para imprimir e compartilhar o arquivo pelo menu nativo do celular, incluindo WhatsApp. Os horários e orientações vêm dos cadastros; nenhuma dose é calculada ou sugerida pelo sistema.

## Confirmação no ponto e diagnóstico de avisos

O botão de registrar ponto pede confirmação se a conta for de administrador, antes de consultar localização ou chamar o backend. Cancelar não registra ponto. O backend mantém o autor da marcação em `registradoPor`.

O diagnóstico do aviso de 20/10/2026 às 07:00 identificou destinatário com perfil funcionário e recibo de aceitação do serviço push às 07:00:33, UTC−3. A conta do administrador não era destinatária desse aviso. O recibo confirma aceitação pelo serviço, não exibição no aparelho. A tela oferece teste de aviso no próprio celular. As novas ocorrências preservam `notificacaoStatus` separado da confirmação e indicam se houve aceitação de aviso aos administradores.

Os lembretes incluem tipo, título, data, horários, repetição (uma vez, diariamente ou dias da semana) e observações. Remédios exigem nome e posologia informada pelo administrador. O campo “Vezes por dia” aceita de 1 a 24 horários distintos por remédio. A confirmação é individual por dose e registra a ocorrência, o usuário e o horário, sem concluir outras doses ou os próximos dias. Lembretes antigos com um único horário continuam funcionando sem migração.

## Dados e acesso

`lembretes/{id}` mantém a programação e a última ocorrência. `lembretes/{id}/ocorrencias/{versao_horarioMs}` conserva o registro de cada disparo/conclusão, com os dados do cuidado naquela ocorrência. Edições usam versão para evitar sobrescrita concorrente.

`horarios` guarda os horários ordenados, e `horario` mantém o primeiro para compatibilidade. O próximo disparo percorre os horários do mesmo dia antes de avançar para o próximo dia permitido. A leitura devolve as ocorrências do dia, permitindo confirmar uma dose anterior mesmo depois do aviso da seguinte.

Leitura e alterações passam pela callable autenticada `lembretesOperacao`. O servidor consulta o perfil ativo e o vínculo de cuidadora em cada operação. A funcionária não pode editar a programação, acessar outra funcionária ou habilitar a própria permissão. Não foi necessário alterar as regras ou os índices do Firestore nesta entrega.

`dispararLembretes` executa a cada minuto em America/Fortaleza (UTC−3), com invocação privada pelo Cloud Scheduler. Reutiliza os dispositivos push existentes e envia somente aos dispositivos da responsável. Reserva por ocorrência e recibos evitam reenvios em concorrência. Avisos com atraso superior a 15 minutos não são enviados; a ocorrência continua distinguida de uma confirmação realizada. O texto da tela não promete entrega pontual: notificações dependem de permissão, conexão e do sistema do aparelho.

## Tarefas

Tarefas fixas e avulsas iniciam recolhidas. O contador mostra concluídas/total, amarelo pulsante enquanto há pendências e verde quando tudo foi concluído. Sem tarefas: 0/0 neutro. A preferência de movimento reduzido desativa a pulsação. Tarefas avulsas concluídas em dias anteriores não entram no contador de hoje.

## Validação da entrega

- Lint e build aprovados; 66 testes unitários, 32 testes na rodada de integração e 10 na conferência final específica de lembretes aprovados. A conferência específica inclui o limite de expediente no momento do envio.
- Duas doses no mesmo dia: avisos separados, manutenção da primeira pendente após o segundo aviso, conclusão independente e avanço para o próximo dia permitido. Formulário e reabertura da edição conferidos com 08:00 e 20:00 em dias da semana.
- Integração com emuladores: permissões, posologia, concorrência, idempotência, conclusão antes da execução do agendador, repetição, falhas transitórias e revogação de acesso.
- Interface com contas fictícias: cadastro pelo administrador, perfil da cuidadora sem edição, administração de remédio com horário e contadores 3/10 → 10/10, sem excesso horizontal na tela móvel.
- Backend publicado no projeto `ponto-app-1c55a`, somente as duas funções novas. Agendador habilitado e resposta HTTP 200 verificada. Nenhum lembrete real foi criado para testes.
- A exibição no celular do administrador ainda precisa ser confirmada após habilitar `Receber lembretes — disponível 24 horas` na conta dele. O botão `Testar aviso neste celular` renova a assinatura e permite conferir a exibição. Nenhuma notificação real foi enviada pelos testes.

Publicação desta rodada: funções atualizadas no `ponto-app-1c55a`, agendador habilitado e HTTP 200 verificado; interface publicada na Netlify em `6ad79704250275f8ef288fa2`, com o bloqueio de publicação preservado e arquivo de entrada conferido no domínio de produção.

## Pessoas e pets cadastrados

O administrador usa “Cadastrar pessoa ou pet” em Lembretes para registrar nome, tipo (criança, idoso, adulto, cão ou gato) e destinatário: um usuário habilitado ou todos os habilitados. O cadastro fica em `pessoasCuidados`, com versão para impedir sobrescrita concorrente. Somente a função autenticada acessa a coleção; a leitura direta do Firestore permanece bloqueada.

Os novos lembretes usam `cuidadoId`. Nome, tipo e responsáveis são resolvidos no servidor a partir desse cadastro. Alterar o responsável muda o acesso e os próximos envios dos lembretes vinculados, sem duplicar os cuidados. Administradores consultam todos; funcionários com Babá/Cuidadora consultam apenas os atribuídos a eles ou compartilhados. Os administradores habilitados continuam recebendo cópias de supervisão dos cuidados da funcionária. “Todos” respeita a habilitação individual e a escala da funcionária; administradores recebem 24 horas. A confirmação de cada dose é única e compartilhada.

Os lembretes antigos permanecem em “Lembretes anteriores por usuário”. É possível vinculá-los a um cadastro ao editar. Não há agrupamento ou migração automática por nome, para evitar confundir pessoas homônimas. O PDF permite selecionar qualquer cadastro acessível, independentemente do usuário escolhido na consulta antiga. A exportação de todos separa os cadastros por ID, incluindo homônimos em páginas distintas, com o responsável de cada um e a identidade visual do AP1303.

Validação: `tests/lembretes-cuidados-emulador.test.cjs` cobre criação restrita, atribuição, reatribuição, acesso revogado, supervisão, envio para todos habilitados, jornada e confirmação concorrente da mesma dose, exclusivamente com dados fictícios.

## Sequência diária de cuidados

A tela principal mostra uma ação pendente por vez, em ordem de horário, com medicamento/cuidado, pessoa ou pet, posologia, observações e botão Concluir. A ação seguinte aparece discretamente abaixo. Após confirmação bem-sucedida no servidor, a ação concluída é ocultada e a próxima ocupa seu lugar. Horários futuros ficam visíveis, com conclusão liberada somente ao chegar o horário. Ao terminar a sequência, aparece “Nenhuma ação pendente para hoje”. A cada dia local (UTC−3), a sequência é refeita respeitando dias da semana, data de início, pausas e doses já confirmadas naquele dia. A edição permanece em “Gerenciar lembretes cadastrados”, recolhida por padrão, somente para administradores. PDF e notificações preservam o fluxo existente.

## Identidade da sessão e supervisão

“Conta conectada” é sempre o nome do perfil autenticado, sem herdar o primeiro responsável da lista. O administrador pode filtrar lembretes de outros usuários; o filtro não troca a identidade nem o autor da conclusão, validado com `request.auth.uid`. A consulta dos lembretes antigos inicia com todos os autorizados para administradores. Os cuidados cadastrados mantêm a seleção por pessoa ou pet. A tela é remontada ao mudar o UID da sessão para não reutilizar filtros, formulários ou dados da conta anterior. A supervisão administrativa e as cópias de notificações permanecem disponíveis 24h para administradores habilitados; a escala restringe apenas as notificações da funcionária.
