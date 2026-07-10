import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { ClientePedido, EstadoPedido, Pedido, PedidoItem } from '../types';
import { db } from '../lib/firebase';

// Capa de acceso a datos de pedidos. A diferencia del catálogo, no hay rama
// seed: sin Firebase los pedidos siguen únicamente por WhatsApp.

export interface NuevoPedido {
  items: PedidoItem[];
  total: number;
  cliente: ClientePedido;
}

// Número corto y legible para citar por WhatsApp, p. ej. "P-20260710-A3F9".
function generarNumero(): string {
  const hoy = new Date();
  const fecha =
    `${hoy.getFullYear()}` +
    `${String(hoy.getMonth() + 1).padStart(2, '0')}` +
    `${String(hoy.getDate()).padStart(2, '0')}`;
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `P-${fecha}-${sufijo}`;
}

// Crea el pedido con estado "nuevo". Devuelve su número, o null si no hay
// Firebase configurado (modo seed: el pedido sigue solo por WhatsApp).
export async function crearPedido(datos: NuevoPedido): Promise<string | null> {
  if (!db) return null;
  const numero = generarNumero();
  await addDoc(collection(db, 'pedidos'), {
    ...datos,
    numero,
    estado: 'nuevo',
    creado_en: serverTimestamp(),
    actualizado_en: serverTimestamp(),
  });
  return numero;
}

// Suscripción en tiempo real (más recientes primero). Devuelve el unsubscribe.
export function suscribirsePedidos(callback: (pedidos: Pedido[]) => void): () => void {
  if (!db) return () => {};
  const q = query(collection(db, 'pedidos'), orderBy('creado_en', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pedido[]);
    },
    (error) => {
      console.error('Error en la suscripción de pedidos', error);
    }
  );
}

export async function actualizarEstadoPedido(id: string, estado: EstadoPedido): Promise<void> {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  await updateDoc(doc(db, 'pedidos', id), { estado, actualizado_en: serverTimestamp() });
}
