# Panel de administración `/admin` — Diseño

> Nota de mantenimiento: este archivo es una especificacion historica del panel.
> Puede diferir de la implementacion actual. Para el estado vigente del
> proyecto, usar `README.md`, `firebase/README.md` y `docs/whatsapp-setup.md`.

**Fecha:** 2026-07-10
**Estado:** Aprobado en conversación; pendiente de plan de implementación.

## Objetivo

Panel personalizado para el dueño de Prólogos Librería en la ruta `/admin`:

1. **Gestión de libros (CRUD)** — crear, editar, activar/desactivar y borrar
   libros, con subida de portada. Categorías fijas por ahora.
2. **Seguimiento de pedidos en tiempo real** — los pedidos del checkout se
   guardan en Firestore y aparecen en vivo en el panel, con gestión de estados.
3. **Seguro** — protegido con Firebase Auth (correo/clave); las reglas de
   Firestore/Storage restringen la escritura al administrador.
4. **Con identidad de marca** — mismo sistema visual del sitio (tokens
   monocromáticos, Georgia para títulos, logo oficial).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Alcance | CRUD de libros; categorías quedan fijas |
| Acceso | Firebase Auth con correo/contraseña, un solo usuario admin |
| Portadas | 1 imagen por libro subida a Firebase Storage; modelo preparado para galería futura (`imagenes_extra?: string[]`, sin migración) |
| Estructura | Ruta única `/admin` (enfoque A): login inline si no hay sesión; panel con pestañas si la hay |
| Pedidos | El checkout crea el documento en `pedidos` antes de abrir WhatsApp; si Firestore falla o no está configurado, WhatsApp abre igual |
| Tiempo real | Suscripción `onSnapshot` a `pedidos` solo dentro del panel |
| Estados de pedido | `nuevo → confirmado → enviado → entregado`, más `cancelado` |

## Arquitectura

### Ruta y estructura del panel

- `App.tsx`: nueva ruta `/admin` → `AdminPage`, envuelta en `AuthProvider`.
  Sin enlace en la navegación pública (el dueño entra por URL directa; la
  seguridad la dan Auth y las reglas, no la ocultación).
- `AdminPage` decide: sin sesión → formulario de login; con sesión → panel.
- El panel tiene dos pestañas:
  - **Pedidos** (predeterminada): lista en tiempo real, filtro por estado,
    detalle expandible, cambio de estado, enlace `wa.me` al cliente.
  - **Libros**: tabla de todos los libros (incluidos inactivos) con acciones
    crear / editar / activar-desactivar / borrar; formulario en la misma vista.

### Piezas nuevas o modificadas

| Archivo | Cambio |
|---|---|
| `src/lib/firebase.ts` | Exponer `auth` (`getAuth`) y `storage` (`getStorage`) junto a `db`; siguen siendo `null` sin config |
| `src/context/AuthContext.tsx` | **Nuevo.** `{ usuario, cargando, entrar(correo, clave), salir() }` sobre `onAuthStateChanged`; patrón idéntico a `CartContext` (`useAuth()` lanza fuera del provider) |
| `src/data/catalogo.ts` | Añadir escrituras: `crearLibro`, `actualizarLibro`, `eliminarLibro`, `obtenerLibrosAdmin()` (sin filtro `activo`). Si `db` es `null` lanzan `Error('El panel requiere Firebase configurado')` — el admin no tiene rama seed |
| `src/data/pedidos.ts` | **Nuevo.** Dominio aparte del catálogo: `crearPedido(pedido)` (usado por el checkout; devuelve id), `suscribirsePedidos(callback)` (`onSnapshot`, devuelve unsubscribe), `actualizarEstadoPedido(id, estado)` |
| `src/lib/storage.ts` | **Nuevo.** `subirPortada(archivo, libroId)` → guarda en `portadas/{libroId}` y devuelve la URL de descarga |
| `src/pages/AdminPage.tsx` | **Nuevo.** Login + pestañas Pedidos / Libros |
| `src/components/admin/LoginForm.tsx` | **Nuevo.** Correo/clave, error legible, logo y marca |
| `src/components/admin/PedidosPanel.tsx` | **Nuevo.** Lista en vivo + estados |
| `src/components/admin/LibrosPanel.tsx` | **Nuevo.** Tabla CRUD |
| `src/components/admin/LibroForm.tsx` | **Nuevo.** Alta/edición con subida de portada y select de categorías (desde `obtenerCategorias()`) |
| `src/pages/CheckoutPage.tsx` | Al confirmar: `crearPedido()` y luego abrir WhatsApp con el número de pedido en el mensaje. Errores de Firestore no bloquean WhatsApp |
| `src/types.ts` | Añadir `Pedido`, `EstadoPedido`, `PedidoItem` |
| `src/index.css` | Estilos del panel con los tokens existentes; responsive en el bloque `/* Responsive */` |
| `firebase/firestore.rules` | Ver Seguridad |
| `firebase/storage.rules` | **Nuevo.** Ver Seguridad |

### Modelo de datos — colección `pedidos`

```
pedidos/{id}:
  numero: string            // corto y legible, p. ej. "P-20260710-XXXX"
  items: [{ libro_id, titulo, precio, cantidad }]   // snapshot de precios
  total: number
  cliente: { nombre, telefono, email, ciudad, direccion }
  estado: 'nuevo' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado'
  creado_en: timestamp      // serverTimestamp()
  actualizado_en: timestamp
```

Los items copian título y precio al momento de la compra (snapshot): si un
libro cambia de precio después, el pedido conserva el valor cobrado.

### Flujo de un pedido

1. Cliente llena el checkout → `crearPedido()` escribe en Firestore
   (`estado: 'nuevo'`) → se abre WhatsApp con el resumen + número de pedido.
2. El panel, suscrito con `onSnapshot`, muestra el pedido al instante.
3. El dueño confirma por WhatsApp y avanza el estado desde el panel.

## Seguridad

- **Auth:** habilitar proveedor Email/Password; crear un único usuario admin.
  El UID de ese usuario se fija en las reglas.
- **Firestore rules:**
  - `esAdmin()` = `request.auth != null && request.auth.uid == '<UID_ADMIN>'`.
  - `libros`, `categorias`: `read: true`, `write: esAdmin()`.
  - `pedidos`: `create` público pero **validado** (solo los campos del
    esquema, `estado == 'nuevo'`, `total` numérico, items no vacíos, límites
    de tamaño en strings) para impedir abuso; `read/update/delete: esAdmin()`.
- **Storage rules:** lectura pública de `portadas/**`; escritura solo admin,
  `contentType` imagen y tamaño máximo 5 MB.
- Las claves `VITE_FIREBASE_*` son públicas por diseño; la protección real
  está en las reglas, nunca en el cliente.
- Nada de claves compartidas en el JS ni rutas "ocultas" como mecanismo de
  seguridad.

## Identidad visual

- Reutiliza los tokens de `:root` (monocromo, `--fuente-titulo` Georgia) y
  componentes de marca existentes (`logo.svg`, patrón `brand__*`).
- El login es una tarjeta centrada con el logo; el panel usa la misma
  cabecera tipográfica del sitio con un distintivo "Panel" discreto.
- Los estados de pedido usan el acento existente (`--color-oro`, grises) —
  sin introducir colores nuevos fuera de la paleta.

## Manejo de errores

- Login fallido: mensaje legible en español (credenciales inválidas / red).
- Escrituras del panel: feedback inline por acción (guardando / error), sin
  librerías de toasts.
- Checkout: si `crearPedido()` falla, se registra en consola y WhatsApp abre
  igual — la venta no se pierde.
- Sin Firebase configurado (`db === null`): `/admin` muestra un aviso claro
  de que requiere Firebase, en lugar de romperse.

## Prerrequisitos de configuración (una sola vez)

1. Activar plan **Blaze** en el proyecto (necesario para Storage; sigue
   siendo $0 dentro de la cuota gratuita — el catálogo no se acerca).
2. Habilitar **Email/Password** en Firebase Auth y crear el usuario admin.
3. Poner el UID del admin en las reglas y publicar `firestore.rules` y
   `storage.rules`.

## Verificación

No hay framework de tests (convención del repo): `npm run build` para tipos y
prueba manual dirigida — login correcto/incorrecto, crear libro con y sin
portada, editar, desactivar (desaparece del catálogo público), borrar, hacer
un pedido desde el checkout y verlo aparecer en vivo, avanzar estados, y
verificar con un usuario no autenticado que las escrituras están bloqueadas.

## Fuera de alcance (esta versión)

- CRUD de categorías.
- Galería de imágenes por libro (el modelo queda preparado).
- Notificaciones push / correo al dueño por pedido nuevo.
- Multiusuario o roles.
