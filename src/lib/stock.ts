import type { Libro } from '../types';

/* Tope de unidades por libro: evita pedidos basura (39 copias del mismo
   título). Un pedido mayorista real se gestiona por WhatsApp de todos modos.
   Vive aquí (y no en CartContext) para que la UI pueda consultarlo sin crear
   un ciclo de imports con el contexto. */
export const MAX_POR_LIBRO = 10;

// Unidades máximas que un cliente puede llevar: el tope global o el stock
// cargado, lo que sea menor. Sin stock cargado (o 0 es agotado) → ver abajo.
export function maximoDisponible(libro: Pick<Libro, 'stock'>): number {
  const { stock } = libro;
  if (typeof stock !== 'number' || Number.isNaN(stock)) return MAX_POR_LIBRO;
  return Math.max(0, Math.min(MAX_POR_LIBRO, Math.floor(stock)));
}

// true cuando no queda nada que vender de ese título.
export function estaAgotado(libro: Pick<Libro, 'stock'>): boolean {
  return maximoDisponible(libro) === 0;
}

// Texto para la ficha/tarjeta, o null si el libro es bajo demanda (no se
// muestra nada para no saturar el catálogo con "disponible").
export function etiquetaStock(libro: Pick<Libro, 'stock'>): string | null {
  if (typeof libro.stock !== 'number' || Number.isNaN(libro.stock)) return null;
  const unidades = Math.max(0, Math.floor(libro.stock));
  if (unidades === 0) return 'Agotado';
  if (unidades <= 5) return `Quedan ${unidades}`;
  return `${unidades} disponibles`;
}
