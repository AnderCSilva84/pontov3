import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {Buffer} from 'node:buffer';
function preparar(resolver){
 const auth={currentUser:{uid:'ficticio'}},eventos={},chamadas=[];let grupo='a';const navigator={onLine:true};
 const fonte=readFileSync('src/services/anexosLembrete.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 class Arquivo{constructor(bytes,name,options){this.bytes=bytes;this.name=name;this.type=options.type;}}
 const ctx=vm.createContext({auth,navigator,functions:{},obterGrupoAtual:()=>grupo,registrarPdf:f=>f,httpsCallable:()=>async d=>{chamadas.push(d);return{data:await resolver(d)};},window:{addEventListener:(n,f)=>eventos[n]=f},Uint8Array,crypto:webcrypto,File:Arquivo,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')});
 vm.runInContext(fonte+';globalThis.api={listarAnexos,enviarAnexo,baixarAnexo};',ctx);return{...ctx.api,auth,navigator,chamadas,trocar:()=>{grupo='b';eventos['ap1303-contexto-alterado']();}};
}
test('upload não envia documento para nova sessão se grupo mudar durante leitura',async()=>{
 const a=preparar(async()=>({ok:true})),file={name:'documento.pdf',size:20,arrayBuffer:async()=>{a.trocar();return new Uint8Array(20).buffer;}};await assert.rejects(a.enviarAnexo('lembrete',file,'arquivo'),/sessão mudou/);assert.equal(a.chamadas.length,0);
});
test('resposta atrasada de outra sessão não retorna metadados',async()=>{
 const a=preparar(async()=>{a.auth.currentUser={uid:'outro'};return{anexos:[{nome:'privado'}]};});await assert.rejects(a.listarAnexos('lembrete'),/sessão mudou/);
});
test('download confere SHA e preserva bytes binários; erro não entrega arquivo',async()=>{
 const bytes=Buffer.from([0,255,128,1,10]),sha256=Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes)).toString('hex');
 const a=preparar(async()=>({base64:bytes.toString('base64'),sha256,nome:'original.pdf',mime:'application/pdf'}));const f=await a.baixarAnexo('lembrete','arquivo');assert.deepEqual(Buffer.from(f.bytes[0]),bytes);assert.equal(f.name,'original.pdf');
 const b=preparar(async()=>({base64:bytes.toString('base64'),sha256:'errado'}));await assert.rejects(b.baixarAnexo('lembrete','arquivo'),/integridade/);
});
test('offline é explícito e não tenta consultar backend',async()=>{const a=preparar(async()=>({}));a.navigator.onLine=false;await assert.rejects(a.listarAnexos('lembrete'),/Reconecte/);assert.equal(a.chamadas.length,0);});
