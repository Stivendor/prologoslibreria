# WhatsApp Cloud API - puesta en marcha

El proyecto tiene dos integraciones de WhatsApp:

- **Enlaces `wa.me`**: usados en la tienda publica y en el checkout para abrir
  una conversacion con el resumen del pedido.
- **WhatsApp Cloud API**: endpoints serverless para recibir mensajes entrantes
  y enviar respuestas desde backend.

Estado actual: los endpoints, la capa de datos de leads y el componente
`LeadsInbox` existen. La navegacion actual de `/admin` todavia no monta la
seccion Leads; `AdminPage.tsx` muestra Resumen, Pedidos y Libros.

## Archivos relevantes

- `src/config.ts`: numero publico de WhatsApp y helpers `wa.me`.
- `src/data/leads.ts`: suscripciones y acciones de leads/mensajes.
- `src/components/admin/LeadsInbox.tsx`: UI de conversacion y detalles del lead.
- `api/whatsapp/send.ts`: envia mensajes salientes usando Graph API.
- `api/whatsapp/webhook.ts`: recibe webhooks de Meta y escribe en Firestore.
- `api/_lib/firebaseAdmin.ts`: inicializa Firebase Admin SDK y valida al admin.

## Requisitos externos en Meta

1. Cuenta Meta Business con verificacion de negocio completada.
2. WhatsApp Business Account (WABA) con numero dedicado registrado en Cloud API.
   Ese numero no debe usarse simultaneamente en la app normal de WhatsApp.
3. App de Meta con el producto WhatsApp agregado.
4. Permiso `whatsapp_business_messaging`.
5. Token permanente generado desde un usuario de sistema del Business Manager.
6. Webhook configurado en la app de Meta:
   - URL: `https://<dominio-vercel>/api/whatsapp/webhook`
   - Verify token: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Campo suscrito: `messages`

## Variables de entorno en Vercel

Estas variables son server-side y no deben llevar prefijo `VITE_`.

| Variable | Uso |
| --- | --- |
| `WHATSAPP_VERIFY_TOKEN` | Token inventado para el handshake del webhook |
| `WHATSAPP_APP_SECRET` | App secret de Meta para validar `X-Hub-Signature-256` |
| `WHATSAPP_TOKEN` | Token permanente de acceso a WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del numero conectado a Cloud API |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo del service account de Firebase |

## Firestore

Los mensajes entrantes crean o actualizan:

- `leads/{telefono}`
- `leads/{telefono}/mensajes/{id}`

El webhook usa Firebase Admin SDK, asi que no depende de las reglas de cliente
para escribir. El cliente admin solo lee leads/mensajes y actualiza estado,
notas o contador de no leidos segun `firebase/firestore.rules`.

## Seguridad del webhook

`api/whatsapp/webhook.ts` valida siempre la firma HMAC de Meta:

- Header esperado: `X-Hub-Signature-256`
- Secreto usado: `WHATSAPP_APP_SECRET`

Sin firma valida responde `401`. Esto es intencional porque el endpoint es
publico.

## Envio de mensajes

`api/whatsapp/send.ts` exige:

1. Metodo `POST`.
2. Header `Authorization: Bearer <Firebase ID token>`.
3. UID igual al `ADMIN_UID` configurado en `api/_lib/firebaseAdmin.ts`.
4. `telefono` numerico de 6 a 15 digitos.
5. `texto` no vacio y de maximo 4096 caracteres.

Si Meta acepta el envio, el mensaje saliente se guarda en Firestore con
`estado_envio: "enviado"`. Si falla, se registra con `estado_envio: "error"`.

## Ventana de 24 horas

Meta permite mensajes de texto libre solo dentro de las 24 horas siguientes al
ultimo mensaje del cliente. Fuera de esa ventana el envio puede fallar. El uso
de plantillas preaprobadas queda para una fase posterior.

## Prueba local

Para probar las funciones localmente se recomienda `vercel dev` con las
variables de entorno cargadas:

```bash
vercel dev
```

Handshake del webhook:

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=123"
```

Para probar `POST` se necesita construir el payload y firmarlo con HMAC-SHA256
usando `WHATSAPP_APP_SECRET`; sin una firma valida el webhook debe responder
`401`.
