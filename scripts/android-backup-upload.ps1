param(
    [Parameter(Mandatory=$true)][string]$Destino,
    [switch]$Verificar,
    [switch]$ValidarDestino
)
# Execute em terminal local interativo. Nunca informe senhas nos argumentos.
$ErrorActionPreference = 'Stop'
$pasta = [IO.Path]::GetFullPath($Destino).TrimEnd('\')
$repositorioProtegido = 'C:\Users\ander\projetos\app-ponto-3'
if ($pasta -eq $repositorioProtegido -or $pasta.StartsWith($repositorioProtegido + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Escolha um destino fora do repositorio.'
}
if (!(Test-Path -LiteralPath $pasta -PathType Container)) { throw 'O destino deve ser uma pasta existente.' }
$ancestral = Get-Item -LiteralPath $pasta
while ($null -ne $ancestral) {
    # Ha um marcador .git na raiz C: deste ambiente. Ele nao representa
    # o projeto AP1303 e nao deve bloquear toda a unidade autorizada.
    if ($null -ne $ancestral.Parent -and (Test-Path -LiteralPath (Join-Path $ancestral.FullName '.git'))) { throw 'Escolha um destino fora do repositorio.' }
    if ($ancestral.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Escolha uma pasta sem redirecionamentos ou links.' }
    $ancestral = $ancestral.Parent
}
if ($ValidarDestino) { Write-Host 'Destino fora do projeto e sem redirecionamentos: OK'; return }
$keytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\keytool.exe' } else { (Get-Command keytool -ErrorAction Stop).Source }
$arquivo = Join-Path $pasta 'ap1303-upload-portatil.p12'
$certificado = Join-Path $pasta 'ap1303-upload-publico.cer'
$esperado = 'D000F2D0DF9AC8DF6D0F1B1BCF2EA8F01C09F53E9C3DCFC837C9437691156734'
foreach ($nome in @('AP1303_BACKUP_SOURCE','AP1303_BACKUP_PASSWORD')) {
    if (Test-Path "Env:$nome") { throw 'Execute sem credenciais de backup pre-carregadas.' }
}
function TextoSeguro($seguro) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function ChaveTool([string[]]$Opcoes) {
    # keytool escreve mensagens informativas em stderr; nao as reproduzir.
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $saida = & $keytool @Opcoes 2>&1; $codigo = $LASTEXITCODE }
    finally { $ErrorActionPreference = $anterior }
    if ($codigo -ne 0) { throw 'keytool falhou. Confira senha, JDK e destino; nenhuma chave nova foi gerada.' }
    return ($saida | Out-String)
}
try {
    if (!$Verificar -and ((Test-Path -LiteralPath $arquivo) -or (Test-Path -LiteralPath $certificado))) {
        throw 'Destino ja contem backup/certificado. Nao sobrescrever; use -Verificar ou outra pasta.'
    }
    if ($Verificar -and !(Test-Path -LiteralPath $arquivo)) { throw 'Backup nao encontrado.' }
    $senha = Read-Host 'Senha propria do backup (guarde em gerenciador separado; minimo 16 caracteres)' -AsSecureString
    try { $env:AP1303_BACKUP_PASSWORD = TextoSeguro $senha } finally { $senha.Dispose() }
    if ($env:AP1303_BACKUP_PASSWORD.Length -lt 16) { throw 'Use pelo menos 16 caracteres.' }
    if (!$Verificar) {
        $confirmar = Read-Host 'Repita a senha do backup' -AsSecureString
        try { $igual = (TextoSeguro $confirmar) -ceq $env:AP1303_BACKUP_PASSWORD } finally { $confirmar.Dispose() }
        if (!$igual) { throw 'Senhas diferentes; backup nao criado.' }
        $origem = Join-Path $env:USERPROFILE '.android-signing\ap1303'
        $segura = Get-Content -LiteralPath (Join-Path $origem 'senha.dpapi') | ConvertTo-SecureString
        try { $env:AP1303_BACKUP_SOURCE = TextoSeguro $segura } finally { $segura.Dispose() }
        # Importa a MESMA chave para PKCS12 protegido pela senha portatil.
        $null = ChaveTool @('-importkeystore','-srckeystore',(Join-Path $origem 'ap1303-upload.p12'),'-srcstoretype','PKCS12','-srcstorepass:env','AP1303_BACKUP_SOURCE','-srcalias','ap1303-upload','-destkeystore',$arquivo,'-deststoretype','PKCS12','-deststorepass:env','AP1303_BACKUP_PASSWORD','-destkeypass:env','AP1303_BACKUP_PASSWORD','-destalias','ap1303-upload','-noprompt')
    }
    $lista = ChaveTool @('-J-Duser.language=en','-list','-v','-keystore',$arquivo,'-storetype','PKCS12','-storepass:env','AP1303_BACKUP_PASSWORD','-alias','ap1303-upload')
    if ($lista -notmatch 'PrivateKeyEntry') { throw 'Backup nao contem entrada de chave privada.' }
    # CSR local descartavel comprova que a senha recupera a chave privada.
    # Nao envia pedido de certificado nem altera o keystore.
    $prova = Join-Path $pasta ('prova-' + [Guid]::NewGuid().ToString('N') + '.csr')
    try {
        $null = ChaveTool @('-certreq','-keystore',$arquivo,'-storepass:env','AP1303_BACKUP_PASSWORD','-keypass:env','AP1303_BACKUP_PASSWORD','-alias','ap1303-upload','-file',$prova)
    } finally { if (Test-Path -LiteralPath $prova) { Remove-Item -LiteralPath $prova } }
    $temporario = Join-Path $pasta ('certificado-' + [Guid]::NewGuid().ToString('N') + '.cer')
    try {
        $null = ChaveTool @('-exportcert','-keystore',$arquivo,'-storepass:env','AP1303_BACKUP_PASSWORD','-alias','ap1303-upload','-file',$temporario)
        if ((Get-FileHash -LiteralPath $temporario -Algorithm SHA256).Hash -ne $esperado) { throw 'Certificado diferente da chave aprovada.' }
        if (!$Verificar) { [IO.File]::Copy($temporario, $certificado, $false) }
    } finally { if (Test-Path -LiteralPath $temporario) { Remove-Item -LiteralPath $temporario } }
    $recibo = [ordered]@{
        verificadoEm = [DateTime]::UtcNow.ToString('o')
        modo = $(if ($Verificar) { 'verificacao-independente-dpapi' } else { 'criacao-e-verificacao' })
        certificadoSha256 = $esperado
        backupSha256 = (Get-FileHash -LiteralPath $arquivo -Algorithm SHA256).Hash
        alias = 'ap1303-upload'
        chavePrivadaTestada = $true
        copiaExterna = 'pendente'
        testeOutroComputador = 'pendente'
    }
    [IO.File]::WriteAllText((Join-Path $pasta 'verificacao-backup.json'), ($recibo | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    Write-Host 'Backup PKCS12 conferido: chave privada presente e certificado aprovado.'
    Write-Host 'Para recuperar em outro computador: use este PKCS12, alias ap1303-upload e a senha propria do backup. DPAPI nao e necessario.'
    Write-Host 'Guarde a senha em gerenciador acessivel fora deste Windows, separado do backup. Teste novamente com -Verificar.'
} finally {
    Remove-Item Env:AP1303_BACKUP_SOURCE -ErrorAction SilentlyContinue
    Remove-Item Env:AP1303_BACKUP_PASSWORD -ErrorAction SilentlyContinue
}
