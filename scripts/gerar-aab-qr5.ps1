# Build local apenas. Nao publica, instala, cria chaves ou executa deploy.
$ErrorActionPreference = 'Stop'
$qrRaiz = Split-Path -Parent $PSScriptRoot
$qrAnteriorPasta = Get-Location
$qrNomes = @('AP1303_STORE_PASSWORD','AP1303_KEY_PASSWORD','JAVA_HOME','ANDROID_HOME','GRADLE_RO_DEP_CACHE')
$qrAntes = @{}
foreach ($qrNome in $qrNomes) { $qrAntes[$qrNome] = [Environment]::GetEnvironmentVariable($qrNome, 'Process') }
function ConverterSenhaLocal([Security.SecureString]$Valor) {
    $qrPonteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Valor)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($qrPonteiro) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($qrPonteiro) }
}
$qrSenhaStore = $null
$qrSenhaChave = $null
try {
    Set-Location -LiteralPath $qrRaiz
    $qrConfig = Get-Content -Raw android/release.local.json | ConvertFrom-Json
    if ($qrConfig.versionCode -ne 5 -or !$qrConfig.versionCodeDisponivel) { throw 'Codigo 5 nao esta aprovado na configuracao local.' }
    $qrDestino = Join-Path $qrRaiz 'output/Ta-no-Ponto-5-1.0.0.aab'
    if (Test-Path -LiteralPath $qrDestino) { throw 'AAB de destino ja existe; arquivo preservado.' }
    $qrNode = Join-Path $qrRaiz 'node_modules/node/bin/node.exe'
    $qrGradle = Join-Path $env:USERPROFILE '.gradle/wrapper/dists/gradle-8.14.3-all/10utluxaxniiv4wxiphsi49nj/gradle-8.14.3/bin/gradle.bat'
    $env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot'
    $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    $env:GRADLE_RO_DEP_CACHE = Join-Path $env:USERPROFILE '.gradle/caches'
    foreach ($qrArquivo in @($qrNode, $qrGradle, (Join-Path $env:JAVA_HOME 'bin/jarsigner.exe'))) {
        if (!(Test-Path -LiteralPath $qrArquivo)) { throw 'Ferramenta local ausente; nenhuma dependencia sera instalada.' }
    }
    if (!$env:AP1303_STORE_PASSWORD) {
        $qrSenhaStore = Read-Host 'Senha da keystore de upload (oculta)' -AsSecureString
        $env:AP1303_STORE_PASSWORD = ConverterSenhaLocal $qrSenhaStore
    }
    if (!$env:AP1303_KEY_PASSWORD) {
        $qrSenhaChave = Read-Host 'Senha da chave/alias de upload (oculta)' -AsSecureString
        $env:AP1303_KEY_PASSWORD = ConverterSenhaLocal $qrSenhaChave
    }
    & $qrNode scripts/android-release-validacao.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Validacao de release bloqueou a geracao. Nenhum bloqueio sera ignorado.' }
    Set-Location android
    & $qrGradle --offline --no-daemon '-Dorg.gradle.internal.instrumentation.agent=false' --max-workers=1 --gradle-user-home (Join-Path $qrRaiz 'output/qr-gradle-home') --project-cache-dir (Join-Path $qrRaiz 'output/qr-gradle-project-cache') '-Pap1303Assinatura=true' :app:validarChaveUpload :app:bundleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Gradle nao concluiu; nenhum AAB foi entregue.' }
    $qrAab = Join-Path $qrRaiz 'android/app/build/outputs/bundle/release/app-release.aab'
    & (Join-Path $env:JAVA_HOME 'bin/jarsigner.exe') -verify $qrAab
    if ($LASTEXITCODE -ne 0) { throw 'Verificacao de assinatura falhou.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $qrZip = [IO.Compression.ZipFile]::OpenRead($qrAab)
    try {
        if (!($qrZip.Entries.FullName -match '^META-INF/.*\.RSA$') -or !$qrZip.GetEntry('base/manifest/AndroidManifest.xml')) { throw 'Bundle sem estrutura ou assinatura esperada.' }
        $qrStampEntrada = $qrZip.GetEntry('base/assets/public/mobile-build.json')
        if (!$qrStampEntrada) { throw 'Stamp de ambiente ausente no bundle.' }
        $qrLeitor = [IO.StreamReader]::new($qrStampEntrada.Open())
        try { $qrStamp = $qrLeitor.ReadToEnd() | ConvertFrom-Json } finally { $qrLeitor.Dispose() }
        if ($qrStamp.destino -ne 'producao' -or $qrStamp.emuladores -or $qrStamp.host -or $qrStamp.projectId -ne 'ponto-app-1c55a') { throw 'Ambiente do AAB incorreto.' }
    } finally { $qrZip.Dispose() }
    Copy-Item -LiteralPath $qrAab -Destination $qrDestino
    Get-FileHash -LiteralPath $qrDestino -Algorithm SHA256
    Write-Host "AAB local gerado e verificado: $qrDestino"
    Write-Host 'Nada foi publicado. Nao envie para a Play antes da revisao final.'
} finally {
    if ($qrSenhaStore) { $qrSenhaStore.Dispose() }
    if ($qrSenhaChave) { $qrSenhaChave.Dispose() }
    foreach ($qrNome in $qrNomes) { [Environment]::SetEnvironmentVariable($qrNome, $qrAntes[$qrNome], 'Process') }
    Set-Location -LiteralPath $qrAnteriorPasta
}
