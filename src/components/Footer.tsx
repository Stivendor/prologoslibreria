import { CONTACTO, urlWhatsApp } from '../config';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="brand__mark">Prólogos Librería</p>
          <p className="muted">Libros y devocionales con propósito.</p>
        </div>
        <div className="site-footer__links">
          <a
            href={`https://instagram.com/${CONTACTO.instagram}`}
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
          <a
            href={urlWhatsApp('Hola Prólogos, tengo una consulta sobre un libro.')}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
        <p className="muted small">
          © {new Date().getFullYear()} Prólogos Librería. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
