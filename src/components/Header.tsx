import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export function Header() {
  const { totalItems } = useCart();

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

        <Link to="/carrito" className="cart-link" aria-label="Ver carrito">
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
        </Link>
      </div>
    </header>
  );
}
