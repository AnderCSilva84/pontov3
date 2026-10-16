import { useEffect } from "react";
import { registrarPush, observarPush, pushDesativadoManualmente } from "../services/push";

export default function NotificacoesPush({ uid }) {
  useEffect(() => {
    let cancelado = false;
    let unsubscribe;
    observarPush(uid).then((fn) => { if (cancelado) fn(); else unsubscribe = fn; }).catch(() => {});
    function reconectar() {
      if (cancelado || !("Notification" in window) || Notification.permission !== "granted" || pushDesativadoManualmente(uid)) return;
      registrarPush(uid, false).catch(() => {
        if (!cancelado) console.warn("Não foi possível reconectar os avisos. Uma nova tentativa ocorrerá ao voltar ao app ou recuperar a conexão.");
      });
    }
    function voltarAoApp() { if (document.visibilityState === "visible") reconectar(); }
    reconectar();
    window.addEventListener("online", reconectar);
    document.addEventListener("visibilitychange", voltarAoApp);
    return () => {
      cancelado = true; unsubscribe?.();
      window.removeEventListener("online", reconectar);
      document.removeEventListener("visibilitychange", voltarAoApp);
    };
  }, [uid]);
  return null;
}