import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Libro } from '../types';
import { obtenerLibro } from '../data/catalogo';
import { formatearPrecio } from '../lib/format';
import { useCart } from '../context/CartContext';
import { BookCover } from '../components/BookCover';
import { urlWhatsApp } from '../config';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agregar } = useCart();
  const [libro, setLibro] = useState<Libro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!id) return;
    setCargando(true);
    obtenerLibro(id)
      .then(setLibro)
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <p className="container section muted">Cargando…</p>;
  if (!libro)
    return (
      <div className="container section">
        <p className="muted">Este libro no está disponible.</p>
        <Link to="/catalogo" className="link">
          ← Volver al catálogo
        </Link>
      </div>
    );

  const handleAgregar = () => {
    agregar(libro);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1800);
  };

  return (
    <div className="container section">
      <Link to="/catalogo" className="link">
        ← Volver al catálogo
      </Link>

      <div className="detail">
        <div className="detail__cover">
          <BookCover libro={libro} />
        </div>
        <div className="detail__info">
          {libro.destacado && <span className="badge badge--inline">Favorito del mes</span>}
          <h1>{libro.titulo}</h1>
          <p className="detail__author">{libro.autor}</p>
          <p className="detail__price">{formatearPrecio(libro.precio)}</p>
          <p className="detail__desc">{libro.descripcion}</p>

          <div className="detail__actions">
            <button className="btn btn--lg" onClick={handleAgregar}>
              {agregado ? '✓ Agregado' : 'Agregar al carrito'}
            </button>
            <a
              className="btn btn--ghost btn--lg"
              href={urlWhatsApp(`Hola Prólogos, me interesa "${libro.titulo}".`)}
              target="_blank"
              rel="noreferrer"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
