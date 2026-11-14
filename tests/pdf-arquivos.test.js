import { Buffer } from 'node:buffer';
import { setImmediate } from 'node:timers';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
function preparar({ android = true, escrever, executar } = {}) {
 const auth = {currentUser:{uid:'ficticio-a'}};let grupo='grupo-a';const eventos={};const chamadas=[];
 const ponte={escreverAnexo:async p=>{chamadas.push(['escreverAnexo',p]);return{id:'anexo'};},escrever: escrever || (async p=>{chamadas.push(['escrever',p]);return{id:'arquivo'};}), executar:executar || (async p=>{chamadas.push(['executar',p]);}),invalidar:async()=>{}};
 const fonte=readFileSync('src/services/pdfArquivos.js','utf8').trimStart().replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 const ctx=vm.createContext({Capacitor:{isNativePlatform:()=>android,getPlatform:()=>android?'android':'web'},registerPlugin:()=>ponte,auth,obterGrupoAtual:()=>grupo,window:{addEventListener:(n,f)=>eventos[n]=f},Uint8Array,btoa:s=>Buffer.from(s,'binary').toString('base64')});
 vm.runInContext(fonte+'\nglobalThis.api={registrarPdf,validarPdf,entregarPdf,entregarAnexo,nomePdfSeguro,pdfAndroid};',ctx);
 return {...ctx.api,auth,chamadas,trocar:()=>{grupo='grupo-b';eventos['ap1303-contexto-alterado']();}};
}
const arquivo=()=>({name:'nome pessoal.pdf',arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.7 ficticio').buffer});
test('anexos Android: MIME e nome seguro mantêm bytes originais e reutilizam arquivo privado',async()=>{
 for(const [type,name,ext]of [['application/pdf','Assinado GOV.pdf','pdf'],['image/jpeg','Imagem impressão.jpeg','jpg'],['image/png','Imagem.png','png'],['image/webp','Imagem.webp','webp']]){
  const a=preparar(),bytes=new TextEncoder().encode('conteúdo binário sem conversão'),f=a.registrarPdf({name,type,arrayBuffer:async()=>bytes.buffer});
  await a.entregarAnexo(f,'salvar');await a.entregarAnexo(f,'compartilhar');assert.equal(a.chamadas.filter(c=>c[0]==='escreverAnexo').length,1);
  const d=a.chamadas[0][1];assert.equal(d.mime,type);assert.ok(d.nome.endsWith('.'+ext));assert.deepEqual(Buffer.from(d.base64,'base64'),Buffer.from(bytes));
 }
});
test('Android: escreve PDF privado, nome sem dados pessoais, MIME tratado nativamente e deduplica toques',async()=>{
 const a=preparar();const f=a.registrarPdf(arquivo());await Promise.all([a.entregarPdf(f,'compartilhar'),a.entregarPdf(f,'compartilhar')]);
 assert.equal(a.chamadas.length,2);assert.equal(a.chamadas[0][1].nome,'Ta_no_Ponto.pdf');assert.equal(a.chamadas[1][1].acao,'compartilhar');
 const java=readFileSync('android/app/src/main/java/br/dev/acstech/ap1303/dev/PdfArquivosPlugin.java','utf8');assert.match(java,/application\/pdf/);assert.match(java,/FLAG_GRANT_READ_URI_PERMISSION/);
});
test('PWA não invoca ponte ou backend e mantém fallback',async()=>{const a=preparar({android:false});assert.equal(await a.entregarPdf(a.registrarPdf(arquivo())),false);assert.equal(a.chamadas.length,0);});
test('troca de sessão durante escrita impede abrir/compartilhar',async()=>{
 let liberar;const a=preparar({escrever:()=>new Promise(r=>liberar=r)});const p=a.entregarPdf(a.registrarPdf(arquivo()));await new Promise(r=>setImmediate(r));a.auth.currentUser={uid:'outro'};liberar({id:'x'});await assert.rejects(p,/sessão mudou/);assert.equal(a.chamadas.length,0);
});
test('grupo alterado invalida arquivo pronto',async()=>{const a=preparar();const f=a.registrarPdf(arquivo());a.trocar();await assert.rejects(a.entregarPdf(f),/sessão mudou/);});
test('falha na escrita e ausência de visualizador são propagadas sem retry; nova tentativa é possível',async()=>{
 for(const codigo of ['PDF_WRITE','PDF_NO_VIEWER']){let n=0;const a=preparar(codigo==='PDF_WRITE'?{escrever:async()=>{n++;throw new Error(codigo);}}:{executar:async()=>{n++;throw new Error(codigo);}});const f=a.registrarPdf(arquivo());await assert.rejects(a.entregarPdf(f),new RegExp(codigo));assert.equal(n,1);await assert.rejects(a.entregarPdf(f),new RegExp(codigo));assert.equal(n,2);}
});
test('cancelamento nativo resolvido não vira falha de geração',async()=>{const a=preparar({executar:async()=>({cancelado:true})});assert.equal(await a.entregarPdf(a.registrarPdf(arquivo()),'salvar'),true);});
test('URL externa rejeita protocolos perigosos e credenciais',async()=>{
 const fonte=readFileSync('src/services/comprovanteExterno.js','utf8').trimStart().replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');const c=vm.createContext({URL,registerPlugin:()=>({})});vm.runInContext(fonte+';globalThis.validar=urlExternaSegura',c);
 for(const url of ['javascript:alert(1)','file:///etc/passwd','https://user:senha@example.test/a'])assert.equal(c.validar(url),null);
 assert.equal(c.validar('https://example.test/documento.pdf'),'https://example.test/documento.pdf');assert.equal(c.validar('http://example.test/legado'),'http://example.test/legado');
});
test('abrir e compartilhar o mesmo arquivo reutilizam a gravação privada',async()=>{
 const a=preparar();const f=a.registrarPdf(arquivo());await a.entregarPdf(f,'abrir');await a.entregarPdf(f,'compartilhar');assert.equal(a.chamadas.filter(c=>c[0]==='escrever').length,1);assert.equal(a.chamadas.filter(c=>c[0]==='executar').length,2);
});
test('ação desconhecida e erro de leitura não abrem arquivo nem fazem retry',async()=>{
 const a=preparar();await assert.rejects(a.entregarPdf(a.registrarPdf(arquivo()),'outro'),/inválida/);let leituras=0;const f=a.registrarPdf({arrayBuffer:async()=>{leituras++;throw new Error('leitura');}});await assert.rejects(a.entregarPdf(f),/leitura/);assert.equal(leituras,1);assert.equal(a.chamadas.length,0);
});
test('logging Android do SDK não expõe payload base64 de PDF',()=>{const config=JSON.parse(readFileSync('capacitor.config.json','utf8'));assert.equal(config.android.loggingBehavior,'none');assert.equal(config.android.allowMixedContent,false);});
