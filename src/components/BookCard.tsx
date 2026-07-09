import { Link } from 'react-router-dom';
import type { Libro } from '../types';
import { formatearPrecio } from '../lib/format';
import { useCart } from '../context/CartContext';
import { BookCover } from './BookCover';

export function BookCard({ libro }: { libro: Libro }) {
  const { agregar } = useCart();

  return (
    <article className="book-card">
      <Link to={`/libro/${libro.id}`} className="book-card__cover">
        <BookCover libro={libro} />
        {libro.destacado && <span className="badge">Favorito</span>}
      </Link>
      <div className="book-card__body">
        <h3 className="book-card__title">
          <Link to={`/libro/${libro.id}`}>{libro.titulo}</Link>
        </h3>
        <p className="book-card__author">{libro.autor}</p>
        <div className="book-card__footer">
          <span className="book-card__price">{formatearPrecio(libro.precio)}</span>
          <button
            className="btn btn--sm"
            onClick={() => agregar(libro)}
            aria-label={`Agregar ${libro.titulo} al carrito`}
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
