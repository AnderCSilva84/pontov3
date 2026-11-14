# Cardápio do dia — arquivamento local implementado em 29-10-2026

Pratos com `modo:data` vencem quando sua data é anterior ao dia civil de Fortaleza (UTC−3). No primeiro carregamento após a virada, o servidor arquiva os vencidos em transação: `ativo:false`, `arquivamentoAutomatico:true`, `arquivadaEm` e versão incrementada. Preserva data, receita, foto, responsável e autoria. Repetições semanais e datas futuras continuam ativas.

Não há promessa de escrita à meia-noite com o app fechado: é arquivamento oportunista ao consultar/cadastrar. A tela usa relógio local programado para a próxima meia-noite e eventos de foco/visibilidade para esconder pratos vencidos, inclusive enquanto a consulta falha/offline. O temporizador de 30 segundos foi removido. O backend decide o vencimento pelo próprio relógio; data enviada pelo cliente não antecipa arquivamento.

Em Tarefas, a gestão do cardápio passa a oferecer Programação e Arquivados. Histórico em páginas de 25; foto acessível sob a mesma autorização do proprietário/admin. Administrador pode editar/reprogramar um prato; funcionário não ganha permissão para edição ou arquivamento manual. Isolamento pelo contexto de grupo preservado.

Custos estimados: a listagem reaproveita a consulta de pratos ativos (limite existente 101) e acrescenta uma escrita por prato vencido, somente uma vez; repetir a listagem não regrava o arquivo. Abrir Arquivados acrescenta consulta de até 26 documentos para detectar próxima página. Cadastro reaproveita sua verificação limitada de ativos para não bloquear novos pratos por datas vencidas. Sem varredura global, migração, índice novo, listeners adicionais, polling, Scheduler ou serviço pago.

Arquivos: functions/pratos-dia.cjs, novo functions/pratos-calendario.mjs, src/components/PratosDia.jsx e testes direcionados de calendário/pratos.

Validação: virada UTC−3; passado/hoje/futuro/semana; preservação de conteúdo; ausência de regravação no replay; acesso ao arquivo/foto; paginação; permissões e grupos. Lint e builds PWA/Android reduzido aprovados; emuladores com dados fictícios, sem teste físico. Esta implementação ainda não foi publicada nem instalada; futura publicação exige frontend e deploy seletivo de lembretesOperacao. As mudanças anteriores continuam preservadas.

## Publicado em 29/10/2026

Arquivamento e aba Arquivados publicados em lembretesOperacao/us-central1, revisão lembretesoperacao-00013-car, e PWA deploy6ae3786e5b305762782fe9c9. Teste de integração de pratos aprovado. APK local atualizado, sem instalação/Play. Arquivamento continua oportunista ao abrir/cadastrar, sem migração em massa ou execução à meia-noite com o app fechado. Relatório conjunto em vales-parcelados-e-pdf-cuidados.md.
