# Firebase — Prólogos Librería

Backend de datos del MVP con **Firebase (Firestore)**. Mientras no haya
credenciales configuradas, la app funciona con los datos de ejemplo locales
(`src/data/seed.ts`); al configurar Firebase, consulta Firestore automáticamente.

## Modelo de datos (colecciones)

### `categorias`
| campo   | tipo   |
| ------- | ------ |
| nombre  | string |
| slug    | string |
| orden   | number |

### `libros`
| campo         | tipo    |
| ------------- | ------- |
| titulo        | string  |
| autor         | string  |
| precio        | number  |
| descripcion   | string  |
| imagen_url    | string / null |
| categoria_id  | string (id de `categorias`) |
| activo        | boolean |
| destacado     | boolean |
| calificacion  | number (opcional) |
| resenas       | number (opcional) |
| etiqueta      | string (opcional) |
| precio_antes  | number (opcional) |
| mas_vendido   | boolean (opcional) |
| creado_en     | timestamp |

### `pedidos` (checkout — fase de pagos)
Datos del cliente, total, estado e ítems del pedido.

## Puesta en marcha (cuando se conecte la BD)

1. Crear el proyecto en <https://console.firebase.google.com> y habilitar **Firestore**.
2. En *Configuración del proyecto → Tus apps → Web*, copiar la config y ponerla
   en `.env` (variables `VITE_FIREBASE_*`, ver `.env.example`).
3. Publicar las reglas de seguridad de `firestore.rules`.
4. Cargar el catálogo de ejemplo:
   ```bash
   npm install firebase-admin
   # descargar la clave de servicio como firebase/serviceAccount.json
   node firebase/seed-firestore.mjs
   ```

## Archivos

- `firestore.rules` — reglas de seguridad (catálogo de lectura pública).
- `catalogo.seed.json` — catálogo de ejemplo (categorías + libros).
- `seed-firestore.mjs` — script para cargar el catálogo en Firestore.
