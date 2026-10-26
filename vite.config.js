import { defineConfig, loadEnv } from "vite";
import {resolverAmbiente,prefixosCliente} from './src/utils/ambiente.js';
import react from "@vitejs/plugin-react";
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

function shellManifest() {
  return {name:'ap1303-shell',enforce:'post',generateBundle:{order:'post',handler(_opcoes,bundle){
    if(!bundle['index.html'])throw Error('Manifesto do shell sem index.html. Build interrompido.');
    const necessarios=new Set(['index.html']);
    function incluir(nome){
      const item=bundle[nome];if(!item||necessarios.has(nome))return;
      necessarios.add(nome);
      if(item.type==='chunk'){
        for(const n of item.imports)incluir(n);
        for(const n of item.viteMetadata?.importedCss||[])incluir(n);
        for(const n of item.viteMetadata?.importedAssets||[])incluir(n);
      }
    }
    for(const m of String(bundle['index.html'].source).matchAll(/(?:src|href)="\/(assets\/[^"?]+)"/g))incluir(m[1]);
    const assets=[...necessarios],publicos=['icon-192.png','icon-512.png','manifest.json'];
    const hash=createHash('sha256');
    for(const n of [...assets].sort())hash.update(n).update(bundle[n].type==='asset'?bundle[n].source:bundle[n].code);
    for(const n of publicos)hash.update(n).update(readFileSync(new URL('./public/'+n,import.meta.url)));
    const versao=hash.digest('hex').slice(0,20);
    this.emitFile({type:'asset',fileName:'app-shell-manifest.js',source:`self.AP1303_SHELL=${JSON.stringify({versao,assets:[...assets,...publicos].map(n=>'/'+n)})};`});
  }}};
}

function verificarEdicaoLoja(mode) {
  return {name:'ap1303-edicao-loja',generateBundle(_opcoes,bundle){
    if(mode!=='mobile-release')return;
    const modulos=Object.values(bundle).filter(x=>x.type==='chunk').flatMap(x=>Object.keys(x.modules));
    const proibidos=modulos.filter(x=>/\/(?:pages\/Lembretes\.jsx|components\/(?:LembreteNotificacao|NotificacoesAndroid|NotificacoesPush)\.jsx|utils\/(?:exportarPdfLembretes|lembretesSequencia)\.js|services\/(?:lembretes|push)\.js)$/.test(x));
    if(proibidos.length)throw Error('Módulos de cuidados/web push no bundle da loja: '+proibidos.join(', '));
    this.emitFile({type:'asset',fileName:'edicao-build.json',source:JSON.stringify({edicao:'android-sem-cuidados',modulosSaude:0,verificado:true})});
  }};
}

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const ambiente = resolverAmbiente(loadEnv(mode, process.cwd(), 'VITE_'), mode);
  return {
  define: {'import.meta.env.VITE_AP1303_EDICAO': JSON.stringify(mode === 'mobile-release' ? 'android-sem-cuidados' : 'completa')},
  resolve: {alias: mode === 'mobile-release' ? [
    {find:/^\.\/pages\/Lembretes$/,replacement:fileURLToPath(new URL('./src/pages/LembretesGerais.jsx',import.meta.url))},
    {find:/^(?:\.\/components\/|\.\.\/components\/)NotificacoesAndroid$/,replacement:fileURLToPath(new URL('./src/components/NotificacoesAndroidLoja.jsx',import.meta.url))},
    {find:/^\.\/components\/NotificacoesPush$/,replacement:fileURLToPath(new URL('./src/components/SemPushWeb.jsx',import.meta.url))},
    {find:/^\.\.\/services\/lembretes$/,replacement:fileURLToPath(new URL('./src/services/receitasLoja.js',import.meta.url))},
    {find:/^\.\/push$/,replacement:fileURLToPath(new URL('./src/services/pushLoja.js',import.meta.url))},
  ] : []},
  envPrefix: prefixosCliente(mode),
  plugins: [react(),shellManifest(),verificarEdicaoLoja(mode),...(ambiente.mobile?[{name:'ap1303-mobile-stamp',generateBundle(){this.emitFile({type:'asset',fileName:'mobile-build.json',source:JSON.stringify({versao:1,destino:ambiente.destino,projectId:ambiente.config.projectId,host:ambiente.host,emuladores:ambiente.emuladores})});}}]:[])],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
          ],
          pdf: ["jspdf", "jspdf-autotable"],
        },
      },
    },
  },
};});
