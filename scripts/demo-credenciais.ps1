param([ValidateSet('gerar','emulador')][string]$Acao='gerar',[ValidateSet('review','mobile')][string]$Ambiente='review')
$ErrorActionPreference='Stop'
$pasta=Join-Path $env:USERPROFILE 'BackupsSeguros\AP1303\revisao-play'
$arquivo=Join-Path $pasta 'credenciais.dpapi'
if($Acao -eq 'gerar'){
 if(Test-Path -LiteralPath $arquivo){Write-Host 'Credenciais existentes preservadas.';return}
 $null=New-Item -ItemType Directory -Path $pasta -Force
 $acl=Get-Acl -LiteralPath $pasta;$acl.SetAccessRuleProtection($true,$false)
 foreach($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User,(New-Object Security.Principal.SecurityIdentifier('S-1-5-18')))){
  $acl.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
 }
 Set-Acl -LiteralPath $pasta -AclObject $acl
 $c=@{};$rng=[Security.Cryptography.RandomNumberGenerator]::Create()
 try{foreach($role in @('admin','funcionario')){$bytes=New-Object byte[] 32;$rng.GetBytes($bytes);$c[$role]=@{email="ap1303-review-$role@example.test";senha=[Convert]::ToBase64String($bytes)}}}finally{$rng.Dispose()}
 $seguro=ConvertTo-SecureString ($c|ConvertTo-Json -Compress) -AsPlainText -Force
 try{[IO.File]::WriteAllText($arquivo,($seguro|ConvertFrom-SecureString))}finally{$seguro.Dispose();$c=$null}
 Write-Host 'Credenciais ficticias cifradas fora do repositorio. Nenhuma conta criada.'
 return
}
$projeto=if($Ambiente -eq 'mobile'){'ap1303-android-push-teste'}else{'demo-ap1303-review'}
$portaFirestore=if($Ambiente -eq 'mobile'){'127.0.0.1:8877'}else{'127.0.0.1:8894'}
$portaAuth=if($Ambiente -eq 'mobile'){'127.0.0.1:9098'}else{'127.0.0.1:9104'}
if($env:GCLOUD_PROJECT -ne $projeto -or $env:FIRESTORE_EMULATOR_HOST -ne $portaFirestore -or $env:FIREBASE_AUTH_EMULATOR_HOST -ne $portaAuth){throw 'Execute somente nos emuladores documentados.'}
$secure=Get-Content -LiteralPath $arquivo|ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$json=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$secure.Dispose()}
try{$json | & (Join-Path (Split-Path -Parent $PSScriptRoot) 'node_modules\node\bin\node.exe') (Join-Path $PSScriptRoot 'preparar-demo-play.cjs') '-';if($LASTEXITCODE -ne 0){throw 'Preparacao demo interrompida.'}}finally{$json=$null}
