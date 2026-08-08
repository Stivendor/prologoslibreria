import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart, MAX_POR_LIBRO } from '../context/CartContext';
import { formatearPrecio } from '../lib/format';
import { BookCover } from './BookCover';
import { CheckoutModal } from './CheckoutModal';

// El carrito es un panel lateral sobre la página actual (antes era la ruta
// /carrito): añadir un libro y seguir explorando no cuesta navegaciones.
// Usa <dialog> nativo igual que el checkout: backdrop, Esc, bloqueo de scroll y
// foco atrapado sin dependencias.
export function CartDrawer() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const {
    items,
    totalPrecio,
    cambiarCantidad,
    quitar,
    vaciar,
    carritoAbierto,
    cerrarCarrito,
  } = useCart();
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);

  // Sincroniza el atributo open del <dialog> con el estado de React.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (carritoAbierto && !d.open) d.showModal();
    else if (!carritoAbierto && d.open) d.close();
  }, [carritoAbierto]);

  return (
    <>
      <dialog
        ref={dialogo}
        className="cart-drawer"
        aria-label="Tu carrito"
        onCancel={cerrarCarrito}
        onClick={(e) => {
          // Clic en el backdrop (el propio <dialog>, no su contenido) cierra.
          if (e.target === dialogo.current) cerrarCarrito();
        }}
      >
        <header className="cart-drawer__head">
          <h2>Tu carrito</h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={cerrarCarrito}
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </header>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="empty-state">
              <p className="muted">Agrega libros del catálogo para empezar tu pedido.</p>
              <Link to="/" className="btn btn--lg" onClick={cerrarCarrito}>
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <ul className="cart-list">
              {items.map(({ libro, cantidad }) => (
                <li key={libro.id} className="cart-item">
                  <div className="cart-item__cover">
                    <BookCover libro={libro} />
                  </div>
                  <div className="cart-item__info">
                    {/* Navegar con el diálogo abierto dejaría la página detrás
                        del backdrop: cerrar antes de ir al detalle. */}
                    <Link
                      to={`/libro/${libro.id}`}
                      className="cart-item__title"
                      onClick={cerrarCarrito}
                    >
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
          )}
        </div>

        {items.length > 0 && (
          <footer className="cart-drawer__foot">
            <div className="cart-summary__row cart-summary__total">
              <span>Subtotal</span>
              <strong>{formatearPrecio(totalPrecio)}</strong>
            </div>
            <p className="muted small">El envío se calcula al finalizar el pedido.</p>
            <button
              className="btn btn--lg btn--block"
              onClick={() => {
                // Cerrar antes de abrir el checkout: dos <dialog> modales
                // apilados se estorban (foco y backdrop doble).
                cerrarCarrito();
                setCheckoutAbierto(true);
              }}
            >
              Finalizar pedido
            </button>
            <button className="link small cart-drawer__vaciar" onClick={vaciar}>
              Vaciar carrito
            </button>
          </footer>
        )}
      </dialog>

      <CheckoutModal abierto={checkoutAbierto} onCerrar={() => setCheckoutAbierto(false)} />
    </>
  );
}
