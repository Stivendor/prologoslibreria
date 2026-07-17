import { FieldValue } from 'firebase-admin/firestore';
import { ADMIN_UID, adminAuth, adminDb } from '../_lib/firebaseAdmin';

// Envío de mensajes de WhatsApp desde el panel admin.
// Solo el administrador autenticado (Firebase ID token) puede llamar aquí:
// sin este control cualquiera enviaría mensajes a costa del cliente.

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status(codigo: number): Res;
  json(cuerpo: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  // Autenticación: Bearer <Firebase ID token> del admin.
  const autorizacion = req.headers.authorization;
  const token =
    typeof autorizacion === 'string' && autorizacion.startsWith('Bearer ')
      ? autorizacion.slice(7)
      : null;
  if (!token) {
    res.status(401).json({ error: 'Falta el token de autenticación' });
    return;
  }
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }
  if (uid !== ADMIN_UID) {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  const { telefono, texto } = (req.body ?? {}) as { telefono?: string; texto?: string };
  if (!telefono || !/^\d{6,15}$/.test(telefono)) {
    res.status(400).json({ error: 'Teléfono inválido' });
    return;
  }
  if (!texto || typeof texto !== 'string' || texto.trim().length === 0 || texto.length > 4096) {
    res.status(400).json({ error: 'Texto inválido' });
    return;
  }

  const tokenMeta = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!tokenMeta || !phoneNumberId) {
    res.status(500).json({ error: 'WhatsApp Cloud API no está configurado en el servidor' });
    return;
  }

  // Enviar por Cloud API.
  const respuesta = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenMeta}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'text',
        text: { body: texto },
      }),
    }
  );
  const datos = (await respuesta.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  const db = adminDb();
  const leadRef = db.collection('leads').doc(telefono);

  if (!respuesta.ok) {
    // Registrar el intento fallido para que el panel lo muestre.
    await leadRef.collection('mensajes').add({
      direccion: 'saliente',
      texto,
      tipo: 'text',
      estado_envio: 'error',
      creado_en: FieldValue.serverTimestamp(),
    });
    res.status(502).json({
      error: datos.error?.message ?? 'Error enviando el mensaje por WhatsApp',
    });
    return;
  }

  await Promise.all([
    leadRef.collection('mensajes').add({
      direccion: 'saliente',
      texto,
      tipo: 'text',
      wa_message_id: datos.messages?.[0]?.id ?? null,
      estado_envio: 'enviado',
      creado_en: FieldValue.serverTimestamp(),
    }),
    leadRef.set(
      {
        ultimo_mensaje_texto: texto,
        ultimo_mensaje_en: FieldValue.serverTimestamp(),
        actualizado_en: FieldValue.serverTimestamp(),
        no_leidos: 0, // responder marca la conversación como leída
      },
      { merge: true }
    ),
  ]);

  res.status(200).json({ ok: true, wa_message_id: datos.messages?.[0]?.id ?? null });
}
