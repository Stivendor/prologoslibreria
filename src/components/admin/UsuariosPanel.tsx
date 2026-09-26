import { useEffect, useState } from 'react';
import type { Pedido, Perfil, UsuarioCliente } from '../../types';
import { actualizarPerfilAdmin, cambiarEstadoUsuario, suscribirseUsuarios } from '../../data/usuarios';
import { suscribirsePedidosCliente } from '../../data/pedidos';
import { formatearPrecio, soloDigitos } from '../../lib/format';

// Pestaña Usuarios: listado en vivo de las cuentas de cliente y, al hacer
// clic, detalle con sus datos de envío, su historial de pedidos y el estado
// de la cuenta. La eliminación física de la cuenta de Auth es con
// firebase/usuarios-admin.mjs (el navegador no puede borrar usuarios).

const ETIQUETAS: Record<string, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

function fecha(ts: UsuarioCliente['creado_en']): string {
  return typeof ts?.toDate === 'function'
    ? ts.toDate().toLocaleDateString('es-CO', { dateStyle: 'medium' })
    : '—';
}

export function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState<UsuarioCliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(
    () =>
      suscribirseUsuarios(
        (lista) => {
          setUsuarios(lista);
          setError('');
        },
        () =>
          setError(
            'No se pudieron cargar los usuarios. Verifica que tu usuario tenga permisos de administrador.'
          )
      ),
    []
  );

  const texto = busqueda.trim().toLowerCase();
  const filtrados = texto
    ? usuarios.filter((u) =>
        [u.email, u.nombre, u.telefono].some((v) => (v ?? '').toLowerCase().includes(texto))
      )
    : usuarios;

  const detalle = usuarios.find((u) => u.uid === abierto) ?? null;

  if (usuarios.length === 0) {
    return (
      <div className="admin-vacio">
        {error && <p className="field-error">{error}</p>}
        <p>
          Aún no hay cuentas de cliente. Cuando alguien se registre en la tienda aparecerá aquí al
          instante.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="pedidos__toolbar">
        <p className="pedidos__resumen">
          {usuarios.length} cuenta{usuarios.length === 1 ? '' : 's'}
        </p>
        <input
          className="usuarios__buscador"
          type="search"
          placeholder="Buscar por correo, nombre o teléfono…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar usuarios"
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      {filtrados.length === 0 ? (
        <div className="admin-vacio">
          <p>Ninguna cuenta coincide con «{busqueda}».</p>
        </div>
      ) : (
        <ul className="usuarios__lista">
          {filtrados.map((u) => (
            <li key={u.uid}>
              <button
                type="button"
                className={`usuarios__fila${u.activo === false ? ' is-inactivo' : ''}`}
                onClick={() => setAbierto(u.uid)}
              >
                <span className="usuarios__nombre">
                  <strong>{u.nombre || 'Sin nombre'}</strong>
                  <span className="usuarios__correo">{u.email}</span>
                </span>
                <span className="usuarios__datos">
                  {u.telefono && <span>{u.telefono}</span>}
                  {u.ciudad && <span>{u.ciudad}</span>}
                  <span>Registrado: {fecha(u.creado_en)}</span>
                </span>
                <span
                  className={`usuarios__estado usuarios__estado--${u.activo === false ? 'inactivo' : 'activo'}`}
                >
                  {u.activo === false ? 'Inactiva' : 'Activa'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detalle && (
        <>
          <div className="modal__overlay" onClick={() => setAbierto(null)} aria-hidden="true" />
          <div className="modal" role="dialog" aria-label={`Cuenta de ${detalle.email}`}>
            <DetalleUsuario usuario={detalle} onCerrar={() => setAbierto(null)} />
          </div>
        </>
      )}
    </section>
  );
}

function DetalleUsuario({ usuario, onCerrar }: { usuario: UsuarioCliente; onCerrar: () => void }) {
  const [form, setForm] = useState<Perfil>({
    nombre: usuario.nombre ?? '',
    telefono: usuario.telefono ?? '',
    ciudad: usuario.ciudad ?? '',
    direccion: usuario.direccion ?? '',
  });
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [comandoCopiado, setComandoCopiado] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => suscribirsePedidosCliente(usuario.uid, setPedidos, () => setError('No se pudieron cargar sus pedidos.')),
    [usuario.uid]
  );

  const set =
    (campo: keyof Perfil) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const valor = campo === 'telefono' ? soloDigitos(e.target.value) : e.target.value;
      setForm((f) => ({ ...f, [campo]: valor }));
    };

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await actualizarPerfilAdmin(usuario.uid, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        ciudad: form.ciudad.trim(),
        direccion: form.direccion.trim(),
      });
    } catch {
      setError('No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado() {
    setError('');
    try {
      await cambiarEstadoUsuario(usuario.uid, usuario.activo === false);
    } catch {
      setError('No se pudo cambiar el estado de la cuenta.');
    }
  }

  async function copiarBorrado() {
    const comando = `node firebase/usuarios-admin.mjs borrar ${usuario.uid}`;
    try {
      await navigator.clipboard.writeText(comando);
      setComandoCopiado(true);
    } catch {
      setError(comando);
    }
  }

  const total = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .reduce((n, p) => n + p.total, 0);

  return (
    <>
      <header className="pedido-detalle__head">
        <h2>
          {usuario.nombre || 'Cuenta de cliente'}{' '}
          <span className="pedido-detalle__fecha">{usuario.email}</span>
        </h2>
        <button className="btn btn--sec" onClick={onCerrar}>
          Cerrar
        </button>
      </header>

      <p className="usuarios__uid">
        UID: <code>{usuario.uid}</code> · Registrado: {fecha(usuario.creado_en)} ·{' '}
        {usuario.activo === false ? 'Cuenta inactiva' : 'Cuenta activa'}
      </p>

      {error && <p className="field-error">{error}</p>}

      <form className="admin-form" onSubmit={guardar}>
        <div className="admin-form__row">
          <label>
            Nombre
            <input value={form.nombre} onChange={set('nombre')} maxLength={120} />
          </label>
          <label>
            Teléfono
            <input
              value={form.telefono}
              onChange={set('telefono')}
              inputMode="numeric"
              maxLength={30}
            />
          </label>
        </div>
        <div className="admin-form__row">
          <label>
            Ciudad
            <input value={form.ciudad} onChange={set('ciudad')} maxLength={80} />
          </label>
          <label>
            Dirección
            <input value={form.direccion} onChange={set('direccion')} maxLength={200} />
          </label>
        </div>
        <div className="admin-form__acciones">
          <button type="submit" className={`btn${guardando ? ' btn--disabled' : ''}`} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar datos'}
          </button>
          <button
            type="button"
            className={usuario.activo === false ? 'btn' : 'btn btn--sec'}
            onClick={() => void alternarEstado()}
          >
            {usuario.activo === false ? 'Reactivar cuenta' : 'Desactivar cuenta'}
          </button>
          <button type="button" className="btn btn--sec" onClick={() => void copiarBorrado()}>
            {comandoCopiado ? '¡Comando copiado!' : 'Copiar comando de borrado'}
          </button>
        </div>
        <p className="usuarios__nota">
          Desactivar evita que la cuenta use sus datos; el bloqueo total del login se hace con{' '}
          <code>node firebase/usuarios-admin.mjs bloquear {usuario.uid}</code>. El borrado definitivo
          solo funciona desde tu máquina, no desde el navegador.
        </p>
      </form>

      <h3 className="usuarios__subtitulo">
        Pedidos ({pedidos.length}) · <strong>{formatearPrecio(total)}</strong> sin contar cancelados
      </h3>

      {pedidos.length === 0 ? (
        <p className="usuarios__nota">Esta cuenta aún no ha hecho pedidos.</p>
      ) : (
        <ul className="cuenta__pedidos">
          {pedidos.map((p) => (
            <li key={p.id} className="pedido-card">
              <div className="pedido-card__head">
                <strong>{p.numero}</strong>
                <span className={`pedido-card__estado pedido-card__estado--${p.estado}`}>
                  {ETIQUETAS[p.estado]}
                </span>
              </div>
              <p className="pedido-card__meta">
                {typeof p.creado_en?.toDate === 'function'
                  ? p.creado_en.toDate().toLocaleString('es-CO', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'}{' '}
                · {p.items.length} artículo{p.items.length === 1 ? '' : 's'}
              </p>
              <p className="pedido-card__total">{formatearPrecio(p.total)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
