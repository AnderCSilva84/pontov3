# Encerramento Android — AP1303

Atualizado 24/10/2026, Script 15. **AAB não gerado: identidade/Firebase Android finais, chave de upload autorizada, backend compatível e acesso remoto de revisão ainda pendentes.** APK demo preservado. Sem deploy, upload à Play, commit, push, PR ou alterações de produção nesta etapa. O PWA publicado pelo Script14 é uma entrega separada, não homologa o Android.

O checklist do Script15 ao final é a situação atual. As evidências abaixo dos Scripts11–13 são históricas e foram reutilizadas sem repetir auditoria completa ou testes físicos aprovados.

| Item | Estado/evidência | Responsável e próxima ação | Bloqueia |
|---|---|---|---|
| Base debug e ambiente exclusivo | Concluído: br.dev.acstech.ap1303.dev, Auth/Firestore/Functions locais, FCM do projeto exclusivo de teste | Desenvolvimento: preservar guards; não usar produção como atalho | Não bloqueia teste local; destino final bloqueia distribuição |
| Push e ações | Script08: ensaios reais no Samsung, bloqueio seguro, offline/logout/isolamento | Desenvolvimento/QA: regressão no destino final; entrega sujeita ao aparelho/rede | Piloto final/publicação até regressão final |
| Recuperação de senha | Emulador aprovado; email/link real e retorno no APK final pendentes | Titular define URLs/destino; desenvolvimento/QA valida | Piloto final/publicação |
| Exclusão de Auth/acesso | Script09 concluído no contexto testado, com processamento recuperável; históricos explicitamente retidos | Titular e orientação contábil/jurídica definem retenção e descarte; QA final | Política final bloqueia publicação |
| Ponto idempotente e isolamento | Scripts02–04/10 com testes; payload/ID preservados e replay sem nova marcação | Desenvolvimento mantém recibos/autorização e regressão | Não bloqueia teste no recorte |
| Captura GPS iniciada offline até decisão | Concluído em área aberta no Samsung: amostra real, persistência após reinício, reconexão única, aprovação/consulta e rejeição/consulta; 2 recibos/1 registro, sem alterar plugin/raio/timeout | QA: repetir em destino final e outros aparelhos; ambiente anterior tinha timeout | Bloqueio ambiental anterior superado no ensaio; não dispensa QA final |
| Revisão offline direta | Script10 concluído com paginação/auditoria/justificativas/isolamento/proteção de folha | Desenvolvimento/QA mantém segurança | Não bloqueia teste direto |
| Revisões que exigem ajuste/reabertura | Caminhos seguros bloqueiam conflito, mas integração da aprovação após ajuste não concluída | Titular define política; desenvolvimento integra, sem contornar folha/seqüência | Fluxo correspondente/piloto se necessário/publicação do recurso completo |
| Etiquetas e farmácia | Script11: backend, autoria confiável, legado, filtros, gastos/exportações e exclusão No Bolso; testes e visual320px APK/PWA | QA final no destino distribuível | Não bloqueia teste local |
| PDF temporário legado | Limpeza privada reconhecida/24h, conta e entregas protegidas; testes Java e físicos com arquivos fictícios | QA: destinatários externos no destino final; cópias públicas não revogáveis | Bateria final de PDF bloqueia publicação |
| Dependências | Script13: Zod/body-parser corrigidos, dependência externa file:.. sem uso removida; restam 3 moderados raiz e 10 backend | Desenvolvimento: revisar uuid/ts-deepmerge e pais com compatibilidade, sem force | Fechamento de segurança antes de distribuir |
| Release/segredos | Guard bloqueou assembleRelease intencionalmente; backup false, cleartext release negado, configurações locais ignoradas | Desenvolvimento/titular: identidade final/assinatura controlada | Produção/AAB/publicação |
| Privacidade/suporte/retenção | Exclusão não promete apagamento integral; faltam prazos, critérios, URLs finais e contato | Titular com orientação contábil/jurídica; revisar declarações Google Play | Publicação |
| Regressão no artefato final | Baterias parciais documentadas, não todos os fluxos em configuração final | QA após visual e preparação de destino | Piloto final/publicação |
| Assinatura/AAB/Google Play | Não iniciado, só debug; nenhuma chave de distribuição criada | Titular/desenvolvimento na etapa autorizada | Publicação |
| Revisão visual APK/PWA e marca | Script13: matrizes admin/funcionária/consulta e63 estados de formulários, escala tablet e consulta indevida corrigidas; teclado/Voltar/câmera no Samsung | QA: completar variantes de conteúdo/diálogos e regressão no destino final, preservando verde Comprado | Não certifica todas as telas nem libera publicação |
| Chunks/Gradle e Apple | Melhorias posteriores; Apple não iniciado | Desenvolvimento após Android | Não bloqueia teste debug; Apple fora do escopo |

Relatório: [Script11](11-fechamento-tecnico-android.md). Histórico: [GPS](10-complemento-gps-real.md), [revisão offline](10-revisao-ponto-offline.md), [push](08-validacao-push-android.md), [exclusão](09-exclusao-conta.md).

Próximas etapas: confirmar decisões externas e destino → implantar/validar dependências Android em rodada autorizada → configurar release/assinatura → AAB e passagem crítica no artefato final → distribuição Play sob comando. Não repetir redesign ou a bateria física inteira sem mudança que justifique. Apple permanece fora do escopo.

Script12: [relatório e comparações](12-revisao-visual.md). Ícones oficiais confirmados no Samsung; imagem de receita por link adicionada com busca explícita/segurança e limites de terceiros. Nenhuma publicação, assinatura final ou preparação Apple executada. A revisão aplicada não remove os bloqueadores acima.

Rodada posterior — [associações de produtos](../compras-associacoes.md): mesclagem manual reversível, sugestões locais, aliases e correção pontual, com autorização no backend. Integração isolada com 27 testes aprovados, mais teste de alias fiscal; APK/PWA com dados fictícios. APK debug atualizado e instalado sem limpar dados. A API/cache No Bolso permanece inalterada. Esta rodada não remove bloqueadores de distribuição nem autoriza publicação.

## Fechamento Script13

[Relatório](13-versao-candidata-android.md) e [materiais locais Google Play](google-play/README.md). Última bateria geral210 testes:181 aprovados/29 condicionais; emuladores296:289 aprovados/7 condicionais, complementados por9 guards mobile e2 HTTP específicos.5 Java aprovados. Lint/builds/sync e APK demo instalados; release continua falhando intencionalmente. Assets mobile não embutem as variáveis públicas web; PWA mantém o prefixo anterior.

Package debug confirmado, target SDK36, alinhamento ZIP/ELF16KB verificado nas bibliotecas64bits; Samsung usa4KB, execução16KB ainda pendente. Assinatura Android Debug preservada, sem chave definitiva/AAB. [Manifesto de artefatos e hashes](google-play/artefatos.json) identifica o estado local sem commit.

**Próximas ações externas:** definir identidade/projeto/versão finais; aprovar responsável, contatos, URLs e retenção/saúde/público; autorizar especificamente chave de upload; preparar acesso remoto demonstrativo; validar no destino assinado. Limitação de revisão após ajuste/reabertura e alertas moderados seguem explícitos. Nenhuma produção, deploy, migração, commit, push, PR ou envio ao Console; Apple não iniciado.

## Checklist único — Script15: AAB e preparação Google Play

| Item | Resultado real / próxima ação |
| --- | --- |
| Conta Play e verificação | Não identificadas no material/acesso disponível. Titular informar se já existe, pessoal/organização, data de criação e estado de verificação/acesso à produção. Não comprada conta nem presumida verificação. |
| Identidade final | Apenas `br.dev.acstech.ap1303.dev`, código1/versão0.1.0-dev confirmados. Nome AP1303 proposto; applicationId e versão finais aguardam confirmação e disponibilidade no Console. Não renomeado namespace/pacote do Samsung. |
| Firebase final | `android/app/google-services.json` pertence a `ap1303-android-push-teste` e ao pacote `.dev`; não é produção. Não existem `android/release.local.json` nem `android/app/google-services.release.json`. `ponto-app-1c55a` é o PWA confirmado, não foi adotado como Android por suposição. |
| Assinatura | Não existe `android/signing.local.json`; nenhuma chave final identificada/autorizada. Não gerada/substituída chave. Senhas somente por variáveis/gestor local, nunca no chat. Exemplo Gradle não aplicado agora verifica autorização, alias, fingerprint público do certificado real e rejeita Android Debug antes de assinar. Guarda: titular/responsável, backup criptografado fora do repo, recuperação testada e acesso restrito, conforme material já preparado. |
| Release e AAB | Gradle/resolver continuam recusando produção mobile. Preencher JSON não implementa destino final. Nenhum AAB gerado nem debug apresentado como pacote de loja. Liberar somente após os valores finais e contratos homologados; sem USB/emuladores/server.url ou cleartext global. |
| Documentos públicos | Rascunhos anteriores reaproveitados; responsável, contato, critérios/prazos de retenção e URLs finais ainda não aprovados. `/conta` com exclusão pertence ao cliente local completo e não entrou no pacote web isolado do Script14. HTTP200 de fallback/login não comprova política/suporte/exclusão disponíveis. Não publicada política com placeholders. |
| Retenção | Decisão já tomada: titular do grupo com orientação contábil/jurídica autoriza retenção/descarte. Faltam critérios/prazos por categoria e procedimento de solicitação para históricos retidos. Não inventado prazo nem prometida exclusão integral. |
| Acesso dos revisores | Sem grupo/contas remotos finais. Não provisionados sem projeto autorizado. Preparação: grupo isolado, dados fictícios, contas admin/funcionária, credenciais pelo canal privado do Console e contas descartáveis para exclusão. O ponto precisa de local de teste autorizado pelo fluxo normal do grupo, sem endereço de cliente, raio artificial ou bypass público; validar esse roteiro antes de fornecer acesso. Não declarar que vídeo ou APK USB substitui acesso remoto. |
| Materiais locais | Ficha em pt-BR: nome6, curta73 e completa1275 caracteres; ícone oficial512×512 copiado intacto; candidato a feature graphic JPEG1024×500, sem alpha, conferido visualmente e sem redesenhar a marca. Em `output/google-play-script15/`. Descrições dependem do escopo final habilitado. Screenshots reais fictícios dos Scripts12/13 reutilizáveis como evidência, mas o banner/identidade demo não deve ser ocultado para aparentar release. Capturas promocionais finais e aprovação do titular pendentes. |
| Checks desta rodada | Lint aprovado; um build mobile aprovado; 11 testes direcionados aprovados, zero falhas/skips. Validador release bloqueia com causas explícitas (resultado esperado). Não executada suíte completa/289 testes nem novo ensaio físico. AAB inexistente, portanto não há inspeção/assinatura/hash de AAB a declarar. |
| Preservação | SHA-256 do APK demo permanece `2371ce888de72e647246e809164c40c45c3a96e9d2d393c5b910c6b191cf27ad`. Build somente em `dist`, sem sync/instalação. Nenhum dado do Samsung limpo e nenhuma chave final criada. |

### Matriz curta de contratos Android × backend publicado

Evidência reaproveitada: inventário autenticado do Script14 de24/10/2026, 24 Functions, e fontes/configurações preservadas nessa publicação. Não foi consultado banco de clientes nem repetido inventário remoto nesta etapa. Destino Android definitivo ainda não escolhido; matriz abaixo refere-se somente ao **PWA `ponto-app-1c55a`**. Existência de uma Function não comprova protocolo compatível.

| Recurso Android | Backend necessário | Situação / ação pendente |
| --- | --- | --- |
| Ponto idempotente/fila/replay e revisão | `registrarOperacaoPonto`, `revisarPendenciaPonto`; regras privadas e índices de `pontoPendencias` | Ausentes no inventário. `registrarPonto` legado publicado não substitui o novo contrato. Implantar aditivamente, manter legado e conferir bloqueio de folha revisada. |
| Conta, transferência e exclusão | `contaOperacao`, trigger `processarExclusaoConta`; barreiras de criação/exclusão administrativa e regras | Novos endpoints/trigger ausentes. Atualizar também `criarGrupo`, `criarMembroGrupo`, `excluirUsuario` e proteção de perfis. Sem trigger/retomada funcional não anunciar exclusão concluída. |
| Push Android e ações | Registro/revogação `fcm-android`, emissores com payload nativo e `acaoNotificacaoTarefa`/`acaoNotificacaoLembrete` | Registro/revogação/emissores publicados são web anteriores; ações ausentes. Atualizar protocolo e emissores existentes, sem duplicar rotinas, e validar destinatários de teste no projeto final. |
| Compras e associações | `comprasOperacao`, `comprasRelatorio`, `comprasEstimativa` | Associações publicadas pelo14; classificação completa/gastos de farmácia e estimativa por tipo continuam locais. Atualizar esses três contratos para paridade com o cliente Android. API externa já recebeu filtro de farmácia, não requer redesenho/cache novo. |
| Folha após revisão de ponto | `salvarFolhaPagamento` | Existe, mas guard de revisão de ponto ainda local; precisa coordenar com revisão e regras. |
| Lembretes/pratos/imagem de receita | `lembretesOperacao`, emissor `dispararLembretes` existente | Operação de imagem segura e auditoria das ações nativas ainda locais. Atualizar handlers necessários; não criar novo Scheduler. |
| Consulta No Bolso no APK | `noBolsoConsulta` | Ausente. Não substituir por acesso financeiro de escrita/ponte web. Preservar API e cache do consumidor, sem alterar repositório No Bolso. |
| Câmera/GPS/PDF/ícone | Adapters/plugins locais e contratos acima | Evidências13/anteriores válidas para demo. Bibliotecas64bits alinhadas16KB já verificadas; execução16KB e inspeção no AAB final permanecem pendentes. |
| Regras/índices | `firestore.rules`, índices de revisão, histórico e estimativa usados | Script14 não publicou esses diffs. Comparar novamente ao destino escolhido, selecionar apenas índices usados e esperar READY; não sobrescrever regras remotas desconhecidas. |

### Comandos seletivos preparados — NÃO EXECUTADOS

Válidos **somente se o titular confirmar o projeto do PWA como destino Android e autorizar a implantação em outra rodada**. Isolar fontes, revisar os diffs/remoto e preservar valores de ambiente antes. Não executar deploy geral de Functions nem migrar dados. Não recriar triggers/schedules já existentes. O inventário deve ser revalidado se o destino mudar.

```powershell
# Novos contratos/trigger ausentes:
firebase.cmd deploy --project ponto-app-1c55a --only "functions:registrarOperacaoPonto,functions:revisarPendenciaPonto,functions:contaOperacao,functions:processarExclusaoConta,functions:noBolsoConsulta,functions:acaoNotificacaoTarefa,functions:acaoNotificacaoLembrete"
# Compatibilidade das operações existentes:
firebase.cmd deploy --project ponto-app-1c55a --only "functions:criarGrupo,functions:criarMembroGrupo,functions:excluirUsuario,functions:salvarFolhaPagamento,functions:comprasOperacao,functions:comprasRelatorio,functions:comprasEstimativa,functions:lembretesOperacao"
# Transporte/emissores existentes, sem criar outra rotina agendada:
firebase.cmd deploy --project ponto-app-1c55a --only "functions:registrarDispositivoPush,functions:removerDispositivoPush,functions:testarNotificacaoPush,functions:alertaListaCompras,functions:alertaListaComprasGrupo,functions:alertaComprasItem,functions:alertaComprasItemGrupo,functions:alertaNotificacoes,functions:alertaNotificacoesGrupo,functions:alertaRegistroPonto,functions:alertaRegistroPontoGrupo,functions:dispararLembretes"
# Apenas depois da conciliação dos arquivos com o destino:
firebase.cmd deploy --project ponto-app-1c55a --only firestore:indexes
firebase.cmd deploy --project ponto-app-1c55a --only firestore:rules
```

O deploy de exclusão adiciona trigger e seu consumo por solicitação; precisa preservar recuperação/idempotência. Atualizar emissor agendado existente não autoriza multiplicar sua frequência/instâncias. Índices agregam armazenamento/escritas: revisar os realmente usados antes. Nenhuma dessas ações executada no15.

### Requisitos oficiais rechecados — 24/10/2026

- [Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en): API36 para novos apps/atualizações comuns. Projeto já declara36, conforme inspeção e badging histórico; nenhum SDK atualizado nesta rodada.
- [Memória16KB](https://developer.android.com/guide/practices/page-sizes): conferir `.so` transitivas/alinhamento e execução; evidência de alinhamento do13 não substitui AAB/execução finais. Orientação atual cita bloqueio de atualizações incompatíveis em01/02/2027; confirmar requisitos aplicados no Console na submissão.
- [Teste fechado](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en): contas pessoais criadas após13/11/2023 exigem pelo menos12 participantes continuamente inscritos por14 dias antes de solicitar acesso à produção. Tipo/data da conta ainda não fornecidos; não afirmar que essa exigência se aplica ou foi cumprida. Teste interno, teste fechado e produção pública são etapas distintas; APK instalado por USB não conta como cumprimento automático.
- [Segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [exclusão](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) e [saúde](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en): declarar os dados próprios e de SDKs; caminho no app e recurso web para exclusão, com retenções transparentes; lembretes de medicamentos são recursos a declarar. Reutilizar inventário existente, sem marcar ausência de saúde/coleta por conveniência. Público adulto responsável é uma decisão pendente, não inferido por haver crianças cuidadas.

Materiais existentes de privacidade/suporte/saúde/Segurança dos dados seguem como **rascunhos**, não políticas publicadas nem certificação jurídica. Análise de alcance dos alertas moderados do13 continua pendente; não reexecutado audit completo porque não houve atualização de dependências no15.

### Resultado, custos e única solicitação ao titular

Arquivos preparados/ajustados: validador/testes de release, exemplos de configuração/assinatura com fingerprint e autorizações, `android/release-signing.gradle.example`, gerador local `scripts/preparar-materiais-play.mjs` e os candidatos em `output/google-play-script15/`. O exemplo Gradle não foi aplicado/executado contra chave final inexistente. Não muda segurança por simples ocultação de UI.

Nenhuma leitura/escrita de negócio, invocação de Function, listener, polling, upload de loja, serviço pago ou infraestrutura adicional nesta rodada. Build/renderização/testes são locais; apenas documentação oficial consultada pela rede. Não é previsão de custo zero para lançamento. Reutilizadas as estimativas anteriores: ponto online8leituras/3escritas/1Function; replay4/0/1; primeira sincronização offline6/2/1; fila ociosa0operações adicionais. Outros listeners/serviços preexistentes do app continuam; valores estimados, não medição de fatura.

**Informações consolidadas necessárias, sem senhas/chaves privadas:** (1) conta Play existente, tipo/data/verificação; (2) nome/ID/versão e projeto Firebase Android finais, com configuração correspondente em arquivo local; (3) chave de upload existente/caminho e certificado público, ou autorização específica para criá-la/definir guarda; (4) responsável, contatos, URLs e critérios/prazos de retenção aprovados, público-alvo e declaração de cuidados/medicamentos; (5) projeto/grupo demonstrativo remoto autorizado para revisores. Credenciais de revisores apenas por canal privado do Console.

**Próxima ação concreta:** receber essas definições, fechar compatibilidade/deploy Android em rodada autorizada e implementar o destino release sem alterar o debug. Só então gerar AAB assinado, conferir identidade/versão/ambiente/certificado/hash e instalar APK derivado para a passagem crítica. Distribuição no canal interno, eventual teste fechado exigido e produção pública dependem de comandos posteriores. Não foi produzido artefato com valores inventados para aparentar conclusão.

## Identidade e chave de upload — autorização de 24/10/2026

Identidade aprovada aplicada exclusivamente por `androidComponents` à variante release: AP1303, `br.dev.acstech.ap1303`, versão `1.0.0`, código candidato `1`. Recursos release usam o mesmo nome e esquema de URL final. Namespace, configuração Capacitor compartilhada, pacote debug `.dev` e versão debug `0.1.0-dev` preservados. Release continua bloqueado: isto não autoriza empacotar assets demo como produção.

O validador exige `versionCodeDisponivel: true`, somente após conferência no Console; o exemplo mantém `false`. Nenhuma consulta ao Console foi realizada e disponibilidade não foi presumida.

Não encontrados arquivos locais `android/signing.local.json` ou `android/release.local.json`; isso **não comprova ausência de chave já vinculada na Play**. Foi solicitada confirmação da existência do aplicativo/chave anterior antes de gerar a primeira chave. Nenhuma chave foi criada, substituída ou enviada. Alias, caminho e fingerprint finais permanecem pendentes dessa conferência. O exemplo de assinatura agora recusa keystore dentro do repositório e caminhos relativos.

Guarda prevista: keystore e senhas fora do repositório, armazenamento local restrito; configuração ignorada contém somente caminho absoluto, alias e SHA-256 público. Senhas por ambiente/entrada segura, nunca argumentos literais, logs ou documentação. Após criação autorizada sem duplicidade, registrar certificado público e testar leitura local; manter cópias criptografadas independentes fora do computador e testar restauração sem substituir a chave original. Não enviar chave privada ao Console ou outros serviços.

Permanecem os bloqueios de Firebase final, contratos Android, documentos públicos e acesso demonstrativo descritos acima. Sem deploy, upload Play, cobrança, commit, push, instalação ou limpeza de dados.

Checks desta autorização: 2 testes direcionados do validador aprovados; lint dos dois arquivos JS aprovado. Gradle 8.14.3/JDK21 configurou com sucesso e tarefas locais de inspeção confirmaram `debug br.dev.acstech.ap1303.dev 0.1.0-dev code=1` e `release br.dev.acstech.ap1303 1.0.0 code=1`. Tarefa contendo Release recusada pela proteção existente, como esperado; nenhuma proteção removida. SHA-256 do APK debug preservado: `2371ce888de72e647246e809164c40c45c3a96e9d2d393c5b910c6b191cf27ad`. Nenhum acesso de negócio ao Firebase ou consumo adicional de infraestrutura.

### Chave criada após confirmação do titular

Titular confirmou que não existe upload anterior na Play; conferência baseada nessa declaração, sem sessão remota do Console. Primeira chave criada com `keytool` oficial do JDK21. Nenhuma chave anterior substituída. O código de versão1 ainda depende de conferência antes do primeiro envio.

| Dado público / localização | Valor |
| --- | --- |
| Keystore privada (fora do repo) | `C:\Users\ander\.android-signing\ap1303\ap1303-upload.p12` |
| Alias | `ap1303-upload` |
| Certificado público DER | `C:\Users\ander\.android-signing\ap1303\ap1303-upload.cer` |
| SHA-256 do certificado (não é hash do arquivo keystore) | `D0:00:F2:D0:DF:9A:C8:DF:6D:0F:1B:1B:CF:2E:A8:F0:1C:09:F5:3E:9C:3D:CF:C8:37:C9:43:76:91:15:67:34` |
| Identificação / algoritmo / validade | `CN=AP1303`, RSA3072/SHA256withRSA, até11/03/2054; nenhum nome jurídico, endereço ou dado pessoal inventado |
| Senha protegida | `C:\Users\ander\.android-signing\ap1303\senha.dpapi`; aleatória, nunca impressa ou passada literalmente na linha de comando |

Pasta com herança removida e acesso somente ao SID do usuário atual e SYSTEM, conferida antes da geração. A primeira execução foi interrompida porque PowerShell tratou a mensagem informativa de stderr do keytool como erro; foi confirmada ausência da keystore e retomada a mesma preparação/senha. Gerada somente uma keystore. Nenhuma senha registrada em arquivos do repositório ou logs.

`android/signing.local.json` ignorado contém somente caminho absoluto, alias e fingerprint públicos. `android/release.local.json` ignorado registra a aprovação da assinatura, mantendo disponibilidade do código1 e demais homologações como pendentes. `android/release-signing.gradle` exige opt-in `-Pap1303Assinatura=true`, verifica caminho externo, certificado e autorização; configura somente release. O bloqueio de release e os assets demo permanecem intactos. O exemplo anterior não é mais o carregador efetivo.

Validação reproduzível local, com JAVA_HOME apontando para o JDK21:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/android-assinatura-local.ps1
```

O script descriptografa DPAPI somente em memória, fornece as variáveis ao Gradle sem daemon persistente e as remove ao encerrar. Executa apenas `:app:validarChaveUpload`, sem gerar AAB/APK. Resultado real: BUILD SUCCESSFUL; chave privada lida com sucesso, assinatura de amostra aleatória verificada com o certificado público e debug não associado à chave de upload. Repetidos somente os2 testes do validador e lint direcionado: aprovados. APK debug mantém o SHA-256 anterior. Nenhum teste físico necessário ou declarado nesta rodada.

**Backup ainda a executar pelo titular:** copiar a keystore criptografada e o certificado para mídias independentes protegidas, fora do repositório e fora deste computador. Guardar a senha em cofre criptografado independente por procedimento local seguro, sem chat/logs/clipboard de automação; o arquivo DPAPI é vinculado à conta Windows/máquina e sua cópia isolada NÃO constitui recuperação portátil da senha. Não apagar o original antes de restaurar uma cópia em diretório externo e validar leitura, alias e o mesmo fingerprint com keytool, além de prova de assinatura. Não criar outra chave para testar recuperação. Nenhum backup externo/portátil nem teste de recuperação em outra máquina foi realizado nesta etapa. A chave privada não foi enviada a qualquer serviço.

Pendências para AAB/distribuição: backup portátil comprovado, código de versão confirmado, Firebase Android final aprovado, contratos Android homologados, documentos públicos e acesso de revisão conforme matriz anterior. Sem deploy, upload Play, cobrança, commit ou push. Zero operações adicionais de Firestore/Functions: geração e validação locais. Comando keytool usa senha por variável de ambiente, conforme [documentação oficial do JDK21](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html).

## Rodada de ponto/mapa e catálogo — 24/10/2026

[Relatório específico](../ponto-ajustes-localizacao.md): consultas de resumo consolidadas, rotas secundárias sob demanda, correção administrativa auditada no servidor e localização por endereço/mapa, **para Android e PWA**. Novas funcionalidades de ponto/mapa ainda locais, sem deploy de backend/interface.23 testes locais e15 de emulador aprovados;5 verificações de interface com serviços simulados; PWA/mobile/sync/assembleDebug aprovados. APK debug `C7393603D387C4A1D399BAEBA312BD4B8691C747FEDD3CD88B925E4118D64920`, mesmo pacote/certificado/versão demo, sem instalar ou limpar aparelho. A nova assinatura de upload não foi utilizada. Validação de mapa externo e latência física pendentes; não afirmar ganho em segundos. Sem índices/serviços pagos novos. A matriz anterior continua exigindo publicar/homologar `revisarPendenciaPonto` e dependências antes da interface de correção.

Apenas a correção de apresentação do catálogo mesclado foi publicada no PWA, dentro da autorização pontual persistente: `6adcf4e67d596066183aa4c6`; detalhes em [associações](../compras-associacoes.md). Android recebeu os mesmos filtros no código/APK demo local. Sem deploy geral, migração, commit ou push.

## Publicação ponto/mapa — 24/10/2026

[Validação e publicação detalhadas](../ponto-ajustes-localizacao.md): PWA `6adcfcbdddb5fb6faf1dc507` publicado após teste HTTP e interface completa em Auth/Firestore/Functions emulados. Nova callable restrita `ajustarJornadaPonto` e proteção de reconferência em `salvarFolhaPagamento` publicadas seletivamente em `ponto-app-1c55a`; fórmulas salariais atuais preservadas. Revisão offline Android continua fora deste deploy. Índice dias existente conferido READY, sem regras/índices/Scheduler novos ou migração.

Correção de inicialização lazy validada, busca pública de endereço/CORS e bloco OSM conferidos, PWA público renderizado sem erro JS. APK demo recompilado com o endpoint compartilhado, SHA-256 `6CBCA2606BBA09B3FC9F41A1FFF3DDCE60BB0F3765EF352BE727699918610443`, sem instalar/limpar aparelho ou usar upload key. Não houve teste físico novo nem marcações reais em produção. Permanecem os demais bloqueadores de release/Play; esta autorização foi somente para validar/publicar ponto e mapa no PWA e dependências necessárias. Sem commit/push.

## Backup portátil e versão final — 24/10/2026

Ver [procedimento e bloqueios consolidados](google-play/backup-portatil.md). Script local preparado com keytool/PKCS12 e senha própria solicitada com entrada oculta, sem dependência de DPAPI na recuperação. Cópia real e ensaio de recuperação pendentes do destino e da entrada segura pelo titular. Chave original preservada, nenhuma segunda chave gerada. Arquivos .p12/.pfx ignorados como defesa adicional.

Console acessível conferido visualmente: conta sem aplicativos, exibindo “Criar seu primeiro app”. versionCode1 disponível nessa conta na conferência; não incrementado. Identidade final br.dev.acstech.ap1303 / 1.0.0 preservada; debug inalterado. Sem AAB final, deploy, upload, commit ou push. Dois testes direcionados do validador e sintaxe PowerShell aprovados; nenhuma auditoria/suíte completa repetida.
### Destino de backup aprovado

Pasta local `C:\Users\ander\BackupsSeguros\AP1303` preparada com ACL restrita; entrada oculta da senha pelo titular aberta em terminal local. Criação e verificação sem DPAPI aguardam conclusão interativa; conferir recibo antes de declarar sucesso. Cópia externa e ensaio em outro computador permanecem pendentes. Sem deploy/upload/commit/push.
## Firebase Android final compartilhado — 24/10/2026

Decisão explícita do titular executada: registrado AP1303 / br.dev.acstech.ap1303 no projeto do PWA ponto-app-1c55a, appId público 1:809643426461:android:7ab3ae41264ca9e5c0ca74, SHA256 público de upload cadastrado. Configuração/build web finais separados de demo, mesma base Auth/Firestore/Functions, sem migrar/duplicar dados. Modo demo continua fechado para produção. Nenhum deploy, cobrança, upload Play, commit ou push.

[Relatório e etapa única posterior](google-play/firebase-compartilhado.md). AAB bloqueado por URLs/documentos aprovados, homologação dos contratos Android e acesso de revisão; assinatura/identidade/projeto já configurados. Testes direcionados e build web/debug aprovados. Backup externo e recuperação física continuam com status próprio; não presumir conclusão.
## Documentos e contato público preparados — 24/10/2026

Responsável Anderson Costa e Silva e email andersoncsilva84@hotmail.com aplicados às páginas estáticas de privacidade, suporte e exclusão e aos materiais locais da Play. Rotas propostas no domínio existente, sem deploy: /privacidade/, /suporte/, /excluir-conta/. Build isolado e HTTP200 local das três páginas aprovados, sem SDK Firebase nas páginas públicas. [Relatório, decisões de retenção e fontes](google-play/documentos-publicos.md). Políticas não declaradas finais nem publicadas: prazos/critérios de retenção por categoria continuam dependentes do titular com orientação contábil/jurídica. Sem alteração funcional de conta, dados reais, deploy, upload, commit ou push.
## Preparação de revisão e plano único — 24/10/2026

- [x] Provisionador conservador de grupo isolado e duas contas fictícias preparado; credenciais cifradas fora do repositório e relatórios públicos, sem criação em produção.
- [x] Simulação de ponto separada, identificada e autorizada por claim/grupo/vínculo; sem GPS nem escrita de jornada/folha. Geofence normal preservado. Sem envios no grupo demo.
- [x] Teste HTTP em Auth/Firestore/Functions emulados aprovado: perfis, quatro marcações/replay, isolamento, recusa de escrita direta, fixtures legíveis, ausência de registros trabalhistas. Lint, parser e build web direcionados aprovados; nenhuma suíte geral repetida.
- [x] Lista única de recursos/ordem, verificações, recuperação, custos estimados e instruções privadas da Play consolidada no [relatório Firebase compartilhado](google-play/firebase-compartilhado.md), substituindo a seção anterior.
- [ ] Aprovar retenção/textos finais conforme lista existente, autorizar etapa seletiva posterior, provisionar/homologar grupo remoto e acesso Play, validar push final em instalação autorizada e gerar/conferir AAB. Não marcar acessoRevisaoValidado por antecipação.

Sem deploy, dados/contas em produção, migração, upload Play, cobrança adicional, commit ou push. Próxima ação: resolver decisões de retenção e aprovar o plano seletivo identificado; só então executar a etapa remota e homologação.
## Script16 — acabamento revisável e retenção preparada — 24/10/2026

[Relatório e capturas](16-acabamento-final.md). Estilos de formulários compartilhados, modais/ícones corrigidos após inspeção real; fonte/tokens e semântica de status preservados. APK debug final instalado por atualização no Samsung sem apagar dados; SHA256 FD4E74661502957AE256A8213E6C9DB4627E7E565D8D87D91FB7389F9FEBB99C. PWA local5190 com emuladores, nove telas/27 viewports e formulários abertos conferidos; teclado real confirmado. Estados/subabas não inspecionados e limitação do ensaio offline estão explícitos, sem certificação global.

Lint/builds/sync/assembleDebug aprovados;39 testes direcionados de fila/scanner/PDF/push e2 de retenção aprovados. Matriz e lista única A/B atualizadas em documentos-publicos.md; propostas não foram convertidas em política final. Lote manual de coordenadas legadas/dry-run preparado e restrito à execução emulada, sem TTL/Scheduler ou limpeza real. Backups/restauração permanecem dependentes de controle específico. Dados novos e amostra/idempotência do ponto não foram alterados.

Visual aguarda aprovação de Anderson. Permanecem bloqueios AAB/Play e plano seletivo anterior, sem deploy, produção, migração, commit, push, PR ou upload. Emuladores preexistentes preservados; preferências temporárias do Samsung restauradas a1/0.
## Rodada final de produção / PWA / AAB — 24/10/2026

Autorização desta rodada substitui a etapa anterior somente para deploy técnico seletivo, fixtures demonstrativos e homologação. Visual congelado; sem commit, push, PR, Apple, No Bolso ou upload Play. Branch `feat/ponto-operacoes-offline` e todo o diff/untracked preservados.

- [x] Destinos reconfirmados: Firebase `ponto-app-1c55a`, Netlify `ponto1303`, site `cf66ee21-9935-4013-8043-1471c62694e7`. Deploy anterior `6adcfcbdddb5fb6faf1dc507`; fontes/revisões anteriores guardadas em `tmp/final-round` para recuperação seletiva. Em incidente, corrigir adiante por novo deploy, sem apagar filas nem desfazer dados aceitos.
- [x] PWA publicado: **`6add4c571118c3e79283fdd9`**, https://ponto.acstech.dev.br. Index, assets iniciais, manifest, ícones e Service Worker conferem byte a byte. Políticas rascunho excluídas do artefato publicado; `/privacidade/`, `/suporte/`, `/excluir-conta/` continuam fallback da SPA, não páginas aprovadas.
- [x] Regras remotas comparadas, somente proteções esperadas de conta/ponto/folha; novo ruleset `8d644b9b-ebf9-4915-a6bb-4d6680b39c28`. Três índices `pontoPendencias` criados e READY: `CICAgJj7z4EK`, `CICAgOi39IkK`, `CICAgOi3kJAK`. Cinco índices anteriores preservados.
- [x] 27 Functions selecionadas publicadas; inventário final 33 recursos ACTIVE. Sem deploy geral, sem republicar registrarPonto, comprasApi, salvarFolhaPagamento, ajustarJornadaPonto ou financeiro. Lista/revisões antes/depois: `tmp/final-round/functions-after.json` e `revisoes-before.json`.
- [x] Falha inicial real: `npm ci` recusou override qs6.16.0 com lock6.14.2. Reparação isolada alterou apenas versão qs e removeu entrada extraneous do diretório pai; dry-run ci aprovado. Recurso novo processarExclusaoConta em FAILED, sem Cloud Run/Eventarc, removido/recriado com o mesmo nome; nenhum recurso antigo/dado removido. Tentativa seguinte bloqueou por esse estado residual; terceira concluiu.
- [x] Autorização IAM específica adicional do titular: `allUsers → roles/run.invoker` exclusivamente nos sete serviços us-central1 correspondentes a demonstracaoOperacao, contaOperacao, registrarOperacaoPonto, revisarPendenciaPonto, noBolsoConsulta, acaoNotificacaoTarefa e acaoNotificacaoLembrete. Mapeamento confirmado e dez arquivos publicados conferidos por SHA-256. Nenhum papel de projeto alterado; demais bindings preservados. Cada handler mantém Auth e autorização/contexto. Todos recusaram sem login; testes autenticados comprovaram acesso próprio/recusa de outro grupo ou parâmetros de outra conta. A recusa de um transporte privado anterior era HTTP401 fora do handler; agora é recusa JSON autenticada dentro do contrato.
- [x] Demonstração remota `demo_play_ap1303_v1` provisionada conservadoramente (30 documentos previstos, 2 contas com claim restrita). Senhas permanecem cifradas fora do repositório. Login admin e funcionário, simulação/replay e restrições validados; sem registros trabalhistas e sem dispositivos de push no demo. Ponto normal/geofence preservado.
- [x] Smoke adicional restrito ao grupo `g_qa_android_final_admin_20261024`: cadastro/retomada, membro fictício, marcação com coordenadas explicitamente fictícias do local QA, replay único, pendência/aprovação/consulta pela funcionária, mescla/replay/histórico/desfazer, recuperação sem enviar email e exclusão de conta descartável. Nenhum grupo/registro de cliente consultado ou alterado. Ações HTTP de tarefa e lembrete confirmadas e testadas contra outro grupo. Evidências: homologacao.json, iam-noauth-check.json, iam-auth-check.json em tmp/final-round. Geolocalização física não é comprovada por fixtures.
- [x] Foto adiada: sem armazenamento privado integrado/regras/custos demonstrados; avatar por iniciais preservado, nenhum controle de upload inoperante.
- [x] Backup portátil existente e íntegro: `C:\Users\ander\BackupsSeguros\AP1303\ap1303-upload-portatil.p12`; recibo `verificacao-backup.json` confirma modo independente de DPAPI e chave privada testada. SHA256 arquivo `CE522613DD0B292252F775D2E322BA71A186147E95E93CFA8B224FFEC9921CBD`; certificado `D000F2D0DF9AC8DF6D0F1B1BCF2EA8F01C09F53E9C3DCFC837C9437691156734`. Cópia externa e ensaio em outro computador pendentes. Nenhuma senha exibida e chave original preservada.
- [x] Play Console consultado nesta rodada: conta pessoal exibiu “Criar seu primeiro app”. Código1 ainda não utilizado nessa conta; identidade AP1303/br.dev.acstech.ap1303/1.0.0/1 mantida.
- [x] Titular optou explicitamente por manter TODOS os prazos como propostas. Nenhuma política final publicada, limpeza real/TTL ativados ou retenção “indefinida” aprovada. Matriz e lista única de decisões permanecem em [documentos-publicos.md](google-play/documentos-publicos.md). Não considerar pronto para submissão.
- [x] Guard de geração local distingue artefato assinado de distribuição: `bundleLocal`/`apkLocal` podem ignorar apenas aprovação/URLs documentais, mantendo identidade, assinatura, Firebase, ausência de emuladores, backend homologado e acesso de revisão. Modo normal de distribuição continua exigindo documentos; privacidadeAprovada permanece false. Novo teste protege essa separação. Documentos pendentes também excluídos dos assets APK.

Custos incrementais estimados, não medição de faturamento: deploys/builds e tentativas falhas consomem infraestrutura existente; três índices adicionam armazenamento/manutenção apenas das pendências correspondentes. Sem serviço pago novo, polling, Scheduler ou listeners permanentes novos. Grupo demo tem30 documentos previstos; QA usa fixtures limitadas, operações e recibos de ensaio, sem históricos globais. Consultas/FCM podem gerar cobrança conforme uso, não há promessa de gratuidade.

Ponto em grupo (estimativas por execução sem repetição da transação): online aceito, com1 local e sem pendência anterior: 8 leituras/3 escritas/1 Function; replay:4 leituras/0 escritas/1 Function; primeiro envio offline:6 leituras/2 escritas/1 Function, sem marcar jornada; revisão administrativa acrescenta suas leituras/auditoria. Ausência de atividade não invoca essas Functions; listeners de telas existentes continuam podendo ter consumo conforme resultados/alterações. A reconciliação reutiliza a resposta da operação idempotente, sem leitura extra de recibo nem listener por item. Comparado ao fluxo legado, há custo necessário de recibo/pendência/auditoria; não foi removida segurança para economizar. Perfil/contexto são validados na mesma transação, sem consulta prévia adicional nesta marcação.

Status de compilação assinada e ensaio final no Samsung será registrado abaixo ao concluir. Documentação pública e submissão Play continuam bloqueadas pelas decisões reais pendentes.

### Conclusão do ensaio final — 25/10/2026

AAB assinado gerado com sucesso, sem upload: `android/app/build/outputs/bundle/release/app-release.aab`, 5.621.136 bytes, SHA256 `5E0184218D71478D8EE8D663C307A6C044A6E9636FB33A081B766C4EB58DA92B` (artefato antes dos ajustes visuais adicionais solicitados em25/10). Assinatura jar e certificado conferidos; APK da mesma variante confirma AP1303 / br.dev.acstech.ap1303 /1.0.0/código1, minSDK24/target36. Assets AAB confirmam produção ponto-app-1c55a, ausência de emuladores/host USB/server.url, mixed content false; sem keystore/credenciais administrativas, exceções debug ou documentos rascunho. Distribuição normal continua bloqueada pelos documentos pendentes.

APK final instalado separadamente no Samsung SM-A057M R9XXA0AHCEJ, preservando br.dev.acstech.ap1303.dev e seus dados. Login real na conta QA fictícia, autorização de notificação/runtime, registro de exatamente1 dispositivo QA, recebimento físico de1 FCM com app em segundo plano, toque em Concluir tarefa, revisão autenticada e confirmação explícita executados. Registro remoto confirmou conclusão pela mesma conta QA. Evidência sem token: tmp/final-round/push-final-resultado.json; captura do próprio app: capturas/16/apk-final-push-concluido.png. Não enviada notificação a clientes ou grupo demo. Preferências temporárias screensaver/stayon restauradas aos valores anteriores1/0. Protetor/PIN não alterado.

PWA publicado também conferido por login real fictício, conta/logo, demonstração e compras sem overflow; capturas pwa-producao-conta-final.png, pwa-producao-demonstracao.png e pwa-producao-compras.png. Lint completo anterior passou;13 testes direcionados passaram/2 dependentes de emulador foram explicitamente pulados;4 testes de release passaram e10 do adapter PDF passaram. Nenhuma suíte geral repetida. O teste de recuperação gerou link por Admin sem enviar email. A rodada técnica está concluída; políticas/foto/cópia externa continuam com seus bloqueios próprios. O novo pedido de25/10 corrige cabeçalho/login/identidade e apresentação do histórico, com novo artefato a conferir.


### Atualização concluída — 25/10/2026: cabeçalho, acesso e histórico

Concluídos os quatro ajustes adicionais de UI, com validação local, Samsung e PWA publicado. Deploy Netlify 6addfb9a8ec83003a4a5c61b, destino confirmado ponto.acstech.dev.br. Sem novo deploy de backend ou alteração de compras. AAB atual assinado: 5.622.162 bytes, SHA-256 38C49DCF494EE05FEDE1AB412AD95B4DAE34D7D3554D1B5AC676BC3BC1EAFC20; identidade 1.0.0 / código 1 preservada. APKs atualizados instalados sem limpar dados.

- [x] PWA publicado e conferido: deploy `6addfb9a8ec83003a4a5c61b`; quatro ajustes visuais disponíveis.
- [x] APK atualizado instalado e validado no Samsung, preservando dados e sessão.
- [x] AAB final local gerado e assinatura conferida: `android/app/build/outputs/bundle/release/app-release.aab`; SHA-256 `38C49DCF494EE05FEDE1AB412AD95B4DAE34D7D3554D1B5AC676BC3BC1EAFC20`. Sem upload à Play.


Detalhes, causa da sobreposição, arquivos, capturas, custos e testes estão no complemento de 25/10 de [16-acabamento-final.md](16-acabamento-final.md). Permanecem documentos/retenção, cópia externa do backup, foto privada e ciclo físico completo GPS offline; não houve upload à Play, commit ou push.


### Catálogo publicado — 25/10/2026

PWA atualizado para deploy 6ade0a11e31b7d67e78201c0 (ponto.acstech.dev.br): caixa alta, exclusão segura do catálogo e ícones adicionais. Backend seletivo comprasOperacao revisão comprasoperacao-00024-paj ACTIVE. Smoke fictício e conferência autenticada do PWA aprovados; detalhes/evidências em [compras-associacoes.md](../compras-associacoes.md). Políticas continuam não publicadas; sem novo AAB, Play, commit ou push.
