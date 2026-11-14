# Importação e conferência simplificadas — primeira rodada

## Unidades e atenção por produto — 30-10-2026, local

O caso enviado pelo titular contém 35 linhas e somente PC, GF, UN, KG, BJ, CT e LA. Regressão anonimizada preservou quantidades, unidades e valores, lendo as 35 linhas com original R$322,15, desconto R$3,09 e pago R$319,06. Não foi reproduzida falha de leitura dessa nota; a mensagem original não está disponível. Não foi persistido CPF, chave ou emitente real no teste.

Confirmado no código outro bloqueio geral: medidas sem conversão e códigos inválidos interrompiam a leitura inteira. Agora retornam linha com `unidadePendente: true`, unidade fiscal original e unidade de comparação nula. O servidor impede importar essa linha até sua retirada explícita; valores não são convertidos. Não há sugestão ou associação automática para essa linha. As demais podem ser importadas e o total fiscal integral permanece, com valor descartado discriminado. Retirada exige confirmação e não é automática. Códigos comerciais desconhecidos continuam exigindo confirmação por embalagem; confirmação anterior só é reutilizada para o mesmo estabelecimento/produto/unidade e categoria.

Erros de incompatibilidade entre produto selecionado e unidade/apresentação fiscal passam a informar linha no contrato de erro e nome no aviso; frontend marca o cartão, abre detalhes e permite corrigir sem perder a revisão. Sem afirmar que esse era o erro da nota enviada.

Testes direcionados incluem a nota anonimizada, medidas e códigos pendentes, impossibilidade de falsificar confirmação pelo cliente, ausência de gravação parcial, indicação de linha incompatível, descarte preservando total e repetição idempotente. Sem novas consultas permanentes, dependências ou custos recorrentes. Somente campos adicionais no rascunho existente. Conferência visual e física desta alteração ainda pendente.

Para disponibilizar: deploy seletivo de `comprasOperacao` (leitor e validação) e frontend, mais novo APK local quando solicitado. Nada publicado nesta rodada; não alterar históricos reais nem No Bolso.

### Publicação autorizada em 30-10-2026

Após autorização posterior do titular, publicado somente `comprasOperacao` no projeto `ponto-app-1c55a`, região `us-central1`, estado ACTIVE, e PWA Netlify `ponto1303`. Deploy `6ae4eda5e17957d7f8f806c0`, ready, https://ponto.acstech.dev.br. Sem deploy de regras, índices ou outras Functions; sem alteração de compras reais, commit, push ou envio à Play.

Checks direcionados: 15 testes unitários e teste de integração no emulador previamente aprovados; unidades/nota anonimizada rechecadas, lint dos arquivos afetados e build PWA aprovados. Em produção: rota do catálogo, manifesto e chunk de compras conferidos byte a byte; `/lista-compras`, `/tarefas`, `/lembretes` e `/ponto` HTTP200 com shell novo; callable sem login recusado HTTP401. Não se importou nota real para homologar. Conferência visual específica e validação física desta alteração permanecem pendentes. APK anterior não contém a nova interface; nenhum APK foi gerado nesta publicação.

Implementação local em 29-10-2026. Sem publicação, instalação ou alteração de backend.

- Duas etapas: Trazer nota e Conferir compra.
- Total pago destacado; dados fiscais e descontos recolhidos, sem mudar cálculos.
- Cada linha destaca nome escolhido, descrição original, quantidade, preço e situação.
- Campos completos em “Conferir ou editar produto”. Produtos sem vínculo e unidades fiscais pendentes iniciam abertos.
- Sugestões usam “Usar este produto”; sem nova associação automática por semelhança.
- Catálogo adicional, atualização e paginação permanecem disponíveis em seção recolhida.
- Antes do envio, pendências explícitas de associação e unidade produzem orientação. Validação obrigatória no backend preservada.
- Descarte continua pedindo confirmação; não reduz o total fiscal. Comparação com lista existente e retirada de planejados preservadas.

Contratos, autorização, aliases, valores originais/líquidos e idempotência permanecem os existentes. Nenhuma leitura, escrita, listener ou dependência adicional. Recolher controles não altera a política atual de carregamento do catálogo.

Validação automatizada: 15 testes existentes de cupom/catálogo e um novo teste de pendências aprovados. Lint e builds PWA/mobile-release executados. Build mobile é bundle web, não APK instalado.

## Conferência interativa local

Executada no Chrome com Firebase Auth, Firestore e Functions em emuladores `demo-ap1303`, somente com contas e notas fictícias. Nenhum deploy ou dado real alterado.

- Importação sem link, nome da lista, cadastro de estabelecimento, confirmação de produto novo e propagação entre duas linhas fiscais idênticas.
- Descarte: cancelar mantém produto; confirmar retira somente a linha e preserva o total fiscal.
- Primeira nota finalizada em nova lista: R$ 53,56 original, R$ 3,56 desconto, R$ 50,00 pago; duas linhas importadas, uma descartada.
- Segunda nota reconheceu aliases confirmados da primeira; produtos reconhecidos iniciaram recolhidos. Busca por nome e seleção do próprio cadastro verificadas.
- Segunda nota comparada e finalizada na lista demonstrativa existente; três linhas importadas e total de R$ 50,00.
- Encontrada e corrigida falha de campo obrigatório recolhido: validação abre os detalhes antes da indicação do navegador. Mensagens de erro recebem foco e rolagem para ficarem visíveis. Repetição interativa confirmou abertura, foco no campo e orientação de escolha pendente.
- Formato estreito e desktop: cartões separados e nenhuma largura de conteúdo maior que a área disponível na medição DOM. O controle de viewport reportou largura efetiva diferente da solicitada; isso é simulação responsiva no navegador, não homologação de aparelho específico.
- Capturas: `capturas/importacao-simplificada/revisao-celular.png` e `capturas/importacao-simplificada/validacao-desktop.png`.

Limitação: ADB iniciou, mas a lista de dispositivos estava vazia. Não houve instalação nem validação física no Samsung, câmera ou teclado nativo. Esses testes permanecem pendentes. Não houve teste interativo de uma unidade fiscal desconhecida nesta rodada; cobertura automatizada existente preservada.

## Publicação e APK local

Autorização posterior do titular executada em 29-10-2026. Netlify `ponto1303`, site `cf66ee21-9935-4013-8043-1471c62694e7`, deploy `6ae3c97171e09317cf161e7b`, estado ready, URL https://ponto.acstech.dev.br. Rotas `/lista-compras`, `/lista-compras/catalogo`, `/tarefas`, `/lembretes` e `/ponto` retornaram HTTP200 com o shell atual. Chunk de compras e manifesto conferidos byte a byte; API de compras sem autenticação retornou 401.

16 testes direcionados, lint completo, build PWA e preparação Android aprovados. Sem deploy de Functions/regras/índices. A associação administrativa dos 15 produtos de Farmácia já estava aplicada; não houve nova alteração de dados nesta publicação.

APK `output/AP1303-importacao-simplificada-2026-10-29.apk`, 5.973.775 bytes, SHA-256 `1B57B1CF3B444B33567960A0FAD1A13A2CE88F440525CE196208EF1619DFE58C`. Assinatura verificada por apksigner; identidade `br.dev.acstech.ap1303`, 1.0.0/código 2, chave de upload existente, Firebase produção `ponto-app-1c55a`. Edição reduzida confirmou zero módulos de saúde; PWA mantém cuidados. APK não instalado e não enviado à Play. Assinatura local não deve ser presumida compatível com Play App Signing; preservar instalação e pendências existentes.

Roteiro: importar texto fictício; conferir produto reconhecido recolhido e novo aberto; associar sugestão ou confirmar novo; confirmar unidade sinalizada; tentar finalizar com pendência; descartar e cancelar/confirmar; comparar com lista existente; conferir total original, desconto e pago antes de finalizar.


## Diagnóstico monetário local — 03/11/2026

Titular relata Valor monetário inválido na nota ao usar QR e ao colar texto. Trecho exato dos valores ainda solicitado; não foi identificada a linha da nota real. Não foi usada nota/conta real para testes, nem consultado QR de terceiros.

O erro vem de dinheiro() em functions/cupom-dominio.cjs. A validação anterior permitia até duas casas e rejeitava representações numericamente iguais como 10,0000. Correção local: remover somente zeros excedentes após as duas casas antes de validar. Não arredonda frações reais de centavo, não adivinha separador decimal ponto/milhar e preserva os limites, quantidade, conferência de totais, descontos e rejeição de divergências. Agora o erro informa campo, linha (nos itens) e token numérico, para permitir diagnóstico específico. Os testes continuam recusando 10,001 e formatos ambíguos como 10.00. Isso não comprova que o caso do titular tenha somente zeros extras.

21 testes direcionados de parser/consulta aprovados; dois testes de integração aprovados nos emuladores, incluindo preparação com casas extras zero, rejeição significativa sem criar rascunho, confirmação com valores originais, desconto/pago e retry sem duplicar cupom, além de unidade fiscal pendente. Lint aprovado. Testes exclusivamente fictícios. Logs: output/cupom-monetario-testes.log, cupom-monetario-integracao.log e cupom-monetario-lint.log.

Alterações locais preservadas, sem deploy, APK, dados reais, commit ou push nesta rodada. Pendente: trecho real com quantidade, preço unitário, total da linha e valor a pagar, para reproduzir e concluir o diagnóstico exato antes de qualquer conversão adicional ou publicação.


## Diagnóstico fechado com a nota informada — precisão fiscal e 139 linhas

O trecho integral recebido confirmou preços unitários significativos com até dez casas, como 26,6666666667, e 139 linhas. A causa principal não era apenas padding com zeros. A nota também superava o limite local de 120 linhas e poderia exceder a trava legada de 490 escritas ao cadastrar produtos/aliases novos. Os dados identificadores, emitente e nomes reais não foram copiados para a fixture: tests/fixtures/cupom-precisao-139.cjs preserva somente quantidades, unidades e valores, com chave/CNPJ/nomes fictícios. São 139 linhas, doze preços de alta precisão e total de 107748 centavos. Troco NaN não é um valor usado no cálculo da compra e permanece ignorado.

### Contrato final

- Preço unitário: aceita o formato brasileiro com até dez casas decimais, conforme o campo vUnCom do leiaute fiscal. Quantidade e unitário são multiplicados em escala inteira com BigInt antes de arredondar o resultado da linha. Permanece a tolerância existente de um centavo na conferência e os limites de valor/quantidade; nenhum total ou desconto é inventado.
- Totais da linha, original, desconto e pago: permanecem em centavos inteiros. Dígitos significativos além dos centavos nesses totais continuam rejeitados; apenas zeros extras equivalentes são normalizados. Formato de ponto decimal ambíguo não é adivinhado. Erros identificam campo e linha.
- Compatibilidade: precoUnitarioCentavos permanece inteiro, como projeção arredondada para as telas/contratos antigos. Quando há frações reais de centavo, precoUnitarioOriginalFiscal guarda a string integral de origem no rascunho, no item e no histórico privado de preços. A validação do total usa o fiscal integral, nunca a projeção arredondada. A revisão exibe esse valor fiscal completo. A confirmação usa somente os valores do rascunho do servidor; tentativas de adulterar unitário/total/fiscal no payload não substituem a origem.
- A Central de Preços, cujo contrato público exige centavos inteiros, não publica esse unitário projetado como preço exato: registros com precoUnitarioOriginalFiscal não são elegíveis. Demais preços e políticas de desconto permanecem com o comportamento anterior. Não houve alteração no repositório No Bolso.
- O limite de leitura por cupom passa a 200, alinhado ao limite existente da lista. A confirmação continua atômica e idempotente, em uma única transação; foi removida a contagem antiga de 490 escritas, não a conferência de até 200 itens, tamanho dos dados ou limites da API. Caso emulado de 139 produtos/aliases todos novos confirmou mais de 500 escritas na mesma transação e retry sem duplicar nada.

Fontes primárias conferidas: campo vUnCom com até dez casas no [manual oficial NF-e](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5W9aeeSeghM%3D); remoção do antigo teto de 500 writes em 29/03/2023 nas [notas oficiais Firestore](https://docs.cloud.google.com/firestore/docs/release-notes#March_29_2023), preservando [limites de tamanho e tempo](https://firebase.google.com/docs/firestore/quotas#writes_and_transactions). Não foi inferido suporte de produção somente pelo emulador.

### Verificação final

28 testes direcionados aprovados, cobrindo parser, HTML/JSON da consulta QR, conservação dos 139 itens e de R$1.077,48, precisão antes do peso e elegibilidade da Central. Três testes de integração aprovados na rodada com unidade pendente; a reexecução final dos dois testes monetários confirmou adulteração ignorada, totais e 139 produtos/139 preços/um cupom, sem duplicidade. Lint, diff direcionado e builds PWA/Android reduzido aprovados. Logs: output/cupom-precisao-testes-final.log, cupom-precisao-integracao-final.log, cupom-precisao-integracao.log, cupom-precisao-lint-final.log, cupom-precisao-pwa-build.log e cupom-precisao-android-web.log. Nenhuma nota ou compra real foi gravada.

Estado: correção preparada localmente. Publicação ainda depende da autorização específica exigida pelo roteiro inicial; sem deploy, instalação, Play, commit/push ou alteração de dados reais. Para publicação consistente do código atual, atualizar comprasOperacao e os consumidores do cálculo de elegibilidade da Central: centralPrecos, centralExecutarLote, centralEventocomprasPrecosGrupo/Legado e centralEventocomprasAssociacoesOperacoesGrupo/Legado. Não requer novas funções, regras, índices, serviços, agendamentos ou infraestrutura.

APK local de revisão gerado e verificado: output/Ta-no-Ponto-cupom-precisao-2026-11-03.apk, pacote br.dev.acstech.ap1303, 1.0.0/código2, assinatura existente validada e assets iguais ao build reduzido final. SHA-256 87DC7706D34C65E07103B4459BEF5CBCEDF5F6257B66827E3338AD7CD9D4A4E2. Não instalado nem enviado à Play. Não resolve o servidor publicado até a publicação autorizada da correção.


### Publicação autorizada e concluída — 03/11/2026

O titular respondeu Sim à autorização específica de publicação. Publicadas seletivamente, no projeto explícito ponto-app-1c55a, comprasOperacao e os seis consumidores existentes de elegibilidade da Central listados acima. As sete funções foram verificadas ACTIVE. Não foram publicadas regras/índices, criados serviços/agendamentos nem alterados consentimentos ou compras reais.

PWA ponto1303: deploy 6aea9e7eb7eae0bcca67002e, ready, publicado em 03/11/2026 às 23:55 (UTC−3; 04/11/2026 02:55 UTC). URL https://ponto.acstech.dev.br. Seis rotas, incluindo lista de compras/catálogo, e doze arquivos de shell, módulo de compras, manifests/worker e privacidade conferidos por hash contra dist. comprasOperacao sem login retornou HTTP401. Não foi feita importação da nota real em produção.

APK local atualizado e assinado preservado: output/Ta-no-Ponto-cupom-precisao-2026-11-03.apk; SHA-256 87DC7706D34C65E07103B4459BEF5CBCEDF5F6257B66827E3338AD7CD9D4A4E2. Pacote br.dev.acstech.ap1303, 1.0.0/código2, certificado esperado e 60 assets finais conferidos. Não instalado nem enviado à Play. Sem afirmação de novo código de loja ou compatibilidade com assinatura Play.

Evidências: output/cupom-precisao-functions-deploy.log, cupom-precisao-functions-verificado.json, cupom-precisao-netlify-deploy.json, cupom-precisao-publicado-verificado.json, cupom-precisao-apk-verificado.json e cupom-precisao-apk-assets.json. Todas as pendências de publicação local desta seção ficam superadas por este registro. Preservadas alterações locais e dados; sem commit/push ou uso de conta/nota real para gravação.


## Associação antecipada e revisão por pendências — 04/11/2026, local

Relato: cerca de 20 linhas rejeitadas por incompatibilidade de apresentação, uma por tentativa. A imagem mostra a linha fiscal de um sabão de 1,6 kg, mas não identifica o cadastro selecionado. Não foi provado se aquela associação real é incompatível ou se o cadastro está inconsistente; nenhum produto real foi lido ou modificado nesta rodada.

Confirmado: o seletor manual filtrava somente unidade de compra; a verificação de peso, dose e embalagem ocorria no servidor ao finalizar, interrompendo no primeiro conflito. A interface também repetia uma confirmação por linha além da confirmação da compra.

Agora:
- Mesma validação de identidade no seletor, nas sugestões, nos itens planejados e na revisão local. A identidade fiscal é comparada somente com a descrição/unidade originais, sem contaminar a comparação com a apresentação do cadastro escolhido.
- Servidor informa todos os conflitos de identidade encontrados nas associações em uma tentativa, com detalhes por linha, descrição fiscal e cadastro selecionado. Nada é gravado antes dessa validação. Cliente anterior ainda recebe a primeira linha no campo legado.
- Abas de atenção/todos, contagem de pendências e conservação da revisão em falha. Sugestão principal com um botão; demais sugestões e campos detalhados recolhidos. Sem confirmação extra por item.
- Reconhecimento inicial somente por nome exato normalizado, cadastro único, mesmo contexto e apresentação compatível. Sem decisão automática por semelhança; associações já escolhidas são preservadas. Após carregar mais páginas, o reconhecimento pode ser solicitado na seção do catálogo.
- Escolha de cadastro reaproveita item planejado somente quando há um destino único; trocas eliminam associação planejada anterior incompatível. Linhas fiscais idênticas seguem sendo ajustadas juntas.
- Produto novo recebe apresentação extraída literalmente das medidas fiscais ou a descrição neutra de unidade/venda por medida. Categoria comum opcional; decisão de criar continua explícita. Não altera embalagem dos cadastros existentes.
- Botão para buscar produtos pelo link válido usa a consulta SEFA já existente, com alternativa de texto. Não garante disponibilidade externa. Filial anterior é limpa quando uma nova nota não tem correspondência única por CNPJ.

Sem conversão automática de unidades/preços, mesclagem por similaridade, mudança no total fiscal, novas consultas permanentes, listeners, dependências ou infraestrutura. Categorias, autorização, grupos, aliases e idempotência do servidor preservados. Mesclagem geral do catálogo mantém comportamento anterior; modo compacto de sugestões é exclusivo desta revisão.

Validação: 31 testes unitários direcionados; quatro testes de integração nos emuladores. Caso de 139 linhas com 20 apresentações incompatíveis retorna os 20 conflitos, não cria lista/preços/aliases parciais, confirma após correção com R$1.077,48, repete sem duplicidade e reconhece alias numa nota posterior. Regressões de unidades pendentes e precisão fiscal mantidas. Equivalência 1,6 kg/1600 g aprovada e 800 g bloqueada. Lint e builds PWA/Android reduzido aprovados; não é homologação de aparelho físico.

Prévia interativa fictícia a 390px: 20 pendências entre 139 itens; escolher sugestão reduz para 19, criar nova apresentação reduz para 18, descarte cancelado mantém item, cadastro incompatível desabilitado, correção das demais sugestões chega a zero e finalização exibe sucesso simulado. Sem largura horizontal excedente. Capturas: capturas/cupom-fluido/associacao-mobile.png e sugestao-mobile.png. Interface usou serviço simulado; persistência/idempotência foram verificadas separadamente no emulador.

Logs: output/cupom-fluido-testes-final.log, cupom-fluido-integracao.log, cupom-fluido-lint-final.log, cupom-fluido-build-final.log e cupom-fluido-android-web.log. Prévia e emuladores encerrados. Sem publicação, instalação, Play, commit/push ou alteração de dados reais. Publicação consistente requer comprasOperacao e frontend, no Firebase ponto-app-1c55a e Netlify ponto1303, após autorização específica do titular. Nenhum APK binário foi gerado nesta rodada; o bundle Android foi preparado e validado.


## Numeração por linha e publicação autorizada — 04/11/2026

Titular pediu numeração visível 1, 2, 3… em cada linha de produto e autorizou publicar PWA e servidor após esta rodada. Cada cartão exibe o número fiscal original (i.linha); não é o índice da lista filtrada. Descartados e itens prontos mantêm sua referência em Todos. Rótulo acessível “Linha N”, somente o numeral visível. Lint e build aprovados; testes e integração da associação permanecem os aprovados na seção anterior. Publicação seletiva em andamento: comprasOperacao no Firebase ponto-app-1c55a e frontend Netlify ponto1303. Sem regras, índices, novo serviço, dados reais, APK, Play, commit ou push.

Publicação concluída em 04/11/2026 às 08:50 (UTC−3). comprasOperacao ACTIVE, revisão comprasoperacao-00030-raw, atualização 2026-11-04T11:50:04.569611525Z. Netlify deploy 6aeb1c0e0ac292ac11740332 ready, publicado 2026-11-04T11:50:55.183Z em https://ponto.acstech.dev.br. Seis rotas e 12 arquivos públicos comparados byte a byte com o build final; todos iguais, incluindo chunk ListaCompras-B5fga5s-.js com numeração fiscal visível. API de compras sem login retorna 401. Evidências: output/cupom-fluido-functions-deploy.log, cupom-fluido-servidor-verificado.json, cupom-fluido-netlify-deploy.json e cupom-fluido-publicado-verificado.json. Nenhuma compra real criada para verificar publicação.
