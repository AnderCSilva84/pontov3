# Backup portátil da chave de upload — 24/10/2026

Preparação concluída; **cópia real pendente do destino e da entrada local da senha pelo titular**. Não confundir script preparado com backup já realizado. A chave original e sua senha DPAPI permanecem inalteradas.

## Criar a cópia

Abra um PowerShell local interativo na raiz do projeto, configure `JAVA_HOME` para o JDK21 instalado e execute:

```powershell
.\scripts\android-backup-upload.ps1 -Destino 'E:\Backup-AP1303'
```

Substitua pelo destino real, uma pasta existente fora do repositório, de preferência mídia externa. A senha é solicitada duas vezes com entrada oculta: não a coloque no comando, chat, arquivo de texto ou histórico. Guarde-a em gerenciador de senhas com recuperação independente deste Windows, separado da mídia. Não dependa só da memória ou do DPAPI.

O script usa `keytool -importkeystore` do JDK para copiar **a mesma chave** para `ap1303-upload-portatil.p12`, protegida pela nova senha. Não gera outra identidade, não muda a chave original e não transmite dados. Senhas passam ao processo filho por variáveis temporárias, removidas em `finally`, nunca por argumentos. Execute sem transcript/depurador; administradores da máquina ainda têm acesso à memória do processo.

Confere entrada privada, gera um CSR local descartável para provar acesso à chave e compara o SHA256 do certificado com o aprovado. Exporta apenas o certificado público `ap1303-upload-publico.cer`. Recusa sobrescrever arquivos existentes. Se houver falha após criar o PKCS12, não trate a cópia como validada: use `-Verificar`, sem gerar nova chave.

## Recuperar sem este Windows

São necessários somente o PKCS12 portátil, sua senha própria e o alias `ap1303-upload`. A senha original DPAPI não é necessária. Use o PKCS12 como keystore de upload; a senha do arquivo e da chave são a senha própria escolhida para o backup. Forneça-a por entrada segura/variáveis de processo na configuração de assinatura, nunca no Git.

Em outro Windows com JDK21, copie também este script (não contém segredos) e execute:

```powershell
.\android-backup-upload.ps1 -Destino 'E:\Backup-AP1303' -Verificar
```

O modo de verificação não lê DPAPI nem a chave original. Em Linux/macOS, o mesmo formato funciona com o `keytool` do JDK: `keytool -list -v -storetype PKCS12 -keystore /caminho/ap1303-upload-portatil.p12 -alias ap1303-upload` solicita a senha interativamente. Compare o certificado e teste a assinatura em ambiente local antes de depender dessa recuperação.

Certificado SHA256: `D0:00:F2:D0:DF:9A:C8:DF:6D:0F:1B:1B:CF:2E:A8:F0:1C:09:F5:3E:9C:3D:CF:C8:37:C9:43:76:91:15:67:34`.

Base técnica: [keytool oficial do JDK21](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html). Sem biblioteca criptográfica própria, dependência nova, cobrança ou rede.

## Console e bloqueios restantes

Conferência visual da sessão autenticada na Play Console em 24/10/2026: a conta acessível mostra **“Criar seu primeiro app”**, sem aplicativos. Não houve código enviado nessa conta; `versionCode=1` mantido e disponibilidade registrada na configuração local. Identidade final `br.dev.acstech.ap1303`, versão `1.0.0`; debug continua separado. Revalidar imediatamente antes do primeiro upload caso ocorram envios por outra sessão. Depois de criar o app, conferir os códigos em **Testar e lançar → Explorador de app bundles**, incluindo artefatos de todos os canais. Nenhum app foi criado nesta rodada.

- **Locais:** executar e verificar a cópia portátil após destino/senha; concluir seleção separada do ambiente final, assets nativos e geração/inspeção do AAB assinado após os dados finais. Guards de release preservados; nenhum AAB final gerado.
- **Deploys futuros:** publicar seletivamente os contratos Android ainda locais (ponto offline/revisão, ciclo de conta/exclusão, FCM e ações, consulta No Bolso e demais diferenças efetivamente necessárias), regras/índices usados e páginas públicas aprovadas. Ponto/mapa administrativo e seu ajuste de folha já publicados não precisam ser republicados por este motivo. Homologar o conjunto final antes de liberar o build.
- **Titular:** fornecer destino e digitar senha do backup localmente; definir projeto/configuração Firebase final, aprovar URLs e informações legais/suporte/retenção, disponibilizar acesso fictício independente para revisão e concluir cadastro/requisitos aplicáveis na Play. Nenhuma decisão substituída por configuração inventada.

Checks desta rodada: parser PowerShell e dois testes direcionados de validação de release aprovados. Sem suíte completa, alteração funcional do aplicativo, deploy, upload, cobrança, commit ou push. Recuperação em outra máquina e backup real ainda não executados.

## Destino aprovado e entrada segura — continuação

Destino autorizado: `C:\Users\ander\BackupsSeguros\AP1303`, no mesmo computador. Pasta criada com ACL restrita ao usuário atual e SYSTEM. Script e instruções sem segredos copiados para essa pasta; terminal local interativo preparado para o titular escolher a senha sem enviá-la ao chat. A cópia externa continua **pendente**.

O lançador `criar-e-conferir.ps1` executa criação e, depois, uma nova verificação com redigitação da senha. A segunda execução não lê DPAPI nem o keystore original, testa a chave privada por CSR local descartável e confere o certificado aprovado. Sucesso gera `verificacao-backup.json`, sem senha, com hashes e data. A cópia deste script fora do repositório também funciona; o bloqueio de destino percorre os ancestrais procurando `.git` e recusa links/redirecionamentos.

Estado no momento da preparação: aguardando entrada local da senha; não declarar backup criado nem recuperação aprovada antes do recibo. Teste em outro computador não realizado. Parser e recusa de destino no Git aprovados. Nenhum segredo em texto aberto persistido; nenhuma alteração na chave original ou em produção.
### Correcao do destino — marcador Git na raiz da unidade

Causa confirmada da recusa antes da senha: existe `C:\.git`; a verificacao anterior de ancestrais recusava qualquer pasta em C:. Corrigido para manter o bloqueio explicito do projeto AP1303 e repositorios ancestrais abaixo da raiz, sem tratar esse marcador da unidade como o projeto. Links/redirecionamentos continuam recusados. Modo `-ValidarDestino` permite conferir o caminho sem acessar chave/DPAPI/senha. Destino aprovado passou nesse modo; projeto continua bloqueado. Nova janela identificada como “AP1303 - Backup seguro” aberta na pasta autorizada. Backup/recuperacao real ainda dependem da entrada local; copia externa continua pendente.