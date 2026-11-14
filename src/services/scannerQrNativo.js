import { registerPlugin } from '@capacitor/core';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { contextoScanner } from './scannerQr';
import { criarTesteQrNativo } from '../utils/scannerQrNativo';

const CameraQr = registerPlugin('CameraQr');
export function iniciarTesteQrNativo(opcoes) {
  const contexto = contextoScanner(), uid = auth.currentUser?.uid;
  const sessao = criarTesteQrNativo({ ...opcoes, plugin: CameraQr, contextoValido: () => Boolean(uid) && contexto === contextoScanner() });
  const cancelar = () => { sessao.parar(); opcoes.aoCancelar(); };
  const voltar = e => { e.preventDefault(); cancelar(); };
  const pausar = () => sessao.pausar(), retomar = () => sessao.retomar();
  const ocultar = () => { if (document.hidden) pausar(); else retomar(); };
  const eventos = ['ap1303-ponto-sair', 'ap1303-contexto-alterado', 'popstate', 'pagehide'];
  eventos.forEach(n => window.addEventListener(n, cancelar));
  window.addEventListener('ap1303-voltar', voltar);
  window.addEventListener('ap1303-pausar', pausar);
  window.addEventListener('ap1303-retomar', retomar);
  document.addEventListener('visibilitychange', ocultar);
  const sairAuth = onAuthStateChanged(auth, u => { if (u?.uid !== uid) cancelar(); });
  return { ...sessao, parar() {
    sessao.parar(); sairAuth();
    eventos.forEach(n => window.removeEventListener(n, cancelar));
    window.removeEventListener('ap1303-voltar', voltar);
    window.removeEventListener('ap1303-pausar', pausar);
    window.removeEventListener('ap1303-retomar', retomar);
    document.removeEventListener('visibilitychange', ocultar);
  } };
}
