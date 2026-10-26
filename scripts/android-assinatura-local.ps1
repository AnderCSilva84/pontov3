param([ValidateSet('chave','release','bundle','bundleLocal','apkLocal')][string]$Acao = 'chave')
# Credenciais DPAPI somente no processo. Nunca imprime segredos nem libera guards.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$segredo = Join-Path $env:USERPROFILE '.android-signing\ap1303\senha.dpapi'
if (!(Test-Path -LiteralPath $segredo)) { throw 'Senha protegida local não encontrada.' }
if ($env:AP1303_STORE_PASSWORD -or $env:AP1303_KEY_PASSWORD) {
    throw 'Execute em um processo sem credenciais de assinatura pré-carregadas.'
}
$secure = Get-Content -LiteralPath $segredo | ConvertTo-SecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $env:AP1303_STORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $env:AP1303_KEY_PASSWORD = $env:AP1303_STORE_PASSWORD
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $secure.Dispose()
}
try {
    if ($Acao -eq 'release') {
        Push-Location $raiz
        try { & (Join-Path $raiz 'node_modules\node\bin\node.exe') scripts/android-release-validacao.mjs }
        finally { Pop-Location }
    } else {
        $tarefa = if ($Acao -in @('bundle','bundleLocal')) { ':app:bundleRelease' } elseif ($Acao -eq 'apkLocal') { ':app:assembleRelease' } else { ':app:validarChaveUpload' }
        $argumentos = @('-p',(Join-Path $raiz 'android'),$tarefa,'-Pap1303Assinatura=true','--offline','--no-daemon','--console=plain')
        if ($Acao -in @('bundleLocal','apkLocal')) { $argumentos += '-Pap1303ArtefatoLocal=true' }
        # Windows PowerShell trata stderr informativo de processo nativo como erro.
        # O exit code continua obrigatório; não interromper antes de recebê-lo.
        $preferenciaAnterior = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            & (Join-Path $raiz 'android\gradlew.bat') @argumentos
        } finally { $ErrorActionPreference = $preferenciaAnterior }
    }
    if ($LASTEXITCODE -ne 0) { throw 'Verificação bloqueada; confira os requisitos acima. Não gerar outra chave nem desativar guards.' }
} finally {
    Remove-Item Env:AP1303_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:AP1303_KEY_PASSWORD -ErrorAction SilentlyContinue
}
