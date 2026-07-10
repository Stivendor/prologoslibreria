import { Link } from 'react-router-dom';
import type { Libro } from '../types';
import { formatearPrecio } from '../lib/format';
import { useCart } from '../context/CartContext';
import { BookCover } from './BookCover';
import { StarRating } from './StarRating';

export function BookCard({ libro }: { libro: Libro }) {
  const { agregar } = useCart();

  return (
    <article className="book-card">
      <Link to={`/libro/${libro.id}`} className="book-card__cover">
        <BookCover libro={libro} />
        {libro.etiqueta && <span className="tag">{libro.etiqueta}</span>}
      </Link>
      <div className="book-card__body">
        {libro.calificacion !== undefined && (
          <StarRating valor={libro.calificacion} resenas={libro.resenas} />
        )}
        <h3 className="book-card__title">
          <Link to={`/libro/${libro.id}`}>{libro.titulo}</Link>
        </h3>
        <p className="book-card__author">{libro.autor}</p>
        <div className="book-card__prices">
          <span className="book-card__price">{formatearPrecio(libro.precio)}</span>
          {libro.precio_antes && (
            <span className="book-card__price-old">{formatearPrecio(libro.precio_antes)}</span>
          )}
        </div>
        <button
          className="btn btn--block book-card__add"
          onClick={() => agregar(libro)}
          aria-label={`Agregar ${libro.titulo} al carrito`}
        >
          Añadir al carrito
        </button>
      </div>
    </article>
  );
}
