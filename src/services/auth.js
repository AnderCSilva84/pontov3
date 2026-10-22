import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db, firebaseConfig, functions } from "./firebase";
import { desativarPush, solicitarPermissaoPushNoLogin } from "./push";
import { getDefaultPermissionsForRole, normalizeRole, ROLE_FUNCIONARIO } from "../utils/roles";
import { definirGrupoAtual, obterGrupoAtual } from './dadosGrupo';
const cadastrosPendentes = new Map();

// Login
export async function login(email, password) {
  if (!(import.meta.env.DEV && import.meta.env.MODE === 'compras-test')) await solicitarPermissaoPushNoLogin();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Logout
export async function logout() {
  cadastrosPendentes.clear();
  try { await desativarPush({ manterPreferencia: true }); }
  catch { console.warn("Não foi possível remover o cadastro remoto de avisos ao sair."); }
  finally { await signOut(auth); }
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
      const vinculoAtual = ++versaoVinculo;
      pararPerfil?.();
      const grupoId = vinculo.exists() ? vinculo.data().grupoId : null;
      if (vinculo.exists() && (vinculo.data().ativo === false || typeof grupoId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(grupoId))) { definirGrupoAtual(null); callback(null); return; }
      definirGrupoAtual(grupoId);
      const ref = grupoId ? doc(db, 'grupos', grupoId, 'users', user.uid) : doc(db, 'users', user.uid);
      pararPerfil = onSnapshot(ref, userDoc => {
      if (atual !== versao || vinculoAtual !== versaoVinculo || auth.currentUser?.uid !== user.uid) return;
      if (!userDoc.exists() || userDoc.data().ativo === false) {
        callback(null);
        return;
      }
      callback({ ...userDoc.data(), uid: user.uid, grupoId });
    }, error => {
      console.error("Falha ao carregar perfil de acesso:", error.code);
      if (atual === versao && vinculoAtual === versaoVinculo) callback(null);
      });
    }, () => { if (atual === versao) { definirGrupoAtual(null); callback(null); } });
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

export async function cadastrarTitular({ nome, email, senha, nomeGrupo }) {
  if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== email.trim().toLowerCase()) await createUserWithEmailAndPassword(auth, email, senha);
  return (await httpsCallable(functions, 'criarGrupo')({ nome, nomeGrupo })).data;
}
