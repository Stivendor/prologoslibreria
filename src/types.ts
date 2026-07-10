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
  /* Campos de presentación (datos de muestra en el MVP) */
  calificacion?: number;
  resenas?: number;
  etiqueta?: string;
  precio_antes?: number;
  mas_vendido?: boolean;
}

export interface CartItem {
  libro: Libro;
  cantidad: number;
}
