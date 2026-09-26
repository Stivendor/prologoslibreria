import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Libro } from '../types';
import { formatearPrecio } from '../lib/format';
import { maximoDisponible, etiquetaStock } from '../lib/stock';
import { useCart } from '../context/CartContext';
import { BookCover } from './BookCover';

export function BookCard({ libro }: { libro: Libro }) {
  const { agregar, items } = useCart();
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

  // Disponibilidad: sin stock cargado el libro es bajo demanda y no muestra
  // nada; con stock, se informa y se deshabilita si ya no cabe más en el carrito.
  const max = maximoDisponible(libro);
  const enCarrito = items.find((i) => i.libro.id === libro.id)?.cantidad ?? 0;
  const agotado = max === 0;
  const lleno = !agotado && enCarrito >= max;
  const stock = etiquetaStock(libro);

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
          {stock && (
            <span className={`book-card__stock${agotado ? ' book-card__stock--out' : ''}`}>
              {stock}
            </span>
          )}
        </div>
        <button
          className="btn btn--block book-card__add"
          onClick={() => agregar(libro)}
          disabled={agotado || lleno}
          title={
            agotado
              ? 'Por ahora no tenemos unidades de este libro.'
              : lleno
                ? `Ya tienes el máximo disponible (${max}) en el carrito.`
                : undefined
          }
          aria-label={`Agregar ${libro.titulo} al carrito`}
        >
          {agotado ? 'Agotado' : lleno ? 'Máximo en carrito' : 'Añadir al carrito'}
        </button>
      </div>
    </article>
  );
}
