import test from 'node:test';
import assert from 'node:assert/strict';
import {diaPrato,pratoVencido,ateViradaPrato} from '../functions/pratos-calendario.mjs';
test('prato de data vence na virada de Fortaleza, preservando futuro e recorrência',()=>{
 const antes=Date.parse('2026-10-30T02:59:59Z'),depois=antes+1000;
 assert.equal(diaPrato(antes),'2026-10-29');assert.equal(diaPrato(depois),'2026-10-30');assert.equal(ateViradaPrato(antes),1000);assert.equal(ateViradaPrato(depois),86400000);
 const p={ativo:true,modo:'data',data:'2026-10-29'};
 assert.equal(pratoVencido(p,diaPrato(antes)),false);assert.equal(pratoVencido(p,diaPrato(depois)),true);
 assert.equal(pratoVencido({...p,data:'2026-11-01'},diaPrato(depois)),false);
 assert.equal(pratoVencido({...p,modo:'semanal'},diaPrato(depois)),false);
 assert.equal(pratoVencido({...p,ativo:false},diaPrato(depois)),false);
});
