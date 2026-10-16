import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db, firebaseConfig, functions } from "./firebase";
import { desativarPush, solicitarPermissaoPushNoLogin } from "./push";
import { getDefaultPermissionsForRole, normalizeRole, ROLE_FUNCIONARIO } from "../utils/roles";

// Login
export async function login(email, password) {
  if (!(import.meta.env.DEV && import.meta.env.MODE === 'compras-test')) await solicitarPermissaoPushNoLogin();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Logout
export async function logout() {
  try { await desativarPush({ manterPreferencia: true }); }
  catch { console.warn("Não foi possível remover o cadastro remoto de avisos ao sair."); }
  finally { await signOut(auth); }
}

// Observador de login
export function observeAuth(callback) {
  let versao = 0;
  return onAuthStateChanged(auth, async (user) => {
    const atual = ++versao;
    if (!user) {
      callback(null);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (atual !== versao || auth.currentUser?.uid !== user.uid) return;
      if (!userDoc.exists() || userDoc.data().ativo === false) {
        callback(null);
        return;
      }
      callback({ ...userDoc.data(), uid: user.uid });
    } catch (error) {
      console.error("Falha ao carregar perfil de acesso:", error.code);
      if (atual === versao) callback(null);
    }
  });
}

export async function criarUsuario({ nome, email, senha, role, criadoPor }) {
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
