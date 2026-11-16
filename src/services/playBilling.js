import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { obterGrupoAtual } from './dadosGrupo';
import { criarSessaoPlayBilling } from '../utils/playBilling';

const ponte = registerPlugin('PlayBilling');
export const playBillingDisponivel = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export function abrirSessaoPlayBilling() {
  return criarSessaoPlayBilling({
    ponte,
    contexto: () => auth.currentUser ? { uid: auth.currentUser.uid, grupoId: obterGrupoAtual() } : null,
    novoId: () => crypto.randomUUID(),
    hash: async texto => {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    },
  });
}

export async function restaurarComprasTestePlay(user) {
  const conferir = () => {
    if (auth.currentUser?.uid !== user.uid || obterGrupoAtual() !== user.grupoId) throw Error('A sessão mudou. Abra os planos novamente.');
  };
  if (!playBillingDisponivel()) throw Error('Validação disponível no Android instalado pela Google Play.');
  conferir();
  const sessao = abrirSessaoPlayBilling();
  try {
    const resultado = await sessao.consultarCompras(); conferir();
    let confirmadas = 0, pendentes = 0;
    for (const compra of resultado.compras || []) {
      conferir();
      if (compra.pendente) { pendentes++; continue; }
      const r = await httpsCallable(functions, 'processarCompraPlayTeste', { timeout: 60000 })({ token: compra.token });
      conferir();
      if (r.data?.direitosConcedidos === true && r.data.teste === true) confirmadas++;
    }
    return { confirmadas, pendentes };
  } finally { await sessao.encerrar().catch(() => {}); }
}
