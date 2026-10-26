const test=require('node:test'),assert=require('node:assert/strict');
const {calcularAjuste}=require('../functions/ponto-ajuste.cjs');
const f={cargaSegSexMin:480,desconsiderarIntervalo:false};
const d={dataKey:'2026-10-20',tipo:'manual',entrada:'08:00',saidaIntervalo:'12:00',entradaIntervalo:'13:00',saida:'18:00'};
test('correção calcula horários no servidor, sem aceitar valores de total enviados',()=>{
 const r=calcularAjuste({...d,totalMin:9999,saldoMin:9999},f);assert.equal(r.totalMin,540);assert.equal(r.saldoMin,60);assert.equal(r.encerrado,true);
 for(const x of [{...d,entrada:'20:00'},{...d,saidaIntervalo:'07:00'},{...d,entradaIntervalo:''},{...d,tipo:'invalido'}])assert.throws(()=>calcularAjuste(x,f));
 const sabado=calcularAjuste({...d,dataKey:'2026-10-24',saidaIntervalo:'',entradaIntervalo:'',saida:'12:00'},{...f,cargaSabadoMin:240});assert.equal(sabado.totalMin,240);
 const sem=calcularAjuste({...d,saidaIntervalo:'',entradaIntervalo:''},{...f,desconsiderarIntervalo:true,intervaloPrevistoMin:60});assert.equal(sem.totalMin,540);
 assert.throws(()=>calcularAjuste(d,{...f,desconsiderarIntervalo:true}));
});
test('abonos e falta preservam carga e validação de minutos',()=>{
 assert.equal(calcularAjuste({...d,tipo:'falta'},f).saldoMin,-480);
 assert.equal(calcularAjuste({...d,tipo:'atestado'},f).totalMin,480);
 assert.equal(calcularAjuste({...d,tipo:'dispensa',abonoMin:60},f).saldoMin,-420);
 assert.equal(calcularAjuste({...d,tipo:'saida_mais_cedo',saida:'15:00'},f).saldoMin,0);
 for(const abonoMin of [-1,999,1.5,'60'])assert.throws(()=>calcularAjuste({...d,tipo:'ferias',abonoMin},f));
});
