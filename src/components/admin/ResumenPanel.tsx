import { useEffect, useState } from 'react';
import type { Pedido } from '../../types';
import { suscribirsePedidos } from '../../data/pedidos';
import { formatearPrecio } from '../../lib/format';

// Estadísticas calculadas en el cliente sobre la misma suscripción de pedidos
// del panel. ponytail: con miles de pedidos convendría agregar contadores en
// backend; a la escala actual recalcular aquí es instantáneo.

function esDelMes(p: Pedido, ahora: Date): boolean {
  // Solo cuenta pedidos con timestamp real (serverTimestamp ya resuelto).
  if (typeof p.creado_en?.toDate !== 'function') return false;
  const f = p.creado_en.toDate();
  return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
}

export function ResumenPanel() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => suscribirsePedidos(setPedidos), []);

  const ahora = new Date();
  // Los cancelados no cuentan como venta en ninguna métrica.
  const validos = pedidos.filter((p) => p.estado !== 'cancelado');
  const nuevos = pedidos.filter((p) => p.estado === 'nuevo').length;
  const delMes = validos.filter((p) => esDelMes(p, ahora));
  const ingresosMes = delMes.reduce((acc, p) => acc + p.total, 0);
  const ticketPromedio = validos.length
    ? Math.round(validos.reduce((acc, p) => acc + p.total, 0) / validos.length)
    : 0;

  const ventasPorLibro = new Map<
    string,
    { id: string; titulo: string; unidades: number; ingresos: number }
  >();
  for (const p of validos) {
    for (const item of p.items) {
      const acumulado = ventasPorLibro.get(item.libro_id) ?? {
        id: item.libro_id,
        titulo: item.titulo,
        unidades: 0,
        ingresos: 0,
      };
      acumulado.unidades += item.cantidad;
      acumulado.ingresos += item.precio * item.cantidad;
      ventasPorLibro.set(item.libro_id, acumulado);
    }
  }
  const topLibros = [...ventasPorLibro.values()]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5);

  if (pedidos.length === 0) {
    return (
      <p className="admin-vacio">
        Aún no hay pedidos: las estadísticas aparecerán con la primera venta.
      </p>
    );
  }

  return (
    <section>
      <div className="stats-grid">
        <div className="stat">
          <p className="stat__label">Pedidos nuevos</p>
          <p className="stat__value">{nuevos}</p>
          <p className="stat__hint">por atender</p>
        </div>
        <div className="stat">
          <p className="stat__label">Ingresos del mes</p>
          <p className="stat__value">{formatearPrecio(ingresosMes)}</p>
          <p className="stat__hint">
            {delMes.length} {delMes.length === 1 ? 'pedido' : 'pedidos'} este mes
          </p>
        </div>
        <div className="stat">
          <p className="stat__label">Ticket promedio</p>
          <p className="stat__value">{formatearPrecio(ticketPromedio)}</p>
          <p className="stat__hint">histórico, sin cancelados</p>
        </div>
        <div className="stat">
          <p className="stat__label">Pedidos totales</p>
          <p className="stat__value">{validos.length}</p>
          <p className="stat__hint">sin cancelados</p>
        </div>
      </div>

      <h2 className="stats-titulo">Libros más vendidos</h2>
      <ol className="top-libros">
        {topLibros.map((libro, i) => (
          <li key={libro.id}>
            <span className="top-libros__pos">{i + 1}</span>
            <span className="top-libros__titulo">{libro.titulo}</span>
            <span className="top-libros__datos">
              {libro.unidades} {libro.unidades === 1 ? 'ud.' : 'uds.'} ·{' '}
              {formatearPrecio(libro.ingresos)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
