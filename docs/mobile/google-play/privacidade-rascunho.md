# Política de Privacidade do AP1303 — texto consolidado para aprovação

Versão de 25/10/2026. Ainda não publicada. Corresponde ao HTML local de privacidade e ao procedimento administrativo descrito em exclusao-suporte-rascunho.md. Nenhum prazo numérico foi aprovado por suposição.

O AP1303 organiza ponto, tarefas, compras, documentos, pagamentos e lembretes de cuidados por grupo. Esta política descreve o tratamento desses dados no PWA e no aplicativo Android. Responsável pelo AP1303: **Anderson Costa e Silva**. Contato de privacidade e suporte: andersoncsilva84@hotmail.com (mailto:andersoncsilva84@hotmail.com).




## Dados usados e finalidades



- **Conta e grupo:** nome, email, identificadores e permissões para autenticação, acesso e autoria. O Android final e o PWA usam as mesmas contas e base Firebase; grupos não se tornam públicos por esse compartilhamento.

- **Ponto e trabalho:** horários, jornada, justificativas, decisões de revisão e dados trabalhistas/financeiros, como salário, benefícios, descontos, pagamentos e comprovantes, para os recursos de gestão autorizados. O cadastro pode incluir telefone, endereço, CPF, RG, CTPS, nascimento, cargo, admissão, contato de emergência e links de documentos, quando informados pelos responsáveis.

- **Localização:** coordenadas, precisão e instante da amostra para validar o local do ponto e permitir revisão de capturas offline. A captura ocorre ao acionar o registro; não há rastreamento contínuo ou localização em segundo plano. A autorização também pode ser solicitada ao usar a localização para cadastrar um local autorizado.

- **Compras:** listas, autorias, produtos, descrições originais de notas, quantidades, marcas, unidades, estabelecimentos, preços, descontos e datas para organização, totais e histórico de preços. Associações de produtos preservam referências e descrições originais.

- **Rotina e cuidados:** tarefas, receitas, links e imagens opcionais; nomes de crianças, idosos, outras pessoas ou pets, medicamentos, posologia, horários e confirmações quando cadastrados. Dados de saúde e de crianças exigem cuidado especial do responsável que os registra e autoriza o acesso. O app organiza informações fornecidas; não oferece diagnóstico nem prescrição.

- **Notificações e operação:** token de dispositivo/instalação, destinatário, contexto de grupo, recibos e estado das operações para entrega, segurança, confirmação e prevenção de duplicações. Serviços de infraestrutura podem processar metadados técnicos de conexão e falhas.


## Permissões e dados no aparelho


A câmera lê QR Codes no aparelho. A leitura não envia um vídeo contínuo ao servidor. O link ou o conteúdo fiscal escolhido para importação segue o fluxo de consulta/revisão e pode ser gravado na compra. Fotos e arquivos são selecionados pelo usuário; não há acesso amplo a todos os arquivos nem captura de áudio neste fluxo. A foto de prato selecionada para salvar é reduzida no aparelho e enviada com o cadastro. Links de imagens e de comprovantes também podem ser armazenados.


Notificações dependem da permissão do sistema. É possível alterar permissões nas configurações do navegador ou Android; recusar uma permissão pode impedir o recurso que dela depende. Pendências de ponto são guardadas localmente para envio/reconciliação, inclusive após interrupções. O app também utiliza armazenamento local de sessão, preferências e cache do PWA. Cache não substitui a autorização no servidor.




## Serviços e terceiros


Google Firebase Authentication autentica as contas; Cloud Firestore armazena os dados; Cloud Functions executa validações e operações; Firebase Cloud Messaging entrega notificações. No Android, Capacitor e suas pontes acessam recursos do sistema, como localização, câmera, arquivos e notificações. jsQR/ZXing fazem leitura local de QR e jsPDF/AutoTable geram PDFs localmente. Não há SDK de publicidade, Analytics ou Crashlytics habilitado na configuração preparada do aplicativo.


Ao pesquisar um endereço, o texto informado é enviado ao Photon/Komoot. O mapa carrega blocos do OpenStreetMap referentes à área exibida. Esses provedores recebem requisições técnicas, incluindo endereço de rede e informação necessária à consulta ou mapa.


A consulta fiscal contata a SEFA correspondente quando acionada. A busca opcional da imagem de uma receita consulta metadados do site informado pelo backend; ao exibir uma imagem externa, o aparelho contata seu provedor. Os sites podem receber URL consultada e metadados de conexão. Não controlamos sua disponibilidade nem prometemos armazenamento permanente dessas imagens.


O processamento utiliza infraestrutura Google e outros provedores indicados; pode envolver infraestrutura fora do Brasil. Este texto não fixa países, regiões ou prazos de terceiros que não tenham sido confirmados. Consulte também as informações de privacidade do Firebase (https://firebase.google.com/support/privacy).




## Acesso, compartilhamento e exportações


Administradores acessam os recursos permitidos do próprio grupo. Funcionários têm acesso aos próprios dados trabalhistas e aos recursos compartilhados ou direcionados conforme suas permissões. Autorias podem ser visíveis aos membros autorizados do grupo.


A interface de integração No Bolso no Android do AP1303 é somente de consulta de valores; não oferece comandos de importação ou sincronização financeira. As consultas autorizadas ao backend podem disponibilizar preços e compras/totais conforme o vínculo e o contrato aplicável. A ausência desses comandos na interface Android não é uma promessa de que todos os registros da base compartilhada estejam excluídos das integrações autorizadas. Compartilhamento de preços não torna públicos os registros de ponto, folha ou cuidados.


Ao abrir, salvar, imprimir ou compartilhar um PDF/link, o usuário escolhe o destino, como leitor, email ou WhatsApp. Cópias já entregues a terceiros não podem ser revogadas pelo AP1303.




## Exclusão, correção e retenção


A exclusão confirmada no aplicativo remove o login Firebase Auth, perfil/vínculo de acesso e inscrições de dispositivos e integrações pessoais abrangidas pelo fluxo. Essa etapa não apaga automaticamente os históricos do grupo e **não equivale à conclusão da análise de todos os dados associados**.


A solicitação de exclusão feita no aplicativo abrange a retirada do acesso e a análise dos dados pessoais associados, sob o mesmo protocolo; não é necessário fazer um segundo pedido por email. A análise dos dados associados é manual. O suporte identifica os pedidos na fila administrativa existente, verifica a identidade e o contexto registrados e acompanha o caso vinculado ao protocolo, mesmo após a remoção do login. Para pedidos externos, correção ou acompanhamento, o contato é andersoncsilva84@hotmail.com. Antes das remoções, é feita uma prévia dos registros envolvidos. Dados pessoais dispensáveis são removidos; em documentos compartilhados, retiram-se campos pessoais quando isso pode ser feito com segurança, preservando os dados das outras pessoas. Não há autorização geral para conservar todos os históricos.


Cada conservação precisa de justificativa específica, acesso restrito, data e critério de revisão registrados no caso. Pode envolver, por exemplo, uma controvérsia individual ou a necessidade concreta de manter um recibo de segurança; a necessidade não é presumida para todos os documentos. O próprio protocolo e o registro mínimo do atendimento estão sujeitos a essa avaliação. Na revisão, a conservação deve ser reavaliada e o dado dispensável encaminhado ao descarte. Não há calendário automático geral de retenção nem prazo numérico universal aprovado.


A prévia exige decisão por registro e confirmação antes de remover dados. Se o conteúdo mudar, houver associação ambígua, texto livre misto, vínculo com outra conta ou estrutura não coberta pelo procedimento seguro, essa parte do pedido exige tratamento específico e não é anunciada como resolvida. Excluir um identificador não permite afirmar que um documento inteiro se tornou anônimo. O suporte registra as ações, as conservações justificadas e o que ainda exige análise. A conclusão da retirada do acesso não encerra a análise dos dados associados. O pedido integral só pode ser encerrado depois de conferir o escopo tratado e resolver as pendências identificadas; etapas parciais são informadas como parciais. O acompanhamento usa o mesmo protocolo, sem novo pedido e sem prazo fixo de conclusão prometido.


Guarde o protocolo fora do aplicativo antes da exclusão. O login não é necessário para solicitar acompanhamento pelo contato de suporte. O suporte usa o protocolo e o registro privado do atendimento após verificar a identidade; conhecer um protocolo, isoladamente, não autoriza acesso a dados. Se o número for perdido, a mensagem original e as informações verificáveis do atendimento serão necessárias à recuperação segura; não há consulta pública por email.


Capturas nunca enviadas exigem envio ou descarte explícito; resultados desconhecidos precisam de reconciliação. A limpeza local da conta atinge o aparelho em que é executada; outros aparelhos exigem verificação própria. PDFs temporários reconhecidos têm limpeza oportunista, sem garantia de eliminação imediata de todos os arquivos de versões anteriores.


O procedimento não revoga cópias exportadas nem apaga automaticamente dados em aparelhos offline ou em sistemas de terceiros. Backups e registros de infraestrutura precisam de avaliação específica; não prometemos que uma remoção na base ativa elimina imediatamente todas as cópias. Nenhuma restauração deve reabrir o acesso a dados descartados sem conferir e reaplicar as decisões de exclusão. Veja como solicitar a exclusão (/excluir-conta/). Não envie senhas, códigos de autenticação ou dados completos de saúde/trabalho no primeiro contato.




## Segurança e alterações


O sistema usa autenticação, permissões, isolamento de grupos e validações no servidor. A comunicação com o backend Firebase de produção usa conexão criptografada. Links externos podem ter práticas diferentes; o fluxo de comprovantes permite links HTTP e HTTPS, portanto não garantimos criptografia em todos os destinos externos. Não é uma promessa de segurança absoluta ou de criptografia ponta a ponta. Alterações nesta política serão apresentadas nesta página; a data abaixo identifica a preparação desta versão, não uma publicação já realizada.

## Proposta de distinção Android/PWA — 26/10/2026

Texto preparado localmente para revisão da nova edição; não altera a política pública já aprovada e não foi publicado.

**Texto proposto:** O AP1303 possui uma edição Android para ponto, compras, tarefas gerais e gestão administrativa, e uma edição web/PWA que também oferece cuidados. A edição Android candidata não disponibiliza os módulos de medicamentos, posologia, tratamentos, pessoas cuidadas com informações de saúde, confirmações de administração e seus avisos. Não há redirecionamento dentro do aplicativo para recuperar esses módulos no PWA.

Contas, grupos e base continuam compartilhados, com acesso sujeito às permissões existentes. Retirar os módulos Android não apaga nem migra cuidados anteriores. O PWA continua tratando os dados de cuidados informados pelos responsáveis. O backend preserva os contratos autorizados para o PWA; a configuração de build não é autenticação criptográfica de plataforma.

Tarefas, textos livres, compras (inclusive de farmácia) e documentos enviados podem conter informações pessoais ou sensíveis. A edição reduzida não permite afirmar que nenhum dado de saúde possa aparecer nesses conteúdos. Não há classificação automática nem exclusão desses históricos. O procedimento único de exclusão e a análise individualizada dos dados associados, legados e backups permanecem, sem novo prazo nem preservação geral presumida.

O filtro de envio preparado exclui inscrições Android dos avisos de cuidados, incluindo antigas, preservando Web Push. Esse filtro depende de deploy seletivo posterior e ainda não está ativo em produção. A edição candidata também recusa mensagens e ações antigas de cuidados. Avisos de ponto e tarefas permanecem.

A explicação da integração No Bolso permanece: a base compartilhada não garante separação criptográfica por plataforma de origem. As demais finalidades, prestadores, acompanhamento da exclusão e tratamento de backups mantêm o procedimento aprovado. Não publicar este ajuste como definitivo antes de conferir os fluxos residuais e aprovar a redação correspondente.
