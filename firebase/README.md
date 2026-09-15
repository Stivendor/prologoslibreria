# Firebase - Prologos Libreria

Firebase sostiene el backend de datos y administracion del MVP. El catalogo
publico puede funcionar sin credenciales usando `src/data/seed.ts`; cuando las
variables `VITE_FIREBASE_*` existen, la app consulta Firestore.

## Servicios usados

- **Firestore**: catalogo, pedidos, leads y mensajes.
- **Firebase Auth**: sesion del administrador en `/admin`.
- **Firebase Storage**: portadas de libros.
- **Firebase Admin SDK**: funciones serverless en `api/` para verificar tokens
  y escribir desde backend.

## Modelo de datos

### `categorias`

| Campo | Tipo |
| --- | --- |
| `nombre` | string |
| `slug` | string |
| `orden` | number |

### `libros`

| Campo | Tipo |
| --- | --- |
| `titulo` | string |
| `autor` | string |
| `precio` | number |
| `descripcion` | string |
| `imagen_url` | string / null |
| `categoria_id` | string, id de `categorias` |
| `activo` | boolean |
| `destacado` | boolean |
| `etiqueta` | string opcional |
| `creado_en` | timestamp |

### `pedidos`

| Campo | Tipo |
| --- | --- |
| `numero` | string, formato `P-YYYYMMDD-XXXX` |
| `items` | lista de `{ libro_id, titulo, precio, cantidad }` |
| `total` | number |
| `cliente` | `{ nombre, telefono, email, ciudad, direccion }` |
| `estado` | `nuevo`, `confirmado`, `enviado`, `entregado` o `cancelado` |
| `creado_en` | timestamp |
| `actualizado_en` | timestamp |

### `leads/{telefono}`

Usado por la integracion de WhatsApp Cloud API.

| Campo | Tipo |
| --- | --- |
| `telefono` | string |
| `nombre` | string opcional |
| `estado` | `nuevo`, `contactado`, `negociando`, `ganado` o `perdido` |
| `ultimo_mensaje_texto` | string |
| `no_leidos` | number |
| `notas` | string opcional |
| `creado_en` | timestamp |
| `actualizado_en` | timestamp |
| `ultimo_mensaje_en` | timestamp |

### `leads/{telefono}/mensajes`

| Campo | Tipo |
| --- | --- |
| `direccion` | `entrante` o `saliente` |
| `texto` | string |
| `tipo` | string, por ejemplo `text` |
| `wa_message_id` | string / null |
| `estado_envio` | `enviado` o `error`, solo salientes |
| `creado_en` | timestamp |

## Puesta en marcha

1. Crear proyecto en Firebase y habilitar Firestore.
2. Crear una app web y copiar la configuracion publica en `.env` o Vercel:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID` y `VITE_FIREBASE_APP_ID`.
3. Habilitar Authentication con proveedor Email/Password.
4. Crear el usuario administrador y copiar su UID en:
   - `firebase/firestore.rules`
   - `firebase/storage.rules`
   - `api/_lib/firebaseAdmin.ts` (`ADMIN_UID`)
5. Habilitar Storage.
6. Publicar reglas:

```bash
firebase deploy --only firestore:rules,storage
```

7. Cargar catalogo inicial si hace falta:

```bash
npm install
node firebase/seed-firestore.mjs
```

El script de seed usa `firebase/serviceAccount.json` local. Ese archivo esta en
`.gitignore` y no debe subirse al repositorio.

## Variables privadas de backend

Las funciones serverless necesitan:

- `FIREBASE_SERVICE_ACCOUNT`: JSON completo del service account en una sola
  linea.
- Variables de WhatsApp descritas en `docs/whatsapp-setup.md`.

Estas variables no deben tener prefijo `VITE_`.

## Reglas

- `firestore.rules`: lectura publica de catalogo, creacion publica validada de
  pedidos, y lectura/escritura administrativa limitada al UID del admin.
- `storage.rules`: lectura publica de portadas; escritura/borrado solo admin,
  con limite de imagen de 5 MB.
