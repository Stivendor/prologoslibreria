# Firebase - Prologos Libreria

Firebase sostiene el backend de datos y administracion del MVP. El catalogo
publico puede funcionar sin credenciales usando `src/data/seed.ts`; cuando las
variables `VITE_FIREBASE_*` existen, la app consulta Firestore.

## Servicios usados

- **Firestore**: catalogo, pedidos, cuentas de cliente, leads y mensajes.
- **Firebase Auth**: sesion de los clientes en `/cuenta` y del administrador
  en `/admin` (un solo `AuthProvider` compartido).
- **Firebase Storage**: portadas de libros.
- **Firebase Admin SDK**: funciones serverless en `api/` para verificar tokens
  y escribir desde backend; tambien el script `usuarios-admin.mjs`.

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
| `stock` | number / null opcional (unidades; null o ausente = bajo demanda, sin límite) |
| `creado_en` | timestamp |

### `pedidos`

| Campo | Tipo |
| --- | --- |
| `numero` | string, formato `P-YYYYMMDD-XXXX` |
| `items` | lista de `{ libro_id, titulo, precio, cantidad }` |
| `total` | number |
| `cliente` | `{ nombre, telefono, email, ciudad, direccion }` |
| `uid_cliente` | string opcional, uid del comprador si tenia sesion |
| `estado` | `nuevo`, `confirmado`, `enviado`, `entregado` o `cancelado` |
| `creado_en` | timestamp |
| `actualizado_en` | timestamp |

### `usuarios/{uid}`

Cuentas de cliente. El `uid` del documento es el uid de Firebase Auth y el
`email` va copiado aqui porque Auth no permite listar correos de otros
usuarios desde el navegador.

| Campo | Tipo |
| --- | --- |
| `nombre` | string |
| `telefono` | string |
| `ciudad` | string |
| `direccion` | string |
| `email` | string, copia del correo de Auth |
| `activo` | boolean, lo alterna el panel admin |
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
   - `src/config.ts` (`UID_ADMIN`, usado para distinguir clientes de admin)
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

## Gestion de cuentas de cliente

El panel admin (`/admin` → pestaña **Usuarios**) lista las cuentas en vivo,
permite editar sus datos de envio y marcarlas como inactivas. El bloqueo real
del login y el borrado definitivo de una cuenta de Firebase Auth no pueden
hacerse desde el navegador: se ejecutan en local con el Admin SDK:

```bash
node firebase/usuarios-admin.mjs listar
node firebase/usuarios-admin.mjs bloquear <uid>
node firebase/usuarios-admin.mjs desbloquear <uid>
node firebase/usuarios-admin.mjs borrar <uid>
```

## Variables privadas de backend

Las funciones serverless necesitan:

- `FIREBASE_SERVICE_ACCOUNT`: JSON completo del service account en una sola
  linea.
- Variables de WhatsApp descritas en `docs/whatsapp-setup.md`.

Estas variables no deben tener prefijo `VITE_`.

## Reglas

- `firestore.rules`: lectura publica de catalogo, creacion publica validada de
  pedidos (con `uid_cliente` opcional vinculado a la sesion), cuentas
  `usuarios/{uid}` con acceso solo para su dueño y para el admin, y
  lectura/escritura administrativa limitada al UID del admin.
- `storage.rules`: lectura publica de portadas; escritura/borrado solo admin,
  con limite de imagen de 5 MB.
