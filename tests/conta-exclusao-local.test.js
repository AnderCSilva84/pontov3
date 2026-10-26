import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {criarFilaPonto,escopoPonto} from '../src/services/pontoFila.js';
import {resumirPendencias} from '../src/utils/cicloConta.js';
const contexto={tipo:'grupo',id:'g'},s=escopoPonto('a',contexto);
const p=(uid,id,data,modalidade='offline_pendente')=>({uid,operacaoId:id,funcionarioId:uid,contexto,jornadaData:data,modalidade,capturadoEmMs:Date.parse(data)});
test('exclusão local: só descarta captura nunca enviada e só limpa o dono',async()=>{
 const fila=criarFilaPonto({indexedDB:new IDBFactory()});
 await fila.inserir(p('a','offline','2026-10-01'));await fila.inserir(p('a','incerta','2026-10-02','online'));await fila.inserir(p('b','outra','2026-10-01'));
 const o=await fila.assumir(s,'executor');assert.equal(o.payload.operacaoId,'offline');
 await assert.rejects(fila.descartarNaoEnviadas(s),/andamento/);
 await fila.concluir(s,'executor','offline',{status:'incerta'});
 assert.equal(await fila.descartarNaoEnviadas(s),0);assert.equal((await fila.listarConta('a')).length,2);
 await fila.inserir(p('a','nunca','2026-10-03'));assert.equal(await fila.descartarNaoEnviadas(s),1);
 const resumo=resumirPendencias(await fila.listarConta('a'));assert.equal(resumo.onlineIncerto,2);assert.equal(resumo.offlineNaoEnviado,0);
 await assert.rejects(fila.limparConta('a'),/preservada/);
 for(const id of ['offline','incerta']){await fila.assumirReconciliacao(s,'fechar',id);await fila.concluir(s,'fechar',id,{status:'recebida'});}
 await fila.limparConta('a');assert.equal((await fila.listarConta('a')).length,0);assert.equal((await fila.listarConta('b')).length,1);await fila.fechar();
});
