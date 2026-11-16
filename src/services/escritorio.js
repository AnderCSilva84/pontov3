import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export async function operarEscritorio(operacao, id, dados) {
  const r = await httpsCallable(functions, 'escritorioOperacao')({ operacao, id, ...(dados ? { dados } : {}) });
  return r.data;
}
