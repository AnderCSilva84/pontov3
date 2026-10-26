const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('nativo não toca SW, messaging, permissões ou rede; registro do shell web continua ativo',async()=>{
  let web=false,registros=0;
  const shell=fs.readFileSync('src/services/appShell.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
  const navegador={serviceWorker:{getRegistration:async()=>null,register:async()=>{registros++;return{ok:true};}}};
  const c={recursosWeb:()=>web,navigator:navegador};vm.createContext(c);vm.runInContext(shell,c);
  assert.equal(await c.registrarShell(),null);assert.equal(registros,0);
  web=true;await c.registrarShell();assert.equal(registros,1);
  let acessos=0;
  const proibido=()=>{acessos++;throw Error('Recurso web acessado no nativo');};
  const push=fs.readFileSync('src/services/push.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'').replace(/import\.meta\.env\.VITE_FIREBASE_VAPID_KEY/g,"''");
  const p={recursosWeb:()=>false,window:{},navigator:{},isSupported:proibido,getMessaging:proibido,httpsCallable:proibido,Notification:{requestPermission:proibido}};
  vm.createContext(p);vm.runInContext(push,p);
  assert.equal(await p.suportaPush(),false);await p.solicitarPermissaoPushNoLogin();await p.desativarPush();await p.observarPush('demo');
  await assert.rejects(p.registrarPush('demo'),/nativos/);await assert.rejects(p.testarPush(),/nativos/);assert.equal(acessos,0);
});
