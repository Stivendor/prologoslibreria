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
import type { Categoria, Libro } from '../types';
import { db } from '../lib/firebase';
import { categoriasSeed, librosSeed } from './seed';

// Capa de acceso a datos del catálogo.
// Si hay conexión a Firebase (Firestore) se consultan las colecciones; de lo
// contrario se devuelven los datos semilla locales, de modo que la app corre en
// cualquier entorno sin bloquear el desarrollo del frontend.

export async function obtenerCategorias(): Promise<Categoria[]> {
  if (db) {
    const snap = await getDocs(query(collection(db, 'categorias'), orderBy('orden')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Categoria[];
  }
  return [...categoriasSeed].sort((a, b) => a.orden - b.orden);
}

export async function obtenerLibros(): Promise<Libro[]> {
  if (db) {
    const snap = await getDocs(query(collection(db, 'libros'), where('activo', '==', true)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Libro[];
  }
  return librosSeed.filter((l) => l.activo);
}

export async function obtenerLibro(id: string): Promise<Libro | null> {
  if (db) {
    const snap = await getDoc(doc(db, 'libros', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Libro) : null;
  }
  return librosSeed.find((l) => l.id === id) ?? null;
}

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
