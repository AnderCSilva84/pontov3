import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import {resolverAmbiente} from '../utils/ambiente';

export const ambiente = resolverAmbiente(import.meta.env, import.meta.env.MODE);
export const firebaseConfig = ambiente.config;

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
if (ambiente.emuladores) {
  connectAuthEmulator(auth, `http://${ambiente.host}:9098`, { disableWarnings: true });
  connectFirestoreEmulator(db, ambiente.host, 8877);
  connectFunctionsEmulator(functions, ambiente.host, 5007);
}
