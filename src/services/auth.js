import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db, firebaseConfig, functions, ambiente } from "./firebase";
import { suspenderPushLocal, solicitarPermissaoPushNoLogin } from "./push";
import { getDefaultPermissionsForRole, normalizeRole, ROLE_FUNCIONARIO } from "../utils/roles";
import { definirGrupoAtual, obterGrupoAtual } from './dadosGrupo';
import { filaPonto, escopoPonto, EM_ABERTO } from './pontoFila';
import {criarCadastroTitular} from './cadastroTitular';
import {resumirPendencias,textoPendencias} from '../utils/cicloConta';
const cadastrosPendentes = new Map();

// Login
export async function login(email, password) {
  if (!ambiente.teste) await solicitarPermissaoPushNoLogin();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Logout
export async function logout() {
  const dono=auth.currentUser?.uid;
  if(auth.currentUser){
    const grupo=obterGrupoAtual();
    try {
      const fila=await filaPonto.listar(escopoPonto(auth.currentUser.uid,grupo?{tipo:'grupo',id:grupo}:{tipo:'legado'}));
      if(auth.currentUser?.uid!==dono)return;
      if(fila.some(o=>EM_ABERTO.includes(o.status))&&!window.confirm(textoPendencias(resumirPendencias(fila))+'\nSair preservando essas operações neste aparelho? Só a mesma conta e grupo poderão retomá-las. Cancelar mantém você conectado.'))return;
    } catch { if(!window.confirm('Não foi possível conferir a fila de ponto. Sair sem apagar as tentativas locais?'))return; }
  }
  if(auth.currentUser?.uid!==dono)return;
  window.dispatchEvent(new Event('ap1303-ponto-sair'));
  cadastrosPendentes.clear();
  if(dono)try{await (await import('./pdfArquivos')).limparPdfsConta(dono);}catch{/* Sem apagar pendências ou impedir a saída; limpeza local retoma no próximo evento. */}
  try { await suspenderPushLocal(); }
  catch { console.warn("Não foi possível concluir a revogação local dos avisos. Revise a permissão de notificações deste navegador."); }
  finally { if(auth.currentUser?.uid===dono)await signOut(auth); }
}

// Observador de login
export function observeAuth(callback) {
  let versao = 0;
  let pararPerfil;
  let pararVinculo;
  let versaoVinculo = 0;
  const pararAuth = onAuthStateChanged(auth, (user) => {
    const atual = ++versao;
    pararPerfil?.();
    pararVinculo?.();
    if (!user) {
      definirGrupoAtual(null);
      callback(null);
      return;
    }

    callback(undefined);
    pararVinculo = onSnapshot(doc(db, 'vinculosUsuarios', user.uid), vinculo => {
      if (atual !== versao) return;
      if(auth.currentUser?.uid!==user.uid)return;
      callback(undefined);
      const vinculoAtual = ++versaoVinculo;
      pararPerfil?.();
      // Ausência no cache offline não comprova ausência de vínculo no servidor.
      // Não cair no legado nem encerrar o contexto da notificação antes da resposta.
      if (!vinculo.exists() && vinculo.metadata?.fromCache) return;
      const grupoId = vinculo.exists() ? vinculo.data().grupoId : null;
      if (vinculo.exists() && (vinculo.data().ativo === false || typeof grupoId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(grupoId))) { definirGrupoAtual(null); callback(null); return; }
      definirGrupoAtual(grupoId);
      const ref = grupoId ? doc(db, 'grupos', grupoId, 'users', user.uid) : doc(db, 'users', user.uid);
      pararPerfil = onSnapshot(ref, userDoc => {
      if (atual !== versao || vinculoAtual !== versaoVinculo || auth.currentUser?.uid !== user.uid) return;
      if (!userDoc.exists() && userDoc.metadata?.fromCache) { callback(undefined); return; }
      if (!userDoc.exists() || userDoc.data().ativo === false) {
        callback(null);
        return;
      }
      callback({ ...userDoc.data(), uid: user.uid, grupoId });
    }, error => {
      console.error("Falha ao carregar perfil de acesso:", error.code);
      if (atual === versao && vinculoAtual === versaoVinculo) callback(null);
      });
    }, () => { if (atual === versao) { versaoVinculo++;pararPerfil?.();definirGrupoAtual(null); callback(null); } });
  });
  return () => { versao++; pararPerfil?.(); pararVinculo?.(); pararAuth(); };
}

export async function criarUsuario({ nome, email, senha, role, criadoPor }) {
  if (obterGrupoAtual()) {
    const chave = `${auth.currentUser?.uid}:${obterGrupoAtual()}:${email.trim().toLowerCase()}:${normalizeRole(role)}`;
    if (!cadastrosPendentes.has(chave)) cadastrosPendentes.set(chave, crypto.randomUUID());
    const resposta = await httpsCallable(functions, 'criarMembroGrupo')({ nome, email, senha, role: normalizeRole(role), chaveOperacao: cadastrosPendentes.get(chave) });
    cadastrosPendentes.delete(chave);
    return resposta.data;
  }
  const secondaryApp = initializeApp(firebaseConfig, `app-ponto-admin-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  if (ambiente.emuladores) connectAuthEmulator(secondaryAuth, `http://${ambiente.host}:9098`, {disableWarnings:true});

  try {
    const roleNormalizado = normalizeRole(role);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
    const uid = userCredential.user.uid;
    const funcionarioId = roleNormalizado === ROLE_FUNCIONARIO ? uid : null;
    const batch = writeBatch(db);

    batch.set(doc(db, "users", uid), {
      nome,
      email,
      role: roleNormalizado,
      ativo: true,
      funcionarioId,
      permissions: getDefaultPermissionsForRole(roleNormalizado),
      criadoPor: criadoPor || null,
      criadoEm: serverTimestamp(),
    });

    if (roleNormalizado === ROLE_FUNCIONARIO) {
      batch.set(doc(db, "funcionarios", uid), {
        nome,
        email,
        ativo: true,
        cargaSegSexMin: 480,
        cargaSabadoMin: 0,
        locaisPermitidos: [],
        criadoPor: criadoPor || null,
        criadoEm: serverTimestamp(),
      });
    }

    await batch.commit();
    return { uid, funcionarioId };
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export async function excluirUsuario(uid) {
  const callable = httpsCallable(functions, "excluirUsuario");
  return callable({ uid });
}

const cadastroTitular=criarCadastroTitular({
  sessao:()=>auth.currentUser,
  criarConta:(email,senha)=>createUserWithEmailAndPassword(auth,email,senha),
  criarGrupo:dados=>httpsCallable(functions,'criarGrupo',{timeout:30000})(dados).then(r=>r.data),
  armazenamento:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)},
  projeto:firebaseConfig.projectId,
  alterado:()=>window.dispatchEvent(new Event('ap1303-cadastro-alterado')),
});
export const cadastrarTitular=dados=>cadastroTitular.cadastrar(dados);
export function observarCadastroTitular(callback) {
  const atualizar=()=>callback({autenticada:!!auth.currentUser,rascunho:cadastroTitular.pendente()});
  const parar=onAuthStateChanged(auth,atualizar);
  window.addEventListener('ap1303-cadastro-alterado',atualizar);
  return()=>{parar();window.removeEventListener('ap1303-cadastro-alterado',atualizar);};
}
