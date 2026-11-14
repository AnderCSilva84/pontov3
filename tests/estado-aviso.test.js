import test from 'node:test';import assert from 'node:assert/strict';import {estadoAviso} from '../src/utils/estadoAviso.js';
const l={ativo:true,versao:1,proximoDisparoEmMs:2000};
test('amarelo antes do prazo, vermelho no vencimento e verde só com confirmação persistida',()=>{
 assert.equal(estadoAviso(l,1000).estado,'pendente');assert.equal(estadoAviso(l,2000).estado,'atrasado');
 assert.equal(estadoAviso({...l,ultimaOcorrencia:{id:'1_500',horarioMs:500,status:'concluido'}},1000).estado,'concluido');
 assert.equal(estadoAviso({...l,ultimaOcorrencia:{id:'1_500',horarioMs:500,status:'concluido'}},2000).estado,'atrasado');
 assert.equal(estadoAviso({...l,adiamento:{ocorrenciaId:'1_500',ateMs:3000}},1000).rotulo,'Adiado');
 assert.equal(estadoAviso({...l,ativo:false},5000).podeAgir,false);
});
