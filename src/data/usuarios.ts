import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Perfil, UsuarioCliente } from '../types';
import { db } from '../lib/firebase';

// Capa de acceso a datos de las cuentas de cliente (colección usuarios/{uid}).
// Firestore-only: sin Firebase no hay cuentas (la tienda sigue en modo seed).

const PERFIL_VACIO: Perfil = { nombre: '', telefono: '', ciudad: '', direccion: '' };

// Crea el documento de la cuenta. Se llama al registrarse y también como
// auto-sanación si un usuario inicia sesión y su documento no existe.
export async function crearPerfil(uid: string, email: string): Promise<void> {
  if (!db) return;
  await setDoc(
    doc(db, 'usuarios', uid),
    { ...PERFIL_VACIO, email, activo: true, creado_en: serverTimestamp() },
    { merge: true }
  );
}

// Suscripción en vivo al perfil: así el checkout y /cuenta comparten siempre
// los datos más recientes (si el cliente guarda en /cuenta, el modal se entera).
// Devuelve el unsubscribe; callback(null) cuando el documento no existe.
export function suscribirsePerfil(
  uid: string,
  callback: (perfil: Perfil | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'usuarios', uid),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const d = snap.data();
      callback({
        nombre: d.nombre ?? '',
        telefono: d.telefono ?? '',
        ciudad: d.ciudad ?? '',
        direccion: d.direccion ?? '',
      });
    },
    (error) => {
      console.error('Error en la suscripción del perfil', error);
      onError?.(error);
    }
  );
}

// Lee la cuenta completa (perfil + estado). Devuelve null si no existe.
export async function obtenerCuenta(uid: string): Promise<UsuarioCliente | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<UsuarioCliente, 'uid'>) };
}

// Guarda los datos de envío del propio usuario (o los corrige el admin).
export async function guardarPerfil(uid: string, datos: Perfil): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado.');
  await setDoc(
    doc(db, 'usuarios', uid),
    { ...datos, actualizado_en: serverTimestamp() },
    { merge: true }
  );
}

// Lista en tiempo real de todas las cuentas, más recientes primero.
// Devuelve el unsubscribe (solo tiene sentido siendo administrador).
export function suscribirseUsuarios(
  callback: (usuarios: UsuarioCliente[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db) return () => {};
  const q = query(collection(db, 'usuarios'), orderBy('creado_en', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })) as UsuarioCliente[]);
    },
    (error) => {
      console.error('Error en la suscripción de usuarios', error);
      onError?.(error);
    }
  );
}

// El admin corrige los datos de envío de una cuenta ajena.
export async function actualizarPerfilAdmin(uid: string, datos: Perfil): Promise<void> {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  await updateDoc(doc(db, 'usuarios', uid), { ...datos, actualizado_en: serverTimestamp() });
}

// Activa o desactiva una cuenta desde el panel (el bloqueo real del login lo
// hace firebase/usuarios-admin.mjs con el Admin SDK: disabled de Auth).
export async function cambiarEstadoUsuario(uid: string, activo: boolean): Promise<void> {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  await updateDoc(doc(db, 'usuarios', uid), { activo, actualizado_en: serverTimestamp() });
}
