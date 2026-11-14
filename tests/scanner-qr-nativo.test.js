import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { setImmediate } from 'node:timers';
import { criarTesteQrNativo } from '../src/utils/scannerQrNativo.js';
import fixture from './fixtures/cupom-pa.cjs';
import { preferirLeitorNativo } from '../src/utils/scannerQr.js';
import { build as bundle, transformSync } from 'esbuild';

test('ponte permite Android release, QR exclusivo e não registra conteúdo', () => {
  const java = readFileSync('android/app/src/main/java/br/dev/acstech/ap1303/dev/CameraQrPlugin.java', 'utf8');
  for (const trecho of ['setBarcodeFormats(Barcode.FORMAT_QR_CODE)', 'enableAutoZoom()', 'areModulesAvailable', 'if (leituraPendente != call) return']) assert.ok(java.includes(trecho));
  assert.ok(!java.slice(java.indexOf('private boolean autorizarScanner'), java.indexOf('public void estadoScannerNativo')).includes('BuildConfig.DEBUG'));
  for (const trecho of ['Log.', 'Logger.', 'System.out', 'Firebase', 'HttpClient', 'FileOutputStream']) assert.ok(!java.includes(trecho));
});

test('Vite produção não inclui protótipo nativo nem sua interface', async () => {
  const { build } = await import('vite');
  const r = await build({ mode: 'production', logLevel: 'error', build: { write: false, emptyOutDir: false } });
  const chunks = (Array.isArray(r) ? r : [r]).flatMap(x => x.output).filter(x => x.type === 'chunk');
  const nomes = chunks.flatMap(c => Object.keys(c.modules)).join(' ');
  assert.doesNotMatch(nomes, /TesteQrNativo|scannerQrNativo/);
  assert.ok(!chunks.some(c => c.code.includes('Testar leitor nativo')));
});

function ambiente(extra = {}) {
  const estados=[], leituras=[], chamadas=[]; let valido=true, tempo=0;
  const plugin={ estadoScannerNativo:async()=>{chamadas.push('estado');return{disponivel:true};}, prepararScannerNativo:async()=>{chamadas.push('preparar');}, escanearNativo:async()=>{chamadas.push('ler');tempo=1234;return{textoBruto:fixture().link};}, cancelarScannerNativo:async()=>{chamadas.push('cancelar');}, ...extra };
  const sessao=criarTesteQrNativo({plugin,contextoValido:()=>valido,aoEstado:e=>estados.push(e),aoLer:r=>leituras.push(r),agora:()=>tempo});
  return {sessao,estados,leituras,chamadas, invalidar:()=>{valido=false;}};
}
test('nativo exige confirmação explícita, preserva payload e entrega só uma vez',async()=>{
  const b=ambiente();await b.sessao.ler();assert.equal(b.leituras.length,0);
  assert.equal(b.estados.at(-1).fase,'aguardando-confirmacao');assert.equal(b.estados.at(-1).tempoMs,1234);
  assert.doesNotMatch(JSON.stringify(b.estados),/textoBruto|https:|deviceId|uid/);
  b.sessao.confirmar();b.sessao.confirmar();assert.equal(b.leituras.length,1);
  assert.equal(b.leituras[0].textoBruto,fixture().link);assert.equal(b.leituras[0].origem,'android-nativo');
});
test('módulo ausente não baixa nem abre scanner sem gesto de preparação',async()=>{
  const b=ambiente({estadoScannerNativo:async()=>({disponivel:false})});await b.sessao.ler();
  assert.equal(b.estados.at(-1).fase,'modulo-ausente');assert.deepEqual(b.chamadas,[]);
  b.sessao.confirmar();assert.equal(b.leituras.length,0);
  await b.sessao.preparar();assert.deepEqual(b.chamadas,['preparar']);
});
test('pedido de instalação aceito não é confundido com módulo já instalado',async()=>{
  const b=ambiente({estadoScannerNativo:async()=>({disponivel:false})});await b.sessao.preparar();
  assert.equal(b.estados.at(-1).fase,'modulo-ausente');assert.ok(!b.chamadas.includes('ler'));
});
test('preparação confirma disponibilidade sem iniciar captura',async()=>{
  const b=ambiente();await b.sessao.preparar();assert.equal(b.estados.at(-1).fase,'pronto');
  assert.deepEqual(b.chamadas,['preparar','estado']);b.sessao.parar();
});
test('cancelamento e falha não acionam fallback automático nem expõem erro interno',async()=>{
  for(const code of ['qr/cancelado','qr/servicos','qr/indisponivel','UNIMPLEMENTED']){
    const b=ambiente({escanearNativo:async()=>{throw{code,message:'PAYLOAD PRIVADO'};}});await b.sessao.ler();
    assert.equal(b.estados.at(-1).fase,'erro');assert.doesNotMatch(JSON.stringify(b.estados),/PAYLOAD PRIVADO/);
    b.sessao.confirmar();assert.equal(b.leituras.length,0);b.sessao.parar();
  }
});
test('grupo ou UID alterados invalidam resultado pendente e confirmação',async()=>{
  let resolver;const b=ambiente({escanearNativo:()=>new Promise(r=>{resolver=r;})});
  const p=b.sessao.ler();await new Promise(r=>setImmediate(r));b.invalidar();resolver({textoBruto:fixture().link});await p;
  b.sessao.confirmar();assert.equal(b.leituras.length,0);assert.ok(!b.estados.some(e=>e.fase==='aguardando-confirmacao'));b.sessao.parar();
  const c=ambiente();await c.sessao.ler();c.invalidar();c.sessao.confirmar();assert.equal(c.leituras.length,0);c.sessao.parar();
});
test('desmontagem descarta retorno tardio; consulta tardia não abre captura',async()=>{
  for(const etapa of ['estadoScannerNativo','escanearNativo']){
    let resolver;const b=ambiente({[etapa]:()=>new Promise(r=>{resolver=r;})});const p=b.sessao.ler();
    await new Promise(r=>setImmediate(r));b.sessao.parar();const n=b.estados.length;
    resolver(etapa==='estadoScannerNativo'?{disponivel:true}:{textoBruto:fixture().link});await p;
    b.sessao.confirmar();assert.equal(b.estados.length,n);assert.equal(b.leituras.length,0);assert.ok(!b.chamadas.includes('ler'));
  }
});
test('pausa da tela nativa não entrega resultado; confirmar exige retorno e novo gesto',async()=>{
  let resolver;const b=ambiente({escanearNativo:()=>new Promise(r=>{resolver=r;})});const p=b.sessao.ler();
  await new Promise(r=>setImmediate(r));b.sessao.pausar();resolver({textoBruto:fixture().link});await p;
  b.sessao.confirmar();assert.equal(b.leituras.length,0);b.sessao.retomar();assert.equal(b.leituras.length,0);
  b.sessao.confirmar();assert.equal(b.leituras.length,1);
});
test('retomar leitura pendente libera nova tentativa e descarta sucesso tardio',async()=>{
  let resolver, chamadas=0;
  const b=ambiente({escanearNativo:()=>{chamadas++;return chamadas===1?new Promise(r=>{resolver=r;}):Promise.resolve({textoBruto:fixture().link});}});
  const anterior=b.sessao.ler();await new Promise(r=>setImmediate(r));
  b.sessao.pausar();b.sessao.retomar();b.sessao.retomar();
  assert.equal(b.estados.at(-1).fase,'pronto');
  assert.equal(b.chamadas.filter(x=>x==='cancelar').length,1);
  await b.sessao.ler();assert.equal(chamadas,2);
  resolver({textoBruto:fixture().link});await anterior;
  assert.equal(b.estados.at(-1).fase,'aguardando-confirmacao');
  assert.equal(b.leituras.length,0);b.sessao.confirmar();assert.equal(b.leituras.length,1);
});

test('retomada durante consulta não abre captura tardia; erro de cancelamento não bloqueia UI',async()=>{
  let resolver;
  const b=ambiente({estadoScannerNativo:()=>new Promise(r=>{resolver=r;}),cancelarScannerNativo:async()=>{throw new Error('indisponível');}});
  const p=b.sessao.ler();b.sessao.pausar();b.sessao.retomar();
  resolver({disponivel:true});await p;
  assert.equal(b.estados.at(-1).fase,'pronto');assert.ok(!b.chamadas.includes('ler'));
  b.sessao.parar();const n=b.estados.length;b.sessao.pausar();b.sessao.retomar();assert.equal(b.estados.length,n);
});

test('rejeição tardia não sobrescreve nova captura nem libera duplo toque',async()=>{
  let rejeitar,resolver,chamadas=0;
  const b=ambiente({escanearNativo:()=>{chamadas++;return chamadas===1?new Promise((_r,j)=>{rejeitar=j;}):new Promise(r=>{resolver=r;});}});
  const p=b.sessao.ler();await new Promise(r=>setImmediate(r));b.sessao.pausar();b.sessao.retomar();
  const nova=b.sessao.ler();await new Promise(r=>setImmediate(r));rejeitar({code:'qr/cancelado'});await p;
  await b.sessao.ler();assert.equal(chamadas,2);assert.equal(b.estados.at(-1).fase,'lendo');
  b.sessao.parar();resolver({textoBruto:fixture().link});await nova;assert.equal(b.leituras.length,0);
});

test('sair após obter resultado o descarta, sem reutilizar leitura antiga',async()=>{
  const b=ambiente();await b.sessao.ler();b.sessao.pausar();b.sessao.retomar();b.sessao.confirmar();assert.equal(b.leituras.length,0);b.sessao.parar();
});
test('QR arbitrário, vazio ou excessivo não passa pela validação fiscal',async()=>{
  for(const textoBruto of ['https://example.com','', 'x'.repeat(4097)]){
    const b=ambiente({escanearNativo:async()=>({textoBruto})});await b.sessao.ler();b.sessao.confirmar();assert.equal(b.leituras.length,0);b.sessao.parar();
  }
});
test('duplo toque não abre dois scanners',async()=>{
  let resolver;const b=ambiente({escanearNativo:()=>{b.chamadas.push('ler');return new Promise(r=>{resolver=r;});}});
  const p=b.sessao.ler();await new Promise(r=>setImmediate(r));await b.sessao.ler();assert.equal(b.chamadas.filter(x=>x==='ler').length,1);
  b.sessao.parar();resolver({textoBruto:fixture().link});await p;
});
test('adaptador instala e remove listeners; troca de sessão cancela o protótipo',()=>{
  let authCallback,cancelados=0;const janela=new EventTarget(),doc=new EventTarget();
  const c={window:janela,document:doc,registerPlugin:()=>({}),auth:{currentUser:{uid:'a'}},contextoScanner:()=> 'a:g',onAuthStateChanged:(_a,cb)=>{authCallback=cb;return()=>cancelados++;},criarTesteQrNativo:()=>({parar:()=>cancelados++,pausar:()=>{},retomar:()=>{}})};
  vm.createContext(c);vm.runInContext(readFileSync('src/services/scannerQrNativo.js','utf8').split(String.fromCharCode(10)).filter(l=>!l.startsWith('import ')).join(String.fromCharCode(10)).replace(/export /g,''),c);
  const s=c.iniciarTesteQrNativo({aoCancelar:()=>cancelados++});authCallback({uid:'b'});assert.equal(cancelados,2);
  s.parar();const n=cancelados;janela.dispatchEvent(new Event('ap1303-contexto-alterado'));assert.equal(cancelados,n);
});


test('Google é padrão apenas no Android nativo mobile; PWA e iOS preservam leitor web',()=>{
 for(const modo of ['mobile','mobile-release'])assert.equal(preferirLeitorNativo('android',modo),true);
 for(const plataforma of ['web','ios'])for(const modo of ['mobile','mobile-release','production','compras-test'])assert.equal(preferirLeitorNativo(plataforma,modo),false);
 assert.equal(preferirLeitorNativo('android','production'),false);
});

test('bundle Android release inclui integração Google e adaptador de sessão',async()=>{
 const r=await bundle({entryPoints:['src/components/ImportarCupom.jsx'],bundle:true,write:false,metafile:true,splitting:true,format:'esm',outdir:'output/virtual-qr-release',minify:true,logLevel:'silent',loader:{'.png':'dataurl','.jpg':'dataurl','.jpeg':'dataurl','.svg':'dataurl'},define:{'import.meta.env.MODE':JSON.stringify('mobile-release'),'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
 const inputs=Object.keys(r.metafile.inputs).join(' ');
 assert.match(inputs,/TesteQrNativoApp/);assert.match(inputs,/services[/]scannerQrNativo.js/);
 assert.match(inputs,/services[/]scannerQr.js/);assert.match(inputs,/components[/]CameraCupom.jsx/);
});

test('alternativa web é explícita, bloqueada durante captura e libera sessão antes de trocar',()=>{
 let estado={fase:'pronto'},enviar;const refs=[],efeitos=[],eventos=[];let indice=0;
 const react={createElement:(type,props,...children)=>({type,props:props||{},children}),useRef:v=>{const i=indice++;return refs[i]||(refs[i]={current:v});},useState:()=>[estado,e=>{estado=e;}],useEffect:fn=>efeitos.push(fn)};
 const codigo=transformSync(readFileSync('src/components/TesteQrNativo.jsx','utf8'),{loader:'jsx',format:'cjs'}).code;
 const c={React:react,module:{exports:{}},require:n=>{assert.equal(n,'react');return react;}};c.exports=c.module.exports;vm.runInNewContext(codigo,c);
 const props={aoLer:()=>{},fechar:()=>{},usarAlternativo:()=>eventos.push('alternativa'),iniciar:o=>{enviar=o.aoEstado;return{parar:()=>eventos.push('parar'),ler:()=>eventos.push('ler'),preparar:()=>{}};}};
 const render=()=>{indice=0;return c.module.exports.default(props);};
 const procurar=n=>n&&typeof n==='object'?(n.type==='button'&&n.children.includes('Usar outro leitor')?n:n.children.flat().map(procurar).find(Boolean)):null;
 let tela=render();efeitos.forEach(fn=>fn());assert.deepEqual(eventos,[]);
 assert.equal(procurar(tela).props.disabled,false);
 enviar({fase:'lendo'});tela=render();assert.equal(procurar(tela).props.disabled,true);
 enviar({fase:'erro',mensagem:'Módulo indisponível offline'});tela=render();procurar(tela).props.onClick();
 assert.deepEqual(eventos,['parar','alternativa']);
});
