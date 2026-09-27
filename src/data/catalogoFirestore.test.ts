import { describe, expect, it, vi } from 'vitest';

// Rama Firestore: db presente y las funciones del SDK mockeadas.
const fs = vi.hoisted(() => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn((campo: string) => ({ tipo: 'orderBy', campo })),
  query: vi.fn((...partes: unknown[]) => ({ tipo: 'query', partes })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  updateDoc: vi.fn(),
  where: vi.fn((campo: string, op: string, valor: unknown) => ({ tipo: 'where', campo, op, valor })),
  collection: vi.fn((_db: unknown, nombre: string) => ({ tipo: 'coleccion', nombre })),
  doc: vi.fn((_db: unknown, ...ruta: string[]) => ({ tipo: 'doc', ruta })),
}));

vi.mock('firebase/firestore', () => fs);
vi.mock('../lib/firebase', () => ({
  db: { nombre: 'db-de-pruebas' },
  auth: null,
  storage: null,
  usandoFirebase: true,
}));

import { crearLibro, obtenerCategorias, obtenerLibro, obtenerLibros, obtenerLibrosAdmin } from './catalogo';

describe('obtenerLibros (rama Firestore)', () => {
  it('filtra por activo == true y mapea el id del documento', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [{ id: 'abc', data: () => ({ titulo: 'Viviendo Su Voluntad', activo: true }) }],
    });

    const libros = await obtenerLibros();

    expect(fs.where).toHaveBeenCalledWith('activo', '==', true);
    expect(fs.collection).toHaveBeenCalledWith(expect.anything(), 'libros');
    expect(libros).toEqual([
      { id: 'abc', titulo: 'Viviendo Su Voluntad', activo: true },
    ]);
  });
});

describe('obtenerCategorias (rama Firestore)', () => {
  it('ordena por el campo orden', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [{ id: 'cat-1', data: () => ({ nombre: 'Devocionales', orden: 2, slug: 'devocionales' }) }],
    });

    const categorias = await obtenerCategorias();

    expect(fs.orderBy).toHaveBeenCalledWith('orden');
    expect(categorias).toEqual([
      { id: 'cat-1', nombre: 'Devocionales', orden: 2, slug: 'devocionales' },
    ]);
  });
});

describe('obtenerLibro (rama Firestore)', () => {
  it('devuelve el documento cuando existe', async () => {
    fs.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'lib-001',
      data: () => ({ titulo: 'Conocer a Dios', activo: true }),
    });

    expect(await obtenerLibro('lib-001')).toEqual({
      id: 'lib-001',
      titulo: 'Conocer a Dios',
      activo: true,
    });
  });

  it('devuelve null cuando no existe', async () => {
    fs.getDoc.mockResolvedValue({ exists: () => false });

    expect(await obtenerLibro('nope')).toBeNull();
  });
});

describe('crearLibro (rama Firestore)', () => {
  it('escribe la colección con la marca de tiempo del servidor', async () => {
    fs.addDoc.mockResolvedValue({ id: 'lib-nuevo' });

    const id = await crearLibro({ titulo: 'Nuevo', precio: 50000 } as never);

    expect(id).toBe('lib-nuevo');
    expect(fs.addDoc).toHaveBeenCalledWith(
      { tipo: 'coleccion', nombre: 'libros' },
      { titulo: 'Nuevo', precio: 50000, creado_en: 'SERVER_TIMESTAMP' },
    );
  });
});

describe('obtenerLibrosAdmin (rama Firestore)', () => {
  it('trae todos los libros (incluidos inactivos) ordenados por título', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ titulo: 'A', activo: false }) },
        { id: 'b', data: () => ({ titulo: 'B', activo: true }) },
      ],
    });

    const libros = await obtenerLibrosAdmin();

    expect(fs.orderBy).toHaveBeenCalledWith('titulo');
    expect(libros).toHaveLength(2);
    expect(libros.map((l) => l.activo)).toEqual([false, true]);
  });
});
