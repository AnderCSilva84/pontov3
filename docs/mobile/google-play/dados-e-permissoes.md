# Inventário e Segurança dos dados — rascunho para conferência

**Consolidação de 25/10/2026:** usar o mapeamento exato e as decisões de destinatários ao final deste arquivo; os quadros iniciais são o inventário histórico. Sem preenchimento/publicação nesta rodada. Referência: https://support.google.com/googleplay/android-developer/answer/10787469?hl=pt-BR .

Abrange o código local completo, inclusive alterações ainda sem commit. A declaração final deve corresponder ao destino e SDKs efetivamente distribuídos; não preencher o Console automaticamente a partir desta tabela.

## Dados e finalidades observados

| Dados | Uso/destino | Retenção/decisão pendente |
| --- | --- | --- |
| Email, nome, UID e vínculo ao grupo/papel | Firebase Auth e Firestore; login, autorização e autoria | Exclusão de login/acesso implementada; autoria e históricos do grupo permanecem identificáveis |
| Localização precisa/aproximada, precisão e instante de amostra | Validação do ponto e pendências revisáveis no backend | Captura pontual, sem rastreamento contínuo; prazo/descarte a definir |
| Marcações, jornada, decisões e justificativas | Grupo e administradores autorizados; auditoria de ponto | Histórico trabalhista retido após exclusão; não prometer anonimização |
| Salário, benefícios, descontos, pagamentos e comprovantes | Folha/financeiro e consulta restrita da funcionária | Dados financeiros/trabalhistas; prazo e base de retenção a aprovar |
| Compras, produtos, marca, nota fiscal, estabelecimento, preço/data | Compras e histórico do grupo | Compartilhamento externo depende dos contratos autorizados; farmácia não entra por acidente nas consultas de supermercado |
| Nomes de pessoas/pets, cuidado, medicamento, dose/horário e confirmação | Lembretes direcionados e administradores habilitados | Potenciais dados pessoais sensíveis e dados de menores representados; finalidade/base/retensão precisam de revisão específica |
| Tarefas, receitas, imagem opcional e links | Rotina do grupo; imagem inline/URL conforme fluxo | Não há upload novo em Storage; URL externa pode expirar |
| Instalação/token push e recibos de envio/ação | FCM e backend, propriedade por conta/grupo | Revogação de inscrição na saída/exclusão; entrega condicionada a rede/aparelho |
| Capturas e resultados pendentes locais | IndexedDB/cache privado para reconciliação idempotente | Não apagar em logout/reinstalação; descarte de não enviadas é explícito |
| PDFs temporários e cópias exportadas | Cache privado Android, leitor/compartilhamento/destino escolhido | Limpeza oportunista de temporários reconhecidos; cópias externas não são revogáveis |

O servidor armazena descrição original e associações de produtos reversíveis. O compartilhamento dentro do grupo não equivale a dados públicos. Excluir uma conta não apaga todo o grupo nem os dados de terceiros.

## SDKs/serviços encontrados

* React/Vite, Capacitor8.5.3 com App8.1.2 e Geolocation8.2.4. WebView do sistema.
* Firebase JS12.10.x para Auth/Firestore/callables no cliente; confirmar lock final do artefato. FCM nativo `firebase-messaging:25.0.1`, com Analytics desabilitado e auto-init controlado pelo fluxo de permissão/conta.
* jsPDF/AutoTable para geração local; ZXing/jsQR para decodificação local; pontes próprias de câmera, PDF e notificações. Não foram encontrados SDK de anúncios, Billing, Analytics ou Crashlytics habilitados na implementação examinada.
* Backend Node24 declarado, Firebase Admin/Functions e Google Auth. Testes locais não equivalem a validar o runtime final implantado. Functions existentes incluem lembretes agendados/triggers: não foram provisionados nem multiplicados nesta etapa.
* Metadados de receitas: busca autenticada explícita no backend, validações SSRF e limites; imagem persistida é solicitada ao site terceiro pelo dispositivo, sujeito a CORS/cache/disponibilidade. Consulta da SEFA, quando acionada, contata serviço externo. Não contornar CAPTCHA/bloqueios.

## Permissões Android

Localização COARSE/FINE apenas durante uso e por gesto de registrar ponto; sem BACKGROUND_LOCATION. Câmera por gesto de ler QR; sem áudio. POST_NOTIFICATIONS com consentimento do sistema. INTERNET para comunicação autorizada. Seleção de foto/PDF e salvamento via seletor do sistema/FileProvider; não há permissão ampla de armazenamento nem necessidade de ler todos os arquivos. Activity principal exportada para launcher; serviços/providers sensíveis não exportados; content URIs recebem concessões temporárias.

Release exige HTTPS e `allowBackup=false`, sem cleartext global/server.url. As exceções HTTP dos emuladores ficam na variante debug e não provam o transporte de uma futura versão final.

## Rascunho de respostas — não enviar sem revisão

* **Coleta de dados:** sim, o app transmite dados de conta, localização pontual, rotina e dados financeiros/cuidados ao backend. Não selecionar “nenhum dado coletado”.
* **Categorias a conferir:** informações pessoais (nome/email/identificadores), localização precisa/aproximada, informações financeiras, saúde, fotos/imagens, arquivos/documentos e conteúdo gerado pelo usuário, atividade/interações e identificadores de dispositivo/instalação conforme SDK. Escolher subcategorias do formulário vigente com base no inventário real; não marcar todas cegamente.
* **Finalidades:** funcionalidade do app, gestão da conta, segurança/autorização e comunicações operacionais. Não há publicidade ou perfil publicitário observado.
* **Obrigatório/opcional:** conta para recursos privados; localização para ponto validado; cuidados/foto/receita e push são recursos opcionais. A classificação de cada dado no Console deve explicar quando a função deixa de operar sem ele.
* **Compartilhamento:** conferir definições e exceções do Google para prestadores, grupo autorizado, compartilhamento pelo usuário e integração externa. Não responder “não” apenas porque Firebase é prestador; avaliar cada fluxo e contrato.
* **Criptografia em trânsito:** exigir/conferir HTTPS no destino final e todos os destinos. Não declarar auditoria independente ou criptografia ponta a ponta.
* **Exclusão:** há caminho app/web implementado e retenções explícitas, mas URLs públicas e política de descarte ainda faltam. Não afirmar apagamento integral.
* **Segurança independente:** nenhuma certificação/auditoria externa foi realizada nesta etapa.

## Saúde, público e limites

Os lembretes de medicamentos e posologia entram na análise da declaração de saúde: a orientação oficial menciona medication reminders. O produto organiza informações inseridas pelos responsáveis, sem diagnóstico, prescrição ou cálculo de dose clínica. Não é apresentado como dispositivo médico. Conferir com o titular a classificação e o aviso aplicável em app/ficha conforme a política vigente antes da submissão. Preparação de texto possível, ainda sujeita à aprovação: “Organiza os cuidados informados pelos responsáveis. Não fornece diagnóstico nem prescrição; confirme tratamento e posologia com profissional habilitado.”

Há pessoas cuidadas que podem ser menores, mas isso não torna automaticamente o app destinado a crianças. Público-alvo e representação/consentimento precisam ser definidos, não presumidos. A classificação IARC deve ser preenchida pelo titular. Se recursos de folha/financeiro exigirem formulário de recursos financeiros, descrever gestão de registros/folha, sem empréstimos, investimentos ou atividade bancária inexistentes.

## Mapeamento para preenchimento — versão para aprovação em 25/10/2026

Fonte técnica: inventário existente; recorte adicional de cadastroInicial em Financeiro.jsx, fotoPrato/PratosDia e contratos no-bolso-bridge/consulta, sem auditoria geral. O cadastro trabalhista oferece CPF, RG, CTPS, telefone, endereço, nascimento e contato de emergência: esses dados estavam subdescritos no texto anterior e foram incluídos. A foto opcional do prato é reduzida localmente e enviada; não é somente tratamento no dispositivo. O app não lê a agenda ou os contatos do Android.

**C = coletado** quando sai do dispositivo. **S = compartilhado**, por destinatários autorizados além dos prestadores que processam exclusivamente por nossa conta. Não usar um “não compartilha” global: nomes/autorias, dados de ponto, compras e cuidados ficam disponíveis a outros membros conforme permissões. Como não foi demonstrada uma isenção específica para cada um desses fluxos permanentes, a proposta é marcar S nos tipos correspondentes. Restrição de grupo não significa ausência de compartilhamento.

Firebase Auth/Firestore/Functions/FCM: classificar a coleta efetiva, mas não marcar S **apenas** pela contratação desses prestadores para processar por nossa conta. Isso não isenta os destinatários de grupo/integrações. Photon/Komoot, OSM, SEFA e sites de receita não foram presumidos contratualmente nossos operadores; a proposta conserva S para os tipos pessoais efetivamente encaminhados a esses destinos. Uma isenção por ação iniciada pelo usuário só será usada onde o envio e o destinatário são esperados/documentados, como compartilhar um PDF escolhido com um aplicativo/destinatário escolhido. Navegação externa aberta não é tratada como rastreamento de navegação pelo AP1303.

| Categoria → tipo exato da Play | Dados efetivos / C e S propostos | Finalidade / escolha |
| --- | --- | --- |
| Informações pessoais → Nome | Conta, trabalhador, autorias e nomes cadastrados: C/S | Conta, funcionalidade e segurança; nome da conta necessário, cadastros adicionais conforme uso |
| Informações pessoais → Endereço de e-mail | Login e cadastro trabalhista: C/S quando acessível a administradores do grupo | Conta/funcionalidade; login necessário, cadastro adicional opcional |
| Informações pessoais → IDs de usuários | UID, relações de grupo, autoria e registros: C/S | Conta, funcionalidade e segurança; necessário |
| Informações pessoais → Endereço | Endereço cadastrado/pesquisado, quando pessoal: C/S | Cadastro/mapa; opcional |
| Informações pessoais → Número de telefone | Cadastro e contato de emergência informado: C/S | Cadastro/contato operacional; opcional |
| Informações pessoais → Outras informações | CPF, RG, CTPS, nascimento, cargo/admissão e justificativas pessoais: C/S | Gestão autorizada; cadastro opcional |
| Local → Local aproximado; Local exato | Amostra de GPS e área enviada ao mapa: C/S | Validar ponto/mapa, segurança; exigido pelo ponto com GPS, recurso não utilizável sem coleta |
| Informações financeiras → Histórico de compras | Notas, itens, estabelecimentos, preços e totais: C/S | Compras/comparação; inserção/importação opcional |
| Informações financeiras → Outras informações financeiras | Salário, benefícios, descontos e valores de pagamentos: C/S | Folha/gestão; conforme uso administrativo |
| Saúde e fitness → Informações sobre saúde | Medicamentos, posologia, tratamentos e confirmações cadastrados: C/S | Cuidados; cadastro opcional |
| Fotos e vídeos → Fotos | Foto salva do prato e referências de fotos opcionais: C/S | Receita/apresentação; opcional |
| Arquivos e documentos → Arquivos e documentos | Referências, títulos e links de comprovantes/documentos cadastrados: C/S | Consulta documental; opcional. PDF gerado apenas localmente não vira coleta pelo simples ato de gerar |
| Agenda → Eventos da agenda | Consultas e compromissos efetivamente agendados pelo usuário na agenda interna: C/S | Funcionalidade; cadastro opcional; não lê o calendário do aparelho. Não classificar todo lembrete como evento |
| Atividade em apps → Outro conteúdo gerado pelo usuário | Listas, tarefas, receitas e lembretes operacionais não enquadrados em saúde ou eventos de agenda: C/S | Rotina; entrada opcional |
| Atividade em apps → Outras ações | Marcações, conclusões e decisões operacionais registradas: C/S quando consultadas no grupo | Funcionalidade/auditoria; necessário para a operação escolhida |
| Identificadores do dispositivo e outros → Identificadores do dispositivo e outros | Instalação/token push: C; não S somente pelo FCM/backend | Entrega/segurança; push depende de ativação. Considerar separadamente identificadores de sessão necessários ao login |

O formulário distingue necessário/opcional por **tipo**, não por célula ou perfil. Quando um tipo mistura dados opcionais com dados necessários à função principal, usar “obrigatório” para não alegar que todos conseguem desativar a coleta. Para localização, a recusa bloqueia o ponto com GPS; a proposta conservadora é obrigatório nesse formulário, mantendo a explicação de uso pontual/por gesto na política. Nomes/IDs/email necessários ao login não viram opcionais porque um cadastro administrativo contém também esse tipo. As finalidades técnicas são Funcionalidade do app, Gerenciamento de contas e Segurança, conformidade e prevenção de fraudes, conforme o dado. Avisos de cuidados não são marketing nem novidade do desenvolvedor; não selecionar essa finalidade por haver push.

Não selecionar automaticamente: informações de cartão/conta bancária sem campo/coleta efetiva demonstrada, score de crédito, condicionamento físico, SMS, áudio, apps instalados, histórico de navegação, contatos do aparelho ou métricas de Analytics. CPF não vira um ID de publicidade. Fotos de QR/vídeo apenas processados localmente não são um vídeo coletado. A busca de produtos local não é um histórico de pesquisa coletado. Para diagnóstico/crash, a ausência de Crashlytics não prova ausência de logs da infraestrutura: não declarar uma categoria de telemetria no app sem evidência; registros realmente tratados pelo suporte/infraestrutura permanecem descritos na política, sem prazo inventado.

### Integração No Bolso

No Android, `noBolsoConsulta` só despacha status, rankings e produto; isso limita **ações da interface/contrato nativo**. `no-bolso-bridge` consulta compras finalizadas no backend por usuário/período/vínculo: não há, nesse trecho, um filtro de plataforma de origem. Portanto, não declarar que todo registro salvo na base comum pelo Android está tecnicamente excluído das consultas externas. Preços, totais e identificadores/nome disponibilizados por uma integração autorizada contam nos tipos compartilhados correspondentes. Não foram alterados o contrato, o outro repositório nem os dados para ajustar essa declaração.

### Exclusão e retenção — resposta vinculada ao procedimento real

Criação de conta: nome de usuário/email e senha. Criptografia em trânsito global: não declarar “Sim” com a evidência disponível; preparar “Não” à pergunta sobre todos os dados, sem afirmar que o Firebase não é criptografado. O backend Firebase de produção usa TLS, mas src/services/comprovanteExterno.js aceita http: e https:. A exceção oficial para transferências escolhidas a outros serviços não prova cobertura de todos os links/fluxos deste app; não foi demonstrada uma garantia global. Mecanismo de solicitação de exclusão: pedido no app já inclui análise manual dos dados associados, sem segundo email, pelo mesmo protocolo e fila administrativa; atendimento externo é alternativa/acompanhamento; preencher a URL somente depois de publicada e verificada. Pedidos de dados sem excluir login podem ser iniciados pelo mesmo suporte, com identidade/escopo verificados; não selecionar exclusão automática em90 dias. Não há certificação independente de segurança ou selo de pagamento.

Dados de domínio e recibos não são efêmeros. Foto/câmera local e PDF local não são enviados só por serem abertos no dispositivo. Solicitar imagem/mapa pode gerar transmissões técnicas; não chamar processamento remoto de “somente local” nem “efêmero” sem prova da retenção dos destinatários.

O atendimento de dados associados usa prévia, decisão específica, confirmação e conferência em `scripts/privacidade-conta.cjs`, descrito em `exclusao-suporte-rascunho.md`. Não prometer apagar todos os dados ao remover Auth. Para cada conservação: necessidade daquele registro, acesso já restrito, data e critério de revisão humana. Caso mínimo/protocolo também sujeitos à revisão. Pendências não cobertas não são anunciadas como resolvidas. Roteiro emulado aprovado não equivale a descarte real ou homologação da infraestrutura de backups/terceiros. As propostas numéricas anteriores continuam propostas.

### Limite antes de enviar à Play

Tabela e textos consolidados aguardam a aprovação explícita desta versão. Não declarar conformidade geral por esse mapeamento. O suporte precisa assumir a triagem humana dos pedidos do aplicativo e externos; a exclusão de Auth não dispara um novo aviso automático. Casos legados, referências indiretas/mistas, backups e cópias externas exigem escopo específico, sem preservação genérica nem promessa de apagamento universal. Nenhuma declaração na Play foi alterada nesta rodada.

### Ajustes finais das definições e do pedido único — 25/10/2026

A definição oficial de Eventos da agenda abrange eventos, observações de eventos e convidados; não exige leitura do calendário Android. Mantida apenas para consultas/compromissos realmente agendados. Horários de medicamento e posologia permanecem em Informações sobre saúde; tarefas e lembretes operacionais ficam em Outro conteúdo gerado pelo usuário; confirmações ficam em Outras ações. A presença de horário ou notificação, sozinha, não determina Agenda. Não omitir outros tipos de dado presentes no mesmo registro.

Criptografia: a pergunta global abrange todos os dados coletados/transmitidos pelo app e SDKs. Há exceção oficial para transferências a outros serviços escolhidas pelo usuário, mas não foi demonstrado que ela cubra integralmente os caminhos externos aceitos. Não marcar “Sim” global com base apenas em Firebase. Sem alterar validadores, links ou comportamento nesta rodada.

O pedido autenticado em contaSolicitacoes já é a entrada administrativa da análise associada. status=concluida nesse documento significa retirada de acesso concluída, não encerramento do pedido integral. O suporte faz triagem manual paginada, registra/retoma privacidadeCasos pelo mesmo UID/grupo e não espera outro email. Não há novo aviso automático, polling ou serviço pago. Conferência do caso cobre seu escopo; pendências externas/legadas continuam abertas no atendimento.
## Segurança dos dados — proposta para Android reduzido, 26/10/2026

Nenhuma resposta salva na Play foi alterada. A retirada de módulos específicos não autoriza apagar categorias de dados só porque a tela não existe mais.

| Categoria exata | Proposta para a próxima declaração Android |
| --- | --- |
| Informações pessoais → Nome, Endereço de e-mail, IDs de usuários e demais subtipos já usados no cadastro | Preservar conforme coleta administrativa real; mesmas contas/grupos/autenticação |
| Local → Local aproximado e Local preciso | Preservar captura pontual do ponto/mapa; sem rastreamento em segundo plano |
| Informações financeiras → Histórico de compras; Outras informações financeiras | Preservar compras, folha, pagamentos e compartilhamentos efetivos da integração |
| Saúde e fitness → Informações sobre saúde | Não remover automaticamente: módulos estruturados foram excluídos do candidato, mas texto livre, documentos e notas de farmácia podem conter dados sensíveis; avaliar o acesso residual antes de afirmar ausência |
| Agenda → Eventos da agenda | Consultas de cuidados não são mais disponibilizadas no Android. Não retirar por suposição se outros compromissos efetivamente coletados se enquadrarem; horários de tarefas, isoladamente, não justificam a categoria |
| Fotos e vídeos → Fotos; Arquivos e documentos | Preservar de acordo com fotos, receitas culinárias e comprovantes ainda oferecidos; geração local de PDF não é upload por si só |
| Atividade em apps → Outro conteúdo gerado pelo usuário; Outras ações | Preservar listas, tarefas, receitas e confirmações operacionais; não há confirmação de dose no candidato |
| Dispositivo ou outros IDs | Preservar instalação/token e operação das notificações de ponto/tarefas |

Coletado/compartilhado, obrigatoriedade e finalidades restantes seguem o inventário anterior por destino real. Prestadores de serviço não tornam automaticamente toda transmissão isenta de compartilhamento. Não mudar a resposta global de criptografia em trânsito para “Sim”; nenhuma correção integral dos destinos externos foi demonstrada. Não anunciar uma restrição por plataforma da ponte No Bolso que o backend não aplica.

Declaração de apps de saúde: a implementação candidata removeu os recursos estruturados anteriormente declarados como “Controle de medicamentos e tratamentos”. Ainda não marcar “Meu app não tem recursos de saúde” enquanto não estiver esclarecido o tratamento relevante de conteúdos residuais e validado o candidato. O PWA mantém cuidados, dados e contratos. A dúvida deve ser descrita ao suporte, não resolvida ocultando recursos.

Finanças: manter proposta de “Outro” com gestão administrativa até esclarecer o enquadramento oficial, sem marcar empréstimos/bancos/carteiras inexistentes. Pergunta objetiva e ficha propostas em ficha-e-revisao.md. Todas essas propostas permanecem locais; não houve submissão.

### Respostas propostas para o código 2 — revisão de 26/10/2026

Propostas locais, não aplicadas no Console. A liberação interna não equivale à aprovação dessas declarações nem ao reenvio do teste fechado.

- Categoria: **App / Produtividade**.
- Apps de saúde: retirar **Controle de medicamentos e tratamentos** somente após confirmar fisicamente o candidato; não marcar **Meu app não tem recursos de saúde** enquanto permanecer o tratamento residual relevante. Proposta conservadora para esclarecimento: **Outro**, descrevendo: “Aplicativo administrativo sem módulos de medicamentos, posologia, tratamentos ou confirmação de cuidados na edição Android. Mantém compras de farmácia, identificação de apresentação dos produtos e textos/documentos fornecidos pelos usuários, que podem conter informações sensíveis. O PWA separado mantém o módulo de cuidados na mesma base, com acesso autorizado.” Essa proposta pode continuar sujeita ao requisito de organização; pedir enquadramento ao suporte, sem garantir que remova a rejeição.
- Recursos financeiros: **Outro**. Texto exato mantido: “Gestão administrativa de folha de pagamento, registros de pagamentos/comprovantes e gastos de compras; não oferece empréstimos, carteira digital, transferências bancárias ou investimentos.” Não marcar bancos, empréstimos ou carteiras inexistentes; não marcar ausência de recursos financeiros por suposição.
- Segurança dos dados: **Sim** para coleta/compartilhamento conforme inventário aprovado; **Não** para garantia global de criptografia em trânsito; **Sim** para solicitação de exclusão, com análise de dados associados pelo mesmo protocolo. Preservar os tipos ainda tratados: informações pessoais, localização, histórico de compras, outras informações financeiras, informações sobre saúde quando presentes nos conteúdos residuais, fotos, arquivos/documentos, conteúdo do usuário, ações e identificadores. Não remover categorias pela simples ausência da tela. Consultas de cuidados não são oferecidas no Android; a retirada de Eventos da agenda exige conferir se há outro evento realmente coletado, sem classificar automaticamente toda tarefa datada como agenda.

A dosagem/concentração exibida no catálogo de farmácia identifica a apresentação de um produto e protege contra mesclagem de apresentações incompatíveis; não é posologia ou orientação de administração a uma pessoa. Esses campos do catálogo foram preservados junto com compras e precisam aparecer na explicação ao suporte. Não afirmar que o aplicativo não apresenta qualquer informação sobre medicamentos.

Pergunta financeira ao suporte: “O app apenas calcula/registra folha, benefícios, descontos, comprovantes e gastos, sem movimentar dinheiro, conceder crédito ou oferecer investimento. A declaração ‘Outro’ é adequada? Esse escopo administrativo exige conta de organização? Qual recurso e trecho da política fundamentam o enquadramento?”

Canal oficial: **Play Console → Ajuda → Entrar em contato**, associado ao AP1303; https://play.google.com/console/u/0/developers/6100647269076604802/help-and-support?app=4973017562652730061 . Referência de definições: https://support.google.com/googleplay/android-developer/answer/13849271?hl=pt-BR . Nenhuma mensagem foi enviada em nome do titular.

Validação física posterior: o titular confirmou no Samsung atualizado pela Play o código 2, navegação Ponto/Compras/Tarefas, ausência da aba de cuidados e retorno/cancelamento de PDF sem inutilizar o app. O ADB confirmou pacote/versão e não encontrou ANR/crash dos processos relevantes no intervalo observado. A condição de validação física para propor retirar “Controle de medicamentos e tratamentos” está cumprida. A proposta conservadora de “Outro”, a explicação do conteúdo residual e a dúvida financeira permanecem; não converter isso automaticamente em “Meu app não tem recursos de saúde”. Declarações continuam não aplicadas no Console; não houve envio ao suporte.
