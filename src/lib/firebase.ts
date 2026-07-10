import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
// los datos de ejemplo locales (seed).
const configurado = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

if (configurado) {
  app = initializeApp(config);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const usandoFirebase = dbInstance !== null;
