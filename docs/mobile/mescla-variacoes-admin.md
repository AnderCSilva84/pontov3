# Mesclagem manual de variações

04/11/2026. O usuário confirmou expressamente que deseja reunir produtos como Pringles churrasco 109 g e original 104 g no mesmo cadastro principal.

A mesclagem manual do catálogo agora permite ao administrador confirmar diferenças de marca, GTIN, sabor e apresentação, desde que a unidade de compra seja a mesma e válida. Diferenças farmacêuticas continuam bloqueadas. A mudança é exclusiva da operação manual `mesclarProdutos`; as sugestões automáticas e a confirmação de equivalência na comparação não passam a tratar variações como duplicados.

A prévia apresenta as diferenças, a confirmação específica e a ação “Reunir variações”. Cada produto pode ser retirado da seleção na própria prévia, que também oferece retorno à seleção. Sugestões auxiliares desse formulário mostram apenas opções compatíveis. A decisão de reunir variações é auditada, usa assinatura determinística da prévia, versão do mapa e identificador idempotente. Alterar o cadastro depois da prévia exige nova conferência. Permissões e isolamento entre grupos permanecem no servidor.

As notas, descrições fiscais, pesos, apresentações e preços originais são preservados. A comparação mantém embalagens diferentes em grupos distintos; reunir cadastros não equivale a declarar que 104 g e 109 g têm o mesmo preço por peso. A operação é reversível. Mesclagem manual e reversão retornam os documentos afetados para preservar as páginas carregadas no catálogo.

Validação: 10 testes locais, lint, build e 3 integrações em emuladores. Casos: confirmação obrigatória, assinatura incorreta, cadastro alterado, funcionário sem permissão, repetição idempotente, desfazer, unidades incompatíveis e farmácia. A tela real foi exercitada com serviço fictício, mostrando confirmação e sucesso. Captura `capturas/mescla-variacoes/previa.png`. Nenhum dado real foi mesclado nos testes.

Logs: `output/mescla-variacoes-*.log`. Publicação no projeto explícito ponto-app-1c55a e site Netlify existente; sem nova infraestrutura, APK, commit ou push.

Servidor ACTIVE, revisão `comprasoperacao-00034-yos`, atualização 18:44:06 UTC. Netlify `6aeb7d18859595af2055e59e` ready às 18:44:54 UTC (15:44 UTC−3). Verificação pública de 7 rotas e 17 arquivos, iguais ao build local, com rejeição 401 sem autenticação.
