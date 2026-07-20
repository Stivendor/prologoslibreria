import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogo } from '../hooks/useCatalogo';
import { BookCard } from '../components/BookCard';
import { Paginacion } from '../components/Paginacion';
import { CONTACTO } from '../config';

const LIBROS_POR_PAGINA = 10;

export function CatalogPage() {
  const { libros, categorias, cargando, error } = useCatalogo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const categoriaActiva = searchParams.get('categoria') ?? '';

  const seleccionarCategoria = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('categoria', slug);
    else next.delete('categoria');
    setSearchParams(next);
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const catId = categorias.find((c) => c.slug === categoriaActiva)?.id;
    return libros.filter((l) => {
      const coincideCategoria = !catId || l.categoria_id === catId;
      const coincideBusqueda =
        !q ||
        l.titulo.toLowerCase().includes(q) ||
        l.autor.toLowerCase().includes(q);
      return coincideCategoria && coincideBusqueda;
    });
  }, [libros, categorias, categoriaActiva, busqueda]);

  // Volver a la primera página al cambiar filtros.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoriaActiva]);

  const totalPaginas = Math.ceil(filtrados.length / LIBROS_POR_PAGINA);
  const visibles = filtrados.slice(
    (pagina - 1) * LIBROS_POR_PAGINA,
    pagina * LIBROS_POR_PAGINA
  );

  const cambiarPagina = (p: number) => {
    setPagina(p);
    // behavior 'auto' respeta el scroll-behavior del CSS (suave salvo reduced-motion)
    document.getElementById('catalogo')?.scrollIntoView();
  };

  return (
    <div>
      {/* Banner compacto de marca; el catálogo va justo debajo */}
      <section className="promo">
        <div className="container promo__inner">
          <div className="promo__copy">
            <p className="eyebrow eyebrow--light">Librería cristiana · Colombia</p>
            <h1 className="promo__title">
              Libros que <em>alimentan</em> el alma
            </h1>
            <p className="promo__text">
              Libros y devocionales con propósito. Elige, confirma tu pedido
              por WhatsApp y recíbelos en casa.
            </p>
            <p className="promo__envio">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 18H3V6a1 1 0 0 1 1-1h11v13" />
                <path d="M15 8h4l3 4v6h-2" />
                <circle cx="7.5" cy="18" r="1.8" />
                <circle cx="17.5" cy="18" r="1.8" />
                <path d="M9.3 18H15" />
              </svg>
              Envíos a todo Colombia
            </p>
            <div className="promo__actions">
              <a
                className="btn btn--lg btn--ghost-light"
                href={`https://instagram.com/${CONTACTO.instagram}`}
                target="_blank"
                rel="noreferrer"
              >
                Síguenos en Instagram
              </a>
            </div>
          </div>
        </div>
        <a className="promo__scroll" href="#catalogo" aria-label="Bajar al catálogo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </section>

      <div className="container section" id="catalogo">
      <div className="catalog-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por título o autor…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar libros"
        />
      </div>

      <div className="chips">
        <button
          className={`chip ${!categoriaActiva ? 'chip--active' : ''}`}
          onClick={() => seleccionarCategoria('')}
        >
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c.id}
            className={`chip ${categoriaActiva === c.slug ? 'chip--active' : ''}`}
            onClick={() => seleccionarCategoria(c.slug)}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {error && <p className="error-msg">No se pudo cargar el catálogo: {error}</p>}

      {cargando ? (
        <p className="muted">Cargando catálogo…</p>
      ) : filtrados.length === 0 ? (
        <p className="muted">No se encontraron libros con esos criterios.</p>
      ) : (
        <>
          <p className="muted small">{filtrados.length} libro(s)</p>
          <div className="grid">
            {visibles.map((libro) => (
              <BookCard key={libro.id} libro={libro} />
            ))}
          </div>
          <Paginacion pagina={pagina} totalPaginas={totalPaginas} alCambiar={cambiarPagina} />
        </>
      )}
      </div>
    </div>
  );
}
