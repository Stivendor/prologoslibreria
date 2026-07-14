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

const STORAGE_KEY = 'prologos-carrito';

/* Tope de unidades por libro: evita pedidos basura (39 copias del mismo título).
   Un pedido mayorista real se gestiona por WhatsApp de todos modos. */
export const MAX_POR_LIBRO = 10;

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrecio: number;
  agregar: (libro: Libro, cantidad?: number) => void;
  quitar: (libroId: string) => void;
  cambiarCantidad: (libroId: string, cantidad: number) => void;
  vaciar: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function cargarInicial(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Sanea carritos guardados antes de existir el tope.
    return (JSON.parse(raw) as CartItem[]).map((i) => ({
      ...i,
      cantidad: Math.min(i.cantidad, MAX_POR_LIBRO),
    }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(cargarInicial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing / quota exceeded — cart stays in memory only.
    }
  }, [items]);

  const agregar = useCallback((libro: Libro, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.libro.id === libro.id);
      if (existente) {
        return prev.map((i) =>
          i.libro.id === libro.id
            ? { ...i, cantidad: Math.min(i.cantidad + cantidad, MAX_POR_LIBRO) }
            : i,
        );
      }
      return [...prev, { libro, cantidad: Math.min(cantidad, MAX_POR_LIBRO) }];
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
              ? { ...i, cantidad: Math.min(cantidad, MAX_POR_LIBRO) }
              : i,
          ),
    );
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

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
    }),
    [items, totalItems, totalPrecio, agregar, quitar, cambiarCantidad, vaciar],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
