import { Link } from 'react-router-dom';
import { useCart, MAX_POR_LIBRO } from '../context/CartContext';
import { formatearPrecio } from '../lib/format';
import { BookCover } from '../components/BookCover';

export function CartPage() {
  const { items, totalPrecio, cambiarCantidad, quitar, vaciar } = useCart();

  if (items.length === 0) {
    return (
      <div className="container section empty-state">
        <h1>Tu carrito está vacío</h1>
        <p className="muted">Agrega libros del catálogo para empezar tu pedido.</p>
        <Link to="/catalogo" className="btn btn--lg">
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1>Tu carrito</h1>

      <div className="cart-layout">
        <ul className="cart-list">
          {items.map(({ libro, cantidad }) => (
            <li key={libro.id} className="cart-item">
              <div className="cart-item__cover">
                <BookCover libro={libro} />
              </div>
              <div className="cart-item__info">
                <Link to={`/libro/${libro.id}`} className="cart-item__title">
                  {libro.titulo}
                </Link>
                <p className="muted small">{libro.autor}</p>
                <p className="cart-item__price">{formatearPrecio(libro.precio)}</p>
              </div>
              <div className="cart-item__controls">
                <div className="qty">
                  <button
                    onClick={() => cambiarCantidad(libro.id, cantidad - 1)}
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span>{cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(libro.id, cantidad + 1)}
                    disabled={cantidad >= MAX_POR_LIBRO}
                    title={
                      cantidad >= MAX_POR_LIBRO
                        ? `Máximo ${MAX_POR_LIBRO} unidades por libro`
                        : undefined
                    }
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                <button className="link small" onClick={() => quitar(libro.id)}>
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Resumen</h2>
          <div className="cart-summary__row">
            <span>Subtotal</span>
            <strong>{formatearPrecio(totalPrecio)}</strong>
          </div>
          <p className="muted small">El envío se calcula al finalizar el pedido.</p>

          <Link to="/checkout" className="btn btn--lg btn--block">
            Finalizar pedido
          </Link>
          <button className="link small" onClick={vaciar}>
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
}
