# Código 4 — correções da homologação

Publicado em 11/11/2026 no teste interno existente. Console confirmou “Última versão: 4 (1.0.0)” e “Disponível para testadores internos”, lançamento 19:31. Nenhuma promoção para produção ou alteração de testadores.

Correções: splash restrito ao fundo da janela de abertura, removendo sua herança em controles nativos; seção de exclusão em Minha conta recolhida e subtítulo removido.

Preparação mobile e bundle release concluídos com os guards e assinatura de upload existentes. Verificação JAR retornou `jar verified`. AAB: `output/Ta-no-Ponto-codigo-4-teste-interno-2026-11-11.aab`, SHA-256 `FDB77F078F764A6EE4429BC0480230103AE2402EFE87498FCD031D59AF0A8A53`.

Play validou código 4 sem erros impeditivos. Dois avisos de diagnóstico: ausência de arquivo de desofuscação e símbolos nativos. Compatibilidade de dispositivos mantida. Comprovante em `output/codigo4-play-publicado.png`.

Validação no aparelho concluída: ADB confirmou código 4 instalado por `com.android.vending`. O usuário respondeu “Os três passaram” ao verificar nomes da equipe sem logo, menu de seleção de texto sem logo e seção “Excluir minha conta” recolhida e expansível. Não houve instalação USB, exclusão de dados ou teste com marcação de ponto real. PWA e backend não foram republicados nesta rodada.
