import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogo } from '../hooks/useCatalogo';
import { BookCard } from '../components/BookCard';

export function CatalogPage() {
  const { libros, categorias, cargando, error } = useCatalogo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');

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

  return (
    <div className="container section">
      <h1>Catálogo</h1>

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
            {filtrados.map((libro) => (
              <BookCard key={libro.id} libro={libro} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
