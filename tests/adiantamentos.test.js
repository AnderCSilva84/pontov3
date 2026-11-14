import test from 'node:test';
import assert from 'node:assert/strict';
import {montarParcelas,adiantamentosDaCompetencia} from '../functions/adiantamentos-calculos.mjs';
import {calcularFolha} from '../functions/folha-calculos.mjs';
test('3000 em dez parcelas mensais, centavos exatos e virada de ano',()=>{
 const ps=montarParcelas(3000,10,'2026-11');assert.equal(ps.length,10);assert.equal(ps.at(-1).competencia,'2027-08');assert.ok(ps.every(p=>p.centavos===30000));
 const tres=montarParcelas(100,3,'2026-12',2);assert.deepEqual(tres.map(p=>p.centavos),[3334,3333,3333]);assert.deepEqual(tres.map(p=>p.competencia),['2026-12','2027-02','2027-04']);assert.equal(tres.reduce((s,p)=>s+p.centavos,0),10000);
 for(const args of [[1.001,1,'2026-11'],[0,1,'2026-11'],[1,101,'2026-11'],[1,0,'2026-11'],[1,121,'2026-11'],[1,1,'2026-13'],[1,1,'2026-11',4]])assert.throws(()=>montarParcelas(...args));
});
test('parcelas por competência não duplicam manuais, pagamentos ou origens',()=>{
 const plano={id:'a',tipo:'adiantamento',funcionarioId:'f',valor:3000,descricao:'Compra fictícia',parcelamento:{versao:1,quantidade:10,primeiraCompetencia:'2026-11',intervaloMeses:1}};
 const entradas=[plano,plano,{...plano,id:'outro-func',funcionarioId:'g'},{id:'legado',tipo:'vale',funcionarioId:'f',valor:90}];
 assert.equal(adiantamentosDaCompetencia(entradas,'f','2026-10').total,0);
 const a=adiantamentosDaCompetencia(entradas,'f','2026-11');assert.equal(a.total,300);assert.equal(a.itens.length,1);
 const f=calcularFolha({salarioBase:2500,divisorHoras:220,adiantamentos:50},{total:0,itens:[]},a);assert.equal(f.adiantamentosAutomaticos,300);assert.equal(f.totalAdiantamentos,350);assert.equal(f.liquido,2150);assert.equal(f.baseInss,2500);
 assert.equal(adiantamentosDaCompetencia([{...plano,parcelamento:{...plano.parcelamento,canceladoAPartir:'2026-12'}}],'f','2026-12').total,0);
 assert.ok(adiantamentosDaCompetencia([{...plano,valor:-1}],'f','2026-11').erro);
});
