# Avisos do App Ponto no celular

WhatsApp e Telegram foram removidos do código ativo. Compras e tarefas agora usam Firebase Cloud Messaging (FCM) para exibir notificações do próprio app.

## Como ativar

O painel visual de avisos foi removido a pedido do usuário. A conexão e o recebimento continuam em segundo plano.

1. Abrir o app publicado por HTTPS e entrar na conta.
2. Na primeira entrada, permitir as notificações quando o celular apresentar o pedido.
3. Se a permissão já foi concedida, o cadastro é reconectado automaticamente ao entrar, voltar ao app ou recuperar a internet.
4. Conferir a central de notificações ao ocorrer uma nova compra, tarefa ou marcação de ponto. Permissões de exibição são ajustadas nas configurações do celular.

No Android, usar um navegador compatível, como Chrome. É possível instalar o app na tela inicial pelo menu do navegador. No iPhone/iPad com iOS/iPadOS 16.4 ou superior, adicionar o app à Tela de Início pelo navegador, abrir pelo ícone instalado e só então ativar os avisos. Referências: [Web Push no iOS, WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) e [Firebase Cloud Messaging web](https://firebase.google.com/docs/cloud-messaging/web/get-started).

A aparição na tela bloqueada, o som e os banners dependem das permissões do sistema, ajustes de privacidade, modo Foco/Não Perturbe e conectividade. O app não controla esses ajustes nem garante entrega instantânea.

## Avisos disponíveis

- **Compras:** quando um item passa a solicitado e ainda não comprado. Alterar nome ou marcar comprado não dispara novo aviso. Um aviso é emitido por nova solicitação, sem agrupamento por tempo.
- **Tarefas:** quando a administração publica um documento em `notificacoes`, incluindo novas tarefas e alterações de rotina já emitidas pelo app.
- **Ponto:** administradores ativos recebem aviso quando uma funcionária registra a entrada ou a saída final, com nome, horário e data. Intervalos e marcações feitas por administrador não disparam esse aviso. O toque abre `/admin`. O evento é gerado a partir do histórico gravado no servidor, depois da marcação, sem depender de uma chamada extra do celular.
- **Teste:** enviado somente aos dispositivos vinculados à conta que tocou em Testar aviso. Repetições normais são limitadas por uma janela de 30 segundos.

Os avisos gerais são destinados aos usuários com cadastro ativo e dispositivo inscrito; os de ponto são exclusivos de administradores ativos. Cada conta pode cadastrar mais de um celular. Continuar conectado permite receber push em segundo plano; sair da conta revoga a inscrição daquele navegador, sem afetar outros celulares. Ao entrar novamente, a assinatura é recriada automaticamente se o sistema já permite notificações. Desativar avisos explicitamente mantém essa escolha; recarregar a página não os reativa sozinho.

A permissão inicial do sistema não pode ser concedida automaticamente: no iPhone, o pedido exige interação direta. Ele é solicitado no toque em Entrar, antes da autenticação; recusar ou falhar não impede o login. O cadastro automático acontece depois da autenticação. A antiga preferência `pushAtivado` não limita mais essa reconexão; apenas a nova opção explícita `pushDesativadoManualmente` a bloqueia.

## Configuração e publicação

O frontend e o worker usam o mesmo objeto de configuração Firebase, evitando o projeto fixo que existia no worker antigo. A chave pública VAPID pode ser configurada por `VITE_FIREBASE_VAPID_KEY` no ambiente de build. O fallback é a chave pública que já existia neste projeto; confirmar que corresponde à chave Web Push do projeto Firebase em **Configurações do projeto → Cloud Messaging**. A chave pública VAPID é diferente de um token de acesso de servidor.

Confirmar que Firebase Cloud Messaging API (HTTP v1) está habilitada e que a conta de serviço das Functions tem permissão para enviar mensagens. Publicar as Functions com Node 24, conforme `functions/package.json`.

```powershell
firebase deploy --only functions:registrarDispositivoPush,functions:removerDispositivoPush,functions:testarNotificacaoPush,functions:alertaListaCompras,functions:alertaNotificacoes,functions:alertaRegistroPonto
```

Depois publicar o frontend pelo processo habitual do projeto, incluindo `firebase-messaging-sw.js`, manifest e ícones. As regras locais bloqueiam explicitamente acesso direto às coleções de push. Ao publicar todas as regras, considerar também a migração do ponto para `registrarPonto` descrita na auditoria anterior: o frontend e as Functions precisam estar alinhados antes da mudança.

Excluir do Firebase as antigas `telegramWebhook`, `whatsappWebhook` e `processarMensagemWhatsapp`, **se estiverem publicadas nesse projeto**, após confirmar os nomes e a região. O novo `alertaListaCompras` substitui o trigger anterior. Um deploy seletivo não exclui Functions removidas do código. A configuração Meta observada em `acstech.dev.br/api/whatsapp/webhook` pode pertencer a outro aplicativo; não foi alterada. Remover a integração local não revoga tokens remotos: revogar a credencial do Telegram anteriormente exposta.

Publicação concluída em 13/10/2026: site em https://ponto.acstech.dev.br, deploy Netlify `6ace53491b19488431dc6b1c`. As nove Functions locais estão ativas no Firebase `ponto-app-1c55a`, incluindo as cinco de push e `registrarPonto`. As regras foram publicadas e o antigo `telegramWebhook` foi excluído. Não havia Functions WhatsApp publicadas nesse projeto.

Verificação de produção: site, manifest e worker retornaram HTTP 200; o bundle inclui o painel de avisos e o cadastro push. As callables verificadas rejeitam chamadas sem login com HTTP 401. FCM API está habilitada e a conta de serviço das Functions possui as permissões do projeto. O usuário confirmou o recebimento do aviso de teste em um iPhone em 13/10/2026.

As políticas TTL de `pushEnvios.expiresAt` e `pushEventos.expiresAt` foram solicitadas ao Firestore e estavam em estado `CREATING` na verificação. A ativação dessa limpeza é assíncrona e não impede o envio de avisos.

Atualização publicada em 13/10/2026: deploy Netlify `6ace616011e6a82675e5319a` com pedido inicial no login e reconexão automática. A função `alertaRegistroPonto` está publicada em `southamerica-east1`, vinculada à criação de `registros/{id}`. O teste no emulador confirmou destinatários administradores ativos, nome/hora/data, rejeição de intervalos e marcações administrativas, e deduplicação das reentregas. A entrega de uma marcação real aos administradores ainda deve ser confirmada no próximo registro legítimo da funcionária.

## Operação e privacidade

- Inscrições são feitas por callables autenticadas; usuários inativos são bloqueados. O UID informado precisa coincidir com o UID da sessão autenticada.
- `pushDispositivos` associa o hash de cada token ao usuário atual. Trocar o vínculo move a assinatura, sem duplicá-la entre contas.
- Usuários inativos ou sem cadastro não recebem avisos. Tokens expirados são removidos; falhas temporárias disparam retry e preservam recibos dos envios já aceitos.
- Lotes têm até 500 mensagens. Recibos em `pushEnvios` e controle de execução em `pushEventos` evitam duplicações normais por reentrega. Configure TTL em `expiresAt` nessas duas coleções, para retenção de aproximadamente 30 dias.
- A API FCM e o Firestore não compartilham transação: se o envio for aceito, mas o recibo não puder ser gravado, uma nova tentativa ainda pode repetir a mensagem. A tag do evento substitui o aviso anterior na central de notificações em navegadores compatíveis.
- A entrega via FCM é do tipo `data`, com exibição explícita pelo worker. Isso evita duplicação por exibição automática mais exibição manual. O worker e o listener em primeiro plano rejeitam mensagens de outro usuário.
- A saída da conta tenta revogar a assinatura local antes da remoção remota. Uma falha remota não impede o logout. O cadastro órfão pode permanecer até a limpeza de tokens inválidos.
- Preferências de ativação são guardadas localmente por usuário; limpar dados do navegador remove essa preferência. O token anterior em `users.fcmToken` não é usado para envio pelo backend novo; cada dispositivo deve ativar os avisos novamente.
- Eventos antigos, com mais de 24 horas, não são reenviados. O TTL de transporte também é de 24 horas.
- As mensagens de tarefas podem aparecer na tela bloqueada. Ajustar a exibição de prévias no sistema se for necessário ocultar o conteúdo.

## Verificação

```powershell
npm test
npm run lint
npm run build
firebase emulators:exec --only firestore --project demo-app-ponto-audit "node scripts/auditar-push.mjs"
firebase emulators:exec --only firestore --project demo-app-ponto-audit "node scripts/auditar-regras.mjs"
```

Os testes do worker verificam exibição única, isolamento por UID, navegação local e bloqueio de destino externo. O teste de integração usa Firestore real no emulador e FCM simulado: autenticação, troca de vínculo, remoção própria, teste individual, usuários inativos, tokens inválidos, retry parcial, deduplicação, eventos expirados e 503 dispositivos distribuídos em lotes. Nenhuma notificação real é enviada por esses testes.

Resultado local atualizado: 18 testes automatizados, 11 verificações de regras da etapa anterior e o teste de integração push passaram, assim como lint, build e validação de sintaxe do backend. Os testes de ciclo de vida verificam solicitação inicial, reconexão após logout e preferência explícita de desativação.

Confirmado pelo usuário em 13/10/2026: recebimento do aviso de teste em um iPhone. Ainda falta comprovar os avisos automáticos de compras e tarefas, a entrega com o app fechado, a abertura ao tocar, desativação/recarregamento e logout.
