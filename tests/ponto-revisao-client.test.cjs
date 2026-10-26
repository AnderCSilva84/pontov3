const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const fonte=fs.readFileSync('src/services/pontoRevisao.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
test('resultado tardio de outra sessão não aparece nem modifica a fila da nova conta',async()=>{
  let concluir,aplicadas=0;const c={auth:{currentUser:{uid:'a'}},functions:{},obterGrupoAtual:()=> 'g',httpsCallable:()=>()=>new Promise(r=>concluir=r),filaPonto:{aplicarRevisao:()=>aplicadas++},escopoPonto:()=> 'escopo',window:{dispatchEvent(){}},Event};
  vm.createContext(c);vm.runInContext(fonte,c);const chamada=c.revisarPendencia({acao:'listar'});c.auth.currentUser={uid:'b'};concluir({data:{itens:[{uid:'a',decisao:{resultado:{}}}]}});await assert.rejects(chamada,/sessão mudou/);assert.equal(aplicadas,0);
});
test('consulta própria aplica recibo no escopo original e não exige captura local',async()=>{
  const aplicadas=[];const c={auth:{currentUser:{uid:'a'}},functions:{},obterGrupoAtual:()=> 'g',httpsCallable:()=>async()=>({data:{itens:[{uid:'a',decisao:{resultado:{status:'confirmado'}}},{uid:'outro',decisao:{resultado:{}}}]}}),filaPonto:{aplicarRevisao:async(...a)=>{aplicadas.push(a);return false;}},escopoPonto:uid=>uid+'-g',window:{dispatchEvent(){}},Event};
  vm.createContext(c);vm.runInContext(fonte,c);const r=await c.revisarPendencia({acao:'listar'});assert.equal(r.itens.length,2);assert.equal(aplicadas.length,1);assert.equal(aplicadas[0][0],'a-g');
});
