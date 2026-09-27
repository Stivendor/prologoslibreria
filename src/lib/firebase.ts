import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Config web de Firebase (claves públicas — seguras de exponer en el cliente).
// Se completan en .env cuando Prólogos cree el proyecto en Firebase.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Solo se inicializa si hay credenciales. Mientras tanto, la app funciona con
// los datos de ejemplo locales (seed) y el panel /admin queda deshabilitado.
const configurado = Boolean(config.apiKey && config.projectId);

export const app: FirebaseApp | null = configurado ? initializeApp(config) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const auth: Auth | null = app ? getAuth(app) : null;
export const usandoFirebase = db !== null;

// Storage no se inicializa aquí a propósito: solo lo necesita el panel
// (LibroForm, chunk lazy) y arrastrarlo aquí metía ~21 kB en el bundle inicial.
// Ver src/lib/storage.ts.
