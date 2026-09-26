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
  /* Unidades disponibles. Ausente/null = bajo demanda (sin límite, que es
     cómo trabaja Prólogos con la mayoría de títulos); número = tope que el
     cliente no puede superar. El descuento es manual (panel admin). */
  stock?: number | null;
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

// Datos de envío guardados en la cuenta de un cliente (colección usuarios).
// El correo vive en Firebase Auth; aquí va copiado solo para listados.
export interface Perfil {
  nombre: string;
  telefono: string;
  ciudad: string;
  direccion: string;
}

// Documento usuarios/{uid}: perfil + estado de la cuenta.
export interface UsuarioCliente extends Perfil {
  uid: string;
  email: string;
  activo: boolean;
  creado_en?: TimestampFirestore;
  actualizado_en?: TimestampFirestore;
}

export interface Pedido {
  id: string;
  numero: string; // corto y legible, p. ej. "P-20260710-A3F9"
  items: PedidoItem[];
  total: number;
  cliente: ClientePedido;
  estado: EstadoPedido;
  /* uid del comprador cuando tiene sesión; ausente en pedidos anónimos. */
  uid_cliente?: string;
  /* Timestamps de Firestore tipados estructuralmente para no importar
     firebase aquí (seed.ts depende de este archivo). Null mientras el
     serverTimestamp está pendiente en snapshots locales. */
  creado_en?: { toDate(): Date } | null;
  actualizado_en?: { toDate(): Date } | null;
}

// Timestamp de Firestore tipado estructuralmente (ver nota en Pedido).
type TimestampFirestore = { toDate(): Date } | null;

// Pipeline de venta del CRM de leads de WhatsApp (distinto al de pedidos).
export type EstadoLead = 'nuevo' | 'contactado' | 'negociando' | 'ganado' | 'perdido';

// Un lead es una conversación de WhatsApp. El id del documento es el teléfono.
export interface Lead {
  id: string; // = telefono
  telefono: string;
  nombre?: string;
  estado: EstadoLead;
  ultimo_mensaje_texto?: string;
  no_leidos?: number;
  notas?: string;
  creado_en?: TimestampFirestore;
  actualizado_en?: TimestampFirestore;
  ultimo_mensaje_en?: TimestampFirestore;
}

export interface MensajeLead {
  id: string;
  direccion: 'entrante' | 'saliente';
  texto: string;
  tipo?: string; // text, image, etc. (Cloud API)
  wa_message_id?: string;
  estado_envio?: 'enviado' | 'error';
  creado_en?: TimestampFirestore;
}
