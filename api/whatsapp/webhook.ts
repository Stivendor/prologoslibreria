import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin';

// Webhook de WhatsApp Cloud API.
// GET: handshake de verificación de Meta (hub.challenge).
// POST: mensajes entrantes → upsert del lead + append del mensaje en Firestore.
// La firma HMAC (X-Hub-Signature-256) se valida SIEMPRE: el endpoint es público.

export const config = { api: { bodyParser: false } };

interface Req {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  on(evento: string, cb: (chunk?: Buffer) => void): void;
}
interface Res {
  status(codigo: number): Res;
  send(cuerpo: string): void;
  json(cuerpo: unknown): void;
}

function leerCuerpo(req: Req): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    req.on('data', (chunk) => partes.push(chunk as Buffer));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', () => reject(new Error('Error leyendo el cuerpo')));
  });
}

function firmaValida(cuerpo: Buffer, cabecera: string | undefined): boolean {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !cabecera) return false;
  const esperada =
    'sha256=' + crypto.createHmac('sha256', secreto).update(cuerpo).digest('hex');
  const a = Buffer.from(esperada);
  const b = Buffer.from(cabecera);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Estructura mínima del payload de mensajes de Cloud API.
interface CambioMensajes {
  value?: {
    contacts?: { wa_id?: string; profile?: { name?: string } }[];
    messages?: {
      id?: string;
      from?: string;
      type?: string;
      text?: { body?: string };
    }[];
  };
}

export default async function handler(req: Req, res: Res) {
  if (req.method === 'GET') {
    const modo = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const reto = req.query['hub.challenge'];
    if (modo === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(String(reto ?? ''));
      return;
    }
    res.status(403).send('Token de verificación inválido');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Método no permitido');
    return;
  }

  const cuerpo = await leerCuerpo(req);
  const firma = req.headers['x-hub-signature-256'];
  if (!firmaValida(cuerpo, typeof firma === 'string' ? firma : undefined)) {
    res.status(401).send('Firma inválida');
    return;
  }

  let payload: { entry?: { changes?: CambioMensajes[] }[] };
  try {
    payload = JSON.parse(cuerpo.toString('utf8'));
  } catch {
    res.status(400).send('JSON inválido');
    return;
  }

  const db = adminDb();
  const tareas: Promise<unknown>[] = [];

  for (const entrada of payload.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value;
      if (!valor?.messages?.length) continue; // ignorar statuses, etc.
      const nombrePorTelefono = new Map<string, string>();
      for (const c of valor.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nombrePorTelefono.set(c.wa_id, c.profile.name);
      }

      for (const msg of valor.messages) {
        const telefono = msg.from;
        if (!telefono) continue;
        // ponytail: solo texto en Fase A; otros tipos se guardan con placeholder
        const texto = msg.text?.body ?? `[${msg.type ?? 'mensaje'} no soportado]`;
        const leadRef = db.collection('leads').doc(telefono);
        const nombre = nombrePorTelefono.get(telefono);

        tareas.push(
          db.runTransaction(async (tx) => {
            const doc = await tx.get(leadRef);
            tx.set(
              leadRef,
              {
                telefono,
                ...(nombre ? { nombre } : {}),
                ultimo_mensaje_texto: texto,
                ultimo_mensaje_en: FieldValue.serverTimestamp(),
                actualizado_en: FieldValue.serverTimestamp(),
                no_leidos: FieldValue.increment(1),
                // Solo al crear: estado inicial del pipeline y fecha de alta.
                ...(doc.exists
                  ? {}
                  : { estado: 'nuevo', creado_en: FieldValue.serverTimestamp() }),
              },
              { merge: true }
            );
          })
        );
        tareas.push(
          leadRef.collection('mensajes').add({
            direccion: 'entrante',
            texto,
            tipo: msg.type ?? 'text',
            wa_message_id: msg.id ?? null,
            creado_en: FieldValue.serverTimestamp(),
          })
        );
      }
    }
  }

  await Promise.all(tareas);
  res.status(200).json({ ok: true });
}
