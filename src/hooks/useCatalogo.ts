import { useEffect, useState } from 'react';
import type { Categoria, Libro } from '../types';
import { obtenerCategorias, obtenerLibros } from '../data/catalogo';

interface EstadoCatalogo {
  libros: Libro[];
  categorias: Categoria[];
  cargando: boolean;
  error: string | null;
}

export function useCatalogo(): EstadoCatalogo {
  const [estado, setEstado] = useState<EstadoCatalogo>({
    libros: [],
    categorias: [],
    cargando: true,
    error: null,
  });

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerLibros(), obtenerCategorias()])
      .then(([libros, categorias]) => {
        if (activo) setEstado({ libros, categorias, cargando: false, error: null });
      })
      .catch((e: unknown) => {
        if (activo)
          setEstado({
            libros: [],
            categorias: [],
            cargando: false,
            error: e instanceof Error ? e.message : 'Error al cargar el catálogo',
          });
      });
    return () => {
      activo = false;
    };
  }, []);

  return estado;
}
