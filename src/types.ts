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
}

export interface CartItem {
  libro: Libro;
  cantidad: number;
}
