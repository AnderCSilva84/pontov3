# Configuração final e assinatura — preparação bloqueada

## Inventário

| Campo | Situação real |
| --- | --- |
| Nome pretendido | AP1303, a confirmar pelo titular |
| Nome debug | AP1303 Teste |
| applicationId/namespace atuais | br.dev.acstech.ap1303.dev |
| Versão debug | versionCode1 / versionName0.1.0-dev |
| compileSdk/targetSdk/minSdk | 36/36/24 declarados; conferir também badging do APK |
| AGP/JDK | 8.13.0 / JDK21 nos builds locais |
| Firebase do APK de ensaio | ap1303-android-push-teste; Auth/Firestore/Functions locais, FCM dedicado |
| Destino de lançamento | Não definido/autorizado; não usar o projeto do PWA por suposição |
| Assinatura atual | Debug Android; não é chave definitiva de upload/distribuição |
| URLs finais | Suporte, privacidade, exclusão e recuperação pendentes de aprovação/publicação |

O PWA existente tem configuração própria. Nenhuma configuração de produção foi copiada para o APK. Nenhum endpoint real foi invocado para ensaio de cadastro/exclusão.

## Arquivos preparados

Copiar os exemplos desta pasta para `android/release.local.json` e `android/signing.local.json` somente quando os valores tiverem sido aprovados. Ambos são ignorados; o JSON de assinatura contém apenas caminho de keystore e alias. Senhas ficam em `AP1303_STORE_PASSWORD` e `AP1303_KEY_PASSWORD`, fornecidas por mecanismo local seguro, nunca em código, argumentos de linha de comando, documentação ou logs. Keystores `.jks`/`.keystore` já são ignoradas.

`android/release-signing.gradle.example` prepara o vínculo à signingConfig de upload. Não foi aplicado. O `build.gradle` mantém o bloqueio de release existente e `resolverAmbiente` continua recusando produção no modo mobile. Registrar o Android definitivo no Firebase e obter a configuração de cliente correspondente é ação externa futura; nenhum projeto/app definitivo foi criado nesta rodada.

`npm run android:release:validar` verifica localmente identidade, versão, URLs HTTPS, aprovações, projeto/package Firebase, assets sem emulador/server.url/mixed content e presença dos arquivos/variáveis de assinatura. Não faz rede, não imprime senhas e não habilita lançamento. Com o estado atual, **deve falhar** e listar bloqueios. Mesmo preencher exemplos não remove o bloqueio final: a liberação do ambiente exige rodada autorizada e validação integrada.

Validações futuras adicionais indispensáveis: pacote efetivo no manifest, versão já usada no Play Console, certificados/SHA autorizados no Firebase, configuração de recuperação, configuração FCM, regras/índices/backend publicados e inspeção do AAB final. O validador local não verifica disponibilidade de package/versionCode no Console nem assinatura criptográfica de uma keystore ainda inexistente.

## Comandos reproduzíveis de teste no Windows

Usar Node22 local (`node_modules/node/bin` no PATH), JDK21 e Android SDK local. Não imprimir variáveis de ambiente ou configurações Firebase completas.

```powershell
npm run lint
npm test
npm run build
npm run build:mobile:dev
npm run cap:sync:android
# Após gerar o APK, na raiz:
node scripts/manifesto-candidato-android.mjs 2026-10-24
# Na pasta android, com JAVA_HOME e ANDROID_HOME locais corretos:
.\gradlew.bat testDebugUnitTest assembleDebug
# Conferir o aparelho autorizado antes de instalar:
adb devices
adb -s R9XXA0AHCEJ install -r app\build\outputs\apk\debug\app-debug.apk
```

Na configuração dedicada de FCM+emuladores, usar `build:mobile:dev`, não sobrescrever o destino com `--usb`. O celular usa os reverses9098/8877/5007 para esse ensaio; isso não pertence ao lançamento. Nunca desinstalar/limpar dados para atualizar com pendências.

## AAB futuro

Após decisão de identidade, configuração final autorizada, implantação validada e remoção deliberada dos guards nesta rodada futura:

```powershell
npm run android:release:validar
# Construir/sincronizar o destino final implementado e auditado nessa rodada.
# Na pasta android:
.\gradlew.bat bundleRelease
```

Hoje `bundleRelease` é intencionalmente bloqueado; não foi produzido um AAB fictício. Não basta mudar o nome de um APK ou usar assinatura debug. Validar AAB com bundletool/Play App Signing, instalar APKs derivados, conferir ambiente/certificado e regressão antes de envio.

## Guarda da chave — ação futura do titular

Definir responsável e recuperação; criar a chave somente sob autorização específica. Guardar backup criptografado em local separado do projeto e cópia controlada, testar recuperação, restringir acesso. Separar chave de upload da chave gerenciada pelo Play App Signing; registrar fingerprints públicos após geração e proteger as senhas em gerenciador seguro. Nunca incluir a chave em ZIP de revisão, Git ou APK. Não substituir chave existente sem examinar continuidade de atualizações.

## Atualização vigente — Firebase compartilhado aprovado

A decisão posterior de 24/10/2026 definiu ponto-app-1c55a como projeto comum ao APK final e PWA. App Android registrado, configuração por variante e build local preparados. As seções históricas acima sobre ausência de identidade/chave/projeto não representam mais esses campos. Ver [configuração atual, checks e bloqueios exatos](firebase-compartilhado.md). Permanece bloqueado o AAB até URLs/documentos, backend e acesso de revisão aprovados. Nenhum deploy foi executado nessa configuração.