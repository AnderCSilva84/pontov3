import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function cadastrarFuncionario(operacao, id, nome) {
  const resposta = await httpsCallable(functions, 'cadastrarFuncionario')({ operacao, id, ...(nome !== undefined ? { nome } : {}) });
  return resposta.data;
}
