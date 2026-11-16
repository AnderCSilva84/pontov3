# Primeiro lançamento público — issue #7

Atualização em 15/11/2026: código **7/1.0.0 disponível para testadores internos**; última resposta do titular informa que a opção Atualizar ainda não apareceu. Onze Functions novas e RTDN implantados, sem ativar cobrança/regime comercial. Homologação física e critérios do lançamento público continuam pendentes. [Estado de retomada](../CONTINUAR-NO-VSCODE.md) e [roteiro atual do código7](21-teste-interno-codigo7.md). Os registros anteriores abaixo são históricos.

Preparação iniciada em 13/11/2026. Issue: https://github.com/AnderCSilva84/pontov3/issues/7.

## Resultado esperado

Disponibilizar o Tá no Ponto ao público com a versão aprovada identificada, acesso pela loja verificado e atendimento preparado. Aprovação para produção e disponibilidade pública são marcos distintos.

Em 14/11/2026, o titular solicitou incluir assinaturas na mesma versão completa de produção. A [issue #9](https://github.com/AnderCSilva84/pontov3/issues/9) acompanha a implementação conforme a definição da #8. A candidata deve reunir frontend, Functions/regras e Android, após integração real de cobrança e homologação; a tela informativa local não conclui esse requisito. Ver [estado e configuração de assinaturas](../ASSINATURAS-IMPLEMENTACAO.md).

## Estado e evidências

- O titular apresentou em 13/11/2026 a mensagem do Google Play concedendo acesso à produção e aos testes abertos. Isso confirma a habilitação da faixa, sem comprovar aprovação do código 2 ou de outro lançamento específico. Conferir a candidata e seu estado no Console.
- Disponibilidade pública, países, percentual de distribuição e eventual publicação gerenciada: ainda não conferidos nesta rodada.
- Código 4: teste interno e três correções visuais aceitos pelo titular, conforme `correcoes-android-codigo-4.md`. Esse aceite não comprova homologação integral nem aprovação dessa versão para produção.
- O checkout contém alterações posteriores, incluindo ensaios locais de QR. Não representa automaticamente a candidata ao lançamento. Avaliar os artefatos existentes e a homologação antes de decidir sobre um novo AAB.
- Nesta rodada não foram executados lançamento, deploy, mudança de faixa, instalação ou alteração de dados.

## Critérios de aceite

- [ ] Conferir no Console a versão aprovada, o estado da faixa Produção e as pendências efetivas de publicação.
- [ ] Registrar países, público atendido e disponibilidade planejada, conforme configuração real do Console.
- [ ] Conferir a ficha pública: marca Tá no Ponto, imagens e descrição correspondentes ao código aprovado, contato e links de suporte, privacidade e exclusão acessíveis.
- [ ] Validar os fluxos essenciais na versão destinada ao público, com conta e dados de teste: entrada/recuperação, ponto e sincronização, compras/importação, PDF e notificações. Usar `homologacao-codigo-3.md` como roteiro, registrando o código efetivamente testado e os recursos presentes nele.
- [ ] Registrar a decisão de lançar o código aprovado ou preparar uma atualização após avaliar as pendências. Não promover automaticamente o código 4 nem os ensaios QR locais.
- [ ] Executar a publicação autorizada e confirmar o resultado no Console.
- [ ] Verificar o link público https://play.google.com/store/apps/details?id=br.dev.acstech.ap1303 e a instalação/atualização pela Play em país e conta elegíveis, preservando dados.
- [ ] Registrar data, código distribuído, link e resultado da primeira verificação após o lançamento.

## Operação inicial

Contato já aprovado: andersoncsilva84@hotmail.com. Conferir atendimento e acompanhar falhas de login, permissões, sincronização, importação, PDF e notificações. Registrar código do app, modelo/Android, horário e passos para reprodução, sem credenciais ou dados pessoais.

Se houver falha que impeça o uso, avaliar interrupção da distribuição quando disponível no Console e preparar correção com código superior. Não desinstalar, limpar filas, repetir operações com novos IDs ou tratar retorno a um binário antigo como reversão dos dados. Publicação de backend/PWA exige avaliar compatibilidade com o código que está na loja.

## Encerramento

A issue só estará concluída com a disponibilidade pública e os critérios de aceite comprovados. A concessão de acesso à produção foi informada pelo titular por meio da mensagem recebida; o Play Console ainda não foi inspecionado nesta rodada.
