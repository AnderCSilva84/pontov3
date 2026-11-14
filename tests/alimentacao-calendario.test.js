import test from 'node:test';
import assert from 'node:assert/strict';
import {planoNoDia,opcoesDaRefeicao} from '../src/utils/alimentacao.js';
test('a tela de hoje respeita início, término, data única e dias da semana',()=>{
 const p={dataInicio:'2026-11-04',dataFim:'2026-11-06',repeticao:'diario',diasSemana:[]};
 assert.equal(planoNoDia(p,'2026-11-03'),false);assert.equal(planoNoDia(p,'2026-11-04'),true);assert.equal(planoNoDia(p,'2026-11-07'),false);
 assert.equal(planoNoDia({...p,repeticao:'uma_vez'},'2026-11-05'),false);
 assert.equal(planoNoDia({...p,repeticao:'dias',diasSemana:[5]},'2026-11-06'),true);
 assert.equal(planoNoDia({...p,repeticao:'dias',diasSemana:[5]},'2026-11-05'),false);
});
test('refeições anteriores abrem com o texto preservado numa linha e CHO em branco',()=>{
 const texto='Orientação já cadastrada\nCom suas alternativas';
 assert.deepEqual(opcoesDaRefeicao({sugestao:texto}),[{id:'texto-legado',descricao:texto,choGramas:null}]);
 const opcoes=[{id:'a',descricao:'Opção cadastrada',choGramas:21.5}];assert.equal(opcoesDaRefeicao({opcoes}),opcoes);
});

import {refeicaoEmDestaque} from '../src/utils/alimentacao.js';
test('destaque passa à próxima refeição aos 30 minutos, inclusive virada de dia',()=>{
 const p={id:'p',dataInicio:'2026-11-01',dataFim:'',repeticao:'diario',diasSemana:[],refeicoes:[{id:'j',horario:'19:00'},{id:'a',horario:'12:00'},{id:'l',horario:'10:00'},{id:'c',horario:'07:00'}]};
 const atual=(h,planos=[p])=>refeicaoEmDestaque(planos,Date.parse('2026-11-05T'+h+'-03:00'));
 assert.equal(atual('10:29:59').refeicao.id,'l');assert.equal(atual('10:30:00').refeicao.id,'a');assert.equal(atual('10:33:00').refeicao.id,'a');assert.equal(atual('12:29:59').refeicao.id,'a');assert.equal(atual('12:30:00').refeicao.id,'j');
 assert.equal(atual('19:30:00').dia,'2026-11-06');assert.equal(atual('19:30:00').refeicao.id,'c');
 assert.equal(atual('10:33:00',[{...p,repeticao:'uma_vez',dataInicio:'2026-11-04'}]),null);
 assert.equal(atual('19:30:00',[{...p,dataFim:'2026-11-05'}]),null);
 assert.equal(atual('10:33:00',[{...p,repeticao:'dias',diasSemana:[1]}]).dia,'2026-11-09');
 assert.equal(atual('10:33:00',[{...p,dataInicio:'2026-12-01'}]).dia,'2026-12-01');
 const outro={...p,id:'outro',refeicoes:[{id:'cedo',horario:'11:00'}]};assert.equal(atual('10:33:00',[p,outro]).plano.id,'outro');
});

import {reaproveitarChoAntigo,valoresChoCadastrados} from '../src/utils/alimentacao.js';
test('CHO antigo único vira total sem somar ou alterar linhas, e modos explícitos são preservados',()=>{
 const r={opcoes:[{id:'a',descricao:'A',choGramas:21},{id:'b',descricao:'B',choGramas:null}]};
 const total=reaproveitarChoAntigo(r);assert.equal(total.choModo,'total');assert.equal(total.choTotalGramas,21);assert.equal(total.opcoes,r.opcoes);assert.equal(r.choModo,undefined);
 assert.equal(reaproveitarChoAntigo({...r,opcoes:[{choGramas:0}]}).choTotalGramas,0);
 assert.deepEqual(valoresChoCadastrados({opcoes:[{choGramas:'21,5'},{choGramas:21.5},{choGramas:''},{choGramas:null}]}),[21.5]);
 const varios={opcoes:[{choGramas:21},{choGramas:15}]};assert.equal(reaproveitarChoAntigo(varios),varios);
 const linhas={...r,choModo:'linhas'};assert.equal(reaproveitarChoAntigo(linhas),linhas);
 const salvo={...r,choModo:'total',choTotalGramas:53};assert.equal(reaproveitarChoAntigo(salvo),salvo);
 assert.equal(reaproveitarChoAntigo({...r,opcoes:[{choGramas:21},{choGramas:21}]}).choTotalGramas,21);
});
