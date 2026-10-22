import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export async function salvarFolhaPagamento({ folha, totais, funcionarioId, versao, fechar = false }) {
  if (!navigator.onLine) throw new Error('Conecte-se para salvar a folha.');
  const revisao = Object.fromEntries(['proventos','descontos','valeTransportePago'].map(c => [c, totais[c]]));
  return (await httpsCallable(functions, 'salvarFolhaPagamento')({ folha, funcionarioId, versao, fechar, revisao })).data;
}
