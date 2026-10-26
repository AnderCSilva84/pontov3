import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Capacitor} from '@capacitor/core';
import {resolverAmbiente,prefixosCliente} from '../src/utils/ambiente.js';
import {recursosWeb} from '../src/services/plataforma.js';
import {conectarCicloMobile} from '../src/services/cicloMobile.js';

test('build mobile limita variáveis públicas aos prefixos do destino; PWA conserva VITE_',()=>{
 const mobile=prefixosCliente('mobile');
 for(const chave of ['VITE_TEST_FIREBASE_API_KEY','VITE_AP1303_DESTINO','VITE_EMULATOR_HOST'])assert.ok(mobile.some(p=>chave.startsWith(p)));
 assert.equal(mobile.some(p=>'VITE_FIREBASE_API_KEY'.startsWith(p)),false);
 assert.equal(prefixosCliente('production'),'VITE_');assert.equal(prefixosCliente('development'),'VITE_');
});

test('mobile exige destino explícito, rejeita produção e não herda credenciais web',()=>{
  const prod={VITE_FIREBASE_PROJECT_ID:'ponto-app-1c55a',VITE_FIREBASE_API_KEY:'exemplo-publico'};
  assert.throws(()=>resolverAmbiente(prod,'mobile'),/explícito/);
  assert.throws(()=>resolverAmbiente({...prod,VITE_AP1303_DESTINO:'producao'},'mobile'),/inválido/);
  assert.throws(()=>resolverAmbiente({...prod,VITE_AP1303_DESTINO:'teste'},'mobile'),/dedicado/);
  assert.throws(()=>resolverAmbiente({VITE_AP1303_DESTINO:'emuladores'},'mobile'),/HOST/);
  const demo=resolverAmbiente({...prod,VITE_AP1303_DESTINO:'emuladores',VITE_EMULATOR_HOST:'10.0.2.2'},'mobile');
  assert.equal(demo.config.projectId,'demo-ap1303');assert.equal(demo.config.apiKey,'demo-key');assert.equal(demo.host,'10.0.2.2');
  assert.equal(resolverAmbiente(prod,'production').config.projectId,prod.VITE_FIREBASE_PROJECT_ID);
  assert.equal(resolverAmbiente({},'compras-test').host,'127.0.0.1');
});
test('mobile aceita projeto dedicado somente com configuração própria completa',()=>{
  const env={VITE_AP1303_DESTINO:'teste',VITE_TEST_FIREBASE_PROJECT_ID:'ap1303-teste-exemplo',VITE_TEST_FIREBASE_API_KEY:'public-example',VITE_TEST_FIREBASE_APP_ID:'test-app',VITE_TEST_FIREBASE_AUTH_DOMAIN:'test.example'};
  assert.equal(resolverAmbiente(env,'mobile').destino,'teste');
  for(const p of ['ponto-app-1c55a','demo-ap1303'])assert.throws(()=>resolverAmbiente({...env,VITE_TEST_FIREBASE_PROJECT_ID:p},'mobile'));
});

test('FCM dedicado pode usar os três emuladores sem misturar identidades nem herdar produção',()=>{
  const env={VITE_AP1303_DESTINO:'teste',VITE_TEST_FIREBASE_PROJECT_ID:'ap1303-teste-exemplo',VITE_TEST_FIREBASE_API_KEY:'public-example',VITE_TEST_FIREBASE_APP_ID:'test-app',VITE_TEST_FIREBASE_AUTH_DOMAIN:'test.example'};
  const remoto=resolverAmbiente(env,'mobile');assert.equal(remoto.emuladores,false);
  const local=resolverAmbiente({...env,VITE_TEST_FIREBASE_EMULADORES:'true',VITE_EMULATOR_HOST:'127.0.0.1'},'mobile');
  assert.equal(local.emuladores,true);assert.equal(local.config.projectId,env.VITE_TEST_FIREBASE_PROJECT_ID);assert.notEqual(local.config.apiKey,'demo-key');
  assert.throws(()=>resolverAmbiente({...env,VITE_TEST_FIREBASE_EMULADORES:'true'},'mobile'),/HOST/);
  assert.throws(()=>resolverAmbiente({...env,VITE_TEST_FIREBASE_EMULADORES:'sim'},'mobile'),/flag/);
  assert.throws(()=>resolverAmbiente({VITE_AP1303_DESTINO:'producao',VITE_TEST_FIREBASE_EMULADORES:'true'}),/flag/);
  assert.throws(()=>resolverAmbiente({...env,VITE_TEST_FIREBASE_EMULADORES:'true',VITE_TEST_FIREBASE_PROJECT_ID:'ponto-app-1c55a',VITE_EMULATOR_HOST:'127.0.0.1'},'mobile'),/dedicado/);
  assert.equal(resolverAmbiente({VITE_AP1303_DESTINO:'emuladores',VITE_EMULATOR_HOST:'127.0.0.1'},'mobile').emuladores,true);
  const fonte=readFileSync('src/services/firebase.js','utf8');assert.match(fonte,/if \(ambiente.emuladores\)/);
  for(const sdk of ['connectAuthEmulator','connectFirestoreEmulator','connectFunctionsEmulator'])assert.match(fonte,new RegExp(sdk+'\\('));
});

test('inicialização conecta Auth, Firestore e Functions locais do mesmo app; web remoto não é redirecionado',()=>{
  assert.match(readFileSync('src/services/auth.js','utf8'),/if \(ambiente.emuladores\) connectAuthEmulator\(secondaryAuth/);
  const fonte=readFileSync('src/services/firebase.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'').replace('resolverAmbiente(import.meta.env, import.meta.env.MODE)','__ambiente');
  for(const local of [false,true]){
    const chamadas=[],app={},servicos={};
    const c={__ambiente:{config:{projectId:'ap1303-teste-exemplo'},emuladores:local,host:'127.0.0.1'},initializeApp:config=>{assert.equal(config.projectId,'ap1303-teste-exemplo');return app;}};
    for(const [get,connect,nome] of [['getAuth','connectAuthEmulator','auth'],['getFirestore','connectFirestoreEmulator','firestore'],['getFunctions','connectFunctionsEmulator','functions']]){
      servicos[nome]={};c[get]=a=>{assert.equal(a,app);return servicos[nome];};c[connect]=(s,host,opcao)=>{assert.equal(s,servicos[nome]);if(nome==='auth')assert.equal(opcao.disableWarnings,true);chamadas.push([nome,host,nome==='auth'?null:opcao]);};
    }
    runInNewContext(fonte,c);
    assert.deepEqual(chamadas,local?[['auth','http://127.0.0.1:9098',null],['firestore','127.0.0.1',8877],['functions','127.0.0.1',5007]]:[]);
  }
});
test('plataforma nativa recusa recursos web sem alterar o comportamento do navegador',()=>{
  const original=Capacitor.isNativePlatform;
  try{Capacitor.isNativePlatform=()=>true;assert.equal(recursosWeb(),false);Capacitor.isNativePlatform=()=>false;assert.equal(recursosWeb(),true);}finally{Capacitor.isNativePlatform=original;}
});
test('ciclo remove inclusive listeners resolvidos após desmontagem; Voltar respeita modal e raiz',async()=>{
  const fns={},removidos=[];let voltou=0,minimizou=0,retomou=0,cancelou=0;
  const app={addListener:async(n,fn)=>{fns[n]=fn;return{remove:()=>removidos.push(n)};},minimizeApp:()=>minimizou++};
  let modal=null;
  const janela={dispatchEvent:e=>{if(e.type==='ap1303-retomar')retomou++;return true;},history:{back:()=>voltou++}};
  const documento={querySelectorAll:()=>modal?[modal]:[],querySelector:()=>null};
  const fechar=conectarCicloMobile({app,janela,documento});await Promise.resolve();
  fns.appStateChange({isActive:false});assert.equal(retomou,0);
  fns.appStateChange({isActive:true});assert.equal(retomou,1);
  modal={dispatchEvent:e=>{assert.equal(e.type,'cancel');cancelou++;return false;}};
  fns.backButton({canGoBack:true});assert.equal(cancelou,1);assert.equal(voltou,0);
  modal=null;fns.backButton({canGoBack:true});assert.equal(voltou,1);
  fns.backButton({canGoBack:false});assert.equal(minimizou,1);
  fechar();fns.appStateChange({isActive:true});assert.equal(retomou,1);assert.equal(removidos.length,2);
  const fecharAntes=conectarCicloMobile({app,janela,documento});fecharAntes();await Promise.resolve();assert.equal(removidos.length,4);
});
test('configuração local sem navegação ampla; SW e push têm guarda antes de inicializar',()=>{
  const config=JSON.parse(readFileSync('capacitor.config.json','utf8'));
  assert.equal(config.webDir,'dist');assert.equal(config.server.url,undefined);assert.equal(config.server.allowNavigation,undefined);assert.equal(config.android.allowMixedContent,false);
  const push=readFileSync('src/services/push.js','utf8'),shell=readFileSync('src/services/appShell.js','utf8');
  assert.match(push,/export async function solicitarPermissaoPushNoLogin\(\) \{\s+if \(!recursosWeb\(\)\) return;/);
  assert.match(push,/recursosWeb\(\) && window.isSecureContext/);
  assert.match(shell,/if\(!recursosWeb\(\)\|\|/);
});
