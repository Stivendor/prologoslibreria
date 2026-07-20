import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatearPrecio } from '../lib/format';
import { urlWhatsApp } from '../config';
import { crearPedido } from '../data/pedidos';

// Checkout en un modal <dialog> nativo (backdrop, Esc y foco atrapado sin
// dependencias). Se abre desde el carrito en vez de navegar a otra página.
// El pago en línea (Wompi/ePayco) y el correo de confirmación (Resend) se
// integran en la fase 5; mientras tanto el formulario recoge los datos y
// permite confirmar el pedido por WhatsApp sin perder ventas.
export function CheckoutModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
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

  // Sincroniza el atributo open del <dialog> con el estado de React.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    else if (!abierto && d.open) d.close();
  }, [abierto]);

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
    // Sin el honeypot `website`: las rules de Firestore exigen que `cliente`
    // tenga solo las claves esperadas (hasOnly), o rechazan el create.
    const { website: _honeypot, ...cliente } = datos;
    try {
      numero = await crearPedido({
        items: items.map((i) => ({
          libro_id: i.libro.id,
          titulo: i.libro.titulo,
          precio: i.libro.precio,
          cantidad: i.cantidad,
        })),
        total: totalPrecio,
        cliente,
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
    <dialog
      ref={dialogo}
      className="checkout-modal"
      onCancel={onCerrar}
      onClick={(e) => {
        // Clic en el backdrop (el propio <dialog>, no su contenido) cierra.
        if (e.target === dialogo.current) onCerrar();
      }}
    >
      {numeroEnviado !== null ? (
        <div className="checkout-modal__body empty-state">
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
          <Link to="/catalogo" className="btn btn--ghost btn--lg" onClick={onCerrar}>
            Seguir explorando
          </Link>
        </div>
      ) : (
        <>
          <header className="checkout-modal__head">
            <h1>Finalizar compra</h1>
            <button
              type="button"
              className="checkout-modal__close"
              onClick={onCerrar}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>

          <div className="checkout-modal__body">
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
        </>
      )}
    </dialog>
  );
}
