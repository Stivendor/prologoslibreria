# CRM de leads de WhatsApp — puesta en marcha

La sección **Leads** del panel `/admin` recibe los mensajes entrantes de
WhatsApp (vía Cloud API de Meta) como leads en un tablero Kanban, y permite
responder desde el panel. El código ya está listo; para que funcione en real
hay que completar la configuración externa de Meta y las variables de entorno.

## Requisitos externos (Meta)

1. **Cuenta Meta Business** con verificación de negocio completada.
2. **WhatsApp Business Account (WABA)** con un **número dedicado** registrado
   en Cloud API.
   - ⚠️ Ese número **no puede** usarse a la vez en la app normal de WhatsApp.
     El `320 697 9160` actual (enlaces `wa.me` de la tienda) puede seguir como
     está; lo recomendado es un número nuevo solo para el API. Confirmar con
     el cliente antes de migrar nada.
3. **App de Meta** (developers.facebook.com) con el producto WhatsApp añadido
   y permiso `whatsapp_business_messaging`. Generar un **token permanente**
   (usuario de sistema del Business Manager).
4. Configurar el **webhook** de la app de Meta:
   - URL: `https://<dominio-vercel>/api/whatsapp/webhook`
   - Verify token: el mismo valor de `WHATSAPP_VERIFY_TOKEN` (inventa uno).
   - Suscribirse al campo `messages`.

## Variables de entorno en Vercel (server-side, sin prefijo VITE_)

| Variable | Qué es |
| --- | --- |
| `WHATSAPP_VERIFY_TOKEN` | Token inventado para el handshake del webhook |
| `WHATSAPP_APP_SECRET` | App secret de la app de Meta (firma HMAC de webhooks) |
| `WHATSAPP_TOKEN` | Token permanente de acceso a Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número (panel de WhatsApp de la app) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo del service account de Firebase (una línea) |

Nunca pongas estos valores en `.env` con prefijo `VITE_` ni en el cliente.

## Firestore

- Publicar las reglas actualizadas de `firebase/firestore.rules` (colección
  `leads` + subcolección `mensajes`).
- Colecciones: `leads/{telefono}` y `leads/{telefono}/mensajes/{id}`. Las crea
  el webhook automáticamente; no hay que sembrarlas.

## Límite de la ventana de 24 horas

Meta solo permite texto libre dentro de las 24 h siguientes al último mensaje
del cliente. Fuera de esa ventana el envío falla (el panel muestra el error y
el mensaje queda marcado "no enviado"). Enviar plantillas pre-aprobadas fuera
de la ventana queda para una fase posterior.

## Prueba local sin Meta

```bash
vercel dev
# handshake
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=123"
# mensaje entrante firmado (la firma HMAC-SHA256 del cuerpo con WHATSAPP_APP_SECRET)
# ver payload de ejemplo en la documentación de Cloud API → "webhooks payload examples"
```

Sin firma válida el webhook responde `401`: es lo esperado, el endpoint es
público y la verificación no es opcional.
