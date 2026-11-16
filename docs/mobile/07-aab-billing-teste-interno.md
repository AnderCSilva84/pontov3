# AAB com Billing — issue #11

Rodada de 14/11/2026. [#11](https://github.com/AnderCSilva84/pontov3/issues/11), base Android [#10](https://github.com/AnderCSilva84/pontov3/issues/10), integração completa [#9](https://github.com/AnderCSilva84/pontov3/issues/9), produção [#7](https://github.com/AnderCSilva84/pontov3/issues/7).

## Conferência anterior ao build

Inventário “Todos os pacotes de apps” no Console mostrou códigos 1 a 4 (4 itens). Código 4 disponível no teste interno; não havia código 5 enviado. Checkout base `abfcd40` com alterações locais da rodada, ainda sem commit/push. A candidata inclui as mudanças locais atuais, não apenas o plugin Billing.

Build mobile-release pelo preparador existente, destino `ponto-app-1c55a`, sem emuladores/server.url/mixed content. Build assinado pela chave de upload existente via credencial local protegida, sem imprimir senha, gerar chave nova ou desativar validadores. Build release inclui lint vital. Compras continuam bloqueadas no nativo; nenhum plano pago foi ativado.

## Código 5 — enviado à biblioteca, retirado do lançamento

Artefato `output/Ta-no-Ponto-5-1.0.0-Billing.aab`, 10.501.174 bytes, SHA-256 `F819E6DD5FA76C5FED5E1E83716167B9D38662822452779AB8E95AC70587BE06`. Assinatura e bundletool aprovados.

Ao revisar no Console, a Play detectou perda de 26 dispositivos: 6 tablets, 3 TVs e 17 carros; telefones preservados. Comparação de recursos indicou `android.hardware.screen.portrait` novo. O manifesto do AAB mostrou orientação retrato na Activity `GmsBarcodeScanningDelegateActivity` do leitor QR nativo; o pacote anterior não tinha essa Activity. Não atribuir o filtro à biblioteca Billing.

Corrigido em `AndroidManifest.xml` com `uses-feature android.hardware.screen.portrait` e `required=false`, conforme [documentação Android](https://developer.android.com/guide/topics/manifest/uses-feature-element). Não foi alterada a orientação da Activity do fornecedor. O pacote 5 foi removido somente do rascunho da versão e continua na biblioteca de artefatos. Seu código já está consumido; não reutilizar. AABs locais anteriores preservados.

## Código 6 — artefato corrigido

| Campo | Resultado |
| --- | --- |
| Arquivo local | `output/Ta-no-Ponto-6-1.0.0-Billing.aab` |
| Tamanho | 10.501.202 bytes |
| SHA-256 | `45DBC06F7CBC260775848CD4F6CC24830E4238A656813BB86696FC981306BB83` |
| Pacote / versão | `br.dev.acstech.ap1303` / `1.0.0` / código 6 |
| Billing | 9.1.0 e permissão `com.android.vending.BILLING` |
| minSdk / targetSdk | 24 / 36 |
| Compras habilitadas | Não |
| Retrato obrigatório | Não |
| Certificado upload SHA-256 | `D000F2D0DF9AC8DF6D0F1B1BCF2EA8F01C09F53E9C3DCFC837C9437691156734` |

Segundo build release aprovado; bundletool 1.18.1 oficial validou estrutura e extraiu o manifesto diretamente do AAB. `jarsigner -verify`: jar verified; certificado público comparado ao esperado da configuração local. Avisos de certificado autossinado/cadeia sem CA e ausência de timestamp registrados, sem substituição da chave. Retrato opcional e metadado Billing conferidos no manifesto extraído. Configuração release gerada confirma compras desabilitadas e edição Android sem cuidados.

Evidências locais em `output/billing-aab6-build.log`, `billing-aab6-bundletool.log`, `billing-aab6-manifest.xml` e `billing-aab6-validacao.json`. Esses arquivos não contêm senhas/tokens e permanecem fora do Git.

## Estado no Console

Código 6 publicado no teste interno, nome “6 (1.0.0) - Billing teste interno”. Console confirmou **Disponível para testadores internos**, lançamento mostrado em 14/11, 18:12. Revisão final sem erros e sem perda de dispositivos em relação ao código 4. Permaneceram dois avisos sobre arquivo de mapeamento e símbolos de depuração nativos, sem bloqueio.

Após recarregar Assinaturas, o Console exibiu **Criar uma assinatura**. Dependência técnica da #12 desbloqueada; produtos ainda não cadastrados. #10 concluída para a base nativa; #11 permanece em validação pela atualização física pendente.

Notas da versão: preparação do Google Play Billing para testes internos, tela de planos com consulta de disponibilidade/preços na loja e contratação ainda indisponível.

Não houve publicação em Produção nem deploy Firebase/Netlify nesta rodada. Instalação/atualização física pela Play e teste de leitura real dos produtos continuam pendentes. Seguir a #12 para os três produtos/planos-base e a #9 para verificação no backend e homologação das compras. Não desinstalar nem limpar dados para atualizar.
