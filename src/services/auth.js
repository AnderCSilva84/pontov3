import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";
import { ROLE_FUNCIONARIO } from "../utils/roles";

// Login
export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Logout
export async function logout() {
  await signOut(auth);
}

// Observador de login
export function observeAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      callback(null);
      return;
    }

    callback({
      uid: user.uid,
      ...userDoc.data(),
    });
  });
}

export async function criarUsuario({ nome, email, senha, role, criadoPor }) {
  const secondaryApp = initializeApp(firebaseConfig, `app-ponto-admin-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
    const uid = userCredential.user.uid;
    const funcionarioId = role === ROLE_FUNCIONARIO ? uid : null;
    const batch = writeBatch(db);

    batch.set(doc(db, "users", uid), {
      nome,
      email,
      role,
      ativo: true,
      funcionarioId,
      criadoPor: criadoPor || null,
      criadoEm: serverTimestamp(),
    });

    if (role === ROLE_FUNCIONARIO) {
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
