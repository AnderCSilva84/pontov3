const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const fonte=p=>fs.readFileSync(p,'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];?/g,'').replace(/export /g,'');
test('reautenticação negada ou sessão trocada não iniciam solicitação',async()=>{
  let chamadas=0;const user={uid:'demo-a',email:'demo@example.test',providerData:[{providerId:'password'}],getIdToken:async()=>{}};
  const c={listarTentativasTitular:()=>[],reconciliarTerminaisConta:async()=>{},auth:{currentUser:user},functions:{},EmailAuthProvider:{credential:()=>({})},reauthenticateWithCredential:async()=>{throw{code:'auth/invalid-credential'};},httpsCallable:()=>async()=>{chamadas++;return{data:{}};},criarRecuperacaoSenha:()=>{},sendPasswordResetEmail:()=>{},obterGrupoAtual:()=>null,escopoPonto:()=>'',filaPonto:{listar:async()=>[]},resumirPendencias:()=>({})};vm.createContext(c);vm.runInContext(fonte('src/services/conta.js'),c);
  await assert.rejects(c.solicitarExclusao('ficticia',true));assert.equal(chamadas,0);
  c.reauthenticateWithCredential=async()=>{c.auth.currentUser={uid:'demo-b'};};await assert.rejects(c.solicitarExclusao('ficticia',true),/sessão mudou/);assert.equal(chamadas,0);
});
test('logout offline cancela ou preserva fila; callback tardio não encerra outra conta',async()=>{
  const util=await import('../src/utils/cicloConta.js');const eventos=[];const ops=[{status:'incerta',payload:{modalidade:'online'}}];let aceita=false,signouts=0,trocar=false;
  const c={listarTentativasTitular:()=>[],reconciliarTerminaisConta:async()=>{},auth:{currentUser:{uid:'demo-a'}},obterGrupoAtual:()=>null,escopoPonto:()=>'',filaPonto:{listar:async()=>ops},EM_ABERTO:['incerta'],...util,window:{confirm:()=>aceita,dispatchEvent:()=>eventos.push('suspender-fila')},Event,signOut:async()=>{signouts++;eventos.push('sair');},suspenderPushLocal:async()=>{eventos.push('push-local');if(trocar)c.auth.currentUser={uid:'demo-b'};},criarCadastroTitular:()=>({}),firebaseConfig:{projectId:'demo-ap1303'},console};vm.createContext(c);vm.runInContext(fonte('src/services/auth.js'),c);
  await c.logout();assert.equal(signouts,0);assert.equal(ops.length,1);
  aceita=true;await c.logout();assert.equal(signouts,1);assert.deepEqual(eventos,['suspender-fila','push-local','sair']);assert.equal(ops.length,1);
  c.auth.currentUser={uid:'demo-a'};trocar=true;await c.logout();assert.equal(signouts,1);assert.equal(c.auth.currentUser.uid,'demo-b');
});
test('perfil/vínculo tardios da sessão anterior não atualizam a nova sessão',()=>{
  let observar;const snaps=[],resultados=[];
  const c={window:{dispatchEvent:()=>{}},Event,auth:{currentUser:{uid:'a'}},onAuthStateChanged:(_a,f)=>{observar=f;return()=>{};},onSnapshot:(_d,ok)=>{snaps.push(ok);return()=>{};},doc:(...a)=>a,db:{},definirGrupoAtual:()=>{},criarCadastroTitular:()=>({}),firebaseConfig:{projectId:'demo-ap1303'},console};vm.createContext(c);vm.runInContext(fonte('src/services/auth.js'),c);
  const parar=c.observeAuth(u=>resultados.push(u));observar({uid:'a'});snaps[0]({exists:()=>true,data:()=>({ativo:true,grupoId:'g-a'})});const velho=snaps[1];
  c.auth.currentUser={uid:'b'};observar({uid:'b'});const antes=resultados.length;velho({exists:()=>true,data:()=>({ativo:true,role:'admin'})});assert.equal(resultados.length,antes);parar();
});
test('reconciliação reenvia original, preserva recibo e não lê a próxima conta após troca',async()=>{
 const payload={operacaoId:'original',uid:'a',contexto:{tipo:'grupo',id:'g'},modalidade:'online',amostra:{latitude:0,longitude:0,instanteMs:123}};
 const ops=[{payload,status:'incerta',tentativas:1}],aplicados=[];let enviado;
 const c={listarTentativasTitular:()=>[],reconciliarTerminaisConta:async()=>{},auth:{currentUser:{uid:'a'}},functions:{},obterGrupoAtual:()=> 'g',escopoPonto:()=> 'escopo-a',window:{dispatchEvent:()=>{}},Event,crypto:require('node:crypto'),filaPonto:{listarConta:async uid=>{assert.equal(uid,'a');return ops;},assumirReconciliacao:async()=>ops[0],concluir:async(...args)=>aplicados.push(args)},httpsCallable:()=>async p=>{enviado=p;c.auth.currentUser={uid:'b'};return{data:{operacaoId:'original',status:'confirmado'}};},criarRecuperacaoSenha:()=>{},sendPasswordResetEmail:()=>{},resumirPendencias:()=>({})};
 vm.createContext(c);vm.runInContext(fonte('src/services/conta.js'),c);await assert.rejects(c.reconciliarConta(),/sessão mudou/);assert.strictEqual(enviado,payload);assert.equal(aplicados[0][0],'escopo-a');assert.equal(aplicados[0][3].status,'confirmado');assert.equal(c.auth.currentUser.uid,'b');
});
test('armazenamento do recibo indisponível não impede signOut nem apaga outra conta',async()=>{
 let saidas=0,reloads=0;const c={listarTentativasTitular:()=>[],reconciliarTerminaisConta:async()=>{},auth:{currentUser:{uid:'a'}},functions:{},firebaseConfig:{projectId:'demo-ap1303'},filaPonto:{limparConta:async u=>assert.equal(u,'a')},localStorage:{removeItem:()=>{}},sessionStorage:{setItem:()=>{throw Error('indisponivel');},getItem:()=>null},window:{dispatchEvent:()=>{},location:{replace:()=>reloads++}},Event,suspenderPushLocal:async d=>assert.equal(d.remoto,false),signOut:async()=>{saidas++;c.auth.currentUser=null;},criarRecuperacaoSenha:()=>{},sendPasswordResetEmail:()=>{}};
 vm.createContext(c);vm.runInContext(fonte('src/services/conta.js'),c);await c.limparContaLocal('a',{protocolo:'a'});assert.equal(saidas,1);assert.equal(reloads,0);assert.equal(c.lerReciboExclusao().status,'concluida');assert.equal(c.lerReciboExclusao().reciboTemporario,true);
});
test('status concluído da conta anterior não limpa nem encerra a conta recém-conectada',async()=>{
 let resolver,limpezas=0,saidas=0;const c={listarTentativasTitular:()=>[],reconciliarTerminaisConta:async()=>{},auth:{currentUser:{uid:'a'}},functions:{},obterGrupoAtual:()=>null,filaPonto:{listarConta:async()=>[],limparConta:async()=>limpezas++},resumirPendencias:()=>({}),httpsCallable:()=>()=>new Promise(r=>resolver=r),criarRecuperacaoSenha:()=>{},sendPasswordResetEmail:()=>{},signOut:async()=>saidas++};
 vm.createContext(c);vm.runInContext(fonte('src/services/conta.js'),c);const pedido=c.atualizarContaAtual();c.auth.currentUser={uid:'b'};resolver({data:{solicitacao:{protocolo:'a',status:'concluida'}}});await assert.rejects(pedido,/sessão mudou/);assert.equal(limpezas,0);assert.equal(saidas,0);assert.equal(c.auth.currentUser.uid,'b');
});
