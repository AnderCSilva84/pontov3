import test from 'node:test';
import assert from 'node:assert/strict';
import { criarModeloJornada, validarModeloJornada, cargaNaData, jornadaNaData } from '../functions/jornada.mjs';
import { createRequire } from 'node:module';
const { aplicarAcao } = createRequire(import.meta.url)('../functions/ponto-validacao.cjs');
for (const horas of [44,42,40]) test('Modalidade '+horas,()=>{
 const modelo=criarModeloJornada(horas);
 assert.equal(validarModeloJornada(horas,'2026-12-01',modelo.escala),'');
 assert.equal(Object.values(modelo.escala).reduce((s,d)=>s+d.cargaMin,0),horas*60);
 if(horas===42) assert.equal(Object.values(modelo.escala).filter(d=>d.cargaMin===0).length,2);
});
const f={...criarModeloJornada(44),jornadas:[{...criarModeloJornada(42),vigencia:'2026-12-01'}]};
test('Datas e modalidades inválidas retornam erro sem interromper o formulário',()=>{
 const escala=criarModeloJornada(42).escala;
 for(const data of ['',undefined,'2026-13-01','2026-12-32','2027-02-29','2026-12-01T00:00:00Z']) {
  assert.ok(validarModeloJornada(42,data,escala));
 }
 assert.ok(validarModeloJornada(41,'2026-12-01',escala));
 assert.ok(validarModeloJornada(42,'2026-12-01',null));
 assert.equal(validarModeloJornada('42','2026-12-01',escala),'');
});
test('Vigência preserva novembro, aplica dezembro e folgas',()=>{
 assert.equal(cargaNaData(f,'2026-11-30'),480);
 assert.equal(cargaNaData(f,'2026-12-01'),504);
 assert.equal(cargaNaData(f,'2026-11-28'),240);
 assert.equal(cargaNaData(f,'2026-12-05'),0);
 assert.equal(cargaNaData(f,'2026-12-06'),0);
 assert.equal(jornadaNaData(f,'2026-11-01').horasSemanais,44);
});
test('Rejeita 42h antes de dezembro, carga incorreta ou sem duas folgas',()=>{
 const m=criarModeloJornada(42);
 assert.ok(validarModeloJornada(42,'2026-11-30',m.escala));
 assert.ok(validarModeloJornada(42,'2026-12-01',criarModeloJornada(40).escala));
 m.escala.segunda.cargaMin-=60;m.escala.sabado.cargaMin=60;
 assert.ok(validarModeloJornada(42,'2026-12-01',m.escala));
});
test('Fechamento usa carga vigente e trabalho na folga gera saldo',()=>{
 const dia={entrada:'08:00',saidaIntervalo:'12:00',entradaIntervalo:'13:00'};
 assert.equal(aplicarAcao(dia,'SAIDA','17:24',f,2,'2026-12-01').saldoMin,0);
 assert.equal(aplicarAcao({entrada:'08:00'},'SAIDA','10:00',f,6,'2026-12-05').saldoMin,120);
 assert.equal(aplicarAcao(dia,'SAIDA','17:00',f,1,'2026-11-30').saldoMin,0);
});

test('Folgas podem mudar de dia e vigências são resolvidas por data',()=>{
 const m=criarModeloJornada(42);m.escala.sabado=m.escala.segunda;m.escala.segunda={cargaMin:0,inicio:'',fim:''};
 assert.equal(validarModeloJornada(42,'2026-12-01',m.escala),'');
 const pessoa={...criarModeloJornada(44),jornadas:[{...criarModeloJornada(40),vigencia:'2027-01-01'},{...m,vigencia:'2026-12-01'}]};
 assert.equal(cargaNaData(pessoa,'2026-12-07'),0);
 assert.equal(cargaNaData(pessoa,'2026-12-05'),504);
 assert.equal(cargaNaData(pessoa,'2027-01-04'),480);
});
