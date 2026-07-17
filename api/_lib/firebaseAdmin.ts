import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialización del Admin SDK para las Vercel Functions. Las credenciales
// llegan por env (FIREBASE_SERVICE_ACCOUNT: el JSON del service account).
// Nunca en el bundle del cliente — esto solo corre en el servidor.

let app: App | undefined;

function getApp(): App {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT en el entorno.');
  const cuenta = JSON.parse(raw);
  app = initializeApp({ credential: cert(cuenta) });
  return app;
}

export const adminDb = () => getFirestore(getApp());
export const adminAuth = () => getAuth(getApp());

// UID del administrador (mismo que en firebase/firestore.rules).
export const ADMIN_UID = 'MLMKGU0Pvmex6W7gPCYqRS99KQ92';
