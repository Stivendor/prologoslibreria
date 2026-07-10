# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Online store MVP for **Prólogos Librería**, a Christian bookstore with a curated
catalog. Frontend-only React SPA; a Firebase/Firestore backend is wired but
optional. WhatsApp is the order-completion channel (no payment gateway yet).
Code, comments, and UI copy are in **Spanish** — match that when editing.

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
  `obtenerLibro(id)` from `catalogo.ts`.
- Firestore shape: `libros` collection (query filters `activo == true`) and
  `categorias` (ordered by `orden`). Seed data must mirror these fields; types
  live in `src/types.ts`.

**Cart** — `src/context/CartContext.tsx` holds all cart state, persisted to
`localStorage` under key `prologos-carrito` (hydrated on init, saved on every
change). Consume via `useCart()`; it throws if used outside `<CartProvider>`.
`App.tsx` wraps everything in `CartProvider` → `BrowserRouter`.

**Checkout via WhatsApp** — there is no payment integration. Orders are completed
by building a `wa.me` link. `src/config.ts` centralizes contact/brand constants
(`CONTACTO`, `urlWhatsApp(mensaje)`); the checkout and WhatsApp button compose a
message and open that URL. Keep contact details in `config.ts`, not inline.

**Routing** — `App.tsx` defines all routes (`/`, `/catalogo`, `/libro/:id`,
`/carrito`, `/checkout`, `*` → Home). Global chrome (`Header`, `Footer`,
`WhatsAppButton`) sits outside `<Routes>`.

## Styling

All styles live in a single global `src/index.css` (plain CSS, no Tailwind/CSS
modules) using BEM-ish class names and CSS custom properties for the brand
palette (monochrome + wine accent) defined at the top. Responsive breakpoints are
grouped at the bottom under `/* Responsive */` (980 / 860 / 620 / 520px) — when a
grid overflows on mobile, add its collapse rule there. cSpell flags the Spanish
words as misspellings; ignore those warnings.

## Firebase setup (optional)

See `firebase/README.md`. Copy `.env.example` → `.env`, fill `VITE_FIREBASE_*`,
publish `firebase/firestore.rules`, and seed with `firebase/seed-firestore.mjs`
(catalog data in `firebase/catalogo.seed.json`). With those vars set, the app
switches from seed data to Firestore automatically — no code change needed.
