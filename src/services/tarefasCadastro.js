import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export async function cadastrarTarefa(tipo, id, dados) {
  const resposta = await httpsCallable(functions, 'cadastrarTarefa')({ operacao: 'criar', tipo, id, dados });
  return resposta.data;
}
