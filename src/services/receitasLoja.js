import {httpsCallable} from 'firebase/functions';
import {functions} from './firebase';
// Apenas receitas culinárias; não disponibiliza comandos de cuidados.
export async function operarLembrete(operacao,dados={}) {
  if(!['listarPratos','salvarPrato','arquivarPrato','obterPrato','buscarImagemReceita'].includes(operacao))throw new Error('Recurso indisponível nesta edição.');
  if(!navigator.onLine)throw new Error('Conecte-se para consultar ou salvar receitas.');
  return (await httpsCallable(functions,'lembretesOperacao')({...dados,operacao})).data;
}
