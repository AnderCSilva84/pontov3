# Análise de produtos e catálogo completo

Rodada de 04/11/2026. Complementa o registro histórico em `pente-fino-catalogo.md`.

A ferramenta agora se chama **Análise de produtos**. Considera apenas produtos principais, ativos, não excluídos e com classificação comprovada no catálogo atual. Um cadastro em formato antigo ainda ativo, com histórico válido na classificação, não é confundido com produto obsoleto. Não há opção de incluir cadastros sem comprovação. Pares removidos ou mesclados durante a análise saem automaticamente dos resultados; nomes são conferidos novamente ao abrir.

Foi corrigido o reinício do catálogo nos primeiros 25 registros após uma mesclagem. As respostas do servidor trazem os documentos afetados, e o cliente aplica somente essas mudanças, preservando as páginas carregadas. Repetições da operação retornam os dados atuais, evitando restaurar nomes antigos na interface. Atualizações manuais preservam a profundidade já carregada.

O catálogo informa quando a lista é parcial e oferece **Carregar catálogo completo**, com cancelamento entre páginas. A busca aceita palavras em qualquer ordem e abreviações como QJ MUSS para queijo mussarela. Trocar a classificação limpa filtros antigos. Isso não renomeia nem mescla produtos automaticamente.

Validação: lint e build aprovados; 17 testes locais e 3 testes de integração aprovados. Simulação com 70 produtos comprovou busca além da primeira página, preservação após mesclar/desfazer e recarga completa. A interface de análise foi conferida em 390 px, com dados fictícios, incluindo exclusão de par desatualizado. Capturas: `capturas/analise-atuais/mobile.png` (390 px) e `capturas/analise-atuais/catalogo-completo-mobile.png` (desktop, apesar do nome).

Nenhum produto real foi mesclado, excluído ou reativado nesta validação. Os exemplos fornecidos pelo usuário (queijo mussarela e arroz) orientaram a busca, sem acesso aos seus registros privados. Não houve alteração de regras, índices, infraestrutura, APK, Play, commit ou push.

Evidências em `output/catalogo-final-*.log`. Publicação e verificação registradas em `output/catalogo-atual-*.json` e `output/catalogo-atual-functions-deploy.log`.

Publicado em produção em 04/11/2026: servidor ACTIVE, revisão `comprasoperacao-00033-gum` (17:06:58 UTC); PWA Netlify `6aeb666048181129d0975b64`, ready às 17:08:01 UTC (14:08 UTC−3). Verificação pública: 7 rotas e 17 arquivos iguais ao build local; operação sem login recusada com 401.
