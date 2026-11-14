# QR integrado — Validação 6

APK: `output/Ta-no-Ponto-QR-Integrado-6.apk`, pacote de teste `br.dev.acstech.ap1303.dev`.
Preserva o aplicativo da Play Store. Abre o aplicativo normal, com login e Compras.

## Preparação no Windows

Nenhuma destas etapas foi executada pelo agente. Não use sua conta real.

Abra dois PowerShells na pasta `C:\Users\ander\projetos\app-ponto-3`.

No primeiro, mantenha os emuladores em execução:

```powershell
.\scripts\qr-integrado-local.ps1 -Etapa emuladores
```

Após Auth, Firestore e Functions aparecerem como prontos, no segundo:

```powershell
.\scripts\qr-integrado-local.ps1 -Etapa dados
.\scripts\qr-integrado-local.ps1 -Etapa usb
```

O aparelho precisa estar conectado por USB com depuração USB autorizada.
O encaminhamento conecta o `127.0.0.1` do aparelho aos emuladores do computador.
Não exponha os emuladores na rede. Se as portas estiverem ocupadas, não encerre outros processos.

Instale o APK sobre **Tá no Ponto Teste** e entre com:

- E-mail fictício: `admin@example.test`
- Senha fictícia: `demo-compras-123`

O seed deve ser executado apenas uma vez por base nova. Caso a conta já exista, ele para sem substituí-la.

## Fluxo do teste

1. Verifique a faixa **TESTE — teste**.
2. Abra Compras → Importar cupom → Escanear QR Code.
3. Teste o Google, confirme a leitura e confira o preenchimento do link.
4. Teste Voltar, cancelar e Home → retornar → nova leitura.
5. Para importar localmente, use o texto completo da nota e revise os itens antes de confirmar.

**Consulta automática à SEFA está bloqueada neste backend de teste.** A leitura do QR não consulta a SEFA.
O teste não comprova a importação automática externa. Não use integrações, notificações ou operações de outros módulos: o backend local exporta somente `comprasOperacao`, com operações limitadas.

Auth: `127.0.0.1:9098`; Firestore: `127.0.0.1:8877`; Functions: `127.0.0.1:5007`.
Projeto único para APK, emuladores e seed: `ap1303-android-push-teste`.
FCM está bloqueado nos emuladores e o componente de notificações Android não é montado nesse ambiente.
O modo local não carrega gatilhos ou agendamentos do backend normal.

Encerre o primeiro terminal com Ctrl+C ao terminar. As variáveis são apenas do processo, sem alteração permanente de configuração.

## Rollback

Para voltar ao leitor isolado, reinstale `output/Ta-no-Ponto-QR-Validacao-5.apk` sobre o app de teste.
Base e hashes desta tarefa: `output/qr-integrado-base-20261113`.
Para rollback de código, compare os hashes posteriores antes de restaurar somente os arquivos desta tarefa e remover os arquivos novos listados no registro. Não use `git reset`, `git clean` ou restauração global; preserve mudanças posteriores.
