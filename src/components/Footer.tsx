import { Link } from 'react-router-dom';
import { CONTACTO, urlWhatsApp } from '../config';
import { useCart } from '../context/CartContext';

export function Footer() {
  const { abrirCarrito } = useCart();

  return (
    <footer className="site-footer">
      <div className="container site-footer__top">
        <div className="site-footer__brand">
          <img src="/logo-blanco.svg" alt="Prólogos" width="44" height="44" />
          <div>
            <p className="brand__mark">Prólogos Librería</p>
            <p className="muted">Libros y devocionales con propósito.</p>
          </div>
        </div>

        <nav className="site-footer__col">
          <p className="site-footer__heading">Tienda</p>
          <Link to="/">Catálogo</Link>
          <Link to="/?categoria=devocionales">Devocionales</Link>
          <Link to="/?categoria=vida-cristiana">Vida cristiana</Link>
          {/* El carrito es un panel lateral: abrirlo no debe sacar al usuario
              de la página en la que está. */}
          <button type="button" className="site-footer__link" onClick={abrirCarrito}>
            Mi carrito
          </button>
        </nav>

        <div className="site-footer__col">
          <p className="site-footer__heading">Contacto</p>
          <a href={urlWhatsApp('Hola Prólogos, tengo una consulta.')} target="_blank" rel="noreferrer">
            WhatsApp 320 697 9160
          </a>
          <a href={`https://instagram.com/${CONTACTO.instagram}`} target="_blank" rel="noreferrer">
            @{CONTACTO.instagram}
          </a>
          <span className="muted small">Envíos a todo Colombia</span>
        </div>

        <div className="site-footer__col">
          <p className="site-footer__heading">Pagos</p>
          <span className="muted small">Transferencia · Contraentrega</span>
          <span className="muted small">Compra 100% segura</span>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p className="muted small">
          © {new Date().getFullYear()} Prólogos Librería. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
