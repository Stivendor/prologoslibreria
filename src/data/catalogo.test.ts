import { describe, expect, it, vi } from 'vitest';

// Rama seed: sin Firebase el catálogo se sirve desde los datos locales.
vi.mock('../lib/firebase', () => ({
  db: null,
  auth: null,
  storage: null,
  usandoFirebase: false,
}));

import {
  actualizarLibro,
  crearLibro,
  eliminarLibro,
  obtenerCategorias,
  obtenerLibro,
  obtenerLibros,
  obtenerLibrosAdmin,
} from './catalogo';
import { categoriasSeed, librosSeed } from './seed';

describe('obtenerLibros (rama seed)', () => {
  it('devuelve únicamente libros activos', async () => {
    const libros = await obtenerLibros();

    expect(libros.length).toBeGreaterThan(0);
    expect(libros.every((l) => l.activo)).toBe(true);
    expect(libros.length).toBe(librosSeed.filter((l) => l.activo).length);
  });

  it('incluye los títulos del catálogo local', async () => {
    const libros = await obtenerLibros();

    expect(libros.map((l) => l.id)).toContain('lib-001');
    // Algunos devocionales no traen autor; el título y el precio sí son
    // obligatorios para poder vender el libro.
    expect(libros.every((l) => l.titulo && l.precio > 0)).toBe(true);
    expect(libros.every((l) => typeof l.autor === 'string')).toBe(true);
  });
});

describe('obtenerCategorias (rama seed)', () => {
  it('las devuelve ordenadas por el campo orden', async () => {
    const categorias = await obtenerCategorias();

    expect(categorias.length).toBe(categoriasSeed.length);
    const ordenes = categorias.map((c) => c.orden);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
    expect(categorias[0].slug).toBe('favoritos');
  });
});

describe('obtenerLibro (rama seed)', () => {
  it('encuentra un libro por id', async () => {
    const libro = await obtenerLibro('lib-001');

    expect(libro).not.toBeNull();
    expect(libro?.id).toBe('lib-001');
    expect(libro?.titulo).toBe(librosSeed[0].titulo);
  });

  it('devuelve null cuando el id no existe', async () => {
    expect(await obtenerLibro('lib-inexistente')).toBeNull();
  });
});

describe('operaciones del panel sin Firebase', () => {
  const rechazan: [string, () => Promise<unknown>][] = [
    ['obtenerLibrosAdmin', () => obtenerLibrosAdmin()],
    ['crearLibro', () => crearLibro({} as never)],
    ['actualizarLibro', () => actualizarLibro('lib-001', { precio: 1 })],
    ['eliminarLibro', () => eliminarLibro('lib-001')],
  ];

  it.each(rechazan)('%s rechaza porque no hay dónde persistir', async (_nombre, llamada) => {
    await expect(llamada()).rejects.toThrow(
      'El panel de administración requiere Firebase configurado.',
    );
  });
});
