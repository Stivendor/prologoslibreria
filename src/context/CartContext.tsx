import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, Libro } from '../types';
import { maximoDisponible } from '../lib/stock';

const STORAGE_KEY = 'prologos-carrito';

// El tope por libro se define en lib/stock: lo comparten la UI del catálogo,
// el carrito y el checkout. Se re-exporta aquí por compatibilidad.
export { MAX_POR_LIBRO } from '../lib/stock';

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrecio: number;
  agregar: (libro: Libro, cantidad?: number) => void;
  quitar: (libroId: string) => void;
  cambiarCantidad: (libroId: string, cantidad: number) => void;
  vaciar: () => void;
  /* El carrito es un panel lateral, no una ruta: su apertura vive aquí para que
     el header, el footer y el redirect de /carrito lo abran sin pasar props. */
  carritoAbierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function cargarInicial(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Sanea carritos guardados: aplica el tope global y el stock actual
    // (alguien pudo bajarlo desde el panel mientras el carrito estaba guardado).
    return (JSON.parse(raw) as CartItem[]).map((i) => ({
      ...i,
      cantidad: Math.max(1, Math.min(i.cantidad, maximoDisponible(i.libro))),
    }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(cargarInicial);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing / quota exceeded — cart stays in memory only.
    }
  }, [items]);

  const agregar = useCallback((libro: Libro, cantidad = 1) => {
    const max = maximoDisponible(libro);
    if (max <= 0) return; // agotado: ni siquiera entra al carrito
    setItems((prev) => {
      const existente = prev.find((i) => i.libro.id === libro.id);
      if (existente) {
        // Se re-guarda el libro: así el carrito refleja precio y stock actuales.
        return prev.map((i) =>
          i.libro.id === libro.id
            ? { libro, cantidad: Math.min(i.cantidad + cantidad, max) }
            : i,
        );
      }
      return [...prev, { libro, cantidad: Math.min(cantidad, max) }];
    });
  }, []);

  const quitar = useCallback((libroId: string) => {
    setItems((prev) => prev.filter((i) => i.libro.id !== libroId));
  }, []);

  const cambiarCantidad = useCallback((libroId: string, cantidad: number) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((i) => i.libro.id !== libroId)
        : prev.map((i) =>
            i.libro.id === libroId
              ? { ...i, cantidad: Math.min(cantidad, maximoDisponible(i.libro)) }
              : i,
          ),
    );
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const abrirCarrito = useCallback(() => setCarritoAbierto(true), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  const totalItems = useMemo(
    () => items.reduce((acc, i) => acc + i.cantidad, 0),
    [items],
  );
  const totalPrecio = useMemo(
    () => items.reduce((acc, i) => acc + i.libro.precio * i.cantidad, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      totalPrecio,
      agregar,
      quitar,
      cambiarCantidad,
      vaciar,
      carritoAbierto,
      abrirCarrito,
      cerrarCarrito,
    }),
    [
      items,
      totalItems,
      totalPrecio,
      agregar,
      quitar,
      cambiarCantidad,
      vaciar,
      carritoAbierto,
      abrirCarrito,
      cerrarCarrito,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
