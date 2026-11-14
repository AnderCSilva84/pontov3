import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { filtrarDiagnosticoNativo } from '../src/utils/diagnosticoQrNativo.js';
const base={entryPoints:['src/main.jsx'],bundle:true,write:false,metafile:true,splitting:true,format:'esm',outdir:'output/virtual-apk-qr',minify:true,logLevel:'silent',loader:{'.png':'dataurl','.jpg':'dataurl','.jpeg':'dataurl','.svg':'dataurl'}};
async function gerar(modo,flag='true',destino='teste',emuladores='true'){
 return build({...base,define:{'import.meta.env.MODE':JSON.stringify(modo),'import.meta.env.DEV':'false','import.meta.env.PROD':'true','import.meta.env.VITE_AP1303_QR_NATIVO_TESTE':JSON.stringify(flag),'import.meta.env.VITE_AP1303_DESTINO':JSON.stringify(destino),'import.meta.env.VITE_TEST_FIREBASE_EMULADORES':JSON.stringify(emuladores)}});
}
test('APK de comparação carrega os dois leitores sem Firebase JS, Compras ou App',async()=>{
 const r=await gerar('mobile');const inputs=Object.keys(r.metafile.inputs).join(' ');
 assert.match(inputs,/CompararQrAndroid/);assert.match(inputs,/CameraCupom/);assert.match(inputs,/TesteQrNativo/);
 assert.doesNotMatch(inputs,/firebase|ImportarCupom|ComprasModulo|src[/]App.jsx|services[/]compras/);
});
test('entrada isolada não entra em release, sem opt-in ou com destino remoto',async()=>{
 for(const args of [['mobile-release'],['production'],['mobile','false'],['mobile','true','producao'],['mobile','true','teste','false']]){
  const r=await gerar(...args);assert.ok(!Object.keys(r.metafile.inputs).some(p=>p.includes('CompararQrAndroid')));
 }
});

test('diagnóstico nativo aceita apenas estados e contadores sem conteúdo ou identificadores',()=>{
 const r=filtrarDiagnosticoNativo({travaAtiva:true,chamadaPendente:'true',taskPendente:false,telasCriadas:1,telasDestruidas:NaN,telasRetomadas:-1,tasksConcluidas:Infinity,textoBruto:'PRIVADO',uid:'SEGREDO',imagem:'IMAGEM'});
 assert.equal(r.travaAtiva,true);assert.equal(r.chamadaPendente,false);assert.equal(r.telasCriadas,1);
 assert.equal(r.telasDestruidas,0);assert.equal(r.telasRetomadas,0);assert.equal(r.tasksConcluidas,0);
 assert.equal(Object.keys(r).length,13);assert.doesNotMatch(JSON.stringify(r),/PRIVADO|SEGREDO|IMAGEM/);
 for(const chave of ['textoBruto','uid','imagem']) assert.equal(Object.hasOwn(r,chave),false);
});

test('observação nativa é explícita, restrita ao debug e removida na destruição',()=>{
 const java=readFileSync('android/app/src/main/java/br/dev/acstech/ap1303/dev/CameraQrPlugin.java','utf8');
 const metodo=java.slice(java.indexOf('public void diagnosticoSessaoNativa'),java.indexOf('private GmsBarcodeScanner scanner()'));
 assert.match(metodo,/if \(!BuildConfig.DEBUG\)/);assert.match(metodo,/registerActivityLifecycleCallbacks/);assert.match(metodo,/unregisterActivityLifecycleCallbacks/);
 assert.doesNotMatch(metodo,/startScan|scannerAberto =|leituraPendente =|textoBruto|File|Log\./);
 assert.match(java.slice(java.indexOf('protected void handleOnDestroy')),/unregisterActivityLifecycleCallbacks/);
 const pagina=readFileSync('src/pages/CompararQrAndroid.jsx','utf8');
 assert.match(pagina,/onClick=\{atualizarDiagnostico\}/);assert.match(pagina,/filtrarDiagnosticoNativo\(estado\)/);
 assert.doesNotMatch(pagina,/setInterval|localStorage|sessionStorage|fetch\(/);
});
