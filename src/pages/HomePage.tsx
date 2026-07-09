import { Link } from 'react-router-dom';
import { useCatalogo } from '../hooks/useCatalogo';
import { BookCard } from '../components/BookCard';

export function HomePage() {
  const { libros, categorias, cargando, error } = useCatalogo();
  const destacados = libros.filter((l) => l.destacado);

  return (
    <div>
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow">Librería cristiana</p>
          <h1 className="hero__title">
            Libros y devocionales <em>con propósito</em>
          </h1>
          <p className="hero__text">
            Un catálogo curado para acompañar tu caminar de fe. Elige tus libros,
            paga en línea y recíbelos en casa.
          </p>
          <div className="hero__actions">
            <Link to="/catalogo" className="btn btn--lg">
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>

      {error && <p className="container error-msg">No se pudo cargar el catálogo: {error}</p>}

      {cargando ? (
        <p className="container muted">Cargando catálogo…</p>
      ) : (
        <>
          <section className="container section">
            <div className="section__head">
              <h2>Favoritos del mes</h2>
              <Link to="/catalogo" className="link">
                Ver todo →
              </Link>
            </div>
            <div className="grid">
              {destacados.map((libro) => (
                <BookCard key={libro.id} libro={libro} />
              ))}
            </div>
          </section>

          <section className="container section">
            <h2>Explora por categoría</h2>
            <div className="chips">
              {categorias.map((c) => (
                <Link key={c.id} to={`/catalogo?categoria=${c.slug}`} className="chip">
                  {c.nombre}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
