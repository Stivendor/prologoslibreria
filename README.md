# Prólogos Librería — Tienda en línea (MVP)

Tienda en línea para **Prólogos Librería**, una librería cristiana con catálogo
curado de libros y devocionales. Este repositorio implementa el MVP descrito en
la *Planeación Estratégica y Requerimientos*: catálogo navegable, carrito de
compras y checkout, conservando el canal de WhatsApp que los clientes ya conocen.

## Stack

| Componente        | Tecnología                          |
| ----------------- | ----------------------------------- |
| Frontend          | React + Vite + TypeScript           |
| Datos / backend   | Firebase (Firestore)                |
| Pagos             | Wompi / ePayco *(fase posterior)*   |
| Correos           | Resend *(fase posterior)*           |
| Despliegue        | Vercel                              |

## Estado actual

Implementado (Fases 2–4 del plan):

- Catálogo público por categorías, con detalle de libro (RF-01, RF-02).
- Buscador por título/autor y filtro por categoría (RF-03, RF-04).
- Sección de destacados / "Favoritos del mes" (RF-09).
- Carrito de compras con persistencia local y total (RF-05).
- Botón de WhatsApp y finalización de pedido por WhatsApp (RF-08).
- Diseño responsive con la identidad de marca (RNF-01, RNF-04).
- Backend de datos preparado para Firebase/Firestore (`firebase/`).

Pendiente (Fase 5, requiere insumos de Prólogos):

- Conexión de la base de datos (Firestore) con el catálogo real.
- Integración de pasarela de pagos colombiana — PSE, Nequi, tarjeta (RF-06).
- Correo de confirmación de pedido con Resend (RF-07).
- Portadas reales de los libros y datos definitivos del catálogo.

Mientras no haya credenciales de Firebase, la app usa datos de ejemplo locales
(`src/data/seed.ts`) para poder desarrollarse y demostrarse sin bloqueos.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # verificación de tipos + build de producción
npm run lint     # linter
```

### Conectar Firebase (opcional)

Ver la guía detallada en [`firebase/README.md`](firebase/README.md). En resumen:

1. Crear el proyecto en Firebase y habilitar Firestore.
2. Copiar `.env.example` a `.env` y completar las variables `VITE_FIREBASE_*` (config web).
3. Publicar `firebase/firestore.rules` y cargar el catálogo con `firebase/seed-firestore.mjs`.

Con esas variables, la app consulta Firestore automáticamente en lugar de los datos de ejemplo.

## Estructura

```
src/
  components/   Header, Footer, BookCard, BookCover, StarRating, TrustBadges, ...
  context/      CartContext (carrito con persistencia local)
  data/         seed.ts (datos de ejemplo) y catalogo.ts (acceso a datos)
  hooks/        useCatalogo
  lib/          firebase.ts, format.ts
  pages/        Home, Catálogo, Detalle, Carrito, Checkout
  config.ts     contacto/marca (WhatsApp, Instagram)
firebase/
  firestore.rules      reglas de seguridad
  catalogo.seed.json   catálogo de ejemplo
  seed-firestore.mjs   carga del catálogo en Firestore
```
