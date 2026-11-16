const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture() {
  let consultas=0,encerradas=0,antes;
  const chamadas=[],user={uid:'ana',grupoId:'grupo_a'};
  const ponte={addListener:async()=>({remove:async()=>{}}),configurarSessao:async()=>({}),encerrarSessao:async()=>{encerradas++;},
    consultarCompras:async()=>{consultas++;await antes?.();return{compras:[{token:'ficticio_pendente',pendente:true},{token:'ficticio',pendente:false}]};}};
  const c={Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'},registerPlugin:()=>ponte,auth:{currentUser:{uid:'ana'}},functions:{},
    obterGrupoAtual:()=> 'grupo_a',crypto:{randomUUID:()=> 'sessao',subtle:require('node:crypto').webcrypto.subtle},TextEncoder,
    httpsCallable:()=>async d=>{chamadas.push(d);return{data:{direitosConcedidos:true,teste:true}};}};
  vm.createContext(c);
  const fonte=p=>fs.readFileSync(p,'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];?/g,'').replace(/export /g,'');
  vm.runInContext(fonte('src/utils/playBilling.js'),c);vm.runInContext(fonte('src/services/playBilling.js'),c);
  return {c,user,chamadas,consultas:()=>consultas,encerradas:()=>encerradas,antes:fn=>{antes=fn;}};
}
test('restauração só envia tokens existentes não pendentes e encerra sessão sem compra',async()=>{
  const f=fixture(),r=await f.c.restaurarComprasTestePlay(f.user);
  assert.equal(r.confirmadas,1);assert.equal(r.pendentes,1);assert.equal(f.chamadas.length,1);assert.equal(f.chamadas[0].token,'ficticio');assert.equal(Object.keys(f.chamadas[0]).length,1);assert.equal(f.encerradas(),1);
});
test('troca de conta durante consulta e plataforma web não enviam token ao backend',async()=>{
  const f=fixture();f.antes(()=>{f.c.auth.currentUser={uid:'outra'};});
  await assert.rejects(f.c.restaurarComprasTestePlay(f.user),/sessão mudou/);assert.equal(f.chamadas.length,0);assert.equal(f.encerradas(),1);
  const web=fixture();web.c.Capacitor.isNativePlatform=()=>false;
  await assert.rejects(web.c.restaurarComprasTestePlay(web.user),/Android/);assert.equal(web.consultas(),0);
});
