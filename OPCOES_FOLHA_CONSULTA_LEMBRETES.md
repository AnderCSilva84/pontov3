# Ajustes de folha, consulta de preços e notificações

Publicados após autorização do titular em 21/10/2026 (America/Fortaleza). Deploy Netlify: 6ad95290c9267eeb63f8ec7e.

## Desconto de horas

O campo `descontarHoras` controla somente o desconto das horas devidas na folha mensal. Desmarcado, `descontoHoras` fica zero e a base automática do INSS não subtrai essas horas. A quantidade de horas permanece salva e o ponto não é alterado. Folhas antigas sem o campo mantêm o cálculo anterior; folhas fechadas continuam bloqueadas e preservam seus totais. O servidor valida e persiste a escolha, recalculando os valores.

## Autocomplete

A consulta de preços sugere produtos ao digitar nome, marca ou apresentação, sem diferenciar acentos e maiúsculas. São mostradas até 15 opções, com aviso para refinar a busca. A seleção mantém marca, embalagem e unidade separadas. Setas, Enter, Escape, mouse e toque permitem navegar/selecionar; digitar outra busca remove a seleção anterior para não comparar o produto errado.

## Notificação de cuidado

Os novos avisos levam IDs de lembrete, ocorrência e destinatário no destino `/lembretes`. O toque abre a ocorrência específica, exibe o cuidado e exige confirmação explícita da pessoa conectada. Uma URL, sozinha, não conclui nada. A leitura e a conclusão são validadas no servidor, no grupo da sessão; notificações de outra conta, versões antigas e ocorrências canceladas/inexistentes são recusadas. A conclusão existente continua idempotente.

Navegadores compatíveis podem mostrar a ação “Ver e concluir”. No iPhone, o fluxo usa o toque no corpo da notificação para abrir o cartão no app; não se promete conclusão em segundo plano pela central de notificações do PWA. Referência de compatibilidade: https://developer.mozilla.org/en-US/docs/Web/API/Notification/actions

Somente novos avisos terão o destino específico. Avisos antigos continuam abrindo a escala. A validação de cliques nativos em Android/iPhone reais ainda será necessária depois da publicação; os testes automatizados simulam o service worker e verificam destino, proprietário e ausência de conclusão automática.

## Arquivos principais e validação

- Folha: `functions/folha-calculos.mjs`, `functions/folha-pagamento.cjs`, `src/pages/Financeiro.jsx`.
- Consulta: `src/components/ConsultaPreco.jsx`, `src/utils/comprasConsulta.js`, `src/styles/compras.css`.
- Cuidados: `functions/lembretes.cjs`, `functions/lembretes-cuidados.cjs`, `functions/lembretes-link.cjs`, `src/components/LembreteNotificacao.jsx`, `src/pages/Lembretes.jsx`, `src/services/push.js`, `public/firebase-messaging-sw.js`.
- Testes: cálculo/persistência da folha, autocomplete por marca, link e simulação do clique, consulta de ocorrência autorizada e conclusão repetida. Nenhum pagamento, registro de ponto ou cuidado real foi alterado.

Valida��o final: lint e build aprovados; 89 testes unit�rios e 62 testes de integra��o aprovados. Confer�ncia visual com conta fict�cia: sele��o por teclado e clique no autocomplete, salvamento de rascunho sem desconto de horas e conclus�o da ocorr�ncia espec�fica com atualiza��o da escala. Evid�ncias em output/opcoes/. Nenhuma publica��o realizada nesta rodada.

Publicação conferida: três funções atualizadas sem erros, pacote e service worker remotos idênticos aos validados e consulta real por marca funcionando sem erros no console. A confirmação pela notificação no aparelho físico continua pendente de teste com um novo aviso.
