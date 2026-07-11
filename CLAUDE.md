# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Online store for **Prólogos Librería**, a Christian bookstore with a curated
catalog. React SPA deployed on **Vercel** (SPA rewrite in `vercel.json`) with a
**Firebase backend in production** (Firestore + Auth + Storage). WhatsApp is the
order-completion channel (no payment gateway yet). There is an admin panel at
`/admin` (orders + catalog CRUD). Code, comments, and UI copy are in
**Spanish** — match that when editing.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b (type-check) + vite build — use this to verify a change compiles
npm run lint     # oxlint
npm run preview  # serve the production build
```

There is no test framework. Verify changes with `npm run build` (type-check) and
by driving the app in the browser.

## Architecture

**Data layer with seed fallback** — the load-bearing pattern. `src/lib/firebase.ts`
only initializes Firestore if `VITE_FIREBASE_*` env vars are present
(`config.apiKey && config.projectId`); otherwise `db` is `null`. `src/data/catalogo.ts`
is the single data-access module: every function checks `if (db)` and queries
Firestore, else returns local seed data from `src/data/seed.ts`. This lets the app
run with no backend. **When adding a catalog query, add it here and keep both
branches (Firestore + seed) in sync** — never query Firestore directly from
components.

- Components/pages read the catalog only through the `useCatalogo()` hook
  (`src/hooks/useCatalogo.ts`), which loads books + categories once and exposes
  `{ libros, categorias, cargando, error }`. Single-book detail uses
  `obtenerLibro(id)` from `catalogo.ts`. Catalog **writes** (crear/actualizar/
  eliminarLibro, obtenerLibrosAdmin) also live in `catalogo.ts` but are
  Firestore-only (admin panel).
- Firestore shape: `libros` collection (query filters `activo == true`),
  `categorias` (ordered by `orden`), and `pedidos` (orders). Seed data must
  mirror the catalog fields; types live in `src/types.ts`.

**Orders (`src/data/pedidos.ts`)** — unlike the catalog, there is **no seed
branch**: without Firebase, `crearPedido` returns `null` and orders exist only
as WhatsApp messages. Checkout creates the order in Firestore with a short
human-readable number (`P-YYYYMMDD-XXXX`) and estado `nuevo`; the admin panel
subscribes in real time (`suscribirsePedidos`, `onSnapshot`) and moves orders
through estados (`nuevo → confirmado → enviado → entregado / cancelado`).

**Admin panel (`/admin`)** — `src/pages/AdminPage.tsx` with components under
`src/components/admin/` (LoginForm, PedidosPanel, LibrosPanel, LibroForm).
Requires Firebase: email/password login via `src/context/AuthContext.tsx`
(wraps only the `/admin` route), cover uploads via `src/lib/storage.ts`
(`portadas/{libroId}` in Storage, validated size/type before upload). The
`/admin` route renders **without** the store chrome (Header/Footer/WhatsApp) —
see `Contenido()` in `App.tsx`. Write access is locked to the admin UID in the
published rules (`firebase/firestore.rules`, `firebase/storage.rules`).

**Cart** — `src/context/CartContext.tsx` holds all cart state, persisted to
`localStorage` under key `prologos-carrito` (hydrated on init, saved on every
change). Consume via `useCart()`; it throws if used outside `<CartProvider>`.
`App.tsx` wraps everything in `CartProvider` → `BrowserRouter`.

**Checkout via WhatsApp** — there is no payment integration. Orders are completed
by building a `wa.me` link. `src/config.ts` centralizes contact/brand constants
(`CONTACTO`, `urlWhatsApp(mensaje)`); the checkout and WhatsApp button compose a
message and open that URL. Keep contact details in `config.ts`, not inline.

**Routing** — `App.tsx` defines all routes (`/`, `/catalogo`, `/libro/:id`,
`/carrito`, `/checkout`, `/admin`, `*` → Home). Global chrome (`Header`,
`Footer`, `WhatsAppButton`) sits outside `<Routes>` and is hidden on `/admin`.

## Styling

All styles live in a single global `src/index.css` (plain CSS, no Tailwind/CSS
modules) using BEM-ish class names and CSS custom properties for the brand
palette defined at the top — now fully monochrome (black/white/grays), though
the tokens keep their legacy names (`--color-vino` is near-black, not wine).
Custom easing tokens (`--ease-out`, `--ease-in-out`) live there too — use them
for new animations instead of the weak native CSS curves. Responsive breakpoints are
grouped at the bottom under `/* Responsive */` (980 / 860 / 620 / 520px) — when a
grid overflows on mobile, add its collapse rule there. cSpell flags the Spanish
words as misspellings; ignore those warnings.

## Firebase setup

**Production runs with Firebase connected** (deployed on Vercel with the
`VITE_FIREBASE_*` env vars set there). Locally, see `firebase/README.md`: copy
`.env.example` → `.env`, fill `VITE_FIREBASE_*`, publish
`firebase/firestore.rules` + `firebase/storage.rules`, and seed with
`firebase/seed-firestore.mjs` (catalog data in `firebase/catalogo.seed.json`).
`src/lib/firebase.ts` exports `db`, `auth`, `storage` (all `null` without env
vars) and the `usandoFirebase` flag. Without `.env` the store still works on
seed data, but orders are not persisted and `/admin` is disabled.
`firebase/serviceAccount.json` (used by the seed script) and `.env*` are
gitignored — never commit them.
