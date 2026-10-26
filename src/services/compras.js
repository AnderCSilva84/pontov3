import {nomesProdutosMaiusculos} from '../utils/nomeProduto';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function operarCompras(operacao, dados = {}) {
  if (!navigator.onLine) throw new Error('Você está sem conexão. Conecte-se para salvar a compra.');
  const chamada = httpsCallable(functions, 'comprasOperacao', { timeout: 65000 });
  return (await chamada({ ...dados, operacao })).data;
}
export async function consultarPrecos(inicioMs, fimMs, tipoCompra = 'supermercado') {
  if (!navigator.onLine) throw new Error('Conecte-se para consultar os preços confirmados.');
  const dados=(await httpsCallable(functions, 'comprasRelatorio', { timeout: 65000 })({ inicioMs, fimMs, tipoCompra })).data;
  return {...dados,registros:dados.registros.map(nomesProdutosMaiusculos)};
}
export async function consultarEstimativa(listaId) {
  if (!navigator.onLine) throw new Error('Conecte-se para atualizar a estimativa.');
  return (await httpsCallable(functions, 'comprasEstimativa', { timeout: 65000 })({ listaId })).data;
}
