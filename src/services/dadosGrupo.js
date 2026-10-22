import { collection as colecaoFirebase, doc as documentoFirebase } from 'firebase/firestore';
import { db } from './firebase';

let grupoAtual = null;
export function definirGrupoAtual(id) {
  if (id !== null && (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id))) throw new Error('Grupo inválido.');
  grupoAtual = id;
}
export function obterGrupoAtual() { return grupoAtual; }
function argumentos(base, caminho) {
  return base === db && grupoAtual ? [base, 'grupos', grupoAtual, ...caminho] : [base, ...caminho];
}
export function collection(base, ...caminho) { return colecaoFirebase(...argumentos(base, caminho)); }
export function doc(base, ...caminho) { return documentoFirebase(...argumentos(base, caminho)); }
