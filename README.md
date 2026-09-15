# Prologos Libreria - Tienda en linea (MVP)

Tienda en linea para **Prologos Libreria**, una libreria cristiana con catalogo
curado de libros y devocionales. El MVP incluye catalogo navegable, carrito,
checkout por WhatsApp y panel administrativo para gestionar pedidos y libros.

## Stack

| Componente | Tecnologia |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript |
| Rutas | React Router |
| Datos | Firebase Firestore |
| Autenticacion | Firebase Auth |
| Archivos | Firebase Storage |
| Backend serverless | Vercel Functions en `api/` |
| Admin server-side | Firebase Admin SDK |
| Mensajeria | WhatsApp Cloud API / Meta Graph API |
| Analytics | Vercel Analytics |
| Estilos | CSS global en `src/index.css` |
| Lint | Oxlint |
| Despliegue | Vercel |

## Estado actual

Implementado:

- Catalogo publico por categorias, con paginacion y detalle de libro.
- Buscador por titulo/autor y filtro por categoria.
- Seccion de destacados / "Favoritos del mes".
- Carrito lateral con persistencia local.
- Checkout en modal: registra el pedido en Firestore cuando Firebase esta
  configurado y abre WhatsApp con el resumen de compra.
- Fallback a datos locales (`src/data/seed.ts`) cuando no hay credenciales de
  Firebase para permitir desarrollo y demos.
- Panel de administracion en `/admin`, protegido con Firebase Auth:
  - Resumen de pedidos y libros mas vendidos.
  - Gestion de pedidos en tiempo real.
  - CRUD de catalogo con subida de portadas a Firebase Storage.
- Endpoints serverless para WhatsApp Cloud API:
  - `api/whatsapp/send.ts`: envio de mensajes salientes desde servidor.
  - `api/whatsapp/webhook.ts`: recepcion de mensajes entrantes firmados por Meta.

Pendiente o dependiente de configuracion externa:

- Conectar/mostrar la bandeja de Leads de WhatsApp en la navegacion actual de
  `/admin`. El backend, la capa de datos y el componente `LeadsInbox` existen,
  pero `AdminPage.tsx` hoy solo monta Resumen, Pedidos y Libros.
- Configurar Meta Business / WhatsApp Cloud API en produccion.
- Integracion de pasarela de pagos colombiana (Wompi/ePayco u otra).
- Correo de confirmacion de pedido (por ejemplo, Resend).
- Portadas reales y catalogo definitivo del cliente.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # verificacion de tipos + build de produccion
npm run lint     # linter
npm run preview  # preview del build
```

## Variables de entorno

El cliente web usa variables publicas `VITE_FIREBASE_*`. Las funciones
serverless usan variables privadas sin prefijo `VITE_`.

Ver `.env.example` para la lista completa. En resumen:

- `VITE_FIREBASE_*`: configuracion web publica de Firebase.
- `FIREBASE_SERVICE_ACCOUNT`: JSON completo del service account para
  Firebase Admin SDK en Vercel Functions.
- `WHATSAPP_VERIFY_TOKEN`: token inventado para verificar el webhook de Meta.
- `WHATSAPP_APP_SECRET`: secreto de la app de Meta para validar firmas HMAC.
- `WHATSAPP_TOKEN`: token permanente de WhatsApp Cloud API.
- `WHATSAPP_PHONE_NUMBER_ID`: ID del numero de WhatsApp Cloud API.

No exponer variables privadas con prefijo `VITE_`.

## Firebase

Guia detallada: [`firebase/README.md`](firebase/README.md).

El proyecto usa:

- Firestore: `categorias`, `libros`, `pedidos`, `leads` y subcoleccion
  `leads/{telefono}/mensajes`.
- Auth: login del administrador.
- Storage: portadas en `portadas/{libroId}`.
- Admin SDK: funciones serverless que verifican tokens y escriben desde backend.

Para desarrollo sin Firebase, el catalogo publico usa datos semilla locales. El
panel `/admin` requiere Firebase configurado.

## WhatsApp

Guia detallada: [`docs/whatsapp-setup.md`](docs/whatsapp-setup.md).

Actualmente hay dos flujos:

- Enlaces `wa.me` para que clientes contacten a la libreria y para abrir el
  resumen del pedido desde el checkout.
- WhatsApp Cloud API para recibir/enviar mensajes por backend. Esta parte
  requiere configuracion de Meta y variables privadas en Vercel.

## Estructura

```text
api/
  _lib/                 Firebase Admin SDK compartido
  whatsapp/             endpoints send/webhook de WhatsApp Cloud API
src/
  components/           UI publica, carrito, checkout y componentes admin
  components/admin/     Login, resumen, pedidos, libros y LeadsInbox
  context/              CartContext y AuthContext
  data/                 acceso a catalogo, pedidos, leads y seed local
  hooks/                hooks de catalogo
  lib/                  firebase, storage y formato
  pages/                CatalogPage, BookDetailPage, AdminPage
  config.ts             contacto/marca y enlaces de WhatsApp
firebase/
  firestore.rules       reglas de Firestore
  storage.rules         reglas de Storage
  catalogo.seed.json    catalogo de ejemplo
  seed-firestore.mjs    carga del catalogo en Firestore
docs/
  whatsapp-setup.md     guia de Meta / WhatsApp Cloud API
```

## Seguridad

- Las claves `VITE_FIREBASE_*` son publicas por diseno; la proteccion real vive
  en las reglas de Firestore/Storage.
- Las credenciales privadas (`FIREBASE_SERVICE_ACCOUNT`, `WHATSAPP_TOKEN`,
  `WHATSAPP_APP_SECRET`) solo deben existir en el entorno server-side.
- `api/whatsapp/send.ts` exige token de Firebase Auth del admin.
- `api/whatsapp/webhook.ts` valida `X-Hub-Signature-256` con HMAC antes de
  procesar mensajes entrantes.
