# Busca de produtos existentes na importação — 07/11/2026

Investigação a partir do relato sobre “Alegorcort”, sem acesso a notas ou cadastro reais. A associação do cupom usava apenas as páginas de catálogo já carregadas e a busca textual estrita. O catálogo é paginado em lotes de 25 por tipo, incluindo histórico comprovado; um produto cadastrado podia ficar fora da lista local. Cache de uma consulta completa também podia ficar desatualizado.

Ao abrir a escolha de produto existente, a interface agora atualiza os produtos e percorre as páginas restantes pela operação existente `catalogoPorTipo`, uma vez por classificação durante a importação. Aguarda o carregamento inicial antes de iniciar. Reutiliza os controles, cache, cancelamento por contexto e consultas já existentes do hook, sem novo endpoint ou varredura entre categorias. Exibe andamento/erros e permite pedir o restante do catálogo manualmente. Não recarrega catálogo a cada tecla.

Se não há coincidência textual, sugere nomes com espaço diferente ou uma inserção/remoção/substituição de letra em termos de pelo menos 6 caracteres. Avisa que são nomes parecidos. Não associa automaticamente, não altera produto existente e não converte unidade/dose/embalagem. Mantém separação de classificações e produtos principais ativos. Casos sem classificação comprovada continuam sujeitos à revisão de categorias; não são expostos por inferência de nome.

Validação: 6 testes de catálogo/revisão de cupom aprovados, com caso fictício de grafia parecida, espaços, marca/aliases, isolamento por classificação, inativos e unidade incompatível. ESLint/build aprovados. Ainda não publicado. O tipo selecionado e a grafia no cadastro real foram perguntados ao usuário para confirmar o diagnóstico específico, sem resposta recebida até este registro.

## Publicação autorizada — 07/11/2026
Após “Vamos publicar”, correção enviada ao PWA existente https://ponto.acstech.dev.br, site `cf66ee21-9935-4013-8043-1471c62694e7`, deploy `6aef4aab4073518b405ced3f`. Verificação pública: 9 rotas e 25 arquivos iguais por hash ao build local; callable sem login retorna 401. Sem deploy de backend necessário, sem dados reais alterados e sem commit/push.

APK atualizado `output/Ta-no-Ponto-busca-produtos-nota-2026-11-07.apk`, 10.353.905 bytes, SHA256 `099837597C2C096CD3CA2A28541E8E3E7C46728DF9B16B27160FB05F863070AA`. Assinatura existente verificada e 66 assets internos conferidos contra o release. Produção explícita sem emuladores, edição Android sem cuidados. Sem instalação ou envio à Play. Evidências `output/cupom-busca-publicacao-*`, `cupom-busca-publicado-verificado.json` e `cupom-busca-apk-verificado.json`.

A publicação não representa confirmação de que o cadastro real de Alegorcort esteja classificado no mesmo tipo da nota: essa informação ainda depende da resposta à pergunta de diagnóstico. A busca permanece isolada por classificação e conserva os bloqueios de unidade/apresentação.
