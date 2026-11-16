import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function consultarAssinatura() {
  const resposta = await httpsCallable(functions, 'consultarAssinatura', { timeout: 30000 })({});
  return resposta.data;
}
