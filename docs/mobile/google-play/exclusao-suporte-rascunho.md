# Exclusão, dados retidos e suporte — histórico do rascunho

**Atualização de 25/10/2026:** a seção operacional ao final substitui a antiga proposta de preservação geral dos históricos. Os parágrafos históricos abaixo não são a política para publicação. Os HTMLs locais foram consolidados para uma única aprovação; nenhum foi publicado nesta rodada.

Versões atuais preparadas em `public/excluir-conta/index.html` e `public/suporte/index.html`, com responsável e contato aprovados. Rotas pretendidas no domínio do PWA, ainda sem deploy: `/excluir-conta/` e `/suporte/`. A primeira oferece instrução de solicitação por email sem exigir instalação/login; o fluxo autenticado `/conta` continua condicionado à disponibilidade dos contratos. Ver `documentos-publicos.md`. As pendências de responsável/contato abaixo foram resolvidas; prazos de retenção e atendimento não foram inventados.

**Não publicado. URLs, contato e política final pendentes.**

## Caminho disponível

No app: **Minha conta → Exclusão da própria conta**. Na web, a rota `/conta` permite entrar na própria conta sem instalar o APK, solicitar e confirmar a exclusão. O domínio final não foi definido/publicado por esta rodada; verificar sua disponibilidade real antes de registrá-lo no Console.

O usuário confirma a identidade, consulta as pendências, registra a solicitação e confirma a exclusão definitiva separadamente. Resultados incertos precisam de reconciliação; capturas nunca enviadas exigem envio/descarte explícito. Se for último administrador/titular de grupo com outros membros, é necessário preparar outro administrador e transferir a titularidade. O grupo e terceiros não são excluídos em cascata. Um grupo sem outros membros pode ter o acesso encerrado explicitamente, mantendo históricos informados.

## O que é removido e o que não é

Removidos: login Firebase Auth, perfil/vínculo de acesso, inscrições de dispositivos e integrações pessoais abrangidas pela operação. Retidos: registros de ponto, folha, comprovantes, cadastro trabalhista, compras/preços, tarefas/cuidados e autorias compartilhadas necessários à continuidade do grupo. Podem identificar o usuário. Critérios e prazo de descarte devem ser definidos pelo titular com orientação contábil/jurídica. Não publicar promessa de anonimização/apagamento integral.

O processamento tem recibo/protocolo e retomada recuperável. O protocolo sozinho não autoriza apagar outra conta. Não prometer conclusão imediata ou prazo fixo não definido. Se faltar recibo final, orientar consulta/retomada segura, preservando filas e acesso dos demais membros.

## Recuperação e suporte

**Esqueci minha senha** inicia recuperação pelo Auth. No destino final, conferir entrega real, domínio autorizado, URL do email e retorno ao APK/PWA; o teste em emulador não comprova esses passos externos.

Texto de suporte proposto: “Informe o módulo, a mensagem apresentada, a versão do aplicativo e o protocolo da operação quando disponível. Nunca envie senha, código de autenticação, token de dispositivo ou localização completa por mensagem de suporte. Preserve operações pendentes antes de limpar dados ou trocar de aparelho.”

Pendente: nome do responsável, email/canal público, horário/prazo de atendimento, domínio e página final. Não usar um contato inventado. Capturas de suporte devem omitir dados pessoais de pacientes/funcionários. A política deve indicar como solicitar correção e tratamento dos históricos retidos, com autorização apropriada do grupo.

## Procedimento administrativo executável — 25/10/2026

Responsável: Anderson Costa e Silva; canal aprovado: andersoncsilva84@hotmail.com. Atendimento manual de dados associados aprovado pelo titular, sem aprovação de prazos numéricos gerais. Código: `functions/privacidade-administrativa.cjs`; CLI local: `scripts/privacidade-conta.cjs`. Não são exportados por `functions/index.js`: não há endpoint, deploy, Scheduler, listener, TTL nem serviço novo. Nenhuma conta real foi consultada ou excluída nesta rodada.

### Acesso e preparação

Somente operador de suporte autorizado, com credencial administrativa Google (ADC) fora do repositório. O papel de administrador dentro do grupo não concede acesso ao CLI nem aos casos privados. As regras atuais não permitem ao cliente ler/escrever `privacidadeCasos`, inclusive subcoleções; isso foi testado com cliente anônimo e identidade administrativa simulada no emulador. O Admin SDK opera com IAM e ignora regras do cliente: a estação/credencial administrativa precisa permanecer restrita ao suporte. Não atribuir papéis IAM novos para executar este procedimento.

1. Triar pedidos recebidos no canal de suporte e os pedidos concluídos de exclusão de acesso em `contaSolicitacoes`, pelo Console administrativo, usando filtros e período limitado. Não há aviso ou encaminhamento automático novo para o suporte. Não encerrar o pedido de dados apenas porque Auth foi removido.
2. Verificar identidade e escopo antes de qualquer remoção. Uma solicitação autenticada do app tem a confirmação recente exigida pelo fluxo existente; um email recebido depois não é automaticamente autenticado. Conferir o contexto original e, quando necessário, a autorização do responsável do grupo. Não usar senha, token, localização, UID ou conhecimento do protocolo como prova isolada. Registrar apenas a referência privada da verificação, sem copiar documentos de identidade para a prévia.
3. Confirmar o UID/protocolo, grupo e funcionário a partir dos registros existentes. O CLI exige `contaSolicitacoes/{uid}` concluída, grupo correspondente e Auth ausente. Conta legada sem grupo ou cadastro trabalhista ligado a outro login exige revisão específica e é recusado nesta versão.
4. Guardar arquivos de entrada, prévia e decisões fora do repositório, em pasta privada. Windows: ACL somente operador/SYSTEM, herdada pelos arquivos; Linux: pasta0700/arquivo0600. O CLI recusa arquivo no repositório, link simbólico e permissões amplas. Não altera ACL de pastas existentes nem imprime conteúdo dos documentos. Não usar sincronização pública, email ou anexos de chat para esses arquivos.

### Execução local, uma etapa por comando

Usar sempre o mesmo diretório de trabalho do repositório. No ensaio: `GCLOUD_PROJECT=demo-privacidade`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8877`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9098`. Esses emuladores já estavam ativos; não foram interrompidos. Um `projectId` demo distinto foi usado pelos testes para isolar as fixtures existentes.

Entrada privada inicial (todos os valores são substituídos pelo operador; não colocar credencial no arquivo):

```json
{
  "uid": "UID_CONFIRMADO",
  "grupoId": "GRUPO_CONFIRMADO",
  "operador": "OPERADOR_AUTORIZADO",
  "verificacaoRef": "REFERENCIA_PRIVADA_DA_VERIFICACAO",
  "identificadores": [],
  "revisarEm": "DATA_ISO_ESCOLHIDA_PARA_ESTE_CASO",
  "criterioRevisao": "NECESSIDADE_ESPECIFICA_DO_REGISTRO_MINIMO_DE_ATENDIMENTO"
}
```

`identificadores` pode incluir emails/nomes anteriores **já verificados**, até12 valores, somente para localizar candidatos adicionais. Não usar nomes de terceiros ou termos genéricos. O CLI recupera também o identificador de funcionário do recibo e nome/email do cadastro trabalhista ainda existente. Nome semelhante nunca autoriza exclusão por si só. A data de revisão do caso é escolhida individualmente, não é um prazo universal de retenção.

Comandos, usando caminhos absolutos privados em lugar dos exemplos:

```powershell
node scripts/privacidade-conta.cjs registrar C:\PASTA_PRIVADA\entrada.json
```

A resposta contém apenas `caso`. Acrescentar esse número e o operador a uma entrada privada para as etapas seguintes, e comunicar o protocolo pelo canal de identidade verificada. Não substituir/remover o protocolo antigo.

```powershell
node scripts/privacidade-conta.cjs inventariar C:\PASTA_PRIVADA\caso.json
node scripts/privacidade-conta.cjs previa C:\PASTA_PRIVADA\caso.json C:\PASTA_PRIVADA\plano-1.json
```

`inventariar` faz uma rodada limitada; se retornar `continuar:true`, o operador inicia outra rodada. Não existe polling ou repetição automática. A prévia é recusada enquanto faltar inventário. O arquivo de saída não pode existir: preserva-se a versão anterior para revisão, sem sobrescrita silenciosa.

**Dry-run:** inventário e prévia não alteram documentos de negócio. Persistem apenas o caso privado, cursor e metadados necessários para retomada. A prévia contém caminhos, versões, nomes de campos e bloqueios, não valores de salários, nomes de pacientes, imagens, tokens ou coordenadas.

### Decisões explícitas por registro

O plano começa com `acao:PENDENTE` para cada candidato. O operador deve revisar o documento de origem autorizado quando necessário e escolher:

- `excluir`: somente documento pessoal de coleção restrita, sem conflito com outro titular e com subcoleções cobertas. Não apaga listas, pacientes ou conteúdo compartilhado inteiro.
- `retirarCampos`: somente campos exatos identificados na prévia, todos eles, sem cortar parte de um array ou eliminar texto misto. Remove a autoria/destinatário pessoal identificado, preservando valores e conteúdos dos demais. O campo de caminho é `{ "partes": ["nomeDoCampo"] }`; não usa uma string pontuada ambígua.
- `conservar`: exige justificativa **daquele registro**, `revisarEm` futuro e `criterioRevisao` específico. Só é aceito em coleções com acesso já restrito ou recibos de integridade do servidor. Não é uma autorização para conservar todas as compras, tarefas ou cuidados compartilhados.

Recibos originais de idempotência/decisão e exclusão não são editados para fazer a limpeza passar. Quando necessários, cada um exige conservação individual justificada/revisável; caso contrário, exige desenho específico antes de descartá-los. O próprio caso mínimo (UID, grupo, referência da verificação, ações, operador e revisões) também exige data/critério de revisão. Não há serviço automático que execute essa revisão: ela é responsabilidade administrativa humana, sem infraestrutura recorrente nova.

Adicionar ao plano privado `operador`, `confirmar:true` e as decisões completas. Copiar o `digest` da prévia, sem recalcular ou alterar caminhos/metadados.

```powershell
node scripts/privacidade-conta.cjs executar C:\PASTA_PRIVADA\plano-1.json
node scripts/privacidade-conta.cjs conferir C:\PASTA_PRIVADA\plano-1.json
node scripts/privacidade-conta.cjs status C:\PASTA_PRIVADA\caso.json
```

Execução em uma transação limitada: falta de decisão, versão alterada, vínculo concorrente com outro login, conservação sem revisão ou subcoleção não coberta impedem todas as remoções do lote. `executar` termina em `executada`; somente `conferir` verifica os documentos revisados e encerra em `concluida`. Repetição não repete exclusões. Datas e critérios não são preenchidos automaticamente.

Se houver conflito, preservar a prévia e usar `reinventariar` com `caso`, `operador` e `motivo` específico em arquivo privado. Isso inicia outra geração e registra a revisão; uma prévia antiga deixa de valer. Não editar o checkpoint à mão, apagar o caso ou forçar o digest. Uma falha na conferência exige investigação, sem anunciar conclusão.

### Recuperação após remover Auth

O protocolo anterior é o UID e continua em `contaSolicitacoes/{uid}`. A exclusão do Auth não remove esse documento. O novo caso é determinístico por grupo+UID e contém `protocoloAcesso`; registrar novamente retorna o mesmo caso, sem duplicar. `status` e as etapas usam ADC do suporte, não um token do usuário excluído.

O suporte deve comunicar e guardar o número no atendimento privado antes de apagar os dados elegíveis. Se a pessoa perdeu o número, recuperar pela mensagem original/registro de atendimento e contexto verificado; não há busca pública por email nem reconstrução garantida se todas as referências tiverem sido perdidas. O protocolo não autentica quem o apresenta. Não recriar o login para consultar a decisão. `status` não expõe documentos ou justificativas a um cliente comum.

### Escopo e casos que não podem ser anunciados como concluídos

Inventário paginado do **grupo confirmado**, subcoleções de documentos existentes e âncoras de funcionário/usuário mesmo quando seus documentos pais já foram removidos; recibo de exclusão e execuções do UID na raiz. Correspondências por UID/FID, emails/nomes verificados e IDs de documento geram candidatos; nenhuma remoção ocorre apenas pela busca. Não é uma prova de anonimização.

Não percorre globalmente outros grupos, dados legados na raiz, nomes de campos dinâmicos arbitrários, cópias em outros sistemas, backups, emails de suporte ou aparelhos offline. Referências indiretas (por exemplo, outro identificador de paciente), texto livre misto, arrays, pais órfãos de coleções desconhecidas e documentos que não se enquadrem nas decisões seguras exigem investigação/ação específica antes de concluir esse escopo. Não fazer edições improvisadas para passar pela ferramenta. O recibo confirma **o conjunto revisado**, não garante ausência de novas inserções futuras por outros membros nem apagamento universal. O atendimento deve registrar escopos adicionais e não encerrar o pedido integral enquanto estiverem pendentes.

Limites: páginas de25, até200 documentos/250 passos por rodada, até5000 documentos no escopo e200 candidatos na execução. Exceder exige particionamento/revisão específica, sem aumentar limites automaticamente. A verificação final confere as ações nos documentos do plano; não é uma varredura global adicional. Cópias externas devem ser tratadas com seus responsáveis. Antes de restaurar backups, é necessário reconciliar decisões de descarte; esse controle de restauração não foi implementado/homologado nesta rodada. Não executar restauração como parte deste procedimento.

### Resultado e consumo

Teste direcionado: `tests/privacidade-administrativa-emulador.test.cjs`. Usa exclusão efetiva de Auth fictício pelo fluxo existente antes de iniciar o suporte. Verifica dry-run sem mudanças de negócio; exclusão de financeiro/ponto/cadastro pessoal e subcoleção; retirada de autoria sem perder valores; manutenção do paciente de terceiro; outro membro/grupo intactos; conservação individual com revisão; conflito sem exclusão parcial; idempotência e consulta do caso sem Auth. Também cobre novo vínculo concorrente e cadastro vinculado a outra conta.

CLI exercitado em processo separado, com pasta temporária ACL usuário/SYSTEM, passando por registrar → inventariar → prévia → executar → conferir → status. Pasta e arquivos fictícios removidos ao terminar. Regras testadas no SDK com identidade simulada exclusivamente para o emulador; isso não é anunciado como um novo ensaio de login/aparelho. As portas8877/9098 já em uso foram reutilizadas, sem finalizar processos existentes. Resultado final dos checks registrado em `documentos-publicos.md`.

Consumo **estimado**, não medido em produção: registro do caso cerca de4–6 leituras Firestore + consulta Auth +1 escrita; inventário lê no máximo200 documentos por rodada, mais contexto/consultas vazias e metadados de subcoleções, com uma escrita privada por candidato e1 checkpoint. A consulta paginada é reutilizada sem reler cada documento da página. Prévia: contexto + até201 itens privados. Execução: contexto/prévia e aproximadamenteN leituras de domínio + consultas de subcoleções/vínculo; N escritas privadas, atéN alterações de domínio e1 checkpoint. Conferência: atéN leituras de domínio +N de metadados e1 checkpoint. Transações podem repetir leituras por contenção. Zero novas chamadas de Functions, listeners, Scheduler, TTL, Storage ou serviços pagos neste procedimento local; permanecem custos de Firestore/Auth/rede/armazenamento conforme o uso, sem promessa de gratuidade.

Execução remota é bloqueada por padrão. Somente uma autorização futura por caso pode habilitar `GCLOUD_PROJECT=ponto-app-1c55a`, `AP1303_PRIVACIDADE_PRODUCAO=ponto-app-1c55a` e `AP1303_PRIVACIDADE_CASO` igual ao UID (registro) ou caso (demais etapas), sem variáveis de emulador. **Não executar esses ajustes remotos agora.** A rodada atual não aprovou nenhum caso real, conservação real, data individual, descarte real ou publicação das páginas.

### Pedido único no app e acompanhamento administrativo — ajuste final

Todo pedido autenticado de exclusão no aplicativo abrange também a análise dos dados associados. Não exigir segundo email. O suporte usa a coleção raiz contaSolicitacoes como fila de entrada existente: consulta manual por ID do documento, páginas limitadas (por exemplo 25), com cursor salvo privadamente e retomada da última página; faz retorno ao início em nova triagem humana para não depender de ordem temporal inexistente. Não instalar listener, polling, agendamento ou aviso novo. Ler apenas metadados necessários à triagem e o caso determinístico daquele UID/grupo, sem inventariar dados de negócio para descobrir se existe pedido.

Não filtrar somente pedidos novos ou sem Auth: pedidos aguardando análise, em processamento e falhas também exigem acompanhamento. O estado concluida da fila indica apenas exclusão de acesso. Para cada protocolo, registrar/retomar o caso administrativo existente depois dessa etapa, conforme os requisitos do CLI. A solicitação autenticada e a confirmação recente registradas são a origem da verificação; não pedir novo email para iniciá-la. Identidade adicional só quando indispensável ao atendimento ou a quem solicita informações externamente. VerificacaoRef deve apontar para essa origem autenticada/registro privado, sem copiar senha ou token.

O UID, grupo e funcionarioId do recibo sobrevivem ao Auth; protocoloAcesso liga o caso privado ao pedido original. O operador acompanha pelo comando status e pelas decisões/conferência já existentes. Caso com escopo técnico conferido não encerra o atendimento integral se houver legado, cópia externa ou outra pendência identificada. Registrar essas pendências no atendimento privado restrito e informar escopo parcial, resultado das remoções e conservações justificadas; nenhum prazo fixo prometido. Não recriar Auth nem exigir novo pedido para continuar. O canal de suporte serve para acompanhamento e pedidos externos, não é requisito adicional para a fila do app.

A rotina é administrativa, manual e depende de triagem efetiva pelo suporte. Não foi acrescentada automação de descoberta ou notificação. Operações remotas/reais continuam não executadas nesta rodada.