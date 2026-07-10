export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
}

export interface Libro {
  id: string;
  titulo: string;
  autor: string;
  precio: number;
  descripcion: string;
  imagen_url: string | null;
  categoria_id: string;
  activo: boolean;
  destacado: boolean;
  /* Etiqueta editorial opcional (p. ej. "Novedad", "Clásico"). */
  etiqueta?: string;
}

export interface CartItem {
  libro: Libro;
  cantidad: number;
}

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
