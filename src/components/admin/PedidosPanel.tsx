import { useEffect, useState } from 'react';
import type { EstadoPedido, Pedido } from '../../types';
import { actualizarEstadoPedido, suscribirsePedidos } from '../../data/pedidos';
import { formatearPrecio } from '../../lib/format';
import { urlWhatsAppCliente } from '../../config';
import { PedidoForm } from './PedidoForm';

// Tablero Kanban de pedidos: una columna por estado, drag-and-drop nativo
// entre columnas con <select> como fallback accesible (mismo patrón que el
// Kanban de leads). Clic en la tarjeta expande el detalle del pedido.

const COLUMNAS: { id: EstadoPedido; titulo: string }[] = [
  { id: 'nuevo', titulo: 'Nuevos' },
  { id: 'confirmado', titulo: 'Confirmados' },
  { id: 'enviado', titulo: 'Enviados' },
  { id: 'entregado', titulo: 'Entregados' },
  { id: 'cancelado', titulo: 'Cancelados' },
];

const ETIQUETAS: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

function fecha(p: Pedido): string {
  // Defensa en profundidad: solo se invoca toDate() si es realmente un Timestamp.
  return typeof p.creado_en?.toDate === 'function'
    ? p.creado_en.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}

export function PedidosPanel() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [sobreColumna, setSobreColumna] = useState<EstadoPedido | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  // Suscripción en vivo: los pedidos nuevos aparecen sin recargar.
  useEffect(() => suscribirsePedidos(setPedidos), []);

  async function cambiarEstado(pedido: Pedido, estado: EstadoPedido) {
    if (pedido.estado === estado) return;
    setError('');
    try {
      await actualizarEstadoPedido(pedido.id, estado);
    } catch {
      setError('No se pudo actualizar el estado del pedido.');
    }
  }

  function alSoltar(e: React.DragEvent, estado: EstadoPedido) {
    e.preventDefault();
    setSobreColumna(null);
    const id = e.dataTransfer.getData('text/plain');
    const pedido = pedidos.find((p) => p.id === id);
    if (pedido) void cambiarEstado(pedido, estado);
  }

  const modal = creando && (
    <>
      <div className="modal__overlay" onClick={() => setCreando(false)} aria-hidden="true" />
      <div className="modal" role="dialog" aria-label="Nuevo pedido manual">
        <PedidoForm alTerminar={() => setCreando(false)} alCancelar={() => setCreando(false)} />
      </div>
    </>
  );

  if (pedidos.length === 0) {
    return (
      <div className="admin-vacio">
        <p>
          Aún no hay pedidos. Cuando un cliente confirme su compra aparecerá aquí al
          instante.
        </p>
        <button className="btn" onClick={() => setCreando(true)}>
          + Nuevo pedido manual
        </button>
        {modal}
      </div>
    );
  }

  const pedidoAbierto = pedidos.find((p) => p.id === abierto) ?? null;
  const totalActivo = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .reduce((n, p) => n + p.total, 0);

  return (
    <section>
      <div className="pedidos__toolbar">
        <p className="pedidos__resumen">
          {pedidos.length} pedido{pedidos.length === 1 ? '' : 's'} ·{' '}
          <strong>{formatearPrecio(totalActivo)}</strong> sin contar cancelados
        </p>
        <button className="btn" onClick={() => setCreando(true)}>
          + Nuevo pedido
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="kanban">
        {COLUMNAS.map((col) => {
          const delEstado = pedidos.filter((p) => p.estado === col.id);
          return (
            <section
              key={col.id}
              className={`kanban__col kanban__col--${col.id}${sobreColumna === col.id ? ' is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setSobreColumna(col.id);
              }}
              onDragLeave={() => setSobreColumna(null)}
              onDrop={(e) => alSoltar(e, col.id)}
            >
              <header className="kanban__col-head">
                <h3>{col.titulo}</h3>
                <span className="kanban__count">{delEstado.length}</span>
              </header>
              <p className="kanban__col-total">
                {formatearPrecio(delEstado.reduce((n, p) => n + p.total, 0))}
              </p>
              <div className="kanban__cards">
                {delEstado.map((p) => (
                  <article
                    key={p.id}
                    className="kanban__card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                    onClick={() => setAbierto(p.id)}
                  >
                    <div className="kanban__card-top">
                      <strong>{p.numero}</strong>
                      <span>{formatearPrecio(p.total)}</span>
                    </div>
                    <p className="kanban__tel">{p.cliente.nombre}</p>
                    <p className="kanban__ultimo">
                      {p.items.reduce((n, it) => n + it.cantidad, 0)} libro(s) · {fecha(p)}
                    </p>

                    <div className="kanban__card-foot">
                      <select
                        value={p.estado}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => void cambiarEstado(p, e.target.value as EstadoPedido)}
                        aria-label={`Estado del pedido ${p.numero}`}
                      >
                        {COLUMNAS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {ETIQUETAS[c.id]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {pedidoAbierto && (
        <>
          <div className="modal__overlay" onClick={() => setAbierto(null)} aria-hidden="true" />
          <div className="modal" role="dialog" aria-label={`Pedido ${pedidoAbierto.numero}`}>
            <div className="pedido-detalle__head">
              <h2>
                {pedidoAbierto.numero}{' '}
                <span className="pedido-detalle__fecha">{fecha(pedidoAbierto)}</span>
              </h2>
              <select
                value={pedidoAbierto.estado}
                onChange={(e) =>
                  void cambiarEstado(pedidoAbierto, e.target.value as EstadoPedido)
                }
                aria-label="Estado del pedido"
              >
                {COLUMNAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {ETIQUETAS[c.id]}
                  </option>
                ))}
              </select>
            </div>

            <ul className="pedido-detalle__items">
              {pedidoAbierto.items.map((item) => (
                <li key={item.libro_id}>
                  {item.cantidad} × {item.titulo} —{' '}
                  {formatearPrecio(item.precio * item.cantidad)}
                </li>
              ))}
            </ul>
            <p className="pedido-form__total">
              Total: <strong>{formatearPrecio(pedidoAbierto.total)}</strong>
            </p>

            <p className="pedido-detalle__cliente">
              <strong>{pedidoAbierto.cliente.nombre}</strong>
              <br />
              {pedidoAbierto.cliente.telefono}
              {pedidoAbierto.cliente.email && <> · {pedidoAbierto.cliente.email}</>}
              <br />
              {pedidoAbierto.cliente.ciudad}
              {pedidoAbierto.cliente.direccion && <> — {pedidoAbierto.cliente.direccion}</>}
            </p>

            <div className="admin-form__acciones">
              <a
                className="btn"
                href={urlWhatsAppCliente(pedidoAbierto.cliente.telefono)}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp al cliente
              </a>
              <button className="btn btn--sec" onClick={() => setAbierto(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {modal}
    </section>
  );
}
