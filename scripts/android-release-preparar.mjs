import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync,rmSync,readdirSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadEnv} from 'vite';
import {resolverAmbiente} from '../src/utils/ambiente.js';

// Apenas build local. Nao inicializa Firebase, faz deploy ou usa Admin SDK.
const ler=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const c=ler('android/release.local.json');
if(c.applicationId!=='br.dev.acstech.ap1303'||c.versionName!=='1.0.0'||!Number.isSafeInteger(c.versionCode)||c.versionCode<1||!c.versionCodeDisponivel||c.firebaseProjectId!=='ponto-app-1c55a'||!c.identidadeAprovada)throw Error('Identidade/destino divergente da decisão aprovada.');
const env={...loadEnv('mobile-release',process.cwd(),'VITE_'),VITE_AP1303_DESTINO:'producao'};
delete env.VITE_EMULATOR_HOST;
delete env.VITE_TEST_FIREBASE_EMULADORES;
const ambiente=resolverAmbiente(env,'mobile-release');
const google=ler('android/app/google-services.release.json');
if(google.project_info.project_id!==ambiente.config.projectId||!google.client.some(x=>x.client_info.android_client_info.package_name===c.applicationId))throw Error('Firebase nativo não corresponde ao projeto/package aprovado.');
const node=resolve('node_modules/node/bin/'+(process.platform==='win32'?'node.exe':'node'));
const resultado=spawnSync(node,['node_modules/vite/bin/vite.js','build','--mode','mobile-release','--outDir','dist-android-release'],{stdio:'inherit',env:{...process.env,...env}});
if(resultado.status!==0)process.exit(resultado.status||1);
const pasta=resolve('android/app/src/release/assets');
mkdirSync(pasta,{recursive:true});
// Exclui somente assets gerados deste destino fixo, sem tocar em main/debug.
const publicos=resolve(pasta,'public');
if(!publicos.startsWith(resolve('android/app/src/release/assets')+sep))throw Error('Destino de assets fora da pasta release.');
if(existsSync(publicos))rmSync(publicos,{recursive:true});
const documentosPendentes=new Set(['privacidade','suporte','excluir-conta']);
mkdirSync(publicos,{recursive:true});
for(const nome of readdirSync('dist-android-release')) {
  if(['firebase-messaging-sw.js','manifest.json','app-shell-manifest.js','vite.svg'].includes(nome))continue;
  if(c.privacidadeAprovada!==true&&documentosPendentes.has(nome))continue;
  cpSync(resolve('dist-android-release',nome),resolve(publicos,nome),{recursive:true});
}
if(existsSync(resolve(publicos,'firebase-messaging-sw.js')))throw Error('Worker web indevido no pacote da loja.');
const config={...ler('capacitor.config.json'),appId:c.applicationId,webDir:'dist-android-release'};
writeFileSync(pasta+'/capacitor.config.json',JSON.stringify(config,null,2));
// Mesmo conjunto de plugins nativos ja sincronizado/compilado no projeto.
cpSync('android/app/src/main/assets/capacitor.plugins.json',pasta+'/capacitor.plugins.json');
writeFileSync('capacitor.release.local.json',JSON.stringify(config,null,2));
mkdirSync('android/app/src/release',{recursive:true});
writeFileSync('android/app/src/release/google-services.json',JSON.stringify(google,null,2));
console.log('Assets/configuração final preparados separadamente. Homologação e validação de release continuam obrigatórias.');
