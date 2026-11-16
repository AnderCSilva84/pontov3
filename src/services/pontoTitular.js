import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';
import { obterGrupoAtual } from './dadosGrupo';
import { criarTentativasTitular } from '../utils/pontoTitularTentativas';
const armazenamento = () => criarTentativasTitular(localStorage);
const conferir = user => { if (auth.currentUser?.uid !== user.uid || obterGrupoAtual() !== user.grupoId) throw Error('A sessão mudou. A tentativa permanece vinculada à conta original.'); };
const chamar = dados => httpsCallable(functions, 'pontoTitular', { timeout: 30000 })(dados).then(r => r.data);
export function listarTentativasTitular(uid) { return armazenamento().listar(uid); }
export function lerTentativaTitular(user) { return armazenamento().ler(user.uid, user.grupoId); }
export async function consultarPontoTitular(user) { conferir(user); const r = await chamar({ acao: 'consultar' }); conferir(user); return r; }
export async function selecionarPontoTitular(user, funcionarioIds, operacaoId) { conferir(user); const r = await chamar({ acao: 'selecionar', funcionarioIds, operacaoId }); conferir(user); return r; }
export async function registrarPontoTitular(user, payload) {
  conferir(user); armazenamento().salvar(user.uid, user.grupoId, payload);
  const r = await chamar(payload);
  armazenamento().concluir(user.uid, user.grupoId, payload.operacaoId, r);
  conferir(user); return r;
}
export async function reconciliarPontoTitular(user) {
  conferir(user); const d = lerTentativaTitular(user); if (!d) return null;
  const r = await chamar({ acao: 'reconciliar', operacaoId: d.payload.operacaoId });
  if (r.status === 'pendente') return registrarPontoTitular(user, d.payload);
  armazenamento().concluir(user.uid, user.grupoId, d.payload.operacaoId, r);
  conferir(user); return r;
}
export async function reconciliarTerminaisConta(uid, grupoId) {
  for (const d of listarTentativasTitular(uid)) {
    if (d.grupoId !== grupoId) throw Error('Há uma tentativa do terminal em outro grupo. Preserve-a para recuperação antes de excluir a conta.');
    await reconciliarPontoTitular({ uid, grupoId });
  }
}
