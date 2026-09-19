import { collection, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export function observarLancamentosFinanceiros(onData, onError) {
  return onSnapshot(collection(db, "financeiro"), (snapshot) => {
    const itens = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    itens.sort((a, b) => String(b.dataPagamento).localeCompare(String(a.dataPagamento)));
    onData(itens);
  }, onError);
}

export async function criarLancamentoFinanceiro(dados) {
  const chamada = httpsCallable(functions, "criarLancamentoFinanceiro");
  return chamada(dados);
}

export async function excluirLancamentoFinanceiro(id) {
  const chamada = httpsCallable(functions, "excluirLancamentoFinanceiro");
  return chamada({ id });
}
