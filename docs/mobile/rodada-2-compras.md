# Rodada 2 — compras

Aceite recebido do usuário: importação e baixa funcionaram 100% no fluxo testado.

A janela de compras agora acompanha altura e deslocamento do visualViewport, inclusive quando o teclado não redimensiona o layout. Cabeçalho deixa de ser fixo durante edição e o campo focado é trazido para a área visível. Listeners são removidos no fechamento.

Sugestões e busca reconhecem mais abreviações fiscais, como BEB LAC, IOG, SAB e AMAC. Aliases também são normalizados na ordenação das sugestões. Produtos originais são preservados, conflitos são recalculados com seus dados originais, e associação continua exigindo escolha do usuário. Sugestões da nota recebem todos os atributos disponíveis, incluindo GTIN quando fornecido. Código comum atende Android e PWA; nenhuma mudança no backend ou nos dados reais.

Validar no aparelho: abrir nota em revisão, editar nome/quantidade/valor e campo na parte inferior com teclado aberto; alternar foco, rolar e fechar teclado. Conferir sugestões para abreviações e produtos de embalagem diferente. Confirmar que só a escolha desejada é associada.

Câmera: já solicita foco contínuo quando suportado. Ainda não há reprodução suficiente para concluir limitação física; não foi alterada nesta rodada. Registrar se o problema é foco, distância, câmera escolhida ou leitura de código já nítido.

Verificações: 10 testes passaram (9 de catálogo/identidade e 1 de redução da área visível/limpeza dos listeners), ESLint dos arquivos alterados sem erros e build web concluído. Logs em `output/rodada2-compras-*.log` e `output/rodada2-dialog-testes.log`. Alterações ainda locais; homologação visual no celular e publicação pendentes.
