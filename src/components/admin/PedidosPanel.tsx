import { useEffect, useState } from 'react';
import type { EstadoPedido, Pedido } from '../../types';
import { actualizarEstadoPedido, suscribirsePedidos } from '../../data/pedidos';
import { formatearPrecio } from '../../lib/format';
import { urlWhatsAppCliente } from '../../config';

const ESTADOS: EstadoPedido[] = ['nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado'];

const ETIQUETAS: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Transición principal de cada estado (cancelar está siempre disponible).
const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  nuevo: 'confirmado',
  confirmado: 'enviado',
  enviado: 'entregado',
};

function fecha(p: Pedido): string {
  // Defensa en profundidad: solo se invoca toDate() si es realmente un Timestamp.
  return typeof p.creado_en?.toDate === 'function'
    ? p.creado_en.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}

export function PedidosPanel() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<'todos' | EstadoPedido>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Suscripción en vivo: los pedidos nuevos aparecen sin recargar.
  useEffect(() => suscribirsePedidos(setPedidos), []);

  const visibles = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro);

  async function cambiarEstado(pedido: Pedido, estado: EstadoPedido) {
    setError('');
    try {
      await actualizarEstadoPedido(pedido.id, estado);
    } catch {
      setError('No se pudo actualizar el estado del pedido.');
    }
  }

  return (
    <section>
      <div className="admin-filtros">
        <button className={filtro === 'todos' ? 'is-active' : ''} onClick={() => setFiltro('todos')}>
          Todos ({pedidos.length})
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            className={filtro === e ? 'is-active' : ''}
            onClick={() => setFiltro(e)}
          >
            {ETIQUETAS[e]} ({pedidos.filter((p) => p.estado === e).length})
          </button>
        ))}
      </div>

      {error && <p className="field-error">{error}</p>}

      {visibles.length === 0 && (
        <p className="admin-vacio">
          {pedidos.length === 0
            ? 'Aún no hay pedidos. Cuando un cliente confirme su compra aparecerá aquí al instante.'
            : 'No hay pedidos con este estado.'}
        </p>
      )}

      <ul className="pedido-lista">
        {visibles.map((p) => (
          <li key={p.id} className="pedido-card">
            <button
              className="pedido-card__head"
              onClick={() => setAbierto(abierto === p.id ? null : p.id)}
            >
              <span className="pedido-card__numero">{p.numero}</span>
              <span>{p.cliente.nombre}</span>
              <span>{fecha(p)}</span>
              <strong>{formatearPrecio(p.total)}</strong>
              <span className={`estado estado--${p.estado}`}>{ETIQUETAS[p.estado]}</span>
            </button>

            {abierto === p.id && (
              <div className="pedido-card__detalle">
                <ul>
                  {p.items.map((item) => (
                    <li key={item.libro_id}>
                      {item.cantidad} × {item.titulo} — {formatearPrecio(item.precio * item.cantidad)}
                    </li>
                  ))}
                </ul>
                <p>
                  {p.cliente.telefono} · {p.cliente.email}
                  <br />
                  {p.cliente.ciudad} — {p.cliente.direccion}
                </p>
                <div className="pedido-card__acciones">
                  {SIGUIENTE[p.estado] && (
                    <button className="btn" onClick={() => cambiarEstado(p, SIGUIENTE[p.estado]!)}>
                      Marcar {ETIQUETAS[SIGUIENTE[p.estado]!].toLowerCase()}
                    </button>
                  )}
                  {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                    <button className="btn btn--sec" onClick={() => cambiarEstado(p, 'cancelado')}>
                      Cancelar pedido
                    </button>
                  )}
                  <a
                    className="btn btn--sec"
                    href={urlWhatsAppCliente(p.cliente.telefono)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp al cliente
                  </a>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
