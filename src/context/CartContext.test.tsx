import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Libro } from '../types';
import { CartProvider, useCart } from './CartContext';

const CLAVE = 'prologos-carrito';

function libro(parcial: Partial<Libro> = {}): Libro {
  return {
    id: 'lib-1',
    titulo: 'Viviendo Su Voluntad',
    autor: 'Sebastián Franz',
    precio: 68000,
    descripcion: '',
    imagen_url: null,
    categoria_id: 'cat-favoritos',
    activo: true,
    destacado: false,
    ...parcial,
  };
}

const envoltura = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);
const montar = () => renderHook(() => useCart(), { wrapper: envoltura });

describe('useCart', () => {
  it('lanza si se usa fuera de <CartProvider>', () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow(
      'useCart debe usarse dentro de <CartProvider>',
    );
    silencio.mockRestore();
  });
});

describe('agregar', () => {
  it('agrega con cantidad 1 por defecto y suma repetidos', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro()));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(1);

    act(() => result.current.agregar(libro(), 7));
    expect(result.current.items[0].cantidad).toBe(8);
  });

  it('no pasa del tope global de 10 unidades por libro', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro(), 8));
    act(() => result.current.agregar(libro(), 5));
    expect(result.current.items[0].cantidad).toBe(10);
  });

  it('respeta un stock cargado por debajo del tope', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro({ stock: 3 }), 5));
    expect(result.current.items[0].cantidad).toBe(3);

    act(() => result.current.agregar(libro({ stock: 3 }), 2));
    expect(result.current.items[0].cantidad).toBe(3);
  });

  it('no deja entrar libros agotados', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro({ stock: 0 })));
    expect(result.current.items).toHaveLength(0);
  });

  it('actualiza precio y stock del libro guardado al volver a agregarlo', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro({ precio: 68000 })));
    act(() => result.current.agregar(libro({ precio: 75000, stock: 4 })));

    expect(result.current.items[0].libro.precio).toBe(75000);
    expect(result.current.items[0].libro.stock).toBe(4);
    expect(result.current.items[0].cantidad).toBe(2);
  });

  it('mantiene libros distintos por separado', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(libro({ id: 'lib-1' }));
      result.current.agregar(libro({ id: 'lib-2' }));
    });
    expect(result.current.items.map((i) => i.libro.id)).toEqual(['lib-1', 'lib-2']);
  });
});

describe('quitar y cambiarCantidad', () => {
  it('quita un libro por id', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(libro({ id: 'lib-1' }));
      result.current.agregar(libro({ id: 'lib-2' }));
    });
    act(() => result.current.quitar('lib-1'));
    expect(result.current.items.map((i) => i.libro.id)).toEqual(['lib-2']);
  });

  it('una cantidad menor o igual a cero elimina el ítem', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro()));

    act(() => result.current.cambiarCantidad('lib-1', 0));
    expect(result.current.items).toHaveLength(0);

    act(() => result.current.agregar(libro()));
    act(() => result.current.cambiarCantidad('lib-1', -2));
    expect(result.current.items).toHaveLength(0);
  });

  it('recorta al máximo disponible', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro({ stock: 3 })));
    act(() => result.current.cambiarCantidad('lib-1', 99));
    expect(result.current.items[0].cantidad).toBe(3);
  });

  it('vacía todo el carrito', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(libro({ id: 'lib-1' }));
      result.current.agregar(libro({ id: 'lib-2' }));
    });
    act(() => result.current.vaciar());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrecio).toBe(0);
  });
});

describe('totales', () => {
  it('suma unidades y precios de todos los ítems', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(libro({ id: 'lib-1', precio: 68000 }), 2);
      result.current.agregar(libro({ id: 'lib-2', precio: 62000 }), 1);
    });

    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrecio).toBe(68000 * 2 + 62000);
  });
});

describe('persistencia en localStorage', () => {
  it('guarda el carrito bajo la clave esperada', () => {
    const { result } = montar();
    act(() => result.current.agregar(libro(), 2));

    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    expect(guardado).toHaveLength(1);
    expect(guardado[0].libro.id).toBe('lib-1');
    expect(guardado[0].cantidad).toBe(2);
  });

  it('hidrata el carrito guardado al iniciar', () => {
    localStorage.setItem(
      CLAVE,
      JSON.stringify([{ libro: libro({ id: 'lib-9' }), cantidad: 4 }]),
    );

    const { result } = montar();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].libro.id).toBe('lib-9');
    expect(result.current.items[0].cantidad).toBe(4);
  });

  it('recorta cantidades guardadas que ya superan el stock actual', () => {
    localStorage.setItem(
      CLAVE,
      JSON.stringify([{ libro: libro({ stock: 3 }), cantidad: 99 }]),
    );

    const { result } = montar();
    expect(result.current.items[0].cantidad).toBe(3);
  });

  it('corrige cantidades guardadas en cero', () => {
    localStorage.setItem(CLAVE, JSON.stringify([{ libro: libro(), cantidad: 0 }]));

    const { result } = montar();
    expect(result.current.items[0].cantidad).toBe(1);
  });

  it('arranca vacío si lo guardado está corrupto', () => {
    localStorage.setItem(CLAVE, '{esto no es json');

    const { result } = montar();
    expect(result.current.items).toHaveLength(0);
  });
});

describe('apertura del panel lateral', () => {
  it('abre y cierra el carrito', () => {
    const { result } = montar();
    expect(result.current.carritoAbierto).toBe(false);

    act(() => result.current.abrirCarrito());
    expect(result.current.carritoAbierto).toBe(true);

    act(() => result.current.cerrarCarrito());
    expect(result.current.carritoAbierto).toBe(false);
  });
});
