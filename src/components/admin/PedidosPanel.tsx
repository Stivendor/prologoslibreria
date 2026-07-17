import { useEffect, useState } from 'react';
import type { EstadoPedido, Pedido } from '../../types';
import { actualizarEstadoPedido, suscribirsePedidos } from '../../data/pedidos';
import { formatearPrecio } from '../../lib/format';
import { urlWhatsAppCliente } from '../../config';

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

  if (pedidos.length === 0) {
    return (
      <p className="admin-vacio">
        Aún no hay pedidos. Cuando un cliente confirme su compra aparecerá aquí al
        instante.
      </p>
    );
  }

  return (
    <section>
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
              <div className="kanban__cards">
                {delEstado.map((p) => (
                  <article
                    key={p.id}
                    className="kanban__card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                    onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                  >
                    <div className="kanban__card-top">
                      <strong>{p.numero}</strong>
                      <span>{formatearPrecio(p.total)}</span>
                    </div>
                    <p className="kanban__tel">{p.cliente.nombre}</p>
                    <p className="kanban__ultimo">
                      {p.items.reduce((n, it) => n + it.cantidad, 0)} libro(s) · {fecha(p)}
                    </p>

                    {abierto === p.id && (
                      <div className="kanban__detalle" onClick={(e) => e.stopPropagation()}>
                        <ul>
                          {p.items.map((item) => (
                            <li key={item.libro_id}>
                              {item.cantidad} × {item.titulo} —{' '}
                              {formatearPrecio(item.precio * item.cantidad)}
                            </li>
                          ))}
                        </ul>
                        <p>
                          {p.cliente.telefono} · {p.cliente.email}
                          <br />
                          {p.cliente.ciudad} — {p.cliente.direccion}
                        </p>
                        <a
                          className="btn btn--sec"
                          href={urlWhatsAppCliente(p.cliente.telefono)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp al cliente
                        </a>
                      </div>
                    )}

                    <div className="kanban__card-foot">
                      <span>{abierto === p.id ? 'Cerrar' : 'Ver detalle'}</span>
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
    </section>
  );
}
