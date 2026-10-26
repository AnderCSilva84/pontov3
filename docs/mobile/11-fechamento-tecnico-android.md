# Script 11 — fechamento técnico Android e compras de farmácia

23/10/2026. Branch `feat/ponto-operacoes-offline`. Alterações locais anteriores preservadas. Sem produção, deploy, migração em massa, commit, push ou PR. Repositório No Bolso não alterado. Não é liberação para lojas.

## Entregue

- Etiquetas com texto: Pendente vermelho (#991b1b sobre #fee2e2), Comprado verde (#166534 sobre #dcfce7). Comprado sem preço continua identificado como comprado, com o preço pendente separado; não permite fechamento sem regularização. Verde semântico autorizado, preservado.
- Autoria discreta `Criado por: Nome`, snapshot obtido do perfil pelo servidor na criação, com UID original preservado. Cliente não escolhe autor/nome. Ausência histórica e lista legada importada mostram `Autor não informado`; replay não preenche com o perfil atual. Removida a busca de perfis para resolver autores de itens/listas. Exclusão de conta mantém a autoria histórica conforme política do Script 09, sem atribuição ao próximo usuário.
- `tipoCompra`: `supermercado` ou `farmacia`, validado no servidor em criação/importação. Campo ausente significa supermercado, sem regravação de antigos. Valor inválido é rejeitado em operações. Classificação aparece na criação, cards e detalhes.
- Somente administrador altera classificação de lista aberta, com confirmação, versão otimista e subdocumento `alteracoes` (antes/depois/autor/instante). Lista finalizada não pode mudar por esse fluxo; não foi criado um corretor retroativo. Sem criar/apagar despesas na troca.
- Fechamento e importação copiam a classificação para os registros de preços. Histórico, filtros, comparações, rankings e exportações distinguem supermercado/farmácia. Totais realizados contam somente listas finalizadas; anuladas, pendentes e estimativas não entram. Total geral explicitamente soma os dois subtotais.
- Novo PDF de gastos filtrados usa logo AP1303, azul/branco/vermelho, período, subtotais e total geral. PDF de preparação preserva estimativas e identifica a classificação.
- API v1, ponte financeira e consulta Android do No Bolso excluem farmácia no servidor. Detalhe específico de lista de farmácia retorna 404 nesse contrato. Forma do contrato de supermercado preservada. Nenhuma escrita financeira nova em consulta; integração Android continua somente consulta. Se futuramente No Bolso consumir farmácia, requer contrato/decisão explícitos no consumidor.

## Modelo, consultas e limites

Campo aditivo no cabeçalho e nos preços; documentos legados ausentes tratados como supermercado. Clientes antigos que não mandam classificação continuam criando supermercado. Clientes antigos já instalados não possuem a nova apresentação/filtros, portanto não se promete separação visual nesses binários; a segregação da API é no servidor.

Histórico substituiu assinatura ilimitada por consulta ao grupo, status, intervalo de datas e `limit(501)`. Padrão do primeiro dia de dois meses anteriores até hoje; 500 resultados completos no máximo. Acima disso pede período menor e não anuncia total parcial como completo. Exibição em pastas mensais, 20 linhas por pasta e botão de ampliação; filtros reutilizam o resultado. Alterar período cancela a assinatura anterior; sair da tela também. Sem listeners por categoria/autor.

Relatórios/API consultam período limitado com máximo 5.001 observações; acima de 5.000 recusam período grande. Filtragem por classificação ocorre depois da consulta limitada para incluir documentos antigos sem campo: não exige migração ou índice novo. O custo ainda inclui candidatos da outra classificação. Paginação da API usa cursor dos documentos examinados; uma página pode estar vazia após excluir farmácia e ainda conter próximo cursor. Consumidor deve respeitar o cursor. Não fazer busca ilimitada para preencher páginas.

Estimativa reutiliza a lista já lida e filtra as até 10 referências recentes pela mesma classificação. Se só houver referências da outra classificação nesse conjunto, não inventa preço; referência mais antiga pode não ser encontrada. Limitação explícita em troca de não introduzir índice/migração nem consulta extra nesta etapa. Consultas de catálogo e listas abertas e listeners paralelos de itens já existentes permanecem; não se afirma eliminação de todo consumo anterior.

Nenhum índice adicionado por classificação. Alterações anteriores de índices do ponto foram preservadas, não publicadas.

## PDFs temporários e privacidade

`PdfCacheSeguro` reconhece somente UUID.pdf legado e nomes próprios gerados pelo plugin na pasta privada cache/ap1303-pdf. Caminho canônico conferido; sem recursão, sem apagar desconhecidos, arquivos públicos, Downloads ou cópias escolhidas pelo usuário. Limpeza oportunística no carregamento do plugin e na escrita; sem timer/TTL remoto. Reutiliza prazo local de 24h já existente.

Logout/exclusão limpam somente PDFs não entregues da conta indicada; invalidam contexto/IDs. Arquivos marcados `_entregue.pdf` têm proteção de 24h desde entrega/retorno para permitir leitura pelo destinatário. Operações externas em andamento têm proteção adicional em memória, inclusive durante troca de contexto; nomes entregues persistem após reinício. Falhas de abertura liberam a proteção em memória. Não toca IndexedDB ou pendências do ponto. Erro de limpeza não apaga a fila nem impede logout.

Limites: Android pode remover cache antes; não é armazenamento permanente. Sharesheet não informa que o destinatário terminou de ler/enviar, por isso 24h não é garantia de conclusão externa. Após expiração e evento de limpeza, temporário entregue pode ser removido. Cópias salvas/compartilhadas fora do cache não podem ser revogadas pelo app. Arquivos desconhecidos são preservados deliberadamente; não se afirma apagamento integral do aparelho.

## Dependências e release

Audits locais (não prova de exploração): raiz passou de 4 altos/3 moderados para 0 altos/3 moderados; Functions de 12 moderados para 10 moderados, 0 altos. Overrides pontuais: @grpc/grpc-js 1.13.6 na raiz e qs 6.16.0 no backend, locks atualizados. Sem audit fix --force ou mudança de Capacitor. Regressões executadas após instalação.

- grpc: advisory [mTLS getAuthContext](https://github.com/advisories/GHSA-m9gg-hp2v-232j) e [erro TLS](https://github.com/advisories/GHSA-f596-whhp-79r4), corrigidos na dependência Node; não se inferiu exploração no transporte web do Firebase.
- qs: [DoS em parse/stringify](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g), correção compatível 6.x aplicada.
- Restam cadeias uuid <11.1.1 no CLI/xcode e backend: [bounds em v3/v5/v6 com buffer fornecido](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Uso xcode examinado gera UUID v4; isso reduz alcance naquele trecho, não elimina todos os alertas transitivos. Subir uuid 7/9 para 11 por override global seria quebra de versão sem cobertura suficiente. Audit sugere troca major/downgrade do pacote pai; não aplicada automaticamente.
- ts-deepmerge <8 no firebase-functions-test: [override de métodos/prototype e DoS](https://github.com/advisories/GHSA-87mf-gv2c-c62c). Uso encontrado em geração de CloudEvent de teste; dependência de desenvolvimento. Fix exige major e revisão do harness, não atualização forçada. Permanecem alertas, revisão de alcance/remediação antes de distribuir.

Release guard testado com SDK configurado: `:app:preReleaseBuild` falha com `Release desabilitado nesta base de desenvolvimento.` Só debug br.dev.acstech.ap1303.dev. Sem chave de distribuição/AAB. Capacitor sem server.url remoto, https local, loggingBehavior none, mixed-content liberado apenas em desenvolvimento/emuladores; release cleartext negado. Manifest sem localização em segundo plano, backup desabilitado. google-services.json dedicado, .env.mobile.local e arquivos locais ignorados; git ls-files não encontrou credenciais administrativas/keystores/configs privadas nos padrões conferidos. Não foi feita varredura forense completa de todo histórico Git.

## Testes e evidências

- Lint aprovado.
- npm test: 198 testes, 170 aprovados, 28 condicionais ignorados, 0 falhas. Primeiro ensaio em sandbox impediu esbuild de ler entrada; reexecução local autorizada passou sem alterar/enfraquecer o teste.
- Integração isolada demo: 26 aprovados (compras, farmácia, ponte No Bolso e estimativas). Auth9099, Firestore8878, Functions5008, hub4402, projeto demo-ap1303, dados fictícios. Teste legado exige audience demo; executá-lo contra o projeto dedicado de push falha legitimamente. Verificação de audience mantida. Expectativa de preencher autoria ausente no replay foi alterada por nova decisão de produto; UID e snapshot confiável na criação continuam verificados.
- Cobertura nova: autoria forjada ignorada, legado desconhecido, classificação inválida, funcionário/outro grupo negados, auditoria de alteração, finalização/idempotência de farmácia, bloqueio de mudança após fechamento, preços/rankings separados, API e consulta No Bolso sem farmácia, subtotais sem estimativas/anuladas e PDF.
- Builds PWA e mobile aprovados; cap sync Android aprovado. Gradle testDebugUnitTest/assembleDebug aprovados, 5 testes Java, 0 falhas. Avisos preexistentes de chunks/dynamic-import e Gradle deprecated permanecem.
- Samsung SM-A057M Android15 autorizado: APK debug instalado, login fictício, etiquetas de autoria/classificação e itens Pendente/Comprado conferidos. Viewport 320px sem overflow horizontal, nome longo quebrando dentro do card; ajuste da largura da seta aplicado. PWA autenticado em Chrome temporário local 320px e 1440px também sem overflow. Escopo visual é etiquetas/compras, não revisão completa do app.
- PDF de gastos com 30 listas fictícias: 2 páginas renderizadas e inspecionadas; logo, cores, subtotais, quebra e rodapé sem sobreposição. Artefato local `output/pdf/script11/gastos-demo.pdf`.
- Samsung/plugin real: PDF legado reconhecido vencido removido; desconhecido preservado; PDF próprio não entregue removido pela limpeza da conta. Casos de arquivo entregue/ativo e caminho externo cobertos em testes Java. Nova bateria física completa de todos os destinatários externos não executada; não se declara envio efetivo pelo Sharesheet.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Destino exclusivo de teste, Auth/Firestore/Functions locais via USB; nenhum dado de produção usado. Hash final registrado ao término da rodada.

## GPS — continuação física agora concluída no recorte

Samsung em área aberta fornecida pelo usuário. Mesmo plugin/timeout/geofence, sem coordenada inventada ou reaproveitamento silencioso. Com modo avião, Wi-Fi/dados desligados e app visível, gesto obteve amostra real em 5.380ms; segunda amostra após gesto em 3.986ms. Primeira captura persistiu com mesmo hash após force-stop/reabertura offline, sem tentativa de envio. Reconexão gerou uma tentativa e recibo; administrador aprovou, funcionária consultou decisão e entrada oficial. Segunda captura offline sincronizada uma vez, rejeitada com justificativa, decisão vista pela funcionária sem criar saída. Verificação emulada: 2 capturas, 1 aprovada, 1 rejeitada, 1 registro oficial e 2 recibos; payload original preservado.

O ensaio foi feito no APK anterior do Script10, pois não houve mudança no ponto/localização nesta rodada; o novo APK inclui esse código preservado. Evidência melhora com recepção externa sem mudança de código, compatível com limitação ambiental anterior; não determina causa universal nem garante GPS em todo ambiente. Não amplia raio/timeout, não desativa geofence nem cria rastreamento. Relatórios anteriores conservam a cronologia e recebem referência a esta continuação.

## Custos (estimativas de operações, não fatura medida)

| Fluxo do ponto em grupo, sem contenção | Functions | Leituras no handler | Escritas |
|---|---:|---:|---:|
| Online aceito, um local | 1 | 8 | 3 |
| Replay idêntico | 1 por replay necessário | 4 | 0 |
| Primeira sincronização offline pendente | 1 | 6 | 2 |
| App aberto sem atividade/fila finalizada | 0 adicionais da fila | 0 adicionais da fila | 0 |

Depois de decisão anterior no dia, ponteiro pode acrescentar 1 leitura e 1 escrita. Online com L locais: 7+L leituras. Trigger existente e listeners de jornada/tarefas, regras, transporte e retries de transação podem acrescentar consumo. Antigo online: aproximadamente 6+L leituras/2 escritas, sem recibo idempotente; acréscimo necessário de recibo/controle de pendência, contexto dentro da transação evita resolução duplicada. Reconciliação reenvia o ID/payload e recebe recibo sem consulta prévia por item. Consultas mensais/funcionário e listeners antigos ainda existem.

Etiquetas: 0 consultas/Functions/escritas adicionais; usam snapshot carregado. Classificação na criação/fechamento acrescenta bytes, não nova operação. Troca explícita: transação existente mais 1 documento de auditoria escrito; sem duplicar gasto. Histórico: até 501 documentos por intervalo/assinatura, sujeito a regras/cobrança mínima e reconexões; antes carregava todo histórico. Filtros/subtotais/PDF: 0 consultas adicionais sobre dados já carregados. Relatório/API: 1 chamada e consulta limitada de até 5.001 preços mais autorização já existente, sem escrita de negócio. Filtrar categoria não reduz documentos lidos dessa consulta. Cache Firestore pode gerar leituras faturáveis; não é cache local gratuito.

GPS e limpeza PDF são locais: 0 Functions/Firestore para diagnosticar/limpar. Não há polling, scheduler, serviço pago, TTL remoto, backup novo ou listener por etiqueta/autor. Armazenamento adicional: campo de classificação e auditorias de mudanças explícitas. Sem promessa de custo zero/cota gratuita.

## Pendências classificadas e decisão para distribuição

| Classe | Pendência | Próxima ação |
|---|---|---|
| A — técnica | Alertas moderados restantes; conflitos de revisão que exigem ajuste/reabertura não concluídos automaticamente | Revisar dependências transitivas e política/integração do ajuste sem enfraquecer segurança |
| B — externa | Identidade final, projeto final, assinatura/AAB, Play Console, links de suporte e recuperação por email real | Definir destino de distribuição e testar sem usar produção como atalho |
| C — produto/retenção | Prazos, fundamento e descarte de ponto/folha/comprovantes/autorias após exclusão | Titular do grupo com orientação contábil/jurídica; não presumir prazo nem apagamento integral |
| D — manual | Regressão completa no artefato/destino final, leitores/destinatários de PDFs, recuperação final e aparelhos adicionais | Bateria física antes de loja; ensaio GPS concluído somente no Samsung/contexto descritos |
| E — posterior | Revisão visual completa, otimização de chunks e advertências Gradle; Apple | Etapas separadas, sem avançar agora |

Política atual de exclusão remove login/acesso, preserva históricos necessários do grupo e autoria; não equivale a anonimização/apagamento integral. Documentos/cache exportados pelo usuário têm ciclo próprio. Decisões de retenção e descarte não foram inventadas para encerrar o checklist. **Não pronto para publicação nas lojas.**

## Principais arquivos desta rodada

Backend: functions/compras-tipo.cjs, compras.cjs, cupom-operacoes.cjs, compras-api.cjs, compras-estimativa.cjs, no-bolso-consulta.cjs e no-bolso-bridge.cjs. Interface/contratos: ComprasModulo.jsx, ImportarCupom.jsx, GastosCompras.jsx, comprasTipo.js, services/compras.js e compras.css. PDFs: exportarPdfListaCompras.js, exportarPdfGastosCompras.js, PdfArquivosPlugin.java, PdfCacheSeguro.java e logout em services/auth.js. Dependências: package.json/package-lock.json de raiz e Functions. Testes: compras-farmacia.test.js, compras-farmacia-emulador.test.cjs, compras-emulador.test.cjs e PdfCacheSeguroTest.java. Relatórios Script11, encerramento e continuação GPS. Demais alterações locais anteriores preservadas.

Encerramento físico: sessão fictícia finalizada; screensaver_enabled restaurado para 1 e stay_on_while_plugged_in para 0, sem alterar PIN. Servidores Vite temporários e perfil Chrome de QA encerrados; emuladores preexistentes preservados.
