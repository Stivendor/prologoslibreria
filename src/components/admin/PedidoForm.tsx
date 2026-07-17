import { useEffect, useMemo, useState } from 'react';
import type { Libro, PedidoItem } from '../../types';
import { obtenerLibros } from '../../data/catalogo';
import { crearPedido } from '../../data/pedidos';
import { formatearPrecio } from '../../lib/format';

// Alta manual de pedidos desde el panel (ventas cerradas por WhatsApp u otro
// canal). Reusa crearPedido del checkout: mismo esquema, mismas reglas de
// Firestore (máx. 20 ítems, 1-10 unidades por libro).

interface Fila {
  libro_id: string;
  cantidad: number;
}

export function PedidoForm({
  alTerminar,
  alCancelar,
}: {
  alTerminar: () => void;
  alCancelar: () => void;
}) {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [filas, setFilas] = useState<Fila[]>([{ libro_id: '', cantidad: 1 }]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerLibros().then(setLibros).catch(() => setError('No se pudo cargar el catálogo.'));
  }, []);

  const porId = useMemo(() => new Map(libros.map((l) => [l.id, l])), [libros]);

  const items: PedidoItem[] = filas
    .filter((f) => f.libro_id && porId.has(f.libro_id))
    .map((f) => {
      const libro = porId.get(f.libro_id)!;
      return {
        libro_id: libro.id,
        titulo: libro.titulo,
        precio: libro.precio,
        cantidad: f.cantidad,
      };
    });

  const total = items.reduce((n, it) => n + it.precio * it.cantidad, 0);

  function cambiarFila(i: number, cambio: Partial<Fila>) {
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (items.length === 0) {
      setError('Agrega al menos un libro al pedido.');
      return;
    }
    setGuardando(true);
    try {
      const numero = await crearPedido({
        items,
        total,
        cliente: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          ciudad: ciudad.trim(),
          direccion: direccion.trim(),
        },
      });
      if (!numero) throw new Error('sin firebase');
      alTerminar();
    } catch {
      setError('No se pudo crear el pedido.');
      setGuardando(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={enviar}>
      <h2>Nuevo pedido manual</h2>

      <h3 className="inbox__seccion">Cliente</h3>
      <div className="admin-form__row">
        <label>
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={120} />
        </label>
        <label>
          Teléfono *
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required maxLength={30} />
        </label>
      </div>
      <div className="admin-form__row">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
        </label>
        <label>
          Ciudad
          <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} maxLength={80} />
        </label>
      </div>
      <label>
        Dirección
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} />
      </label>

      <h3 className="inbox__seccion">Libros</h3>
      {filas.map((fila, i) => (
        <div className="admin-form__row pedido-form__fila" key={i}>
          <label>
            Libro
            <select
              value={fila.libro_id}
              onChange={(e) => cambiarFila(i, { libro_id: e.target.value })}
            >
              <option value="">— Elegir —</option>
              {libros.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.titulo} — {formatearPrecio(l.precio)}
                </option>
              ))}
            </select>
          </label>
          <label className="pedido-form__cantidad">
            Cantidad
            <input
              type="number"
              min={1}
              max={10}
              value={fila.cantidad}
              onChange={(e) =>
                cambiarFila(i, {
                  cantidad: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                })
              }
            />
          </label>
          {filas.length > 1 && (
            <button
              type="button"
              className="btn btn--sec pedido-form__quitar"
              onClick={() => setFilas(filas.filter((_, j) => j !== i))}
              aria-label="Quitar libro"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {filas.length < 20 && (
        <button
          type="button"
          className="btn btn--sec"
          onClick={() => setFilas([...filas, { libro_id: '', cantidad: 1 }])}
        >
          + Agregar otro libro
        </button>
      )}

      <p className="pedido-form__total">
        Total: <strong>{formatearPrecio(total)}</strong>
      </p>

      {error && <p className="field-error">{error}</p>}

      <div className="admin-form__acciones">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear pedido'}
        </button>
        <button className="btn btn--sec" type="button" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
