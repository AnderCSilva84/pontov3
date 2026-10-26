# Documentos públicos preparados — 24/10/2026

Responsável aprovado: **Anderson Costa e Silva**. Contato público de suporte/privacidade: **andersoncsilva84@hotmail.com**. Esses dados foram aplicados às páginas e à ficha local da Play; não foi atribuído um CNPJ, endereço, telefone ou qualificação jurídica não informada.

## Arquivos e rotas

| Página | Arquivo | URL pretendida, ainda sem deploy |
| --- | --- | --- |
| Privacidade | public/privacidade/index.html | https://ponto.acstech.dev.br/privacidade/ |
| Suporte | public/suporte/index.html | https://ponto.acstech.dev.br/suporte/ |
| Exclusão | public/excluir-conta/index.html | https://ponto.acstech.dev.br/excluir-conta/ |

Gerador reproduzível: `node scripts/preparar-paginas-publicas.mjs`. HTML estático, responsivo, com marca AP1303 e cores azul/branco/vermelho, sem formulário que recolha dados, JavaScript, SDK Firebase, rastreamento ou fonte externa nas páginas. O email é um link mailto: abrir o email não envia mensagem automaticamente. Custo novo por visita: arquivos estáticos/ícone e tráfego do hosting, sem leitura Firestore ou chamada de Functions. Não prometer custo zero do hosting.

Arquivos em public são copiados pelo build Vite. O fallback SPA existente não precisa ser alterado: diretórios têm index.html próprio. A exclusão oferece um caminho externo por email, sem login obrigatório para iniciar uma solicitação; nenhuma remoção ocorre sem verificar identidade/autorização. A referência ao fluxo /conta ressalva disponibilidade por versão, pois os contratos de exclusão ainda precisam de implantação/homologação. Não declarar que a exclusão automática funciona em produção por ter preparado esta página.

A ficha gerada em output/google-play-script15/ficha-pt-BR.json contém responsável, emails e URLs com `publicadasNestaEtapa:false`. Materiais continuam rascunho. Não houve alteração de flags de aprovação dos documentos nem declaração de publicação. A rota de recuperação existente /recuperar-senha foi reutilizada como link, sem alterar seu fluxo ou afirmar validação de entrega externa.

## Conferência limitada das fontes

Reutilizado inventário de dados/SDKs já existente e conferidos somente: services/firebase.js, utils/ambiente.js, AndroidManifest, pages/Conta.jsx, services/conta.js, functions/conta.cjs e conta-exclusao.cjs, integração No Bolso, mapaLocal e fluxo de metadados de receita. Sem auditoria geral ou repetição de suíte anterior.

Exclusão retém históricos trabalhistas/financeiros, dados compartilhados/autoria, dados de terceiros e recibos de segurança/idempotência. Remoção de login/perfil/vínculo e inscrições pessoais não anonimiza os históricos. A limpeza local é por conta/aparelho; cópias externas não podem ser revogadas. Não foram criados TTL, scheduler, descarte automático ou justificativas legais.

Texto descreve Firebase Auth/Firestore/Functions/FCM, Capacitor e pontes locais, QR/PDF, cache e fila offline, mapas Photon/OSM, SEFA e imagens externas acionadas pelo usuário. Configuração não habilita anúncios, Analytics ou Crashlytics. Não declara criptografia ponta a ponta, residência exclusiva no Brasil ou prazo de terceiros não confirmado. No Bolso Android permanece só consulta; a integração web mantém seu contrato autorizado e dados financeiros privados não são anunciados como preços públicos.

## Matriz de retenção para decisão — Script16

Nenhum prazo abaixo foi aprovado automaticamente ou apresentado como obrigação legal. Marco inicial e exceção precisam de confirmação, antes de criar expirações ou executar descarte. O responsável pelas decisões dos históricos é o titular do grupo com orientação contábil/jurídica; Anderson Costa e Silva responde pelo AP1303 e suporte.

| Categoria / finalidade | Quem decide | Prazo sugerido e marco | Mecanismo preparado ou necessário | Exceções / situação |
| --- | --- | --- | --- | --- |
| Coordenadas exatas / validar local do ponto | Titular com orientação especializada | 90 dias desde a captura, proposta | Lote manual limitado apenas para projeção de registros legados com expiração explícita; modo dry-run; produção bloqueada | Disputa, retenção excepcional e payloads idempotentes preservados. **Depende de revisão especializada**. Não equivale a eliminar todas as cópias de localização. |
| Cuidados encerrados / organizar e comprovar o cuidado | Responsável pelo cuidado e titular com orientação especializada | 30 dias após encerramento formal, proposta condicionada ao contexto | Sem rotina de exclusão preparada; definir encerramento, autorização/representação e escopo antes | Saúde/crianças podem exigir tratamento específico. **Depende de revisão especializada**. |
| Grupo encerrado e compras pessoais / continuidade e exportação | Titular, com revisão dos documentos envolvidos | 30 dias após encerramento e oportunidade efetiva de exportar, proposta | Sem exclusão em cascata; definir o marco de exportação e separar preços de notas/autorais identificáveis | Documentos empresariais, disputas e dados de terceiros não seguem regra genérica. **Proposto**, sujeito a revisão específica. |
| Logs técnicos comuns / diagnosticar falhas | Responsável pelo AP1303 | 30 dias do evento, proposta | Inventário/ciclo do provedor ainda precisam ser confirmados; nenhum TTL ou varredura adicionados | Excluir desta categoria recibos, auditorias e dados de domínio. **Proposto**. |
| PDFs temporários / abrir e compartilhar | Responsável pelo AP1303 | 24 horas desde última modificação, conforme mecanismo existente; proposta a ratificar | PdfCacheSeguro já limpa oportunisticamente arquivos reconhecidos e preserva ativos; não alterado | Compartilhamento ativo, arquivos desconhecidos e cópias externas. **Proposto (mecanismo preexistente)**, sem garantia de apagar exatamente na hora. |
| Suporte / atendimento e evidência de tratamento | Anderson Costa e Silva | 12 meses do encerramento da solicitação, proposta | Procedimento manual no canal de suporte; não há rotina de caixa de email no app | Disputa ou solicitação ainda aberta. **Proposto**. |
| Ponto, folha, comprovantes e documentos empresariais / gestão e auditoria | Titular com contador/jurídico | A definir por categoria; nenhum prazo universal | Mecanismos de exclusão de acesso preservam históricos; não há descarte genérico preparado | Obrigações, provas e controvérsias precisam de análise. **Depende de revisão especializada**. |
| Recibos idempotentes, decisões e auditorias / integridade e retomada | Responsável técnico e titular com orientação especializada | A definir por janela real de repetição, reconciliação e auditoria | Preservados, excluídos da rotina de coordenadas e da proposta de logs comuns | Exclusão da conta não autoriza remoção desses recibos. **Depende de revisão especializada**. |
| Pendências e caches locais / recuperação | Titular e responsável técnico | Até resolver ou descartar explicitamente as não enviadas; prazo dos demais caches a definir | Fluxos existentes por conta/aparelho preservados; nenhuma limpeza nova | Resultados desconhecidos nunca são descartados por idade. **Proposto**. |

### Preparação técnica limitada

`functions/retencao-coordenadas.cjs` não é uma Function publicada: é um módulo administrativo manual, sem novo endpoint, Scheduler, TTL ou execução automática. `loteCoordenadas` aceita grupo/ator/cursor e até20 documentos por chamada. Exige perfil ativo de administrador que seja titular do grupo. Consulta somente registros desse grupo por ID, usando índice básico existente; contagens referem-se ao lote, não ao total do histórico. Cursor é devolvido ao operador, sem polling ou varredura global.

Campo opcional `retencaoCoordenadasEm` representa expiração explícita. **Não foi adicionado a registros reais ou preenchido pelo ponto**: a política por categoria, versão e prazo deve ser aprovada antes. O lote exige documento de política aprovado, categoria coordenadas_legadas, prazo positivo e expiração compatível com o instante do registro. Proteções `retencaoExcepcional` no grupo/registro preservam disputas; esses campos/políticas são de administração servidor, sem novo formulário ou permissão de escrita pelo cliente.

Dry-run não escreve. Execução é aceita somente em projetos demo- e revalida contexto/registro em transação, remove apenas latitude/longitude/distância dos registros legados elegíveis e registra instante/ator/versão no próprio documento. Repetição é idempotente. Documentos com operacaoId, declarado ou payload são sempre preservados: alterar a amostra original destruiria a rastreabilidade/idempotência. Nenhuma exclusão de documento, nota, folha, recibo ou histórico de compra está implementada nessa rotina. A remoção dessa projeção não é anunciada como anonimização nem como eliminação de localização em todo o sistema.

Custo **estimado**, não medido: dry-run3 leituras de contexto + até20 registros; execução emulada acrescenta4 leituras e1 atualização para cada candidato ainda elegível, sujeito a repetição da transação. Repetição sem candidato não escreve. Nenhuma limpeza em produção foi executada para medir custos. Uso eventual de infraestrutura tem custo conforme consumo, sem promessa de gratuidade.

Coleta nova de localização não foi alterada: ponto/geofence e captura original continuam com seus contratos. Reduzir a persistência da amostra após validação exige desenho específico para conflitos, auditoria e replay; não substituir localização original nem descartar coordenadas históricas por suposição.

Backups de dados Firestore e seu ciclo **não foram verificados nesta rodada**; a guarda da chave Android não é backup da base. Não foi criado serviço de backup nem prometido descarte em cópias existentes. Antes de liberar descarte real ou restaurar uma base, definir inventário/ciclo e controle de descartes preservado fora do conjunto restaurado; reconciliar esses descartes antes de reabrir acesso. Esse controle ainda não está implementado/homologado, portanto a execução real permanece bloqueada. Nunca considerar uma restauração segura apenas porque um backup abriu.

### Única lista curta das decisões ainda necessárias

- **A — Operacionais do titular:** confirmar ou ajustar os prazos/marcos propostos de logs comuns, PDFs temporários e suporte, incluindo compartilhamento ativo e atendimento não encerrado.
- **A — Operacionais do titular:** definir encerramento do grupo/cuidado, oportunidade de exportar, quem autoriza exceções e o controle exigido antes de restaurar backups; isso não aprova descarte de documentos sensíveis.
- **B — Contador/jurídico:** definir retenção por categoria de ponto, folha, comprovantes/documentos empresariais e as exceções por prova/disputa, sem prazo universal.
- **B — Contador/jurídico:** avaliar coordenadas, saúde, menores/representação, dados de terceiros e compras pessoais; aprovar o contexto de eventual descarte e tratamento de recibos/auditorias necessários à integridade.

Documentos públicos mantêm os prazos como indefinidos; a matriz é interna para decisão, não uma política final. Contato aprovado: Anderson Costa e Silva / andersoncsilva84@hotmail.com. Rotas preparadas: /privacidade/, /suporte/, /excluir-conta/, ainda sem deploy nesta etapa.

## Validação e publicação

Build isolado em tmp/documentos-build aprovado; dist e assets demo não substituídos. Não foram repetidos testes de ponto, conta, compras ou backend. Publicação e conferência das URLs externas permanecem pendentes. Sem deploy, alteração de dados reais, upload Play, commit ou push.
Verificação visual adicional: páginas locais em viewports 320, 390 e 1366px, sem rolagem horizontal; captura móvel em tmp/documentos-mobile.png. Conferência HTTP dos três HTMLs idênticos às fontes, sem script/iframe/formulário, e ficha local com contato aprovado e flag de páginas não publicadas. Não foram executados fluxos de exclusão, acesso a grupos ou envios de email.
## Consolidação de 25/10/2026 — atendimento manual, ainda não publicado

Esta seção substitui a preservação geral de históricos como proposta de atendimento. Os prazos numéricos anteriores continuam apenas propostas; não foram aprovados nem ativados. Cada conservação exige justificativa específica, acesso restrito, data e critério de revisão.

Procedimento executável: `scripts/privacidade-conta.cjs`, apoiado por `functions/privacidade-administrativa.cjs`, sem endpoint publicado. Instruções operacionais, limites, recuperação do protocolo e estimativas de custo em `exclusao-suporte-rascunho.md`. Texto integral consolidado em `privacidade-rascunho.md`; categorias exatas e destinatários da Segurança dos dados em `dados-e-permissoes.md`.

Validação final: `node --test tests/privacidade-administrativa-emulador.test.cjs`, com Auth em 127.0.0.1:9098 e Firestore em 127.0.0.1:8877, projeto demo isolado. Resultado: 4 testes aprovados, 0 falhas. No cenário fictício após exclusão do Auth: 4 documentos excluídos, campos pessoais retirados de 3 documentos compartilhados e 3 conservações justificadas individualmente. Dados de terceiros e de outro grupo foram preservados. Verificados dry-run, versão obsoleta sem exclusão parcial, replay, vínculo de funcionário concorrente, arquivo privado do CLI e recusa das regras a cliente anônimo/administrador do grupo. A identidade simulada das regras não substitui o teste real de exclusão no Auth, executado separadamente no mesmo ensaio.

A conclusão refere-se ao escopo inventariado: dados legados fora do grupo, referências indiretas, texto misto, arrays, órfãos desconhecidos, cópias externas e backups exigem tratamento específico. Não há promessa de eliminação universal nem rotina genérica de retenção. O protocolo original continua ligado ao UID mesmo após Auth; recuperação por suporte exige verificação de identidade, nunca apenas conhecer UID ou protocolo.

Correção factual importante: a interface Android oferece consulta No Bolso, mas o backend comum de integração não filtra a origem da compra por plataforma. A política descreve os destinatários autorizados sem prometer exclusão dos registros originados no Android. Nenhuma alteração funcional dessa integração foi feita.

HTMLs locais de /privacidade/, /excluir-conta/ e /suporte/ preparados pelo gerador existente. Sem build Android, deploy, preenchimento das declarações Play, dados reais, commit ou push. Próximo passo: uma aprovação do texto consolidado, do procedimento com suas limitações e do quadro de Segurança dos dados; depois, publicação seletiva e conferência das URLs antes de concluir a faixa fechada.
## Publicação aprovada e envio fechado — 26/10/2026

Titular aprovou política, procedimento manual e respostas da Segurança dos dados e assumiu a triagem administrativa. Páginas publicadas no deploy Netlify 6ade93c6a7ebdf1c273efb59, preservando os 52 arquivos anteriores e alterando somente os três HTMLs. URLs /privacidade/, /suporte/ e /excluir-conta/ verificadas com HTTP 200 e conteúdo idêntico às fontes aprovadas, sem marca de rascunho.

Na Play: política salva; Segurança dos dados concluída e salva, com Não para a garantia global de criptografia em trânsito, links de exclusão publicados, 17 tipos de dados tratados conforme o quadro aprovado. Em 26/10/2026 foram confirmadas 14 mudanças para revisão, incluindo exclusivamente a faixa Teste fechado — Alpha, versão 1.0.0/código 1, ficha e declarações previamente autorizadas. Console apresentou Alterações em análise, com verificações rápidas ainda em andamento e estimativa de até 14 minutos. Isso não comprova aprovação nem disponibilidade aos testadores. Nenhum lançamento em produção pública.

Captura: tmp/play-teste-fechado-enviado-2026-10-26.png. Sem rebuild Android, novo upload AAB, alteração de backend, testes repetidos, commit ou push. Nenhum bloqueio obrigatório exibido no envio; resultado da análise do Google permanece pendente.