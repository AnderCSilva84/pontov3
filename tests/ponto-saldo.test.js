import test from 'node:test';
import assert from 'node:assert/strict';
import {somarBancoHoras} from '../src/utils/pontoSaldo.js';
test('resumo reutiliza registros limitados ao mês e mantém cálculo legado/versão atual',()=>{
 const registros=[{dataKey:'2026-09-10',saldoMin:900},{dataKey:'2026-10-01',saldoMin:-10},{dataKey:'2026-10-20',saldoMin:30,calculoVersao:1},{dataKey:'2026-10-21',entrada:'08:00',saida:'18:00',saldoMin:999},{dataKey:'2026-10-22',ajusteTipo:'atestado',saldoMin:999}];
 const f={desconsiderarIntervalo:true,intervaloPrevistoMin:60,cargaSegSexMin:480};
 assert.equal(somarBancoHoras(registros,f,'2026-10'),80);assert.equal(somarBancoHoras(registros,f,'2026-10','2026-10-20'),90);assert.equal(somarBancoHoras(registros,f,'2026-09'),900);
});
