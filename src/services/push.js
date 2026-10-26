import { getMessaging, getToken, deleteToken, isSupported, onMessage } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { app, auth, firebaseConfig, functions } from "./firebase";
import {registrarWorker} from './appShell';
import {recursosWeb} from './plataforma';
import {obterGrupoAtual} from './dadosGrupo';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BAqRHo96CSlN9G01QHjJz4IYPkBMLKXPcb3BU5zhSeYhTaWwnC2929RNN53ip718fvXaA_4OlN4JPA7omL6-LQo";
let registroAtual;
let tokenAtual;
let ativacaoPendente;
let versao = 0;
async function bloquearNotificacoes(bloqueado,valida=()=>true) {
  if(!('caches' in globalThis))return;
  const cache=await caches.open('ap1303-push-sessao');
  if(valida())await cache.put('/push-bloqueado',new Response(bloqueado?'1':'0'));
}
export async function suspenderPushLocal({remoto=true}={}) {
  if(!recursosWeb()){try{await (await import('./pushNativo')).suspenderPushAndroid(remoto);}catch{/* Logout não depende de rede. */}return;}
  const atual=++versao,dono=auth.currentUser?.uid;
  const valida=()=>versao===atual&&auth.currentUser?.uid===dono;
  const token=tokenAtual;tokenAtual=null;
  const registro=registroAtual||('serviceWorker' in navigator?await navigator.serviceWorker.getRegistration():null);registroAtual=null;
  await bloquearNotificacoes(true,valida);
  if(!valida())return;
  registro?.active?.postMessage({tipo:'ap1303-bloquear-push'});
  if(remoto&&token&&navigator.onLine)httpsCallable(functions,'removerDispositivoPush')({token}).catch(()=>{});
  const assinatura=await registro?.pushManager.getSubscription();
  if(!valida())return;
  assinatura?.unsubscribe().catch(()=>{});
  await registro?.unregister();
}

export function pushDesativadoManualmente(uid) {
  try { return localStorage.getItem(`pushDesativadoManualmente:${uid}`) === "true"; }
  catch { return false; }
}

function guardarPreferencia(uid, ativa) {
  try { localStorage.setItem(`pushAtivado:${uid}`, String(ativa)); }
  catch { /* O navegador pode bloquear armazenamento persistente. */ }
}

export async function suportaPush() {
  return recursosWeb() && window.isSecureContext && "Notification" in window && "serviceWorker" in navigator && await isSupported();
}

export async function solicitarPermissaoPushNoLogin() {
  if (!recursosWeb()) return;
  // Executado no gesto de enviar o formulário; não espera rede antes do pedido nativo.
  if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator) || Notification.permission !== "default") return;
  try { await Notification.requestPermission(); }
  catch { /* Recusar ou não suportar avisos nunca impede o login. */ }
}

export function registrarPush(uid, solicitarPermissao = true) {
  if (!recursosWeb()) return Promise.reject(new Error('Avisos nativos ainda não estão habilitados nesta versão de desenvolvimento.'));
  if (ativacaoPendente) return ativacaoPendente;
  const atual = versao;
  ativacaoPendente = ativar(uid, solicitarPermissao, atual).finally(() => { ativacaoPendente = null; });
  return ativacaoPendente;
}

async function ativar(uid, solicitarPermissao, atual) {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error("Entre no app para ativar os avisos.");
  const permission = "Notification" in window
    ? (solicitarPermissao && Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission)
    : "unsupported";
  if (!await suportaPush()) throw new Error("Este navegador não suporta notificações. No iPhone, adicione o app à Tela de Início e abra pelo ícone.");
  if (permission !== "granted") throw new Error("Permita as notificações nas configurações do navegador para receber os avisos.");
  const config = encodeURIComponent(JSON.stringify(firebaseConfig));
  const grupo=obterGrupoAtual()||'';
  const registro = await registrarWorker(`/firebase-messaging-sw.js?config=${config}&uid=${encodeURIComponent(uid)}&grupoId=${encodeURIComponent(grupo)}`);
  await navigator.serviceWorker.ready;
  // Espera a versão com o UID correto assumir antes do primeiro aviso.
  const worker = registro.installing || registro.waiting;
  if (worker && worker.state !== "activated") {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("A ativação dos avisos demorou. Tente novamente.")), 15000);
      function verificar() {
        if (worker.state === "activated" || worker.state === "redundant") {
          clearTimeout(timeout); worker.removeEventListener("statechange", verificar);
          if (worker.state === "redundant") reject(new Error("Não foi possível ativar os avisos.")); else resolve();
        }
      }
      worker.addEventListener("statechange", verificar); verificar();
    });
  }
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registro });
  if (!token || auth.currentUser?.uid !== uid || atual !== versao) throw new Error("Não foi possível ativar as notificações nesta sessão.");
  tokenAtual = token;
  registroAtual = registro;
  await httpsCallable(functions, "registrarDispositivoPush")({ token, uid });
  if (auth.currentUser?.uid !== uid || atual !== versao) throw new Error("Sessão alterada durante a ativação.");
  await bloquearNotificacoes(false,()=>auth.currentUser?.uid===uid&&atual===versao);
  guardarPreferencia(uid, true);
  try { localStorage.removeItem(`pushDesativadoManualmente:${uid}`); }
  catch { /* Preferência não persistida em navegadores que bloqueiam armazenamento. */ }
}

export async function desativarPush({ manterPreferencia = false } = {}) {
  if (!recursosWeb()) return;
  versao++;
  const uid = auth.currentUser?.uid;
  if (!manterPreferencia) {
    guardarPreferencia(uid, false);
    try { localStorage.setItem(`pushDesativadoManualmente:${uid}`, "true"); }
    catch { /* Não impede a revogação local da assinatura. */ }
  }
  await ativacaoPendente?.catch(() => {});
  const token = tokenAtual;
  const registro = registroAtual || ("serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null);
  // Revoga no próprio celular mesmo se a remoção remota estiver indisponível.
  try { await (await registro?.pushManager.getSubscription())?.unsubscribe(); }
  finally { await registro?.unregister(); }
  tokenAtual = null;
  registroAtual = null;
  if (token) {
    try { await httpsCallable(functions, "removerDispositivoPush")({ token }); }
    finally { await deleteToken(getMessaging(app)); }
  }
}

export async function testarPush() {
  if (!recursosWeb()) throw new Error('Avisos nativos ainda não estão habilitados.');
  await httpsCallable(functions, "testarNotificacaoPush")({});
}

export async function observarPush(uid) {
  if (!await suportaPush()) return () => {};
  return onMessage(getMessaging(app), async (payload) => {
    if (payload.data?.uid !== uid || (payload.data?.grupoId||'') !== (obterGrupoAtual()||'') || auth.currentUser?.uid !== uid || Notification.permission !== "granted") return;
    const registro = registroAtual || await navigator.serviceWorker.getRegistration();
    await registro?.showNotification(payload.data.title || "App Ponto", {
      body: payload.data.body || "Há uma atualização no app.", icon: "/icon-192.png",
      tag: payload.data.tag, data: { url: payload.data.url || "/ponto" },
      actions: payload.data.url?.startsWith('/lembretes?') ? [{action:'ver-concluir',title:'Ver e concluir'}] : [],
    });
  });
}
