import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build, transformSync } from 'esbuild';
import { build as buildVite } from 'vite';

const base = { entryPoints: ['src/main.jsx'], bundle: true, write: false, metafile: true, splitting: true, format: 'esm', outdir: 'output/virtual-qr-check', logLevel: 'silent', minify: true, loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.svg': 'dataurl' } };
async function bundle(dev, destino, caminho) {
  return build({ ...base, define: { 'import.meta.env.DEV': String(dev), 'import.meta.env.PROD': String(!dev), 'import.meta.env.VITE_AP1303_DESTINO': JSON.stringify(destino), 'import.meta.env.MODE': JSON.stringify(dev ? 'compras-test' : 'production'), ...(dev ? { 'window.location.pathname': JSON.stringify(caminho) } : {}) } });
}
test('bundle real de produção exclui tela exclusiva e endereço de diagnóstico', async () => {
  const r = await bundle(false, 'emuladores', '/diagnostico-qr');
  assert.ok(!Object.keys(r.metafile.inputs).some(p => p.includes('pages/DiagnosticoQr')));
  assert.ok(!r.outputFiles.some(f => f.text.includes('/diagnostico-qr')));
});
test('entrada DEV emuladores carrega leitor real sem Firebase, Compras ou rede fiscal', async () => {
  const r = await bundle(true, 'emuladores', '/diagnostico-qr');
  const entradas = Object.keys(r.metafile.inputs).join('\n');
  assert.match(entradas, /components[/]CameraCupom/);
  assert.match(entradas, /utils[/]scannerQr/);
  assert.match(entradas, /@zxing/);
  assert.doesNotMatch(entradas, /firebase|ImportarCupom|ComprasModulo|services[/]compras|services[/]dadosGrupo|src[/]App.jsx/);
  const pagina=readFileSync('src/pages/DiagnosticoQr.jsx','utf8');
  assert.doesNotMatch(pagina, /fetch|httpsCallable|localStorage|sessionStorage|textoBruto|window.open/);
});
test('DEV sem destino emuladores não inclui a tela exclusiva', async () => {
  const r=await bundle(true,'producao','/diagnostico-qr');
  assert.ok(!Object.keys(r.metafile.inputs).some(p=>p.includes('pages/DiagnosticoQr')));
});
for (const ligado of [false, true]) test('componente limpa câmera, diagnóstico e sessão: diagnóstico ' + ligado, () => {
  const estados=[], efeitos=[], chamadas=[]; let indice=0, cancelarSessao, resultado, diagnostico;
  const react={ createElement:()=>null, useRef:v=>({current:v}), useState:v=>{const n=indice++;estados[n]=n===0?ligado:v;return[estados[n],x=>chamadas.push(['estado',x])];}, useEffect:fn=>efeitos.push(fn) };
  const codigo=transformSync(readFileSync('src/components/CameraCupom.jsx','utf8'),{loader:'jsx',format:'cjs'}).code;
  const contexto={React:react,module:{exports:{}},exports:{},setTimeout:()=>1,clearTimeout:()=>chamadas.push('timer'), window:{},document:{},navigator:{},require:n=>{
    if(n==='react')return react;
    if(n.includes('scannerQrCamera'))return{iniciarScannerQrCamera(){},cameraAndroid:()=>false};
    if(n.includes('utils/scannerQr'))return{conectarCicloScanner:()=>()=>chamadas.push('ciclo')};
    if(n.includes('cupomQr'))return{normalizarQrCupom:()=>true};
    throw Error(n);
  }};
  contexto.exports=contexto.module.exports;vm.runInNewContext(codigo,contexto);
  contexto.module.exports.default({aoLer:()=>chamadas.push('leitura'),fechar:()=>chamadas.push('fechar'),adaptador:{iniciar:o=>{resultado=o.aoLer;diagnostico=o.aoDiagnostico;return{parar:()=>chamadas.push('parar')};},observarCancelamento:c=>{cancelarSessao=c;return()=>chamadas.push('sessao');}}});
  const limpezas=efeitos.map(fn=>fn()); assert.equal(estados[0],ligado);assert.equal(typeof diagnostico,ligado?'function':'undefined');
  cancelarSessao();assert.ok(chamadas.includes('parar'));assert.ok(chamadas.includes('fechar'));
  limpezas.filter(Boolean).forEach(fn=>fn());const n=chamadas.length;resultado({textoBruto:'nao deve ser entregue'});if(diagnostico)diagnostico({});assert.equal(chamadas.length,n);
  assert.ok(chamadas.includes('sessao'));assert.ok(chamadas.includes('ciclo'));assert.ok(chamadas.includes('timer'));
});
test('adaptador normal conserva cancelamento por troca de usuário', () => {
  const fonte=readFileSync('src/components/ImportarCupom.jsx','utf8');
  const trecho=fonte.slice(fonte.indexOf('const adaptadorCameraApp'),fonte.indexOf('const destinoSeguro'));
  let observar,cancelamentos=0,removidos=0;
  const c={auth:{currentUser:{uid:'a'}},iniciarScannerQr:()=>{},onAuthStateChanged:(_a,fn)=>{observar=fn;return()=>removidos++;}};
  vm.runInNewContext(trecho+';this.adaptador=adaptadorCameraApp;',c);
  const limpar=c.adaptador.observarCancelamento(()=>cancelamentos++);
  observar({uid:'a'});assert.equal(cancelamentos,0);observar({uid:'b'});observar(null);assert.equal(cancelamentos,2);limpar();assert.equal(removidos,1);
});


test('Vite com configuração real também elimina rota de diagnóstico em produção', async () => {
  const r=await buildVite({mode:'production',logLevel:'error',build:{write:false,emptyOutDir:false}});
  const chunks=(Array.isArray(r)?r:[r]).flatMap(x=>x.output).filter(x=>x.type==='chunk');
  assert.ok(!chunks.flatMap(c=>Object.keys(c.modules)).some(p=>p.includes('/pages/DiagnosticoQr.jsx')));
  assert.ok(!chunks.some(c=>c.code.includes('/diagnostico-qr')));
});
