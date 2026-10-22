import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularInss, calcularFolha, transportesDaCompetencia, calcularEspecial } from '../functions/folha-calculos.mjs';
const mensal = { competencia:'2026-10', salarioBase:2500, divisorHoras:220, inssAutomatico:true, cobrarValeTransporte:true, proporcaoVt:100 };
const especial = { competencia:'2026-10', salario:3000, mediaVariaveis:0, avos13:12, avosFerias:6, parcela:'integral', admissao:'2024-01-01', inicioAquisitivo:'2026-04-01', dataDesligamento:'2026-10-20', diasSaldo:20, motivo:'sem_justa_causa', aviso:'indenizado', avisoAutomatico:true };
test('INSS progressivo de 2026 por faixas, teto e competência', () => {
  assert.equal(calcularInss(0,'2026-01'),0);
  assert.equal(calcularInss(1621,'2026-01'),121.58);
  assert.equal(calcularInss(2500,'2026-10'),200.69);
  assert.equal(calcularInss(3000,'2026-10'),248.60);
  assert.equal(calcularInss(100000,'2026-10'),988.09);
  assert.throws(()=>calcularInss(2000,'2027-01'),/Tabela/);
});
test('bônus sem incidência fica fora do INSS e permanece nos proventos', () => {
  const f = {...mensal,salarioBase:1621,bonus:300,bonusSemIncidenciaInss:true};
  const total = calcularFolha(f);
  assert.equal(total.proventos,1921);
  assert.equal(total.baseInss,1621);
  assert.equal(total.inss,121.58);
  assert.equal(total.liquido,1799.42);
  assert.equal(calcularFolha({...f,bonusSemIncidenciaInss:false}).baseInss,1921);
  assert.equal(calcularFolha({...f,horasExtras:100}).baseInss,1721);
  assert.equal(calcularFolha({...f,baseInssManual:true,baseInssInformada:1800}).baseInss,1800);
});
test('VT pago é informativo; participação opcional limitada ao concedido, salário e proporção', () => {
  const total = calcularFolha(mensal,{total:300,itens:[{id:'a',valor:300}]});
  assert.equal(total.proventos,2500); assert.equal(total.valeTransportePago,300); assert.equal(total.descontoValeTransporte,150); assert.equal(total.liquido,2149.31);
  assert.equal(calcularFolha({...mensal,cobrarValeTransporte:false},{total:300,itens:[]}).descontoValeTransporte,0);
  assert.equal(calcularFolha(mensal,{total:50,itens:[]}).descontoValeTransporte,50);
  assert.equal(calcularFolha({...mensal,proporcaoVt:50},{total:300,itens:[]}).descontoValeTransporte,75);
  assert.equal(calcularFolha(mensal).descontoValeTransporte,0);
  assert.equal(calcularFolha({...mensal,horasDevidas:.55}).descontoHoras,6.25);
});
test('desconto opcional de horas preserva as horas devidas e ajusta a base de INSS apenas quando aplicado',()=>{
 const f={...mensal,horasDevidas:2,descontarHoras:false};
 const sem=calcularFolha(f),com=calcularFolha({...f,descontarHoras:true});
 assert.equal(sem.descontoHoras,0);assert.equal(sem.baseInss,2500);assert.equal(f.horasDevidas,2);
 assert.equal(com.descontoHoras,22.73);assert.equal(com.baseInss,2477.27);
 assert.equal(calcularFolha({...mensal,horasDevidas:2}).descontoHoras,com.descontoHoras);
});
test('transportes por competência e rateio legado entre meses, sem incluir outro funcionário', () => {
  const itens = [{id:'a',tipo:'transporte',funcionarioId:'x',competenciaMes:'2026-10',valor:100},{id:'b',tipo:'transporte',funcionarioId:'x',periodoInicio:'2026-10-30',periodoFim:'2026-11-02',valor:80},{id:'c',tipo:'transporte',funcionarioId:'y',competenciaMes:'2026-10',valor:900},{id:'d',tipo:'salario',funcionarioId:'x',competenciaMes:'2026-10',valor:900}];
  assert.equal(transportesDaCompetencia(itens,'x','2026-10').total,140);
  assert.equal(transportesDaCompetencia(itens,'x','2026-11').total,40);
});
test('13º: primeira sem INSS, segunda sobre total e dedução do adiantamento', () => {
  const a = calcularEspecial('decimo_terceiro',{...especial,parcela:'primeira'});
  assert.equal(a.proventos,1500); assert.equal(a.inss,0);
  const b = calcularEspecial('decimo_terceiro',{...especial,parcela:'segunda',adiantado:1500});
  assert.equal(b.proventos,3000); assert.equal(b.inss,248.6); assert.equal(b.liquido,1251.4);
  const c = calcularEspecial('decimo_terceiro',{...especial,admissao:'2026-06-16',avosAutomaticos:true,dataReferencia:'2026-10-31'});
  assert.equal(c.avos13,5); assert.equal(c.proventos,1250);
});
test('férias: gozo + terço e abono sem dupla incidência', () => {
  const f = calcularEspecial('ferias',{...especial,periodoInicio:'2026-10-01',periodoFim:'2026-10-20',diasFerias:20,diasAbono:10});
  assert.equal(f.proventos,4000); assert.equal(f.inss,calcularInss(2666.67,'2026-10'));
  assert.throws(()=>calcularEspecial('ferias',{...especial,periodoInicio:'2026-10-01',periodoFim:'2026-10-20',diasFerias:30}),/período/);
});
test('rescisão: motivo, aviso proporcional, projeção e bases de INSS separadas', () => {
  const f = calcularEspecial('rescisao',especial);
  assert.equal(f.dataProjetada,'2026-11-25'); assert.ok(f.linhas.some(l=>l.descricao.includes('36 dias') && l.valor===3600));
  assert.equal(f.inss,404.29);
  const justa = calcularEspecial('rescisao',{...especial,motivo:'justa_causa',aviso:'dispensado',diasFeriasVencidas:30});
  assert.equal(justa.proventos,6000); assert.ok(!justa.linhas.some(l=>l.descricao.startsWith('13º')));
  const acordo = calcularEspecial('rescisao',{...especial,motivo:'acordo'});
  assert.ok(acordo.linhas.some(l=>l.descricao.includes('metade') && l.valor===1800));
  assert.throws(()=>calcularEspecial('rescisao',{...especial,motivo:'pedido'}),/motivo/);
  assert.throws(()=>calcularEspecial('rescisao',{...especial,avosAutomaticos:true,inicioAquisitivo:'2025-04-01'}),/mais de um período/);
});
