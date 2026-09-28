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

// UIDs de los administradores (mismos que en firebase/firestore.rules y
// src/config.ts).
export const ADMIN_UIDS = [
  'Ie9PZpQ2b3V2DnOHMCtPpKo0cTD3', // admin@gmail.com
  'MLMKGU0Pvmex6W7gPCYqRS99KQ92', // stivendor101@gmail.com
];

export const esAdminUid = (uid: string) => ADMIN_UIDS.includes(uid);
