import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import process from 'node:process';

// Valida somente arquivos locais. Não inicializa SDK, não consulta rede e não habilita release.
export function validarConfiguracaoRelease(c,{capacitor={},stamp={},google={},assinatura={},arquivoExiste=existsSync,env={},somenteArtefato=false}={}){
 const erros=[];
 const exigir=(ok,mensagem)=>{if(!ok)erros.push(mensagem);};
 const texto=v=>typeof v==='string'&&v.trim().length>0&&!/exemplo|example|placeholder|definir|pendente/i.test(v);
 const https=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^\d+(?:\.\d+){3}$/.test(u.hostname)&&!u.hostname.startsWith('[')&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.test')&&!u.hostname.endsWith('.example')&&texto(v);}catch{return false;}};
 exigir(texto(c.nomePublico),'Definir nome público.');
 exigir(texto(c.applicationId)&&/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(c.applicationId)&&!/(?:\.dev|\.debug|\.test|\.teste)$/.test(c.applicationId),'Definir applicationId definitivo, diferente do pacote debug.');
 exigir(texto(c.versionName)&&/^\d+\.\d+\.\d+$/.test(c.versionName),'Definir versionName de lançamento.');
 exigir(Number.isSafeInteger(c.versionCode)&&c.versionCode>0,'Definir versionCode positivo e conferir disponibilidade no Play Console.');
 exigir(c.versionCodeDisponivel===true,'Confirmar no Play Console que o versionCode aprovado ainda não foi utilizado.');
 exigir(texto(c.firebaseProjectId)&&!/(demo-|teste|test)/i.test(c.firebaseProjectId),'Definir projeto Firebase final aprovado pelo titular.');
 if(!somenteArtefato)for(const campo of ['suporteUrl','privacidadeUrl','exclusaoUrl','recuperacaoUrl'])exigir(https(c[campo]),'Definir URL HTTPS pública: '+campo+'.');
 exigir(c.identidadeAprovada===true,'Identidade precisa de aprovação explícita do titular.');
 if(!somenteArtefato)exigir(c.privacidadeAprovada===true,'Documentos de privacidade precisam de aprovação explícita do titular.');
 exigir(c.backendAndroidValidado===true,'Validar os contratos Android no backend final; publicação do PWA não comprova compatibilidade.');
 exigir(c.acessoRevisaoValidado===true,'Validar acesso demonstrativo remoto sem USB, dados reais ou bypass público de geofence.');
 exigir(capacitor.appId===c.applicationId,'Capacitor precisa corresponder à identidade final autorizada.');
 exigir(!capacitor.server?.url&&!capacitor.server?.allowNavigation,'Remover navegação remota/server.url do pacote.');
 exigir(capacitor.android?.allowMixedContent===false,'Mixed content deve continuar desabilitado.');
 exigir(stamp.destino==='producao'&&stamp.emuladores===false&&!stamp.host&&stamp.projectId===c.firebaseProjectId,'Assets não são de lançamento: destino, projeto e ausência de emuladores precisam corresponder.');
 exigir(google.project_info?.project_id===c.firebaseProjectId&&google.client?.some(x=>x.client_info?.android_client_info?.package_name===c.applicationId),'Configuração Firebase Android final ausente ou divergente.');
 exigir(texto(assinatura.storeFile)&&arquivoExiste(assinatura.storeFile),'Keystore de upload autorizada não disponível localmente.');
 exigir(texto(assinatura.keyAlias),'Alias de assinatura não configurado.');
 exigir(c.assinaturaAprovada===true,'Uso/geração da chave de upload exige autorização específica do titular.');
 const fingerprint=String(assinatura.certificadoSha256||'').replaceAll(':','').toLowerCase();
 exigir(/^[a-f0-9]{64}$/.test(fingerprint),'Registrar SHA-256 público do certificado de upload verificado localmente.');
 exigir(!/(?:^|[\\/])debug\.keystore$/i.test(assinatura.storeFile||'')&&assinatura.keyAlias!=='androiddebugkey'&&fingerprint!=='6a4b3f5f402f9e72415f5aa50511d408651152c3e1a01880b3ad790ed461ea06','Assinatura Android Debug não pode ser usada como chave de upload final.');
 exigir(!!env.AP1303_STORE_PASSWORD&&!!env.AP1303_KEY_PASSWORD,'Credenciais de assinatura precisam de variáveis locais (valores nunca são exibidos).');
 return erros;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const ler=p=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):{};
 try{
  const somenteArtefato=process.argv.includes('--artefato-local');
  if(somenteArtefato)console.error('ARTEFATO LOCAL: documentos pendentes não autorizam distribuição ou submissão à Play.');
  const erros=validarConfiguracaoRelease(ler('android/release.local.json'),{capacitor:ler('android/app/src/release/assets/capacitor.config.json'),stamp:ler('android/app/src/release/assets/public/mobile-build.json'),google:ler('android/app/src/release/google-services.json'),assinatura:ler('android/signing.local.json'),env:process.env,somenteArtefato});
  for(const erro of erros)console.error('BLOQUEIO: '+erro);
  process.exitCode=erros.length?1:0;
 }catch{console.error('BLOQUEIO: arquivo local inválido; confira o formato sem compartilhar seu conteúdo.');process.exitCode=1;}
}
