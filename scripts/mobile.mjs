import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {loadEnv} from 'vite';
import {resolverAmbiente} from '../src/utils/ambiente.js';

const require = createRequire(import.meta.url);
// Binário versionado no lockfile; não altera Node/PATH globais.
const node = process.platform === 'win32' ? 'node_modules/node/bin/node.exe' : 'node_modules/node/bin/node';
const [acao,plataforma] = process.argv.slice(2);
const env = {...loadEnv('mobile',process.cwd(),'VITE_'),...Object.fromEntries(Object.entries(process.env).filter(([k])=>k.startsWith('VITE_')))};
if(process.argv.includes('--usb')) {
  delete env.VITE_TEST_FIREBASE_EMULADORES;
  delete process.env.VITE_TEST_FIREBASE_EMULADORES;
  Object.assign(env,{VITE_AP1303_DESTINO:'emuladores',VITE_EMULATOR_HOST:'127.0.0.1'});
  Object.assign(process.env,{VITE_AP1303_DESTINO:'emuladores',VITE_EMULATOR_HOST:'127.0.0.1'});
}
function executar(script,args=[]) {
  const r=spawnSync(node,[script,...args],{stdio:'inherit',env:process.env});
  if(r.error)throw r.error;
  if(r.status!==0)process.exit(r.status||1);
}
if(!existsSync(node))throw Error('Execute npm ci para instalar o Node 22 local.');
if(acao==='build'){
  resolverAmbiente(env,'mobile');
  executar('node_modules/vite/bin/vite.js',['build','--mode','mobile']);
} else if(['sync','add','open'].includes(acao)) {
  if(!['android','ios'].includes(plataforma))throw Error('Informe android ou ios.');
  const ambiente=resolverAmbiente(env,'mobile');
  const stamp=JSON.parse(readFileSync('dist/mobile-build.json','utf8'));
  if(stamp.destino!==ambiente.destino||stamp.projectId!==ambiente.config.projectId||stamp.host!==ambiente.host||Boolean(stamp.emuladores)!==ambiente.emuladores)throw Error('Assets não correspondem ao ambiente. Execute npm run build:mobile:dev.');
  if(plataforma==='android'&&acao==='sync'){
    const pasta='android/app/src/debug/res/xml';mkdirSync(pasta,{recursive:true});
    writeFileSync(pasta+'/ap1303_network_security.xml',`<?xml version="1.0" encoding="utf-8"?><network-security-config><base-config cleartextTrafficPermitted="false"/>${ambiente.emuladores?`<domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">${ambiente.host}</domain></domain-config>`:''}</network-security-config>`);
  }
  executar(require.resolve('@capacitor/cli/bin/capacitor'),[acao,plataforma]);
} else throw Error('Use build, sync/add/open android|ios.');
