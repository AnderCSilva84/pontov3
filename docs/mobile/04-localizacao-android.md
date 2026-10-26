# Localização do ponto no Android — 22/10/2026

> Continuação em 23/10/2026: [complemento do Script 10 — localização real](10-complemento-gps-real.md). O gesto com rede foi reproduzido; houve timeout nativo sem rede, e o ensaio em área aberta não estava disponível. O ciclo físico offline completo continua pendente. Este relatório histórico foi preservado.

Implementação local sobre Scripts02/03 e correção do cadastro. Branch `feat/ponto-operacoes-offline`; alterações anteriores preservadas. Sem deploy, commit, push, migração, mudança de conta real ou configuração de produção. APK continua em `demo-ap1303`, host127.0.0.1, Auth9098/Firestore8877/Functions5007, via USB/reverse conforme documento03.

## Causa confirmada

O AndroidManifest e o APK instalado anterior declaravam somente INTERNET (além da permissão interna gerada pelo AndroidX). `adb shell dumpsys package br.dev.acstech.ap1303.dev` não continha ACCESS_COARSE_LOCATION nem ACCESS_FINE_LOCATION. O código ativo era exclusivamente `navigator.geolocation`, sem plugin nativo nem pedido runtime de localização Android. Isso explica a ausência de autorização editável no Android. O aparelho estava com `location_mode=3` (serviço ligado), portanto não se atribuiu a falha inicial a GPS desligado. Não foi inventado um erro de log inexistente: a evidência inicial foi manifest/serviço/configuração observados.

## Correção e fontes

- `@capacitor/geolocation` **8.2.4** exato, peer Capacitor>=8, compatível com core8.5.3/Java21/AGP8.13. Plugin oficial MIT, sem licença paga/conta/chave de API. Dependência JS `@capacitor/synapse`1.0.4 (ISC) apenas expõe a ponte de plugins; código consultado não faz requisições/analytics. Dependência nativa IONGeolocationLib Android2.2.2 é MIT. Google Play Services Location é usado para obter a posição, sem integração Google Maps paga.
- `android/app/src/main/AndroidManifest.xml`: apenas COARSE e FINE para localização durante uso. Nenhum ACCESS_BACKGROUND_LOCATION, foreground service de localização, hardware obrigatório ou tracking foi adicionado. O manifest empacotado foi conferido com aapt.
- `src/utils/localizacao.js`: ponto de entrada central que escolhe o plugin no nativo e mantém navigator.geolocation e os dois prazos limitados preexistentes no PWA. Import do plugin é tardio, no gesto do ponto; login/inicialização não pedem localização.
- `src/utils/localizacaoNativa.js`: adapter sem dependência de Firebase, com uma única aquisição em andamento, check/request de permissão e getCurrentPosition pontual. Precisão alta, maximumAge0, timeout10s nativo e proteção JS de10,5s se o plugin não responder. Não usa watchPosition, loop, polling ou monitoramento.
- `src/pages/Ponto.jsx`: mantém o gesto existente, apresenta erro específico e orientação expansível para as configurações. Sem abertura forçada de configurações ou novo plugin para isso.
- Testes em `tests/localizacao-nativa.test.js`; testes PWA existentes preservados. O email fictício de `tests/ponto-operacoes-emulador.test.cjs` passou a usar UUID para evitar colisão ao executar novamente com Auth Emulator ainda ativo. Não se afrouxou nenhuma asserção/geofence.
- `package.json`/lock e arquivos Android de registro do plugin atualizados pelo sync. Nenhuma atualização ampla das demais dependências; audit permaneceu com4altos/3moderados já documentados.

Fontes oficiais: [Geolocation Capacitor8](https://capacitorjs.com/docs/apis/geolocation), [licença do plugin](https://github.com/ionic-team/capacitor-geolocation/blob/main/LICENSE), [licença ION Android](https://github.com/ionic-team/IONGeolocationLib-Android/blob/main/LICENSE). Foram também lidos o manifest, código Kotlin e definições da versão8.2.4 instalada.

## Permissões e falhas

O primeiro toque em registrar consulta a permissão e, se necessário, solicita o alias location (COARSE+FINE). Só uma solicitação ocorre por gesto; recusa não gera retry automático.

| Situação | Comportamento |
|---|---|
| Precisa concedida | Obtém uma amostra pontual e segue o contrato existente |
| Somente aproximada | Explica como habilitar “Usar localização precisa”; não inventa precisão/coordenadas nem envia ponto com aproximação inadequada ao geofence |
| Recusa no diálogo | Orienta permitir durante o uso; sem novo pedido automático |
| Recusa permanente/restrição | Permissão denied leva diretamente à orientação de configurações, sem repetir diálogo |
| Serviço desligado/configuração recusada | Mensagem para ativar Localização do Android e tentar por novo gesto |
| Timeout | Libera a interface, orienta melhorar sinal e tentar novamente; não salva operação sem amostra |
| Google Play Services/fix indisponível | Mensagem de indisponibilidade, sem confundir com geofence |
| Permissões ausentes no manifest | Orientação de atualizar APK, sem loop de pedidos |
| Localização obtida, porém fora do local | Resultado do backend continua separado nas Tentativas e pendências: rejeitada/fora do local autorizado |

Há mapeamento dos códigos nativos0003/0007/0008/0009/0010/0014–0018. A precisão da permissão não garante um fix com poucos metros; a accuracy real segue na amostra. Não se mudou o critério de autorização do backend.

## Contrato e integridade

O adapter devolve latitude/longitude/accuracy/timestamp nativos, sem registrar coordenadas nos logs. `criarOperacaoPonto` continua mapeando accuracy→precisaoMetros e timestamp→instanteMs, com o mesmo UUID/payload. A fila salva somente depois de obter amostra válida; reenvios usam o payload já salvo, sem consultar o GPS novamente. Não foram alterados serviços do backend, locais, raios, regras ou estados de confirmação. Uma falha de permissão não produz marcação ou pendência com coordenada fictícia.

## Testes executados

- Lint aprovado.
- Unitários: **138 contabilizados,121aprovados,17condicionais ignorados,0falhas**. Incluem PWA, pedido runtime, recusa sem retry, aproximada, bloqueio, serviço desligado, erro de Play Services, timeout/proteção de callback, amostra inválida e compartilhamento da aquisição em andamento.
- Backend em emuladores, projeto demo isolado para a execução: **12aprovados,0falhas/ignorados**, incluindo fora do raio, idempotência e preservação do payload. Execuções iniciais sobre fixtures reutilizadas falharam por registros anteriores/email fictício repetido; a execução isolada, com email único, passou. Não houve alteração de dados de produção ou limpeza da fila do usuário para fazer testes passarem.
- Build web aprovado, build mobile USB aprovado, sync Android aprovado, assembleDebug aprovado.
- Android físico Samsung SM-A057M: instalado com `adb install -r`, sem apagar dados, mantidos os três reverse e ambiente demo. Foi usada funcionária fictícia criada no grupo demo por callable autenticado, sem atribuir local permitido nem ampliar raio.
- No aparelho: o gesto de registrar obteve localização nativa e o backend respondeu **“Você está fora do local autorizado.”** Como a funcionária fictícia não tem locais permitidos, é a rejeição esperada; não é uma marcação oficial bem-sucedida e não é erro de permissão. Nenhuma coordenada real foi copiada para cadastro de local para autorizar a marcação.
- Para conferir o pedido runtime, foram revogadas somente as permissões do AP1303 de teste (sem limpar seus dados), reaberto o app e acionado Registrar Entrada. O Android exibiu **“Permitir que o app AP1303 acesse a localização deste dispositivo?”**, com opções Exata/Aproximada/Durante o uso do app/Apenas esta vez/Não permitir. Foi selecionada Exata + Durante o uso; dumpsys confirmou FINE/COARSE granted=true. O novo gesto voltou a obter amostra e receber a recusa de local do backend, sem erro GPS. O app ficou novamente com permissão durante uso/precisa.

Evidências locais ignoradas no Git: `output/mobile-auth/gps-permissao.png` e `gps-resultado.png`. Testes no aparelho usaram a interface real da WebView/diálogo Android por ferramentas de depuração; não foram coordenadas simuladas. Conteúdo da amostra não foi impresso em logs de teste.

Pendências físicas: recusa permanente e aproximada selecionada no aparelho, GPS global desligado, timeout em ambiente de sinal ruim e marcação aceita em local já cadastrado legitimamente. Esses ramos foram testados com plugin simulado onde indicado, não anunciados como execução física. iPhone/iOS não foi sincronizado/compilado/testado nesta rodada: a integração nativa exige revisar descrições Info.plist e ensaio no Mac antes de usar localização nessa plataforma. PWA foi coberto por testes/build; não houve nova validação GPS física no navegador.

## Reproduzir e instalar

Manter os três emuladores ativos com Node24 e projeto explícito, conforme documento03. Na raiz:

```powershell
npm run build:mobile:usb
npm run cap:sync:android:usb
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
Set-Location android
.\gradlew.bat :app:assembleDebug --console=plain
Set-Location ..
adb reverse tcp:9098 tcp:9098
adb reverse tcp:8877 tcp:8877
adb reverse tcp:5007 tcp:5007
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Entrar com conta de funcionária demo, abrir Ponto, tocar Registrar Entrada e escolher Durante o uso + Exata. Se houver recusa/serviço desligado, conferir orientação, corrigir manualmente e tocar novamente. Se o resultado for fora do local autorizado, conferir o local cadastrado no ambiente demo; não aumentar raio para contornar a validação. Não usar conta administrativa para gerar ponto da funcionária. Continuam pendentes os demais testes do piloto offline descritos no Script02/03.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`, ID provisório br.dev.acstech.ap1303.dev, assinatura debug. Este artefato substitui o APK USB anterior sem plugin; usar o hash da nova conferência, não o hash antigo do documento03.

Conferência final: `apksigner verify` aprovado, aapt confirmou somente COARSE/FINE para localização, sem BACKGROUND_LOCATION/foreground service. SHA-256 **9B3137D1DC459F08A19AFA2DB5E41FEC06ED842C3C29DAB190B4B9C69B39A107**, tamanho **9.961.258bytes** medido em disco. APK final instalado com sucesso no aparelho usando install-r. `git diff --check` aprovado. Nenhum log de coordenadas foi adicionado pelo adapter/interface.

## Custos

Nenhum serviço pago, chave de API, assinatura, Scheduler, TTL, índice, listener ou leitura Firestore foi adicionado para localização. Consulta de permissão e aquisição são locais no gesto; usam bateria e eventualmente serviços/rede de localização do sistema. O plugin acrescenta JS/bibliotecas nativas, tamanho do APK e downloads de build, sem cobrança recorrente do plugin. Não há localização contínua/em segundo plano.

Falha antes da amostra:0Functions/0leituras/0escritas de ponto. Após amostra, o envio usa o fluxo anterior do Script02; não há consulta remota nova. Replay consulta o recibo, sem nova captura GPS ou log de marcação. Permanecem as contagens estimadas da seção8 do documento03, com custos preexistentes de UI/gatilhos separados. Não houve medição de fatura nem promessa de custo zero.
