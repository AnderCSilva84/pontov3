import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export async function gerirAcesso(dados) {
  return (await httpsCallable(functions, 'gerirAcesso')(dados)).data;
}
