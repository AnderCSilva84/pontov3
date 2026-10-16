/* global importScripts, firebase */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
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
if (config) {
  importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js");
  firebase.initializeApp(JSON.parse(config));
  firebase.messaging().onBackgroundMessage((payload) => {
    const data = payload.data || {};
    if (data.uid !== parametros.get("uid")) return;
    return self.registration.showNotification(data.title || "App Ponto", {
      body: data.body || "Há uma atualização no app.", icon: "/icon-192.png",
      tag: data.tag, data: { url: data.url || "/ponto" },
    });
  });
}
