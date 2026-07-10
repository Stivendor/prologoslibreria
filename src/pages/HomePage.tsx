import { Link } from 'react-router-dom';
import { useCatalogo } from '../hooks/useCatalogo';
import { BookCard } from '../components/BookCard';
import { TrustBadges } from '../components/TrustBadges';
import { Testimonials } from '../components/Testimonials';
import { BookCover } from '../components/BookCover';
import { CONTACTO } from '../config';

export function HomePage() {
  const { libros, categorias, cargando, error } = useCatalogo();
  const destacados = libros.filter((l) => l.destacado);
  const masVendidos = libros.filter((l) => l.mas_vendido);
  const spines = destacados.slice(0, 3);

  return (
    <div>
      {/* Banner promocional */}
      <section className="promo">
        <div className="container promo__inner">
          <div className="promo__copy">
            <p className="eyebrow eyebrow--light">Librería cristiana · Colombia</p>
            <h1 className="promo__title">
              Libros que <em>alimentan</em> el alma
            </h1>
            <p className="promo__text">
              Un catálogo curado de libros y devocionales. Elige, paga en línea con PSE,
              Nequi o tarjeta, y recíbelos en casa.
            </p>
            <div className="promo__actions">
              <Link to="/catalogo" className="btn btn--lg btn--invert">
                Ver catálogo
              </Link>
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
          {spines.length > 0 && (
            <div className="promo__spines" aria-hidden="true">
              {spines.map((l, i) => (
                <div key={l.id} className={`promo__spine promo__spine--${i}`}>
                  <BookCover libro={l} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <TrustBadges />

      {error && <p className="container error-msg">No se pudo cargar el catálogo: {error}</p>}

      {cargando ? (
        <p className="container section muted">Cargando catálogo…</p>
      ) : (
        <>
          {/* Libros del mes */}
          <section className="container section">
            <div className="section-head">
              <div>
                <span className="section-head__num">01</span>
                <h2 className="section-title">Libros del mes</h2>
              </div>
              <Link to="/catalogo" className="section-head__link">
                Ver todo
              </Link>
            </div>
            <div className="grid">
              {destacados.map((libro) => (
                <BookCard key={libro.id} libro={libro} />
              ))}
            </div>
          </section>

          {/* Categorías */}
          <section className="cats-band">
            <div className="container">
              <div className="section-head">
                <div>
                  <span className="section-head__num">02</span>
                  <h2 className="section-title">Explora por categoría</h2>
                </div>
              </div>
              <div className="cats-grid">
                {categorias.map((c) => (
                  <Link key={c.id} to={`/catalogo?categoria=${c.slug}`} className="cat-tile">
                    <span>{c.nombre}</span>
                    <span className="cat-tile__arrow">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Más vendidos */}
          {masVendidos.length > 0 && (
            <section className="container section">
              <div className="section-head">
                <div>
                  <span className="section-head__num">03</span>
                  <h2 className="section-title">Los más vendidos</h2>
                </div>
                <Link to="/catalogo" className="section-head__link">
                  Ver todo
                </Link>
              </div>
              <div className="grid">
                {masVendidos.map((libro) => (
                  <BookCard key={libro.id} libro={libro} />
                ))}
              </div>
            </section>
          )}

          <Testimonials />
        </>
      )}
    </div>
  );
}
