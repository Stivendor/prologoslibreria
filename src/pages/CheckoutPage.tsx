import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatearPrecio } from '../lib/format';
import { urlWhatsApp } from '../config';
import { crearPedido } from '../data/pedidos';

// Checkout del MVP.
// El pago en línea (Wompi/ePayco) y el correo de confirmación (Resend) se
// integran en la fase 5, cuando Prólogos entregue los datos de la cuenta y las
// credenciales de la pasarela (RNF-03). Mientras tanto, el formulario recoge los
// datos del pedido y permite confirmarlo por WhatsApp sin perder ventas.
export function CheckoutPage() {
  const { items, totalPrecio, vaciar } = useCart();
  const [datos, setDatos] = useState({
    nombre: '',
    email: '',
    telefono: '',
    ciudad: '',
    direccion: '',
    website: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [numeroEnviado, setNumeroEnviado] = useState<string | null>(null);
  const [urlPedido, setUrlPedido] = useState('');

  if (numeroEnviado !== null) {
    return (
      <div className="container section empty-state">
        <h1>¡Pedido enviado!</h1>
        <p>
          {numeroEnviado
            ? `Tu pedido ${numeroEnviado} quedó registrado.`
            : 'Tu pedido quedó registrado.'}{' '}
          Te atenderemos por WhatsApp para coordinar el pago y el envío.
        </p>
        <a href={urlPedido} target="_blank" rel="noreferrer" className="btn btn--lg">
          Abrir WhatsApp
        </a>{' '}
        <Link to="/" className="btn btn--ghost btn--lg">
          Seguir explorando
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container section empty-state">
        <h1>No hay nada para pagar</h1>
        <Link to="/" className="btn btn--lg">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const set = (campo: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const cuerpoMensaje =
    items
      .map((i) => `• ${i.cantidad} × ${i.libro.titulo} (${formatearPrecio(i.libro.precio)})`)
      .join('\n') +
    `\n\nTotal: ${formatearPrecio(totalPrecio)}` +
    `\n\nDatos de envío:\n${datos.nombre}\n${datos.telefono}\n${datos.ciudad} — ${datos.direccion}\n${datos.email}`;

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email);
  const formularioCompleto =
    datos.nombre && emailValido && datos.telefono && datos.ciudad && datos.direccion;

  async function confirmarPedido() {
    if (!formularioCompleto || enviando) return;
    // Honeypot: bots auto-fill hidden fields — silently discard.
    if (datos.website) return;
    setEnviando(true);
    // La ventana se abre de forma síncrona, antes de cualquier await: los
    // navegadores (Safari sobre todo) bloquean popups que no nacen dentro del
    // gesto del usuario, y WhatsApp es el único canal de venta.
    const ventana = window.open('', '_blank');
    // El registro en Firestore alimenta el panel; si falla, la venta sigue
    // por WhatsApp sin bloquearse.
    let numero: string | null = null;
    try {
      numero = await crearPedido({
        items: items.map((i) => ({
          libro_id: i.libro.id,
          titulo: i.libro.titulo,
          precio: i.libro.precio,
          cantidad: i.cantidad,
        })),
        total: totalPrecio,
        cliente: { ...datos },
      });
    } catch (err) {
      console.error('No se pudo registrar el pedido en Firestore', err);
    }
    const encabezado = numero
      ? `Hola Prólogos 👋, confirmo el pedido ${numero}:\n\n`
      : 'Hola Prólogos 👋, confirmo este pedido:\n\n';
    const url = urlWhatsApp(encabezado + cuerpoMensaje);
    if (ventana) {
      ventana.location.href = url;
    }
    // Aunque el popup haya sido bloqueado, el pedido no se pierde: la pantalla
    // de confirmación ofrece el enlace "Abrir WhatsApp" con esta misma URL.
    setUrlPedido(url);
    vaciar();
    setNumeroEnviado(numero ?? '');
    setEnviando(false);
  }

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
            <input value={datos.nombre} onChange={set('nombre')} maxLength={120} required />
          </label>
          <label>
            Correo electrónico
            <input type="email" value={datos.email} onChange={set('email')} maxLength={120} required />
            {datos.email && !emailValido && (
              <span className="field-error">Ingresa un correo válido.</span>
            )}
          </label>
          <label>
            Teléfono / WhatsApp
            <input value={datos.telefono} onChange={set('telefono')} maxLength={30} required />
          </label>
          <div className="form-row">
            <label>
              Ciudad
              <input value={datos.ciudad} onChange={set('ciudad')} maxLength={80} required />
            </label>
            <label>
              Dirección
              <input value={datos.direccion} onChange={set('direccion')} maxLength={200} required />
            </label>
          </div>

          {/* Honeypot — hidden from humans, bots auto-fill it. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}>
            <label>
              No Complete Este Campo
              <input
                tabIndex={-1}
                autoComplete="off"
                value={datos.website}
                onChange={set('website')}
              />
            </label>
          </div>

          <div className="notice">
            Al confirmar, tu pedido queda registrado y te atendemos por WhatsApp
            para coordinar el pago y el envío.
          </div>

          <button
            type="button"
            className={`btn btn--lg btn--block ${!formularioCompleto || enviando ? 'btn--disabled' : ''}`}
            onClick={confirmarPedido}
            disabled={!formularioCompleto || enviando}
          >
            {enviando ? 'Registrando pedido…' : 'Confirmar pedido por WhatsApp'}
          </button>
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
