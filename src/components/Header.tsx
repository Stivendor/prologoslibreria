import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { totalItems, abrirCarrito } = useCart();
  const { usuario, cargando } = useAuth();

  // Sin nombre propio en Auth, el identificador legible es el correo.
  const etiqueta = !cargando && usuario?.email ? usuario.email.split('@')[0] : '';

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand">
          <img src="/logo.svg" alt="Prólogos" className="brand__logo" width="40" height="40" />
          <span className="brand__text">
            <span className="brand__mark">Prólogos</span>
            <span className="brand__sub">Librería</span>
          </span>
        </Link>

        <div className="site-header__actions">
          <Link
            to="/cuenta"
            className="account-link"
            aria-label={usuario ? `Mi cuenta: ${usuario.email}` : 'Iniciar sesión'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            {etiqueta && <span className="account-link__name">{etiqueta}</span>}
          </Link>

          <button
            type="button"
            className="cart-link"
            onClick={abrirCarrito}
            aria-label="Abrir carrito"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 3h2l2.4 12.3a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.4" fill="currentColor" />
              <circle cx="18" cy="20" r="1.4" fill="currentColor" />
            </svg>
            {/* key re-monta el nodo al cambiar la cantidad y re-dispara badge-pop */}
            {totalItems > 0 && (
              <span key={totalItems} className="cart-link__count">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
