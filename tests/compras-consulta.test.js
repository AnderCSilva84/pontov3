import test from 'node:test';
import assert from 'node:assert/strict';
import {compararPrecoConsultado,agruparHistoricoMensal,gastosUltimosTresMeses,filtrarProdutosConsulta} from '../src/utils/comprasConsulta.js';
test('autocomplete encontra nome e marca sem acentos e sem misturar embalagens',()=>{
 const opcoes=[['a',{nomeSnapshot:'Açúcar',marca:'União',apresentacao:'Pacote 1 kg',categoriaNome:'Mercearia'}],['b',{nomeSnapshot:'Arroz',marca:'Outra',apresentacao:'Pacote 5 kg'}]];
 assert.deepEqual(filtrarProdutosConsulta(opcoes,'acucar uniao').map(o=>o[0]),['a']);
 assert.equal(filtrarProdutosConsulta(opcoes,'mercearia')[0][0],'a');
 assert.equal(filtrarProdutosConsulta(opcoes,'5 kg')[0][0],'b');assert.equal(filtrarProdutosConsulta(opcoes,'inexistente').length,0);
});
test('consulta usa centavos, média e último registro sem alterar os preços',()=>{
 const registros=[{id:'a',precoUnitarioCentavos:1000,compradoEmMs:1},{id:'b',precoUnitarioCentavos:2000,compradoEmMs:2}];
 const r=compararPrecoConsultado(registros,1800);assert.equal(r.media,1500);assert.equal(Math.round(r.diferencaPct),20);assert.equal(r.ultimo.id,'b');assert.equal(r.menor,1000);assert.equal(registros[0].precoUnitarioCentavos,1000);assert.equal(compararPrecoConsultado([],100),null);
});
test('pastas mensais somam total pago finalizado, excluem anuladas e respeitam fuso',()=>{
 const r=agruparHistoricoMensal([{id:'a',status:'finalizada',totalCentavos:1000,finalizadaEmMs:Date.parse('2026-11-01T01:00Z')},{id:'b',status:'anulada',totalCentavos:9000,finalizadaEmMs:Date.parse('2026-10-22T12:00Z')},{id:'c',status:'finalizada',totalCentavos:2000,finalizadaEmMs:Date.parse('2026-11-02T12:00Z')}]);
 assert.equal(r.length,2);assert.equal(r[0].totalCentavos,2000);assert.equal(r[1].totalCentavos,1000);assert.equal(r[1].listas.length,2);
});
test('gráfico inclui meses sem compras, virada de ano e exclui meses fora do período',()=>{
 const listas=[{status:'finalizada',totalCentavos:1500,finalizadaEmMs:Date.parse('2025-12-20T12:00Z')},{status:'finalizada',totalCentavos:9999,finalizadaEmMs:Date.parse('2025-10-20T12:00Z')},{status:'anulada',totalCentavos:500,finalizadaEmMs:Date.parse('2026-01-10T12:00Z')}];
 const meses=gastosUltimosTresMeses(listas,Date.parse('2026-01-21T12:00Z'));
 assert.deepEqual(meses.map(m=>[m.chave,m.totalCentavos]),[['2025-11',0],['2025-12',1500],['2026-01',0]]);
});
