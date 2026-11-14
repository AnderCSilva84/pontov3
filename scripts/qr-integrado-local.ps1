param([ValidateSet('emuladores', 'dados', 'usb')][string]$Etapa = 'emuladores')
$ErrorActionPreference = 'Stop'
$qrRaiz = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $qrRaiz
$env:AP1303_QR_LOCAL = 'true'
$env:GCLOUD_PROJECT = 'ap1303-android-push-teste'
$env:GOOGLE_CLOUD_PROJECT = $env:GCLOUD_PROJECT
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9098'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8877'
$qrNode = Join-Path $qrRaiz 'node_modules/node/bin/node.exe'
if (!(Test-Path -LiteralPath $qrNode)) { throw 'Node local não encontrado; nenhuma dependência será instalada.' }
switch ($Etapa) {
  'emuladores' {
    $qrFirebase = Join-Path $env:APPDATA 'npm/node_modules/firebase-tools/lib/bin/firebase.js'
    if (!(Test-Path -LiteralPath $qrFirebase)) { throw 'Firebase CLI local não encontrado; nenhuma instalação será feita.' }
    $qrJava = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot'
    if (!(Test-Path -LiteralPath (Join-Path $qrJava 'bin/java.exe'))) { throw 'Java 21 esperado não encontrado.' }
    $env:JAVA_HOME = $qrJava
    $env:PATH = "$qrJava\bin;$env:PATH"
    & $qrNode $qrFirebase emulators:start --only 'auth,firestore,functions' --project $env:GCLOUD_PROJECT --config firebase.compras-emulator.json
    if ($LASTEXITCODE -ne 0) { throw 'Emuladores não iniciaram corretamente. Não execute o seed.' }
  }
  'dados' {
    foreach ($qrPorta in @(9098, 8877, 5007)) {
      $qrCliente = [Net.Sockets.TcpClient]::new()
      try { $qrCliente.Connect('127.0.0.1', $qrPorta) }
      catch { throw "Emulador indisponível na porta $qrPorta. Execute primeiro a etapa emuladores." }
      finally { $qrCliente.Dispose() }
    }
    & $qrNode scripts/seed-compras-demo.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Seed interrompido. Não apague dados nem contas existentes para repetir.' }
  }
  'usb' {
    $qrAdb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
    if (!(Test-Path -LiteralPath $qrAdb)) { throw 'ADB não encontrado.' }
    foreach ($qrPorta in @(9098, 8877, 5007)) {
      & $qrAdb reverse "tcp:$qrPorta" "tcp:$qrPorta"
      if ($LASTEXITCODE -ne 0) { throw 'Conecte e autorize um único aparelho por USB antes de repetir.' }
    }
  }
}
