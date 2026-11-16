# Entrega automática de teste, inventário e homologação

15/11/2026 — #9 e #15, publicação coordenada com #7. Implementação local; não corresponde a liberação comercial.

## Entrega automática Google Play de teste

`processarCompraPlayTeste` verifica o token autenticado, fixa o vínculo privado e chama o produtor de entrega. Não recebe grupo, preço, plano ou vigência do cliente. O produtor consulta novamente a Developer API sob lease compartilhado com a reconciliação e exige compra **de teste**, ativa, vigente e correspondente ao titular/grupo/produto mensal aprovado. Compra real, pendente, troca de canal/token e contexto alterado são recusados nesta etapa.

Entrega e direito são criados juntos na mesma transação. O gatilho `reconhecerEntregaPlay`, já preparado, reage ao documento durável e agenda reconhecimento; o cliente não faz ACK. Duas compras concorrentes não substituem o mesmo direito. Repetição não renova nem reativa um direito expirado. Reconciliação/RTDN continuam responsáveis pelas alterações posteriores.

Configuração privada `assinaturasConfiguracao/google_play`: `homologacaoAtiva`, `entregaTesteAtiva`, `direitosHomologados`, `reconhecimentoTesteAtivo` precisam ser verdadeiros e `gruposPermitidos` deve conter o grupo. O grupo deve estar ativo, migrado e já comercial; o endpoint **não altera** `assinaturasAtivas`. Nenhuma dessas flags foi ativada em produção nesta rodada.

No Android, Minha conta → Planos mostra “Validar compras de teste” somente ao titular de grupo autorizado pelo servidor. Consulta compras existentes, ignora pendentes, envia tokens apenas ao backend e não os persiste. Troca de sessão interrompe o fluxo. O botão não inicia compra. O build nativo continua com contratação desabilitada; os produtos rascunho não foram ativados. Depois da entrega, atualizar a consulta mostra o plano confirmado.

## Inventário para migração comercial

Com credenciais de leitura seguras, executar explicitamente:

```powershell
node scripts/inventariar-assinaturas.cjs --project PROJETO --grupo GRUPO
```

Script sem opção de aplicação. Lê um snapshot transacional de grupo, assinatura, perfis, vínculos, exclusão, cadastros e cotas operacionais. Retorna somente contagens, pendências, código do grupo e hash das versões lidas; não imprime nomes, emails, tokens ou detalhes financeiros. O hash muda quando os documentos mudam e não autoriza futura ativação. A vigência é recalculada com o relógio do servidor a cada execução.

Aponta administrador único, vínculo inconsistente/exclusão, cadastros acima da cota, compartilhamento Free, jornadas abertas e configuração incompleta do ponto. Não arquiva, suspende, seleciona funcionário, altera perfil ou concede plano. `ativacaoDisponivel` permanece falso. Filas locais dos aparelhos não podem ser comprovadas pelo inventário do servidor; precisam ser conciliadas com seus donos antes da migração. Legado sem grupo exige primeiro o roteiro de migração de dados já existente.

## Sequência para o Android físico

O titular confirmou possuir Android com o teste interno instalado. Confirmar versão/código instalado. O último pacote registrado é 1.0.0/código 6 e não inclui estas mudanças locais; não reutilizar esse código nem alegar teste físico desta entrega.

1. Conferir inventário do grupo dedicado de homologação e pendências de filas/dados; manter usuários reais em transição.
2. Implantar backend/regras de teste, configurar RTDN e retomada e conferir identidade dedicada; habilitar apenas o grupo de teste após revisão. Não usar uma compra real para exercitar este endpoint.
3. Concluir produtos/testador na Play Console e preparar novo AAB com código disponível conferido no Console. Compra permanece bloqueada até todo o caminho de teste estar pronto. Um AAB que apenas atualiza a interface não valida cobrança.
4. Atualizar pela Play sem desinstalar/limpar dados. Conferir plano Free, cadastro de dois funcionários, GPS, intervalos/saída, perda de conexão, reconciliação, troca de conta e transferência.
5. Com fluxo de compra de teste habilitado na candidata apropriada, validar compra ativa → acesso automático → ACK no backend, além de pendente, cancelamento, expiração, restauração, notificação repetida/fora de ordem e redução acima da cota. Verificar também o caminho de recuperação pelo botão de validação.
6. Homologar PWA/Mercado Pago separadamente antes da candidata completa. Credenciais, checkout, webhook, estados pagos e cancelamento Mercado Pago ainda precisam de implementação/configuração; nada nesta entrega os substitui.

O adaptador não aceita troca de produto com token vinculado nem mudança de canal; concluir essas rotas antes de liberar contratação ao público. Falhas de entrega/reembolso exigem acompanhamento no ambiente de teste. Procedimento assistido de transferência paga e concessão do criador permanecem separados.

Referências consultadas: [verificação, entrega e reconhecimento no backend](https://developer.android.com/google/play/billing/security), [ciclo de assinaturas](https://developer.android.com/google/play/billing/lifecycle/subscriptions), [webhooks de Assinaturas Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks).

Evidências automatizadas registradas na #9/#15 após a execução. Nenhum deploy, inventário de dados reais, compra na loja, ativação de produto/grupo ou novo AAB nesta rodada.
