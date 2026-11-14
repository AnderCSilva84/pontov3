/* global importScripts, firebase */
// Apenas assets estáticos do build; nenhum fetch de API/Auth/Functions é interceptado.
let shell;
try { importScripts('/app-shell-manifest.js'); shell=self.AP1303_SHELL; } catch { /* Em dev não há manifesto de build. */ }
const prefixoShell='ap1303-shell-';
const cacheShell=shell?prefixoShell+shell.versao:null;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  if(shell){
    const cache=await caches.open(cacheShell),faltantes=[];
    const anteriores=(await caches.keys()).filter(k=>k.startsWith(prefixoShell)&&k!==cacheShell);
    for(const asset of shell.assets){
      if(await cache.match(asset))continue;
      let reaproveitado=false;
      // Nomes em /assets são hashes do build; raízes sem hash nunca vêm de versão antiga.
      if(asset.startsWith('/assets/'))for(const key of anteriores){const r=await(await caches.open(key)).match(asset);if(r){await cache.put(asset,r);reaproveitado=true;break;}}
      if(!reaproveitado)faltantes.push(asset);
    }
    if(faltantes.length)await cache.addAll(faltantes);
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // Sem clientes antigos, é seguro remover versões anteriores. Com abas abertas,
  // preserva chunks antigos para não quebrar imports dinâmicos de telas já carregadas.
  if(shell&&!(await self.clients.matchAll({type:'window',includeUncontrolled:true})).length)
    for(const key of await caches.keys())if(key.startsWith(prefixoShell)&&key!==cacheShell)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(!shell||event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  const pagina=event.request.mode==='navigate'&&/^\/(?:ponto|alimentacao|admin(?:\/financeiro)?|lista-compras(?:\/.*)?|tarefas|avisos|lembretes|cadastro|conta|recuperar-senha|meus-comprovantes|integracoes\/no-bolso)?\/?$/.test(url.pathname);
  if(pagina){event.respondWith(fetch(event.request).catch(()=>caches.open(cacheShell).then(c=>c.match('/index.html'))));return;}
  if(!url.search&&(shell.assets.includes(url.pathname)||url.pathname.startsWith('/assets/')))event.respondWith((async()=>{
    for(const key of [cacheShell,...(await caches.keys()).filter(k=>k.startsWith(prefixoShell)&&k!==cacheShell)]){
      const achado=await (await caches.open(key)).match(event.request);if(achado)return achado;
    }
    return fetch(event.request);
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/ponto", self.location.origin);
  if (destino.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const janela of janelas) {
      if (new URL(janela.url).origin === destino.origin) {
        await janela.navigate(destino.href);
        return janela.focus();
      }
    }
    return self.clients.openWindow(destino.href);
  })());
});
const parametros = new URL(self.location.href).searchParams;
const config = parametros.get("config");
let pushBloqueado=false;
self.addEventListener('message',event=>{if(event.data?.tipo==='ap1303-bloquear-push')pushBloqueado=true;});
if (config) {
  try {
  importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js");
  firebase.initializeApp(JSON.parse(config));
  firebase.messaging().onBackgroundMessage(async (payload) => {
    const bloqueio=await(await caches.open('ap1303-push-sessao')).match('/push-bloqueado');
    if(pushBloqueado||(bloqueio&&await bloqueio.text()==='1'))return;
    const data = payload.data || {};
    if (data.uid !== parametros.get("uid")) return;
    if ((data.grupoId||'') !== (parametros.get('grupoId')||'')) return;
    return self.registration.showNotification(data.title || "Tá no Ponto", {
      body: data.body || "Há uma atualização no app.", icon: "/icon-192.png",
      tag: data.tag, data: { url: data.url || "/ponto" },
      actions: data.url?.startsWith('/lembretes?') ? [{action:'ver-concluir',title:'Ver e concluir'}] : [],
    });
  });
  } catch { /* Sem rede o shell continua disponível; nenhuma confirmação push é simulada. */ }
}
