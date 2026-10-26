# Script 14 — publicação PWA e associações de produtos

24/10/2026, America/Fortaleza. Autorização específica do Script 14. Sem commit, push, PR, publicação Android/Apple ou migração de dados.

## Escopo fechado antes do deploy

Pacotes isolados em `tmp/script14-stage` e `tmp/script14-backend`. A árvore local das etapas Android permanece preservada. Base web: HEAD `aabad8a5d08a634d0d4a3f82c997cbeb314bf952`; fontes das Functions de compras obtidas diretamente de produção e comparadas com a base: iguais antes dos ajustes. Os pacotes publicados não são cópia indiscriminada da árvore suja.

Frontend: `AssociacoesProdutos`, integração no catálogo/cadastro/importação, `ComprasGraficos`, autocomplete por nomes antigos, normalização de apresentação e estilos restritos de associação. Sugestões exigem escolha humana; mesclagem exige prévia/confirmação. Correção pontual, alias futuro e mesclagem completa permanecem ações distintas. Câmera, PDFs, login, ponto, lembretes, identidade visual e demais páginas mantêm a base web anterior. Não entram cadastro/exclusão de conta, fila offline, plugins ou telas exclusivas das rodadas nativas, nem a classificação de listas de farmácia ainda local.

Backend previsto: somente `comprasOperacao`, `comprasRelatorio` e `comprasApi`, em `us-central1`. Dependências: `compras-associacoes.cjs`, `produtos-identidade.mjs`, mudanças de identidade/correção no cupom. Proteção defensiva mantém farmácia fora da API/ponte de supermercado, com documentos sem classificação tratados como supermercado. `no-bolso-functions.cjs` converte conta Auth inexistente em negação callable explícita, preservando autorização. Nenhuma alteração no repositório, formato de respostas ou cache do No Bolso. Nenhuma Function antiga será excluída.

Nenhuma regra ou índice será publicado: regras remotas foram lidas integralmente; catálogo continua somente leitura pelo cliente e as novas coleções não têm regra de acesso direto. Consultas novas usam documentos por ID, índice simples por produto ou ordenação de ID; os cinco índices compostos atuais estão READY. Não há índice adicional necessário.

## Destinos e recuperação registrada

- Firebase confirmado por lista autenticada das Functions, metadados das fontes e configuração do JavaScript público: `ponto-app-1c55a`. O default local `artran-passageiros` **não é usado**.
- Netlify: site `cf66ee21-9935-4013-8043-1471c62694e7`, nome `ponto1303`, domínio `https://ponto.acstech.dev.br`, confirmado pelo conector e CLI autenticados. Sem vínculo Git/CD neste site.
- Deploy anterior: `6ada2e4246065c2dfab4bcbe`, pronto, sem bloqueio de publicação.
- Revisões anteriores: `comprasoperacao-00021-dex`, `comprasrelatorio-00005-zop`, `comprasapi-00010-cay`. Fontes ZIP e configurações anteriores preservadas localmente em `tmp/script14-*-before.*`, sem versionar credenciais.
- Ruleset anterior: `690c267b-8e2b-4303-9803-e51cb690d7b6`; conteúdo e índices registrados em arquivos locais. Não serão sobrescritos.

Recuperação: corrigir para frente por novo deploy isolado. É possível preparar novo frontend com a interface anterior desativando as entradas de associação, preservando o backend compatível e todos os vínculos/aliases. O deploy anterior foi identificado como referência de recuperação; não foi acionada restauração de deploy antigo. Um retorno de interface não desfaz associações do banco. Não apagar documentos novos nem regravar notas/preços. Qualquer retirada de código do backend deve manter leitura dos vínculos já criados; não republicar cegamente a versão antiga após uso real.

## Verificações antes de publicar

Build web de produção e lint do pacote isolado aprovados. Artefato inspecionado: projeto correto, sem destinos demo/push-teste, endpoints dos emuladores, credencial administrativa ou inicialização de plugins nativos. Os seis campos públicos da configuração Firebase foram comparados com o JavaScript anteriormente publicado: iguais, sem expor seus valores. Manifest e worker preservados da base web. Worker não limpa IndexedDB/filas nem força reload. Assets com hash da versão anterior também são mantidos no novo pacote para imports de abas abertas. [Manifesto de fontes e assets](14-publicacao-artefatos.json) identifica por SHA-256 o conteúdo efetivo isolado; HEAD sozinho não identifica este deploy.

Primeira bateria apontou fixtures antigas incompatíveis (500 mL associado a arroz de 1 kg), portas de SDK fixas divergentes e erro bruto de Auth ao tentar vincular usuário inexistente. Fixtures/hosts foram alinhados sem retirar verificações de autorização; o tratamento do erro Auth foi corrigido no pacote. Bateria seguinte: 27 testes aprovados, zero falhas/skips, em Auth/Firestore locais usando as regras publicadas. Inclui quatro observações únicas, originais intactos, desfazer, alias reutilizado, correção isolada, concorrência, grupo alheio negado, imports legados e ponte. Bateria final com proteção de farmácia: **28 aprovados, zero falhas/skips**; lista, detalhe, rankings e totais da ponte não incluem a fixture de farmácia, sem apagar/regravar originais. Teste adicional em `tests/publicacao-associacoes-emulador.test.cjs` aceita pacote isolado por `AP1303_TEST_PACKAGE`, obrigatoriamente em projeto demo.

Lock do backend incorpora a correção transitiva de `body-parser` 1.20.9. O primeiro build remoto revelou que o lock local anterior havia promovido `qs` 6.16.0 à raiz sem conservar a resolução 6.14.2 exigida pelo Express. Corrigido o lock do pacote e o arquivo local: Express mantém 6.14.2 e body-parser recebe 6.16.0 aninhado. Não é atualização geral de pacotes. `npm ci --ignore-scripts --dry-run --no-audit --no-fund` aprovou a resolução em diretório isolado. A entrada extraneous do diretório pai não entra no pacote de publicação. As fontes da API e ponte baixadas de produção coincidem com a base HEAD antes dos filtros defensivos.

## Publicação e pós-verificação

**Publicado.** URL: **https://ponto.acstech.dev.br**.

| Recurso | Resultado |
| --- | --- |
| Preview | `6adca782e788d815a1dc4a3e` — https://6adca782e788d815a1dc4a3e--ponto1303.netlify.app |
| Produção Netlify | `6adca9e730c0f38f5f74163f` — https://6adca9e730c0f38f5f74163f--ponto1303.netlify.app |
| comprasOperacao | ACTIVE, `comprasoperacao-00022-dih` |
| comprasRelatorio | ACTIVE, `comprasrelatorio-00006-feb` |
| comprasApi | ACTIVE, `comprasapi-00011-var` |
| Regras e índices | Nenhum deploy; ruleset remoto confirmado igual ao anterior |

Inventário autenticado antes/depois: **24 Functions em ambos**, nenhuma removida; somente os hashes de `comprasOperacao`, `comprasRelatorio` e `comprasApi` mudaram. Região `us-central1`, runtime Node24. Memória, timeout, limites de instâncias/concor­rência, conta de serviço, ingress e variáveis existentes das três Functions foram comparados e preservados, sem expor valores. Sem novo serviço ou rotina agendada; as verificações de APIs feitas pelo CLI referem-se à infraestrutura já usada pelo projeto.

Uma tentativa inicial parou por caminho relativo incorreto no config temporário, antes do upload. A tentativa seguinte falhou nos três builds por resolução de `qs` no lockfile; não publicou frontend nem substituiu revisões ativas. Após correção, a instalação **real e limpa** em pasta isolada passou (619 pacotes) e os **28 testes foram repetidos com essas dependências exatas: 28 aprovados, zero falhas/skips**. O novo deploy das três Functions concluiu com sucesso. Não houve reset, clean, exclusão de dados nem alteração da árvore para fazer o deploy.

Preview e domínio de produção: seis rotas/recursos (`/`, `/lista-compras/catalogo`, `/lista-compras/precos`, `/ponto`, manifest, worker) retornaram HTTPS/200 e arquivos esperados; **19 assets verificados por SHA-256**, dois ícones acessíveis como imagens. Referências de dez assets anteriores foram preservadas (incluindo arquivos já idênticos no pacote). Browser Chrome headless isolado, sem sessão pessoal: tela de login efetivamente renderizada em 360, 768 e 1440 CSSpx, sem exceções ou overflow. Rotas autenticadas redirecionaram ao login; isso **não comprova** conteúdo autenticado. [Captura móvel](capturas/14/production-360.png), [tablet](capturas/14/production-768.png), [desktop](capturas/14/production-1440.png).

Chamadas públicas sem autenticação às três Functions retornaram **401**, antes de ler dados de negócio. Nenhuma notificação enviada, conta de produção criada, nota importada, mesclagem ou exclusão executada em produtos reais. Nenhum APK foi reconstruído/publicado nesta etapa.

### Conferência autenticada pendente

Não há sessão fictícia autorizada de produção identificada; contas demo locais não equivalem a contas de produção. Falta executar em grupo fictício autorizado: sugestões; mesclar quatro produtos e observar quatro preços distintos; pesquisar nomes antigos; corrigir um item/alias; desfazer sem perda; conferir negação entre grupos e atualização do PWA com pendência real. Esses comportamentos passaram em emuladores, mas **não se declara validação funcional completa em produção**. Não usar produtos de clientes para preencher essa lacuna.

### Atualização segura

Concluir qualquer operação que esteja sendo enviada e então fechar/reabrir o PWA normalmente. Não limpar dados, IndexedDB, filas ou reinstalar para receber a versão. Abas já abertas conservam referências aos assets anteriores; o worker preservado não força reload. O ensaio desta rodada não criou nem apagou pendência no aparelho do usuário.

## Custos e limites

Sem novo serviço, Scheduler, polling, migração/regravação em massa ou listener por produto. Deploy usa a infraestrutura existente de Functions/Cloud Build/Artifact Registry/Netlify e pode consumir suas cotas/créditos, além do armazenamento de versões; não é promessa de gratuidade. Houve preview + produção e três builds falhos + três builds bem-sucedidos; as tentativas falhas também podem consumir recursos de build. Conferência pública usou HTTP/arquivos estáticos e metadados administrativos, sem varrer banco. Os três testes de negação acrescentaram uma invocação por Function e zero leituras/escritas de negócio pelo código antes da autorização.

Prévia: uma callable, leituras limitadas a até 20 produtos e até seis observações por produto; cinco exibidas como amostra. Mesclagem: N catálogos + mapa + recibo escritos, sem regravar preços. Replay idêntico retorna recibo sem novas escritas. Relatório/preparo de cupom acrescentam uma leitura do mapa. Digitação usa catálogo carregado, sem consulta por tecla. Filtro de farmácia reutiliza os resultados limitados existentes, sem consulta adicional. Aplicativo sem interação não cria chamadas das novas operações; carregamentos/listeners preexistentes continuam. Offline, não se confirma mesclagem nem se cria retry infinito. Os números são estimativas de operações, não medição de faturamento; detalhes em `../compras-associacoes.md`.

Limites mantidos: componente de até 20 produtos; 500 vínculos/correções e mapa até 500 KB; relatório de até 366 dias e 5.000 observações. Catálogo continua usando seu carregamento preexistente; não há nova promessa de paginação remota. Sem disponibilidade offline para confirmar mesclagem. Originais e IDs antigos preservados.
