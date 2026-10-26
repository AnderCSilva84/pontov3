# Ficha Google Play — rascunho

Nome proposto: **AP1303** (6 caracteres; limite30).

Descrição curta proposta (abaixo do limite80):

> Ponto, tarefas, compras e lembretes para organizar a rotina do seu grupo.

Descrição completa proposta (abaixo do limite4.000):

> Organize a rotina do seu grupo com o AP1303.
>
> Cada pessoa entra com sua própria conta e usa os recursos liberados pelo administrador. Acompanhe registros de ponto e tarefas, monte listas de supermercado ou farmácia e consulte preços registrados anteriormente.
>
> Revise produtos de notas fiscais, associe descrições equivalentes com confirmação e consulte o histórico de preços. Valores históricos e estimativas não garantem o preço atual no estabelecimento.
>
> Cadastre lembretes de cuidados e horários informados pelos responsáveis, além de pratos do dia e receitas opcionais. Notificações dependem de permissão, conexão e funcionamento do aparelho.
>
> Para administradores, há recursos de gestão de funcionários, folha, pagamentos e comprovantes. Os cálculos e documentos devem ser conferidos pelos responsáveis.
>
> O ponto solicita localização durante o uso. Uma captura offline fica pendente e precisa de sincronização e revisão quando aplicável; não equivale a uma marcação já aprovada.
>
> A integração Android com No Bolso permite consultar valores. Não cria despesas nem altera lançamentos financeiros pela integração.
>
> Antes de usar, confira as permissões do seu grupo e os termos de privacidade. A exclusão de login/acesso preserva os históricos do grupo informados no fluxo.

Revisar descrição final conforme módulos habilitados e aprovação da declaração de saúde. Não anunciar precisão antifraude, push instantâneo, apagamento integral ou funcionalidades/plano de assinatura ainda inexistentes.

## Imagens

Marca original: `src/assets/ap1303.jpeg`. Ícone512 disponível em `public/icon-512.png`; fonte/gerador técnico documentados no Script12. Não usar marca ACS como ícone do produto. Assets Android adaptativos não substituem automaticamente o PNG exigido pela ficha.

Requisitos consultados: ícone512×512 PNG32bits, até1024KB; feature graphic1024×500; screenshots JPEG/PNG24bits sem alpha, mínimo320 e máximo3840px, maior dimensão no máximo duas vezes a menor. Conferir requisitos/recomendações atuais de quantidade/formato e categorias de dispositivo no Console. Para telefone, planejar pelo menos2 screenshots reais; preparar4 boas telas em9:16 para divulgação. Não forçar proporção com distorção.

Capturas reais de revisão com dados fictícios estão em `docs/mobile/capturas/13`, complementadas por12 e associações. São evidências locais, com banner TESTE/identidade debug, não uma ficha pronta para submissão. Planejar novas capturas no destino final: ponto e registros, tarefas, compras/status/farmácia, histórico/mesclagem, lembretes/receitas e gestão conforme acesso. Tablet deve mostrar o layout real correspondente. Ocultar informações de terceiros/status do aparelho no momento da captura, sem montar recursos fictícios.

Feature graphic e conjunto final aprovado da ficha permanecem pendentes. Não reutilizar mockups de funções inexistentes nem screenshots com nomes/documentos reais. Screenshots de erros/QA não são automaticamente material promocional.

## Contato aprovado e páginas preparadas

Responsável: **Anderson Costa e Silva**. Email público de suporte e privacidade: **andersoncsilva84@hotmail.com**. Usar esses dados na ficha e nos documentos; não são senha nem credencial de revisão.

URLs pretendidas, **não publicadas nesta etapa**: `https://ponto.acstech.dev.br/privacidade/`, `https://ponto.acstech.dev.br/suporte/` e `https://ponto.acstech.dev.br/excluir-conta/`. Conferir resposta pública após deploy antes de enviá-las à Play. Não confundir aprovação do contato com aprovação de prazos de retenção ou da política final.

## Campos a preencher pelo titular

Categoria de loja, público-alvo/faixas etárias, questionário IARC, países/idiomas, entidade e contato do desenvolvedor, URLs públicas, declaração de saúde e possíveis formulários financeiros. A presença de informações de crianças cuidadas precisa de avaliação, não de presunção de que o usuário-alvo seja criança.

Anúncios: nenhum SDK/fluxo de anúncios encontrado no recorte examinado. Monetização: limites/planos/in-app purchases não foram implantados nesta rodada; não descrever assinaturas como disponíveis. Confirmar modelo comercial antes de ativar cobrança/declarações.

## Notas para revisores — preparação, acesso ainda pendente

O app possui contas e permissões por grupo. O futuro acesso de revisão deve usar **grupo demonstrativo isolado com dados fictícios**, sem dados de clientes e sem envio aos aparelhos reais de usuários. Disponibilizar contas administrativas e funcionárias com credenciais válidas por canal privado do Console, instruções de navegação e recursos relevantes, sem credenciais neste repositório.

O APK atual depende dos emuladores USB e **não serve como acesso remoto de revisão**. Não fornecer o endereço residencial de cliente nem criar botão público para ignorar geofence. Definir ambiente demonstrativo independente e política específica de teste. Para ponto com GPS, planejar cenário autorizado compatível com avaliação remota ou demonstração guiada admitida pela revisão, preservando validação do backend; isso ainda precisa de desenho/configuração e validação. Vídeo não substitui acesso requerido pela loja por suposição.

Transferência/exclusão devem ser exercitáveis em contas descartáveis, sem impedir o próximo revisor. Documentar recuperação das fixtures e que cada usuário só acessa o próprio grupo. Recuperação por email real e retorno ao app precisam ser testados no destino final.

## Notas iniciais de lançamento propostas

> Versão inicial do AP1303 para organizar ponto, tarefas, compras e lembretes do grupo. Inclui histórico de preços, associação confirmada de produtos e recursos administrativos conforme as permissões da conta.

Somente usar quando corresponder à versão assinada final. Não informar número de versão definitivo antes da decisão do titular.

## Edição Android sem cuidados — proposta de 26/10/2026

Preparação local, não enviada à Play. Substitui as referências antigas a cuidados somente para o próximo candidato Android. O PWA mantém sua edição completa.

Descrição curta proposta: **Ponto, compras e tarefas para organizar a rotina do seu grupo.**

Descrição completa proposta:

> Organize a rotina do seu grupo com o AP1303. Cada pessoa acessa sua própria conta e os recursos autorizados pelo administrador.
>
> Acompanhe registros de ponto e tarefas gerais, monte listas de supermercado ou farmácia, revise notas fiscais e consulte o histórico de preços. Preços históricos e estimativas não garantem o preço atual no estabelecimento.
>
> Administradores podem consultar recursos de gestão de funcionários, folha, pagamentos e comprovantes. Valores e documentos devem ser conferidos pelos responsáveis. O app registra informações administrativas e não executa pagamentos bancários.
>
> O ponto solicita localização durante o uso. Capturas offline permanecem pendentes até sincronização e revisão quando aplicável. A demonstração identificada usa dados fictícios e não gera registros trabalhistas reais.
>
> As notificações de ponto e tarefas dependem de permissão, conexão e funcionamento do aparelho. A edição Android não oferece cadastro, consulta, confirmação ou notificações de cuidados de saúde.
>
> A integração com No Bolso permite consulta de valores. A exclusão da conta inicia também a análise dos dados associados, conforme a política de privacidade e o procedimento de suporte.

Imagens: preservar ícone e arte de marca. Retirar da seleção Android qualquer screenshot de cuidado, dose, medicamento ou confirmação. `apk-final-push-concluido.png` não deve ser reutilizado sem conferir seu conteúdo. Capturas reais da nova edição (ponto, compras, tarefas), com dados fictícios, ainda dependem da validação física; não montar screenshots simulando essa validação.

Acesso privado: reutilizar as duas credenciais demonstrativas existentes, sem expô-las ou criar contas. Administrador: Compras, Tarefas e Gestão; funcionário: jornada e tarefas; banner DEMONSTRAÇÃO: simulação de ponto sem GPS, isolada dos registros trabalhistas. Não orientar a recuperar cuidados pelo PWA dentro da experiência Android. Dados demo existentes não foram excluídos. Validação física do novo candidato pendente.

Pergunta preparada ao suporte (não enviada):

> O AP1303 Android mantém ponto, listas e histórico de compras e gestão administrativa de folha (salário, descontos, benefícios, pagamentos registrados e comprovantes). Não executa transferências, não mantém carteira e não oferece crédito, investimento ou aconselhamento financeiro. A edição candidata removeu o módulo de cuidados e seus avisos; o PWA separado mantém esse módulo na base compartilhada. A opção financeira “Outro”, com essa descrição administrativa, é correta? Esses recursos exigem conta de organização pela política do Play Console? Solicitamos identificar o recurso e o trecho aplicável antes de alterar a declaração. Campos livres, arquivos e compras de farmácia permanecem; não afirmamos impossibilidade de informações de saúde inseridas pelo usuário.

Definições oficiais consultadas: https://support.google.com/googleplay/android-developer/answer/9876821 e https://support.google.com/googleplay/android-developer/answer/13849271. Não presumir isenção financeira nem marcar serviços bancários inexistentes. Não há garantia de aprovação.
