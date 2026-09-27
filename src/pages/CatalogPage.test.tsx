import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Categoria, Libro } from '../types';
import { CartProvider } from '../context/CartContext';
import { useCatalogo } from '../hooks/useCatalogo';
import { CatalogPage } from './CatalogPage';

vi.mock('../hooks/useCatalogo', () => ({ useCatalogo: vi.fn() }));

const categorias: Categoria[] = [
  { id: 'cat-favoritos', nombre: 'Favoritos del Mes', slug: 'favoritos', orden: 1 },
  { id: 'cat-devocionales', nombre: 'Devocionales', slug: 'devocionales', orden: 2 },
];

function libro(id: string, extra: Partial<Libro> = {}): Libro {
  return {
    id,
    titulo: `Título ${id}`,
    autor: 'Autor Genérico',
    precio: 68000,
    descripcion: '',
    imagen_url: null,
    categoria_id: 'cat-favoritos',
    activo: true,
    destacado: false,
    ...extra,
  };
}

function responder(libros: Libro[], extra: Partial<ReturnType<typeof useCatalogo>> = {}) {
  vi.mocked(useCatalogo).mockReturnValue({
    libros,
    categorias,
    cargando: false,
    error: null,
    ...extra,
  });
}

function pintar(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <CartProvider>
        <CatalogPage />
      </CartProvider>
    </MemoryRouter>,
  );
}

const buscar = () => screen.getByRole('searchbox', { name: 'Buscar libros' });
const tarjetas = () => screen.getAllByRole('article');

// La portada de marca repite título y autor: el título "oficial" de la tarjeta
// es el del encabezado h3.
const titulosVisibles = () =>
  tarjetas().map(
    (tarjeta) => within(tarjeta).getByRole('heading', { level: 3 }).textContent ?? '',
  );

describe('Catálogo: listado', () => {
  it('muestra los libros y el total encontrados', () => {
    responder([
      libro('lib-1', { titulo: 'Viviendo Su Voluntad' }),
      libro('lib-2', { titulo: 'Conocer a Dios' }),
    ]);
    pintar();

    expect(titulosVisibles()).toEqual(['Viviendo Su Voluntad', 'Conocer a Dios']);
    expect(screen.getByText('2 libro(s)')).toBeInTheDocument();
    expect(tarjetas()).toHaveLength(2);
  });

  it('muestra el estado de carga', () => {
    responder([], { cargando: true });
    pintar();

    expect(screen.getByText('Cargando catálogo…')).toBeInTheDocument();
    expect(screen.queryByText(/libro\(s\)/)).not.toBeInTheDocument();
  });

  it('muestra el error del catálogo', () => {
    responder([], { error: 'permission-denied' });
    pintar();

    expect(
      screen.getByText('No se pudo cargar el catálogo: permission-denied'),
    ).toBeInTheDocument();
  });
});

describe('Catálogo: búsqueda', () => {
  it('filtra por título ignorando mayúsculas', async () => {
    const usuario = userEvent.setup();
    responder([
      libro('lib-1', { titulo: 'Viviendo Su Voluntad' }),
      libro('lib-2', { titulo: 'Conocer a Dios' }),
    ]);
    pintar();

    await usuario.type(buscar(), 'VOLUNTAD');

    expect(titulosVisibles()).toEqual(['Viviendo Su Voluntad']);
    expect(screen.getByText('1 libro(s)')).toBeInTheDocument();
  });

  it('filtra por autor', async () => {
    const usuario = userEvent.setup();
    responder([
      libro('lib-1', { titulo: 'Viviendo Su Voluntad', autor: 'Sebastián Franz' }),
      libro('lib-2', { titulo: 'El Caos Dentro de Mí', autor: 'Edyah Ramos' }),
    ]);
    pintar();

    await usuario.type(buscar(), 'franz');

    expect(titulosVisibles()).toEqual(['Viviendo Su Voluntad']);
    expect(screen.getByText('1 libro(s)')).toBeInTheDocument();
  });

  it('informa cuando nada coincide', async () => {
    const usuario = userEvent.setup();
    responder([libro('lib-1', { titulo: 'Conocer a Dios' })]);
    pintar();

    await usuario.type(buscar(), 'zzz');

    expect(
      screen.getByText('No se encontraron libros con esos criterios.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});

describe('Catálogo: filtro por categoría', () => {
  const libros = [
    libro('lib-1', { titulo: 'Favorito Uno', categoria_id: 'cat-favoritos' }),
    libro('lib-2', { titulo: 'Devocional Uno', categoria_id: 'cat-devocionales' }),
  ];

  it('respeta la categoría venida en la URL', () => {
    responder(libros);
    pintar('/?categoria=devocionales');

    expect(titulosVisibles()).toEqual(['Devocional Uno']);
    expect(screen.getByText('1 libro(s)')).toBeInTheDocument();
  });

  it('marca como activa la chip de la categoría filtrada', () => {
    responder(libros);
    pintar('/?categoria=devocionales');

    expect(screen.getByRole('button', { name: 'Devocionales' })).toHaveClass('chip--active');
    expect(screen.getByRole('button', { name: 'Todas' })).not.toHaveClass('chip--active');
  });

  it('al elegir una chip cambia el listado', async () => {
    const usuario = userEvent.setup();
    responder(libros);
    pintar();

    await usuario.click(screen.getByRole('button', { name: 'Devocionales' }));

    expect(titulosVisibles()).toEqual(['Devocional Uno']);
    expect(screen.getByText('1 libro(s)')).toBeInTheDocument();
  });

  it('la chip "Todas" quita el filtro', async () => {
    const usuario = userEvent.setup();
    responder(libros);
    pintar('/?categoria=devocionales');

    await usuario.click(screen.getByRole('button', { name: 'Todas' }));

    expect(titulosVisibles()).toEqual(['Favorito Uno', 'Devocional Uno']);
    expect(screen.getByText('2 libro(s)')).toBeInTheDocument();
  });
});

describe('Catálogo: paginación', () => {
  const doceLibros = Array.from({ length: 12 }, (_, i) =>
    libro(`lib-${String(i + 1).padStart(2, '0')}`, { titulo: `Libro ${i + 1}` }),
  );

  it('muestra 10 por página y permite avanzar', async () => {
    const usuario = userEvent.setup();
    responder(doceLibros);
    pintar();

    expect(tarjetas()).toHaveLength(10);
    expect(titulosVisibles()).toContain('Libro 10');
    expect(titulosVisibles()).not.toContain('Libro 11');
    expect(screen.getByText('12 libro(s)')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente →' }));

    expect(tarjetas()).toHaveLength(2);
    expect(titulosVisibles()).toEqual(['Libro 11', 'Libro 12']);
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: '← Anterior' }));
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('vuelve a la primera página al buscar', async () => {
    const usuario = userEvent.setup();
    responder(doceLibros);
    pintar();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente →' }));
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    await usuario.type(buscar(), 'Libro 12');

    expect(titulosVisibles()).toEqual(['Libro 12']);
    // Un solo resultado no necesita paginación.
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('no pinta paginación con una sola página', () => {
    responder(doceLibros.slice(0, 3));
    pintar();

    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });
});

describe('Catálogo: estructura', () => {
  it('el listado vive en la sección #catalogo', () => {
    responder([libro('lib-1')]);
    const { container } = pintar();

    const seccion = container.querySelector('#catalogo');
    expect(seccion).not.toBeNull();
    expect(within(seccion as HTMLElement).getByText('1 libro(s)')).toBeInTheDocument();
  });
});
