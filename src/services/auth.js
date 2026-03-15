import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

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