# Seletores Android e Minha conta

Relato na homologação do código 3: logo atrás dos nomes no seletor de equipe e no menu de seleção de texto de Minha conta.

O tema de abertura definia `android:background` como splash. Esse atributo geral pode ser herdado por controles e menus nativos mesmo após a troca de tema. A imagem foi limitada a `android:windowBackground` no lançamento, com `android:background` limpo no tema em execução. Seleção de texto e seletor continuam usando os controles nativos.

Minha conta agora recolhe toda a seção de exclusão em “Excluir minha conta”. Ao expandir, os avisos, confirmações e ações existentes permanecem disponíveis. O subtítulo de exclusão foi removido do cabeçalho.

Validação: ESLint da página, build web e `processDebugResources` Android concluídos. Log: `output/ajustes-tema-android-debug-recursos.log`. A tentativa de recursos release foi impedida pelo guard de assinatura de distribuição, sem contorná-lo. A correção nativa precisa de uma nova versão Android e de reteste no aparelho; não foi instalada nem publicada nesta rodada.
