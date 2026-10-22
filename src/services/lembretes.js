import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export async function operarLembrete(operacao, dados = {}) {
  if (!navigator.onLine) throw new Error('Conecte-se para salvar ou concluir um lembrete.');
  return (await httpsCallable(functions, 'lembretesOperacao')({ ...dados, operacao })).data;
}
