import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Libro } from '../types';
import { formatearPrecio } from '../lib/format';
import { useCart } from '../context/CartContext';
import { BookCover } from './BookCover';

export function BookCard({ libro }: { libro: Libro }) {
  const { agregar } = useCart();
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <article ref={ref} className={`book-card${visible ? ' is-visible' : ''}`}>
      <Link to={`/libro/${libro.id}`} className="book-card__cover">
        <BookCover libro={libro} />
        {libro.etiqueta && <span className="tag">{libro.etiqueta}</span>}
      </Link>
      <div className="book-card__body">
        <h3 className="book-card__title">
          <Link to={`/libro/${libro.id}`}>{libro.titulo}</Link>
        </h3>
        <p className="book-card__author">{libro.autor}</p>
        <div className="book-card__prices">
          <span className="book-card__price">{formatearPrecio(libro.precio)}</span>
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
