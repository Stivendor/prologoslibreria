import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatearPrecio } from '../lib/format';
import { urlWhatsApp } from '../config';

// Checkout del MVP.
// El pago en línea (Wompi/ePayco) y el correo de confirmación (Resend) se
// integran en la fase 5, cuando Prólogos entregue los datos de la cuenta y las
// credenciales de la pasarela (RNF-03). Mientras tanto, el formulario recoge los
// datos del pedido y permite confirmarlo por WhatsApp sin perder ventas.
export function CheckoutPage() {
  const { items, totalPrecio } = useCart();
  const [datos, setDatos] = useState({
    nombre: '',
    email: '',
    telefono: '',
    ciudad: '',
    direccion: '',
  });

  if (items.length === 0) {
    return (
      <div className="container section empty-state">
        <h1>No hay nada para pagar</h1>
        <Link to="/catalogo" className="btn btn--lg">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const set = (campo: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const mensaje =
    `Hola Prólogos 👋, confirmo este pedido:\n\n` +
    items
      .map((i) => `• ${i.cantidad} × ${i.libro.titulo} (${formatearPrecio(i.libro.precio)})`)
      .join('\n') +
    `\n\nTotal: ${formatearPrecio(totalPrecio)}` +
    `\n\nDatos de envío:\n${datos.nombre}\n${datos.telefono}\n${datos.ciudad} — ${datos.direccion}\n${datos.email}`;

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email);
  const formularioCompleto =
    datos.nombre && emailValido && datos.telefono && datos.ciudad && datos.direccion;

  return (
    <div className="container section">
      <Link to="/carrito" className="link">
        ← Volver al carrito
      </Link>
      <h1>Finalizar compra</h1>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={(e) => e.preventDefault()}>
          <h2>Datos de contacto y envío</h2>
          <label>
            Nombre completo
            <input value={datos.nombre} onChange={set('nombre')} required />
          </label>
          <label>
            Correo electrónico
            <input type="email" value={datos.email} onChange={set('email')} required />
            {datos.email && !emailValido && (
              <span className="field-error">Ingresa un correo válido.</span>
            )}
          </label>
          <label>
            Teléfono / WhatsApp
            <input value={datos.telefono} onChange={set('telefono')} required />
          </label>
          <div className="form-row">
            <label>
              Ciudad
              <input value={datos.ciudad} onChange={set('ciudad')} required />
            </label>
            <label>
              Dirección
              <input value={datos.direccion} onChange={set('direccion')} required />
            </label>
          </div>

          <div className="notice">
            El pago en línea (PSE, Nequi y tarjeta) se habilitará al integrar la
            pasarela colombiana. Por ahora puedes confirmar tu pedido por WhatsApp y
            coordinar el pago.
          </div>

          <a
            className={`btn btn--lg btn--block ${!formularioCompleto ? 'btn--disabled' : ''}`}
            href={formularioCompleto ? urlWhatsApp(mensaje) : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!formularioCompleto}
          >
            Confirmar pedido por WhatsApp
          </a>
        </form>

        <aside className="cart-summary">
          <h2>Tu pedido</h2>
          <ul className="checkout-items">
            {items.map((i) => (
              <li key={i.libro.id}>
                <span>
                  {i.cantidad} × {i.libro.titulo}
                </span>
                <span>{formatearPrecio(i.libro.precio * i.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-summary__row cart-summary__total">
            <span>Total</span>
            <strong>{formatearPrecio(totalPrecio)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
