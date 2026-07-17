import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { EstadoLead, Lead, MensajeLead } from '../types';
import { auth, db } from '../lib/firebase';

// Capa de acceso a datos de leads de WhatsApp (CRM). Como pedidos.ts, no hay
// rama seed: sin Firebase no hay leads. Los mensajes entrantes los escribe el
// webhook del servidor (api/whatsapp/webhook.ts); aquí solo se leen y se
// gestionan estados. El envío pasa por api/whatsapp/send.ts con el ID token.

export function suscribirseLeads(callback: (leads: Lead[]) => void): () => void {
  if (!db) return () => {};
  const q = query(collection(db, 'leads'), orderBy('ultimo_mensaje_en', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[]);
    },
    (error) => {
      console.error('Error en la suscripción de leads', error);
    }
  );
}

export function suscribirseMensajes(
  leadId: string,
  callback: (mensajes: MensajeLead[]) => void
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, 'leads', leadId, 'mensajes'),
    orderBy('creado_en', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MensajeLead[]);
    },
    (error) => {
      console.error('Error en la suscripción de mensajes', error);
    }
  );
}

export async function actualizarEstadoLead(id: string, estado: EstadoLead): Promise<void> {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  await updateDoc(doc(db, 'leads', id), { estado, actualizado_en: serverTimestamp() });
}

export async function marcarLeido(id: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'leads', id), { no_leidos: 0 });
}

export async function guardarNotas(id: string, notas: string): Promise<void> {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  await updateDoc(doc(db, 'leads', id), { notas, actualizado_en: serverTimestamp() });
}

// Envía un mensaje de WhatsApp al lead vía la función del servidor.
// Lanza Error con mensaje legible si algo falla.
export async function enviarMensaje(telefono: string, texto: string): Promise<void> {
  if (!auth?.currentUser) throw new Error('Sesión de administrador no iniciada.');
  const token = await auth.currentUser.getIdToken();
  const respuesta = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ telefono, texto }),
  });
  if (!respuesta.ok) {
    // Sin backend desplegado (404) o sin Cloud API configurada (500): mensaje
    // amable en vez del error crudo — estado esperado hasta conectar el número.
    if (respuesta.status === 404 || respuesta.status === 500) {
      throw new Error('El envío estará disponible al conectar el número de WhatsApp.');
    }
    const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
    throw new Error(datos.error ?? 'No se pudo enviar el mensaje.');
  }
}
