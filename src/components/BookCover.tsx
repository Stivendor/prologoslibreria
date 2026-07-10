import type { Libro } from '../types';

// Portada del libro. Si aún no hay imagen (insumo pendiente de Prólogos),
// se muestra una portada de marca generada con el título y el autor.
export function BookCover({ libro }: { libro: Libro }) {
  if (libro.imagen_url) {
    return (
      <img
        className="cover-img"
        src={libro.imagen_url}
        alt={`Portada de ${libro.titulo}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className="cover-placeholder" aria-label={`Portada de ${libro.titulo}`}>
      <span className="cover-placeholder__marca">Prólogos</span>
      <span className="cover-placeholder__titulo">{libro.titulo}</span>
      <span className="cover-placeholder__autor">{libro.autor}</span>
    </div>
  );
}
