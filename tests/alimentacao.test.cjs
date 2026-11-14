const test=require('node:test'),assert=require('node:assert/strict');
const {validarPlano,proximaRefeicao}=require('../functions/alimentacao.cjs');
const base={titulo:'Rotina de teste',dataInicio:'2026-11-04',dataFim:'',repeticao:'diario',destinatarios:'selecionados',usuarioIds:['u2','u1'],refeicoes:[{id:'jantar',nome:'Jantar',horario:'19:00',sugestao:'Orientação cadastrada pelo usuário'},{id:'cafe',nome:'Café da manhã',horario:'07:00',sugestao:'Outra orientação'}]};
test('programação ordena refeições, valida múltiplos destinatários e respeita UTC−3 e término',()=>{
 const p=validarPlano(base);assert.deepEqual(p.refeicoes.map(r=>r.id),['cafe','jantar']);assert.deepEqual(p.usuarioIds,['u1','u2']);
 assert.equal(new Date(proximaRefeicao(p,p.refeicoes[0],Date.parse('2026-11-04T09:59Z'))).toISOString(),'2026-11-04T10:00:00.000Z');
 assert.equal(new Date(proximaRefeicao(p,p.refeicoes[0],Date.parse('2026-11-04T10:00Z'))).toISOString(),'2026-11-05T10:00:00.000Z');
 assert.equal(proximaRefeicao({...p,dataFim:'2026-11-04'},p.refeicoes[0],Date.parse('2026-11-04T10:00Z')),null);
 assert.equal(proximaRefeicao({...p,repeticao:'uma_vez'},p.refeicoes[0],Date.parse('2026-11-04T10:00Z')),null);
 const semanal=validarPlano({...base,repeticao:'dias',diasSemana:[5]});assert.equal(new Date(proximaRefeicao(semanal,p.refeicoes[0],Date.parse('2026-11-04T10:00Z'))).toISOString(),'2026-11-06T10:00:00.000Z');
 assert.deepEqual(validarPlano({...base,destinatarios:'todos'}).usuarioIds,[]);
});
test('rejeita calendário, horários, destinatários e refeições inválidos antes de salvar',()=>{
 for(const mudanca of [{dataInicio:'2026-02-30'},{dataFim:'2026-10-01'},{usuarioIds:[]},{usuarioIds:['u','u']},{usuarioIds:['../outro']},{repeticao:'dias',diasSemana:[]},{refeicoes:[]},{refeicoes:[{...base.refeicoes[0],horario:'25:00'}]},{refeicoes:[{...base.refeicoes[0],sugestao:'a'.repeat(241)}]},{refeicoes:[base.refeicoes[0],base.refeicoes[0]]}])assert.throws(()=>validarPlano({...base,...mudanca}));
});

test('foto por URL é opcional, usa HTTPS público e pode ser removida',()=>{
 const comFoto=validarPlano({...base,refeicoes:[{...base.refeicoes[0],imagemUrl:'  https://example.com/jantar.jpg  '}]});assert.equal(comFoto.refeicoes[0].imagemUrl,'https://example.com/jantar.jpg');
 assert.equal(validarPlano(base).refeicoes[0].imagemUrl,'');
 assert.equal(validarPlano({...base,refeicoes:[{...comFoto.refeicoes[0],imagemUrl:''}]}).refeicoes[0].imagemUrl,'');
 for(const imagemUrl of ['http://example.com/foto.jpg','javascript:alert(1)','data:image/png;base64,AA==','https://user:senha@example.com/foto.jpg','https://127.0.0.1/a.jpg','https://rede.local/a.jpg','https://example.com:444/a.jpg',123])assert.throws(()=>validarPlano({...base,refeicoes:[{...base.refeicoes[0],imagemUrl}]}),e=>e.code==='invalid-argument');
});

test('linhas de alimentos preservam opções e CHO manual sem somar alternativas',()=>{
 const opcoes=[{id:'a',descricao:' Opção A ',choGramas:'21,5'},{id:'b',descricao:'Opção B',choGramas:''},{id:'c',descricao:'Opção C',choGramas:0}];
 const p=validarPlano({...base,opcoesPorRefeicao:true,refeicoes:[{...base.refeicoes[0],opcoes}]});
 assert.deepEqual(p.refeicoes[0].opcoes,[{id:'a',descricao:'Opção A',choGramas:21.5},{id:'b',descricao:'Opção B',choGramas:null},{id:'c',descricao:'Opção C',choGramas:0}]);
 assert.match(p.refeicoes[0].sugestao,/CHO: 21,5 g/);assert.match(p.refeicoes[0].sugestao,/CHO: 0 g/);
 const r=p.refeicoes[0];assert.deepEqual(validarPlano({...base,refeicoes:[r]}).refeicoes[0].opcoes,r.opcoes);
 assert.throws(()=>validarPlano({...base,refeicoes:[{...r,sugestao:'Edição antiga que perderia as linhas'}]}),e=>e.code==='failed-precondition');
 for(const choGramas of ['-1','NaN','1e3',true,Infinity,10001,'1,234'])assert.throws(()=>validarPlano({...base,opcoesPorRefeicao:true,refeicoes:[{...r,opcoes:[{...opcoes[0],choGramas}]}]}),e=>e.code==='invalid-argument');
 for(const linhas of [[],[opcoes[0],opcoes[0]],[{...opcoes[0],descricao:''}],Array.from({length:21},(_,i)=>({...opcoes[0],id:'a'+i}))])assert.throws(()=>validarPlano({...base,opcoesPorRefeicao:true,refeicoes:[{...r,opcoes:linhas}]}));
 const longo=validarPlano({...base,opcoesPorRefeicao:true,refeicoes:[{...r,opcoes:[{id:'a',descricao:'a'.repeat(240),choGramas:10},{id:'b',descricao:'b'.repeat(240),choGramas:20}]}]}).refeicoes[0];assert.equal(longo.opcoes[1].descricao.length,240);assert.equal(longo.sugestao.length,240);
});

test('CHO total é manual, preserva linhas e aparece ao final do resumo inclusive longo',()=>{
 const r={...base.refeicoes[0],choModo:'total',choTotalGramas:'53,25',opcoes:[{id:'a',descricao:'a'.repeat(240),choGramas:21},{id:'b',descricao:'Alternativa',choGramas:15}]};
 const validar=r=>validarPlano({...base,opcoesPorRefeicao:true,choPorRefeicao:true,refeicoes:[r]}).refeicoes[0];
 const salvo=validar(r);assert.equal(salvo.choTotalGramas,53.25);assert.equal(salvo.opcoes[0].choGramas,21);assert.equal(salvo.sugestao.length,240);assert.match(salvo.sugestao,/CHO total da refeição: 53,25 g$/);assert.doesNotMatch(salvo.sugestao,/CHO: 21/);
 assert.equal(validar({...r,choTotalGramas:0}).choTotalGramas,0);assert.equal(validar({...r,choTotalGramas:''}).choTotalGramas,null);
 const linhas=validar({...r,choModo:'linhas',opcoes:[{id:'a',descricao:'Arroz',choGramas:21}]});assert.match(linhas.sugestao,/CHO: 21 g/);assert.equal(linhas.choTotalGramas,53.25);
 for(const v of [-1,'1,234','NaN',true,Infinity,10001])assert.throws(()=>validar({...r,choTotalGramas:v}),e=>e.code==='invalid-argument');assert.throws(()=>validar({...r,choModo:'automatico'}),e=>e.code==='invalid-argument');
});
