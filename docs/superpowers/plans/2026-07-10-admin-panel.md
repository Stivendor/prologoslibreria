# Panel de administración `/admin` — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel `/admin` protegido con Firebase Auth: CRUD de libros con portada en Storage y seguimiento de pedidos en tiempo real, con el checkout guardando cada pedido en Firestore.

**Architecture:** Ruta única `/admin` (login inline → panel con pestañas Pedidos/Libros). La escritura vive en la capa de datos (`catalogo.ts` para libros, `pedidos.ts` nuevo para pedidos); los componentes nunca tocan Firestore directo. Seguridad real en reglas de Firestore/Storage restringidas al UID del admin.

**Tech Stack:** React 19 + TypeScript + Vite, react-router-dom 7, firebase v12 (firestore, auth, storage). CSS global en `src/index.css`.

**Spec:** `docs/superpowers/specs/2026-07-10-admin-panel-design.md`

## Global Constraints

- Código, comentarios y textos de UI **en español** (convención del repo).
- **No hay framework de tests**: cada tarea se verifica con `npm run build` (tsc + vite) y las de UI además manualmente con `npm run dev`. La verificación end-to-end es la Tarea 15.
- **Sin dependencias nuevas** — `firebase` ya está instalado e incluye auth y storage.
- Estilos solo en `src/index.css`, usando los tokens existentes de `:root` (monocromo + Georgia). Reglas responsive al final, bajo `/* Responsive */`.
- Acceso a datos solo vía `src/data/catalogo.ts` y `src/data/pedidos.ts` — nunca consultas Firestore desde componentes.
- Los mensajes de commit en español, terminados en `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `types.ts` se mantiene libre de imports de firebase (lo usa `seed.ts`); los timestamps se tipan estructuralmente.
- cSpell marca el español como error — ignorar esos diagnósticos.

---

### Task 1: Tipos de pedido

**Files:**
- Modify: `src/types.ts` (añadir al final)

**Interfaces:**
- Consumes: `Libro` existente (sin cambios).
- Produces: `EstadoPedido`, `PedidoItem`, `ClientePedido`, `Pedido` — usados por `pedidos.ts` (Task 4), `PedidosPanel` (Task 10) y `CheckoutPage` (Task 12).

- [ ] **Step 1: Añadir los tipos al final de `src/types.ts`**

```ts
export type EstadoPedido = 'nuevo' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';

export interface PedidoItem {
  libro_id: string;
  titulo: string;
  precio: number; // precio al momento de la compra (snapshot)
  cantidad: number;
}

export interface ClientePedido {
  nombre: string;
  telefono: string;
  email: string;
  ciudad: string;
  direccion: string;
}

export interface Pedido {
  id: string;
  numero: string; // corto y legible, p. ej. "P-20260710-A3F9"
  items: PedidoItem[];
  total: number;
  cliente: ClientePedido;
  estado: EstadoPedido;
  /* Timestamps de Firestore tipados estructuralmente para no importar
     firebase aquí (seed.ts depende de este archivo). Null mientras el
     serverTimestamp está pendiente en snapshots locales. */
  creado_en?: { toDate(): Date } | null;
  actualizado_en?: { toDate(): Date } | null;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "Añadir tipos de pedido (Pedido, EstadoPedido, PedidoItem)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Exponer Auth y Storage en firebase.ts + subida de portadas

**Files:**
- Modify: `src/lib/firebase.ts`
- Create: `src/lib/storage.ts`

**Interfaces:**
- Consumes: config `VITE_FIREBASE_*` existente.
- Produces: `auth: Auth | null`, `storage: FirebaseStorage | null` (exports de `firebase.ts`); `subirPortada(archivo: File, libroId: string): Promise<string>` (devuelve URL de descarga).

- [ ] **Step 1: Reemplazar el contenido de `src/lib/firebase.ts`**

```ts
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Config web de Firebase (claves públicas — seguras de exponer en el cliente).
// Se completan en .env cuando Prólogos cree el proyecto en Firebase.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Solo se inicializa si hay credenciales. Mientras tanto, la app funciona con
// los datos de ejemplo locales (seed) y el panel /admin queda deshabilitado.
const configurado = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

if (configurado) {
  app = initializeApp(config);
  dbInstance = getFirestore(app);
  authInstance = getAuth(app);
  storageInstance = getStorage(app);
}

export const db = dbInstance;
export const auth = authInstance;
export const storage = storageInstance;
export const usandoFirebase = dbInstance !== null;
```

- [ ] **Step 2: Crear `src/lib/storage.ts`**

```ts
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

// Sube la portada de un libro a Storage (portadas/{libroId}) y devuelve su
// URL pública de descarga. Solo se usa desde el panel de administración.
export async function subirPortada(archivo: File, libroId: string): Promise<string> {
  if (!storage) throw new Error('El panel requiere Firebase configurado.');
  const destino = ref(storage, `portadas/${libroId}`);
  await uploadBytes(destino, archivo, { contentType: archivo.type });
  return getDownloadURL(destino);
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts src/lib/storage.ts
git commit -m "Exponer Auth y Storage en la capa de Firebase y añadir subida de portadas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Escrituras de catálogo para el admin

**Files:**
- Modify: `src/data/catalogo.ts`

**Interfaces:**
- Consumes: `db` de `src/lib/firebase.ts`; tipo `Libro`.
- Produces: `LibroDatos = Omit<Libro, 'id'>`; `obtenerLibrosAdmin(): Promise<Libro[]>`; `crearLibro(datos: LibroDatos): Promise<string>` (devuelve id); `actualizarLibro(id: string, datos: Partial<LibroDatos>): Promise<void>`; `eliminarLibro(id: string): Promise<void>`. Usados por `LibroForm` (Task 8) y `LibrosPanel` (Task 9).

- [ ] **Step 1: Ampliar el import de firestore en `src/data/catalogo.ts`**

Reemplazar el bloque de import de `firebase/firestore` por:

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
```

- [ ] **Step 2: Añadir al final del archivo las operaciones del panel**

```ts
// --- Operaciones del panel de administración ---
// Requieren Firebase: el admin no tiene rama seed (no hay dónde persistir).

export type LibroDatos = Omit<Libro, 'id'>;

function requiereDb() {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  return db;
}

// Todos los libros, incluidos los inactivos (el catálogo público filtra activo).
export async function obtenerLibrosAdmin(): Promise<Libro[]> {
  const snap = await getDocs(query(collection(requiereDb(), 'libros'), orderBy('titulo')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Libro[];
}

export async function crearLibro(datos: LibroDatos): Promise<string> {
  const ref = await addDoc(collection(requiereDb(), 'libros'), {
    ...datos,
    creado_en: serverTimestamp(),
  });
  return ref.id;
}

export async function actualizarLibro(id: string, datos: Partial<LibroDatos>): Promise<void> {
  await updateDoc(doc(requiereDb(), 'libros', id), { ...datos });
}

export async function eliminarLibro(id: string): Promise<void> {
  await deleteDoc(doc(requiereDb(), 'libros', id));
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/data/catalogo.ts
git commit -m "Añadir escrituras de catálogo para el panel (crear/actualizar/eliminar libro)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Módulo de datos de pedidos

**Files:**
- Create: `src/data/pedidos.ts`

**Interfaces:**
- Consumes: `db` de `src/lib/firebase.ts`; tipos `Pedido`, `PedidoItem`, `ClientePedido`, `EstadoPedido` (Task 1).
- Produces: `NuevoPedido { items, total, cliente }`; `crearPedido(datos: NuevoPedido): Promise<string | null>` (devuelve el número legible, o null en modo seed); `suscribirsePedidos(callback: (pedidos: Pedido[]) => void): () => void` (unsubscribe); `actualizarEstadoPedido(id: string, estado: EstadoPedido): Promise<void>`. Usados por `PedidosPanel` (Task 10) y `CheckoutPage` (Task 12).

- [ ] **Step 1: Crear `src/data/pedidos.ts`**

```ts
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { ClientePedido, EstadoPedido, Pedido, PedidoItem } from '../types';
import { db } from '../lib/firebase';

// Capa de acceso a datos de pedidos. A diferencia del catálogo, no hay rama
// seed: sin Firebase los pedidos siguen únicamente por WhatsApp.

export interface NuevoPedido {
  items: PedidoItem[];
  total: number;
  cliente: ClientePedido;
}

// Número corto y legible para citar por WhatsApp, p. ej. "P-20260710-A3F9".
function generarNumero(): string {
  const hoy = new Date();
  const fecha =
    `${hoy.getFullYear()}` +
    `${String(hoy.getMonth() + 1).padStart(2, '0')}` +
    `${String(hoy.getDate()).padStart(2, '0')}`;
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `P-${fecha}-${sufijo}`;
}

// Crea el pedido con estado "nuevo". Devuelve su número, o null si no hay
// Firebase configurado (modo seed: el pedido sigue solo por WhatsApp).
export async function crearPedido(datos: NuevoPedido): Promise<string | null> {
  if (!db) return null;
  const numero = generarNumero();
  await addDoc(collection(db, 'pedidos'), {
    ...datos,
    numero,
    estado: 'nuevo',
    creado_en: serverTimestamp(),
    actualizado_en: serverTimestamp(),
  });
  return numero;
}

// Suscripción en tiempo real (más recientes primero). Devuelve el unsubscribe.
export function suscribirsePedidos(callback: (pedidos: Pedido[]) => void): () => void {
  if (!db) return () => {};
  const q = query(collection(db, 'pedidos'), orderBy('creado_en', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pedido[]);
    },
    (error) => {
      console.error('Error en la suscripción de pedidos', error);
    }
  );
}

export async function actualizarEstadoPedido(id: string, estado: EstadoPedido): Promise<void> {
  if (!db) throw new Error('El panel de administración requiere Firebase configurado.');
  await updateDoc(doc(db, 'pedidos', id), { estado, actualizado_en: serverTimestamp() });
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/data/pedidos.ts
git commit -m "Añadir capa de datos de pedidos con suscripción en tiempo real

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Contexto de autenticación

**Files:**
- Create: `src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `auth` de `src/lib/firebase.ts`.
- Produces: `<AuthProvider>` y `useAuth(): { usuario: User | null; cargando: boolean; entrar(correo, clave): Promise<void>; salir(): Promise<void> }`. Usados por `AdminPage` (Task 11) y `LoginForm` (Task 7). Mismo patrón que `CartContext` (lanza fuera del provider).

- [ ] **Step 1: Crear `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// Sesión del administrador del panel. Solo envuelve la ruta /admin.

interface AuthContextValue {
  usuario: User | null;
  cargando: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  // Sin Firebase no hay nada que esperar; con Firebase esperamos la primera
  // respuesta de onAuthStateChanged antes de decidir login vs panel.
  const [cargando, setCargando] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setCargando(false);
    });
  }, []);

  async function entrar(correo: string, clave: string) {
    if (!auth) throw new Error('Firebase no está configurado.');
    await signInWithEmailAndPassword(auth, correo, clave);
  }

  async function salir() {
    if (!auth) return;
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, entrar, salir }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "Añadir contexto de autenticación para el panel

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Reglas de seguridad y firebase.json

**Files:**
- Modify: `firebase/firestore.rules`
- Create: `firebase/storage.rules`
- Create: `firebase.json`

**Interfaces:**
- Produces: reglas con la constante `UID_ADMIN` que la Task 14 reemplaza por el UID real antes de publicar. `firebase.json` habilita `firebase deploy --only firestore:rules,storage`.

**Nota:** `UID_ADMIN` es un valor de configuración que no existe hasta crear el usuario admin (Task 14) — no es un TODO del plan.

- [ ] **Step 1: Reemplazar `firebase/firestore.rules`**

```
rules_version = '2';

// Reglas de seguridad de Firestore para Prólogos Librería.
// Catálogo: lectura pública, escritura solo del administrador autenticado.
// Pedidos: cualquiera puede CREAR un pedido válido (checkout); leer y
// gestionar estados queda restringido al administrador.
service cloud.firestore {
  match /databases/{database}/documents {

    // UID del usuario administrador (Firebase Auth → Users).
    function esAdmin() {
      return request.auth != null && request.auth.uid == 'UID_ADMIN';
    }

    // Valida el esquema de un pedido entrante para impedir abuso del
    // create público: solo los campos esperados, con tipos y tamaños acotados.
    function pedidoValido() {
      let d = request.resource.data;
      return d.keys().hasOnly(['numero', 'items', 'total', 'cliente', 'estado', 'creado_en', 'actualizado_en'])
        && d.estado == 'nuevo'
        && d.numero is string && d.numero.size() <= 30
        && d.total is number && d.total > 0
        && d.items is list && d.items.size() > 0 && d.items.size() <= 50
        && d.cliente is map
        && d.cliente.keys().hasOnly(['nombre', 'telefono', 'email', 'ciudad', 'direccion'])
        && d.cliente.nombre is string && d.cliente.nombre.size() > 0 && d.cliente.nombre.size() <= 120
        && d.cliente.telefono is string && d.cliente.telefono.size() > 0 && d.cliente.telefono.size() <= 30
        && d.cliente.email is string && d.cliente.email.size() <= 120
        && d.cliente.ciudad is string && d.cliente.ciudad.size() <= 80
        && d.cliente.direccion is string && d.cliente.direccion.size() <= 200;
    }

    match /categorias/{id} {
      allow read: if true;
      allow write: if esAdmin();
    }

    match /libros/{id} {
      allow read: if true;
      allow write: if esAdmin();
    }

    match /pedidos/{id} {
      allow create: if pedidoValido();
      allow read, update, delete: if esAdmin();
    }
  }
}
```

- [ ] **Step 2: Crear `firebase/storage.rules`**

```
rules_version = '2';

// Portadas de libros: lectura pública, escritura solo del administrador,
// limitada a imágenes de máximo 5 MB.
service firebase.storage {
  match /b/{bucket}/o {
    match /portadas/{archivo} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == 'UID_ADMIN'
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

- [ ] **Step 3: Crear `firebase.json` en la raíz**

```json
{
  "firestore": {
    "rules": "firebase/firestore.rules"
  },
  "storage": {
    "rules": "firebase/storage.rules"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add firebase/firestore.rules firebase/storage.rules firebase.json
git commit -m "Reglas de seguridad: escritura solo admin, create de pedidos validado

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Formulario de login

**Files:**
- Create: `src/components/admin/LoginForm.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 5) — solo `entrar`.
- Produces: `<LoginForm />` sin props. Renderizado por `AdminPage` (Task 11). Clases CSS `admin-login`, `admin-login__card` (estilos en Task 13).

- [ ] **Step 1: Crear `src/components/admin/LoginForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';

export function LoginForm() {
  const { entrar } = useAuth();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await entrar(correo, clave);
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container section admin-login">
      <form className="admin-login__card" onSubmit={manejar}>
        <img src="/logo.svg" alt="Prólogos" width="48" height="48" />
        <h1>Panel de Prólogos</h1>
        <p className="admin-login__sub">Acceso exclusivo del administrador</p>
        <label>
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn btn--block" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso (el componente aún no se renderiza; tsc lo tipa igual).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/LoginForm.tsx
git commit -m "Añadir formulario de login del panel

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Formulario de libro (alta/edición con portada)

**Files:**
- Create: `src/components/admin/LibroForm.tsx`

**Interfaces:**
- Consumes: `crearLibro`, `actualizarLibro`, tipo `LibroDatos` (Task 3); `subirPortada` (Task 2); tipos `Libro`, `Categoria`.
- Produces: `<LibroForm libro={Libro | null} categorias={Categoria[]} alTerminar={() => void} alCancelar={() => void} />` — `libro === null` significa crear. Usado por `LibrosPanel` (Task 9). Clases CSS `admin-form`, `admin-form__row`, `admin-form__checks`, `admin-form__acciones`.

- [ ] **Step 1: Crear `src/components/admin/LibroForm.tsx`**

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Categoria, Libro } from '../../types';
import { actualizarLibro, crearLibro } from '../../data/catalogo';
import { subirPortada } from '../../lib/storage';

interface Props {
  libro: Libro | null; // null = crear uno nuevo
  categorias: Categoria[];
  alTerminar: () => void;
  alCancelar: () => void;
}

export function LibroForm({ libro, categorias, alTerminar, alCancelar }: Props) {
  const [datos, setDatos] = useState({
    titulo: libro?.titulo ?? '',
    autor: libro?.autor ?? '',
    precio: libro ? String(libro.precio) : '',
    descripcion: libro?.descripcion ?? '',
    categoria_id: libro?.categoria_id ?? categorias[0]?.id ?? '',
    etiqueta: libro?.etiqueta ?? '',
    activo: libro?.activo ?? true,
    destacado: libro?.destacado ?? false,
  });
  const [portada, setPortada] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set =
    (campo: 'titulo' | 'autor' | 'precio' | 'etiqueta') =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const valido =
    datos.titulo.trim() !== '' &&
    datos.autor.trim() !== '' &&
    Number(datos.precio) > 0 &&
    datos.categoria_id !== '';

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!valido || guardando) return;
    setGuardando(true);
    setError('');
    try {
      const base = {
        titulo: datos.titulo.trim(),
        autor: datos.autor.trim(),
        precio: Number(datos.precio),
        descripcion: datos.descripcion.trim(),
        categoria_id: datos.categoria_id,
        etiqueta: datos.etiqueta.trim(),
        activo: datos.activo,
        destacado: datos.destacado,
      };
      if (libro) {
        // Edición: si hay portada nueva se sube primero; si no, se conserva.
        const imagen_url = portada ? await subirPortada(portada, libro.id) : libro.imagen_url;
        await actualizarLibro(libro.id, { ...base, imagen_url });
      } else {
        // Alta: primero el documento (para tener id), luego la portada.
        const id = await crearLibro({ ...base, imagen_url: null });
        if (portada) {
          const url = await subirPortada(portada, id);
          await actualizarLibro(id, { imagen_url: url });
        }
      }
      alTerminar();
    } catch {
      setError('No se pudo guardar el libro. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={guardar}>
      <h2>{libro ? `Editar: ${libro.titulo}` : 'Nuevo libro'}</h2>

      <div className="admin-form__row">
        <label>
          Título
          <input value={datos.titulo} onChange={set('titulo')} required />
        </label>
        <label>
          Autor
          <input value={datos.autor} onChange={set('autor')} required />
        </label>
      </div>

      <div className="admin-form__row">
        <label>
          Precio (COP)
          <input
            type="number"
            min="0"
            step="100"
            value={datos.precio}
            onChange={set('precio')}
            required
          />
        </label>
        <label>
          Categoría
          <select
            value={datos.categoria_id}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setDatos((d) => ({ ...d, categoria_id: e.target.value }))
            }
            required
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Descripción
        <textarea
          rows={4}
          value={datos.descripcion}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setDatos((d) => ({ ...d, descripcion: e.target.value }))
          }
        />
      </label>

      <div className="admin-form__row">
        <label>
          Etiqueta (opcional, p. ej. "Novedad")
          <input value={datos.etiqueta} onChange={set('etiqueta')} />
        </label>
        <label>
          Portada (imagen, máx. 5 MB)
          <input
            type="file"
            accept="image/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPortada(e.target.files?.[0] ?? null)
            }
          />
        </label>
      </div>

      <div className="admin-form__checks">
        <label>
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => setDatos((d) => ({ ...d, activo: e.target.checked }))}
          />
          Visible en el catálogo
        </label>
        <label>
          <input
            type="checkbox"
            checked={datos.destacado}
            onChange={(e) => setDatos((d) => ({ ...d, destacado: e.target.checked }))}
          />
          Destacado (Libros del mes)
        </label>
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="admin-form__acciones">
        <button type="submit" className="btn" disabled={!valido || guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn--sec" onClick={alCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/LibroForm.tsx
git commit -m "Añadir formulario de alta/edición de libros con subida de portada

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Panel de libros (tabla CRUD)

**Files:**
- Create: `src/components/admin/LibrosPanel.tsx`

**Interfaces:**
- Consumes: `obtenerLibrosAdmin`, `obtenerCategorias`, `actualizarLibro`, `eliminarLibro` (Task 3); `<LibroForm>` (Task 8); `formatearPrecio` de `src/lib/format`.
- Produces: `<LibrosPanel />` sin props. Usado por `AdminPage` (Task 11). Clases CSS `admin-tabla`, `admin-tabla__acciones`, `admin-badge`, `admin-badge--off`.

- [ ] **Step 1: Crear `src/components/admin/LibrosPanel.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { Categoria, Libro } from '../../types';
import {
  actualizarLibro,
  eliminarLibro,
  obtenerCategorias,
  obtenerLibrosAdmin,
} from '../../data/catalogo';
import { formatearPrecio } from '../../lib/format';
import { LibroForm } from './LibroForm';

export function LibrosPanel() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Libro | 'nuevo' | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [ls, cs] = await Promise.all([obtenerLibrosAdmin(), obtenerCategorias()]);
      setLibros(ls);
      setCategorias(cs);
    } catch {
      setError('No se pudieron cargar los libros.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarActivo(libro: Libro) {
    setError('');
    try {
      await actualizarLibro(libro.id, { activo: !libro.activo });
      cargar();
    } catch {
      setError('No se pudo actualizar el libro.');
    }
  }

  async function borrar(libro: Libro) {
    if (!window.confirm(`¿Borrar "${libro.titulo}"? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await eliminarLibro(libro.id);
      cargar();
    } catch {
      setError('No se pudo borrar el libro.');
    }
  }

  if (editando) {
    return (
      <LibroForm
        libro={editando === 'nuevo' ? null : editando}
        categorias={categorias}
        alTerminar={() => {
          setEditando(null);
          cargar();
        }}
        alCancelar={() => setEditando(null)}
      />
    );
  }

  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  return (
    <section>
      <div className="admin-tabla__head">
        <p>
          {libros.length} libros ({libros.filter((l) => l.activo).length} visibles)
        </p>
        <button className="btn" onClick={() => setEditando('nuevo')}>
          + Nuevo libro
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}
      {cargando && <p>Cargando libros…</p>}

      {!cargando && (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Autor</th>
                <th>Precio</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {libros.map((libro) => (
                <tr key={libro.id}>
                  <td>{libro.titulo}</td>
                  <td>{libro.autor}</td>
                  <td>{formatearPrecio(libro.precio)}</td>
                  <td>{nombreCategoria(libro.categoria_id)}</td>
                  <td>
                    <span className={`admin-badge${libro.activo ? '' : ' admin-badge--off'}`}>
                      {libro.activo ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td className="admin-tabla__acciones">
                    <button onClick={() => setEditando(libro)}>Editar</button>
                    <button onClick={() => alternarActivo(libro)}>
                      {libro.activo ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button onClick={() => borrar(libro)}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/LibrosPanel.tsx
git commit -m "Añadir panel de gestión de libros con tabla CRUD

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Panel de pedidos en tiempo real + enlace WhatsApp al cliente

**Files:**
- Modify: `src/config.ts` (añadir `urlWhatsAppCliente`)
- Create: `src/components/admin/PedidosPanel.tsx`

**Interfaces:**
- Consumes: `suscribirsePedidos`, `actualizarEstadoPedido` (Task 4); tipos `Pedido`, `EstadoPedido` (Task 1); `formatearPrecio`.
- Produces: `urlWhatsAppCliente(telefono: string): string` en `config.ts`; `<PedidosPanel />` sin props, usado por `AdminPage` (Task 11). Clases CSS `admin-filtros`, `pedido-card`, `pedido-card__head`, `pedido-card__detalle`, `pedido-card__acciones`, `estado`, `estado--nuevo|confirmado|enviado|entregado|cancelado`.

- [ ] **Step 1: Añadir al final de `src/config.ts`**

```ts
// Enlace directo de WhatsApp a un cliente. Acepta el teléfono tal como lo
// escribió en el checkout; si parece un celular colombiano (10 dígitos que
// empiezan por 3) se le antepone el indicativo 57.
export function urlWhatsAppCliente(telefono: string): string {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.length === 10 && digitos.startsWith('3')) digitos = `57${digitos}`;
  return `https://wa.me/${digitos}`;
}
```

- [ ] **Step 2: Crear `src/components/admin/PedidosPanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { EstadoPedido, Pedido } from '../../types';
import { actualizarEstadoPedido, suscribirsePedidos } from '../../data/pedidos';
import { formatearPrecio } from '../../lib/format';
import { urlWhatsAppCliente } from '../../config';

const ESTADOS: EstadoPedido[] = ['nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado'];

const ETIQUETAS: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Transición principal de cada estado (cancelar está siempre disponible).
const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  nuevo: 'confirmado',
  confirmado: 'enviado',
  enviado: 'entregado',
};

function fecha(p: Pedido): string {
  return p.creado_en
    ? p.creado_en.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}

export function PedidosPanel() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<'todos' | EstadoPedido>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Suscripción en vivo: los pedidos nuevos aparecen sin recargar.
  useEffect(() => suscribirsePedidos(setPedidos), []);

  const visibles = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro);

  async function cambiarEstado(pedido: Pedido, estado: EstadoPedido) {
    setError('');
    try {
      await actualizarEstadoPedido(pedido.id, estado);
    } catch {
      setError('No se pudo actualizar el estado del pedido.');
    }
  }

  return (
    <section>
      <div className="admin-filtros">
        <button className={filtro === 'todos' ? 'is-active' : ''} onClick={() => setFiltro('todos')}>
          Todos ({pedidos.length})
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            className={filtro === e ? 'is-active' : ''}
            onClick={() => setFiltro(e)}
          >
            {ETIQUETAS[e]} ({pedidos.filter((p) => p.estado === e).length})
          </button>
        ))}
      </div>

      {error && <p className="field-error">{error}</p>}

      {visibles.length === 0 && (
        <p className="admin-vacio">
          {pedidos.length === 0
            ? 'Aún no hay pedidos. Cuando un cliente confirme su compra aparecerá aquí al instante.'
            : 'No hay pedidos con este estado.'}
        </p>
      )}

      <ul className="pedido-lista">
        {visibles.map((p) => (
          <li key={p.id} className="pedido-card">
            <button
              className="pedido-card__head"
              onClick={() => setAbierto(abierto === p.id ? null : p.id)}
            >
              <span className="pedido-card__numero">{p.numero}</span>
              <span>{p.cliente.nombre}</span>
              <span>{fecha(p)}</span>
              <strong>{formatearPrecio(p.total)}</strong>
              <span className={`estado estado--${p.estado}`}>{ETIQUETAS[p.estado]}</span>
            </button>

            {abierto === p.id && (
              <div className="pedido-card__detalle">
                <ul>
                  {p.items.map((item) => (
                    <li key={item.libro_id}>
                      {item.cantidad} × {item.titulo} — {formatearPrecio(item.precio * item.cantidad)}
                    </li>
                  ))}
                </ul>
                <p>
                  {p.cliente.telefono} · {p.cliente.email}
                  <br />
                  {p.cliente.ciudad} — {p.cliente.direccion}
                </p>
                <div className="pedido-card__acciones">
                  {SIGUIENTE[p.estado] && (
                    <button className="btn" onClick={() => cambiarEstado(p, SIGUIENTE[p.estado]!)}>
                      Marcar {ETIQUETAS[SIGUIENTE[p.estado]!].toLowerCase()}
                    </button>
                  )}
                  {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                    <button className="btn btn--sec" onClick={() => cambiarEstado(p, 'cancelado')}>
                      Cancelar pedido
                    </button>
                  )}
                  <a
                    className="btn btn--sec"
                    href={urlWhatsAppCliente(p.cliente.telefono)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp al cliente
                  </a>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/config.ts src/components/admin/PedidosPanel.tsx
git commit -m "Añadir panel de pedidos en tiempo real con gestión de estados

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: AdminPage y ruta /admin

**Files:**
- Create: `src/pages/AdminPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth`/`AuthProvider` (Task 5); `LoginForm` (Task 7); `LibrosPanel` (Task 9); `PedidosPanel` (Task 10); `usandoFirebase` (Task 2).
- Produces: ruta `/admin` funcional. Clases CSS `admin`, `admin__head`, `admin__user`, `admin__tabs`.

- [ ] **Step 1: Crear `src/pages/AdminPage.tsx`**

```tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usandoFirebase } from '../lib/firebase';
import { LoginForm } from '../components/admin/LoginForm';
import { PedidosPanel } from '../components/admin/PedidosPanel';
import { LibrosPanel } from '../components/admin/LibrosPanel';

export function AdminPage() {
  const { usuario, cargando, salir } = useAuth();
  const [pestana, setPestana] = useState<'pedidos' | 'libros'>('pedidos');

  if (!usandoFirebase) {
    return (
      <div className="container section">
        <h1>Panel de administración</h1>
        <p>
          El panel requiere Firebase configurado. Copia <code>.env.example</code> a{' '}
          <code>.env</code> y completa las variables <code>VITE_FIREBASE_*</code>.
        </p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="container section">
        <p>Cargando…</p>
      </div>
    );
  }

  if (!usuario) return <LoginForm />;

  return (
    <div className="container section admin">
      <header className="admin__head">
        <div>
          <h1>Panel de administración</h1>
          <p className="admin__user">{usuario.email}</p>
        </div>
        <button className="btn btn--sec" onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <nav className="admin__tabs" aria-label="Secciones del panel">
        <button
          className={pestana === 'pedidos' ? 'is-active' : ''}
          onClick={() => setPestana('pedidos')}
        >
          Pedidos
        </button>
        <button
          className={pestana === 'libros' ? 'is-active' : ''}
          onClick={() => setPestana('libros')}
        >
          Libros
        </button>
      </nav>

      {pestana === 'pedidos' ? <PedidosPanel /> : <LibrosPanel />}
    </div>
  );
}
```

- [ ] **Step 2: Registrar la ruta en `src/App.tsx`**

Añadir los imports:

```tsx
import { AuthProvider } from './context/AuthContext';
import { AdminPage } from './pages/AdminPage';
```

Y dentro de `<Routes>`, antes de la ruta comodín `*`:

```tsx
<Route
  path="/admin"
  element={
    <AuthProvider>
      <AdminPage />
    </AuthProvider>
  }
/>
```

- [ ] **Step 3: Verificar build y render**

Run: `npm run build`
Expected: build exitoso.

Run: `npm run dev` y abrir `http://localhost:5173/admin`
Expected: se ve el formulario de login (sin estilos finos todavía — llegan en Task 13). El login aún no funciona: Email/Password se habilita en Task 14.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPage.tsx src/App.tsx
git commit -m "Añadir página /admin con login y pestañas de pedidos y libros

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Checkout guarda el pedido en Firestore

**Files:**
- Modify: `src/pages/CheckoutPage.tsx`

**Interfaces:**
- Consumes: `crearPedido` (Task 4); `vaciar` de `useCart()`; `urlWhatsApp` de `config.ts`.
- Produces: al confirmar, el pedido queda en Firestore con estado `nuevo` y el mensaje de WhatsApp incluye el número. Si Firestore falla, WhatsApp abre igual. El carrito se vacía y se muestra confirmación.

- [ ] **Step 1: Modificar `src/pages/CheckoutPage.tsx`**

Añadir el import:

```tsx
import { crearPedido } from '../data/pedidos';
```

Cambiar la desestructuración del carrito para incluir `vaciar`:

```tsx
const { items, totalPrecio, vaciar } = useCart();
```

Añadir estados junto a `datos` (antes del early-return de carrito vacío):

```tsx
const [enviando, setEnviando] = useState(false);
const [numeroEnviado, setNumeroEnviado] = useState<string | null>(null);
```

Añadir la pantalla de confirmación ANTES del early-return de carrito vacío
(el orden importa: tras vaciar el carrito, esta condición debe ganar):

```tsx
if (numeroEnviado !== null) {
  return (
    <div className="container section empty-state">
      <h1>¡Pedido enviado!</h1>
      <p>
        {numeroEnviado
          ? `Tu pedido ${numeroEnviado} quedó registrado.`
          : 'Tu pedido quedó registrado.'}{' '}
        Te atenderemos por WhatsApp para coordinar el pago y el envío.
      </p>
      <Link to="/catalogo" className="btn btn--lg">
        Seguir explorando
      </Link>
    </div>
  );
}
```

Nota: `numeroEnviado` distingue tres casos — `null` (sin enviar), `''` (enviado
sin registro en Firestore) y `'P-...'` (enviado y registrado).

Reemplazar la construcción de `mensaje` para separar el encabezado:

```tsx
const cuerpoMensaje =
  items
    .map((i) => `• ${i.cantidad} × ${i.libro.titulo} (${formatearPrecio(i.libro.precio)})`)
    .join('\n') +
  `\n\nTotal: ${formatearPrecio(totalPrecio)}` +
  `\n\nDatos de envío:\n${datos.nombre}\n${datos.telefono}\n${datos.ciudad} — ${datos.direccion}\n${datos.email}`;
```

Añadir el manejador de confirmación (después de `formularioCompleto`):

```tsx
async function confirmarPedido() {
  if (!formularioCompleto || enviando) return;
  setEnviando(true);
  // El registro en Firestore alimenta el panel; si falla, la venta sigue
  // por WhatsApp sin bloquearse.
  let numero: string | null = null;
  try {
    numero = await crearPedido({
      items: items.map((i) => ({
        libro_id: i.libro.id,
        titulo: i.libro.titulo,
        precio: i.libro.precio,
        cantidad: i.cantidad,
      })),
      total: totalPrecio,
      cliente: { ...datos },
    });
  } catch (err) {
    console.error('No se pudo registrar el pedido en Firestore', err);
  }
  const encabezado = numero
    ? `Hola Prólogos 👋, confirmo el pedido ${numero}:\n\n`
    : 'Hola Prólogos 👋, confirmo este pedido:\n\n';
  window.open(urlWhatsApp(encabezado + cuerpoMensaje), '_blank', 'noopener');
  vaciar();
  setNumeroEnviado(numero ?? '');
  setEnviando(false);
}
```

Reemplazar el `<a className="btn btn--lg btn--block" ...>Confirmar pedido por WhatsApp</a>` por:

```tsx
<button
  type="button"
  className={`btn btn--lg btn--block ${!formularioCompleto ? 'btn--disabled' : ''}`}
  onClick={confirmarPedido}
  disabled={!formularioCompleto || enviando}
>
  {enviando ? 'Registrando pedido…' : 'Confirmar pedido por WhatsApp'}
</button>
```

- [ ] **Step 2: Verificar build y flujo**

Run: `npm run build`
Expected: build exitoso.

Run: `npm run dev` → agregar un libro al carrito → checkout → llenar el formulario → confirmar.
Expected: se abre WhatsApp con el número de pedido en el mensaje, el carrito queda vacío y se ve la pantalla "¡Pedido enviado!". En Firestore (consola o MCP) existe el documento en `pedidos` con `estado: "nuevo"`.
Nota: hasta publicar las reglas nuevas (Task 14) el create puede fallar — verificar entonces que WhatsApp abre igual y el error solo aparece en consola.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CheckoutPage.tsx
git commit -m "Registrar pedidos en Firestore desde el checkout con número de pedido

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Estilos del panel

**Files:**
- Modify: `src/index.css` (bloque nuevo antes de `/* Responsive */`, más reglas responsive dentro de ese bloque final)

**Interfaces:**
- Consumes: tokens `:root` existentes; clases producidas en Tasks 7–11.
- Produces: estilos para `admin-login`, `admin`, `admin__tabs`, `admin-filtros`, `admin-form`, `admin-tabla`, `admin-badge`, `pedido-*`, `estado--*`, `btn--sec`.

- [ ] **Step 1: Añadir el bloque de estilos antes de `/* Responsive */`**

```css
/* ==========================================================================
   Panel de administración
   ========================================================================== */

.btn--sec {
  background: var(--color-blanco);
  color: var(--color-tinta);
  border: 1px solid var(--color-borde);
}

.btn--sec:hover {
  border-color: var(--color-vino);
}

/* Login */
.admin-login {
  display: flex;
  justify-content: center;
}

.admin-login__card {
  width: 100%;
  max-width: 380px;
  background: var(--color-blanco);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
  box-shadow: var(--sombra);
  padding: 2.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  text-align: center;
}

.admin-login__card img {
  margin: 0 auto;
}

.admin-login__card h1 {
  font-size: 1.4rem;
  margin: 0;
}

.admin-login__sub {
  color: var(--color-tinta-suave);
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

.admin-login__card label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
  font-size: 0.9rem;
}

.admin-login__card input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-sm);
  font: inherit;
}

/* Cabecera y pestañas */
.admin__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.admin__user {
  color: var(--color-tinta-suave);
  font-size: 0.9rem;
  margin: 0;
}

.admin__tabs {
  display: flex;
  gap: 0.4rem;
  border-bottom: 1px solid var(--color-borde);
  margin-bottom: 1.4rem;
}

.admin__tabs button {
  font: inherit;
  font-family: var(--fuente-titulo);
  font-size: 1.05rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.5rem 1rem;
  cursor: pointer;
  color: var(--color-tinta-suave);
}

.admin__tabs button.is-active {
  color: var(--color-vino-osc);
  border-bottom-color: var(--color-vino-osc);
}

/* Filtros de pedidos */
.admin-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.2rem;
}

.admin-filtros button {
  font: inherit;
  font-size: 0.85rem;
  background: var(--color-blanco);
  border: 1px solid var(--color-borde);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  color: var(--color-tinta-suave);
}

.admin-filtros button.is-active {
  background: var(--color-vino);
  border-color: var(--color-vino);
  color: var(--color-blanco);
}

.admin-vacio {
  color: var(--color-tinta-suave);
  padding: 2rem 0;
  text-align: center;
}

/* Tarjetas de pedido */
.pedido-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.pedido-card {
  background: var(--color-blanco);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
}

.pedido-card__head {
  font: inherit;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 1rem;
  background: none;
  border: none;
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  text-align: left;
}

.pedido-card__numero {
  font-family: var(--fuente-titulo);
  font-weight: 700;
}

.pedido-card__detalle {
  border-top: 1px solid var(--color-borde);
  padding: 1rem 1.1rem;
  font-size: 0.92rem;
}

.pedido-card__detalle ul {
  margin: 0 0 0.8rem;
  padding-left: 1.1rem;
}

.pedido-card__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

/* Estados de pedido — paleta monocroma con el vino de acento */
.estado {
  font-size: 0.78rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--color-borde);
  color: var(--color-tinta-suave);
  white-space: nowrap;
}

.estado--nuevo {
  background: var(--color-vino);
  border-color: var(--color-vino);
  color: var(--color-blanco);
}

.estado--confirmado {
  border-color: var(--color-vino);
  color: var(--color-vino);
}

.estado--enviado {
  background: var(--color-crema-2);
}

.estado--entregado {
  color: var(--color-oro);
}

.estado--cancelado {
  text-decoration: line-through;
}

/* Tabla de libros */
.admin-tabla__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-tabla__head p {
  color: var(--color-tinta-suave);
  margin: 0;
}

.admin-tabla__scroll {
  overflow-x: auto;
}

.admin-tabla {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-blanco);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
  font-size: 0.92rem;
}

.admin-tabla th,
.admin-tabla td {
  text-align: left;
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid var(--color-borde);
}

.admin-tabla th {
  font-family: var(--fuente-titulo);
  font-size: 0.85rem;
  color: var(--color-tinta-suave);
}

.admin-badge {
  font-size: 0.78rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--color-vino);
  color: var(--color-blanco);
  white-space: nowrap;
}

.admin-badge--off {
  background: var(--color-crema-2);
  color: var(--color-tinta-suave);
}

.admin-tabla__acciones {
  white-space: nowrap;
}

.admin-tabla__acciones button {
  font: inherit;
  font-size: 0.82rem;
  background: none;
  border: none;
  color: var(--color-vino);
  text-decoration: underline;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
}

/* Formulario de libro */
.admin-form {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.admin-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
  flex: 1;
}

.admin-form input,
.admin-form select,
.admin-form textarea {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-sm);
  font: inherit;
}

.admin-form__row {
  display: flex;
  gap: 0.9rem;
}

.admin-form__checks {
  display: flex;
  gap: 1.5rem;
}

.admin-form__checks label {
  flex-direction: row;
  align-items: center;
  gap: 0.45rem;
}

.admin-form__acciones {
  display: flex;
  gap: 0.6rem;
}
```

- [ ] **Step 2: Añadir al final del bloque `/* Responsive */` (dentro del breakpoint 620px)**

```css
  .admin-form__row {
    flex-direction: column;
  }

  .pedido-card__head {
    grid-template-columns: 1fr auto;
    row-gap: 0.25rem;
  }

  .admin__head {
    flex-direction: column;
  }
```

- [ ] **Step 3: Verificar build y aspecto**

Run: `npm run build`
Expected: build exitoso.

Run: `npm run dev` → `/admin`.
Expected: login como tarjeta centrada con logo, coherente con la identidad del sitio.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "Añadir estilos del panel de administración con la identidad de marca

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Configuración de Firebase (Blaze, Auth, UID, publicar reglas)

**Files:**
- Modify: `firebase/firestore.rules` (reemplazar `UID_ADMIN`)
- Modify: `firebase/storage.rules` (reemplazar `UID_ADMIN`)

Pasos mixtos: algunos los hace el usuario en la consola; los de verificación y deploy se hacen con el MCP de Firebase.

- [ ] **Step 1 (usuario, consola): Activar el plan Blaze**

En https://console.firebase.google.com/project/prologoslibreria-a4280/usage/details → "Modificar plan" → Blaze. Necesario para habilitar Storage; el uso del catálogo queda dentro de la cuota gratuita ($0).

- [ ] **Step 2 (usuario, consola): Habilitar Storage**

Consola → Build → Storage → "Comenzar" (aceptar el bucket por defecto `prologoslibreria-a4280.firebasestorage.app`, que ya está en `.env`).

- [ ] **Step 3 (usuario, consola): Habilitar Email/Password y crear el usuario admin**

Consola → Build → Authentication → Sign-in method → habilitar "Correo electrónico/contraseña". Luego en Users → "Agregar usuario": el correo del dueño y una contraseña fuerte.

- [ ] **Step 4 (MCP): Obtener el UID del admin**

Con `mcp__firebase__auth_get_users` pasando el correo creado.
Expected: JSON con el usuario y su `uid`.

- [ ] **Step 5: Reemplazar `UID_ADMIN` por el UID real**

En `firebase/firestore.rules` y `firebase/storage.rules`, sustituir la cadena `UID_ADMIN` por el UID obtenido (aparece una vez en cada archivo).

- [ ] **Step 6 (MCP): Publicar las reglas**

Con `mcp__firebase__firebase_deploy` y `only: "firestore,storage"` (usa el `firebase.json` de la Task 6).
Expected: deploy exitoso de ambas reglas.

- [ ] **Step 7: Commit**

```bash
git add firebase/firestore.rules firebase/storage.rules
git commit -m "Fijar el UID del administrador en las reglas publicadas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: Verificación end-to-end

Checklist manual con `npm run dev` (Firebase real, reglas ya publicadas):

- [ ] **Login incorrecto** → mensaje "Correo o contraseña incorrectos.", sin entrar.
- [ ] **Login correcto** → panel con pestañas; el correo del admin visible; "Cerrar sesión" vuelve al login.
- [ ] **Crear libro con portada** → aparece en la tabla; la portada se ve en el catálogo público (`/catalogo`).
- [ ] **Crear libro sin portada** → catálogo muestra la portada de marca generada.
- [ ] **Editar libro** (precio/etiqueta) → cambio visible en el catálogo tras recargar.
- [ ] **Ocultar libro** → desaparece del catálogo público; sigue en la tabla como "Oculto".
- [ ] **Borrar libro** → pide confirmación y desaparece.
- [ ] **Pedido end-to-end**: en otra pestaña (ventana de incógnito, sin sesión) carrito → checkout → confirmar. WhatsApp abre con el número de pedido; el carrito queda vacío con pantalla de confirmación; **el pedido aparece en el panel sin recargar** (tiempo real).
- [ ] **Estados**: avanzar nuevo → confirmado → enviado → entregado; filtros reflejan los conteos; "WhatsApp al cliente" abre `wa.me` con el teléfono del pedido.
- [ ] **Seguridad**: en la ventana de incógnito (sin autenticar), en la consola del navegador, intentar `updateDoc` sobre un libro debe fallar con `permission-denied`. Alternativa: Rules Playground en la consola de Firebase (simular write a `/libros/x` sin auth → deny; create inválido a `/pedidos/x` con campo extra → deny).
- [ ] **`npm run build`** final exitoso.
- [ ] **Commit final** si hubo ajustes.
