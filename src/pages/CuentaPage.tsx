import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeAuthError } from '../lib/erroresAuth';
import { usandoFirebase } from '../lib/firebase';
import { usePerfil } from '../hooks/usePerfil';
import { suscribirsePedidosCliente } from '../data/pedidos';
import { formatearPrecio, soloDigitos } from '../lib/format';
import type { EstadoPedido, Pedido, Perfil } from '../types';

// Cuenta del cliente: acceso (login / registro / recuperar clave) y, con
// sesión, el formulario de datos de envío junto a su historial de pedidos.

type Modo = 'entrar' | 'registrarse' | 'restablecer';

const ETIQUETAS: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const PERFIL_INICIAL: Perfil = { nombre: '', telefono: '', ciudad: '', direccion: '' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fechaPedido(p: Pedido): string {
  return typeof p.creado_en?.toDate === 'function'
    ? p.creado_en.toDate().toLocaleDateString('es-CO', { dateStyle: 'medium' })
    : '—';
}

export function CuentaPage() {
  const { usuario, cargando, cuentaDesactivada, entrar, registrarse, restablecerClave, salir } =
    useAuth();

  if (!usandoFirebase) {
    return (
      <div className="container section">
        <h1>Mi cuenta</h1>
        <p>
          Las cuentas requieren Firebase configurado. Copia <code>.env.example</code> a{' '}
          <code>.env</code> y completa las variables <code>VITE_FIREBASE_*</code>.
        </p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="container section">
        <p>Cargando…</p>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="container section cuenta">
        {cuentaDesactivada && (
          <div className="notice">
            Tu cuenta fue desactivada. Si crees que es un error, escríbenos por WhatsApp.
          </div>
        )}
        <FormAcceso entrar={entrar} registrarse={registrarse} restablecerClave={restablecerClave} />
      </div>
    );
  }

  return (
    <div className="container section cuenta">
      <header className="cuenta__head">
        <div>
          <h1>Mi cuenta</h1>
          <p className="cuenta__email">{usuario.email}</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <div className="cuenta__grid">
        <PerfilPanel uid={usuario.uid} />
        <MisPedidos uid={usuario.uid} />
      </div>
    </div>
  );
}

function FormAcceso({
  entrar,
  registrarse,
  restablecerClave,
}: {
  entrar: (correo: string, clave: string) => Promise<void>;
  registrarse: (correo: string, clave: string) => Promise<void>;
  restablecerClave: (correo: string) => Promise<void>;
}) {
  const [modo, setModo] = useState<Modo>('entrar');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const emailValido = EMAIL_RE.test(correo);
  const listo =
    emailValido && (modo === 'restablecer' || (clave.length >= 6 && clave.length <= 72));

  async function manejar(e: React.FormEvent) {
    e.preventDefault();
    if (!listo || enviando) return;
    setError('');
    setAviso('');
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(correo, clave);
      } else if (modo === 'registrarse') {
        await registrarse(correo, clave);
      } else {
        await restablecerClave(correo);
        setAviso('Si el correo existe, te enviamos un enlace para crear una contraseña nueva.');
        setModo('entrar');
      }
    } catch (err) {
      console.error('Error de autenticación', err);
      setError(mensajeAuthError(err));
    } finally {
      setEnviando(false);
    }
  }

  const titulos: Record<Modo, string> = {
    entrar: 'Iniciar sesión',
    registrarse: 'Crear cuenta',
    restablecer: 'Recuperar contraseña',
  };

  return (
    <form className="admin-login__card cuenta__card" onSubmit={manejar}>
      <img src="/logo.svg" alt="" width={48} height={48} />
      <h1>{titulos[modo]}</h1>
      <p className="admin-login__sub">
        {modo === 'entrar'
          ? 'Guarda tus datos de envío y sigue tus pedidos.'
          : modo === 'registrarse'
            ? 'Crea tu cuenta en un minuto.'
            : 'Te enviamos un correo para restablecerla.'}
      </p>

      <label>
        Correo electrónico
        <input
          type="email"
          autoComplete="username"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          maxLength={120}
          required
        />
      </label>

      {modo !== 'restablecer' && (
        <label>
          Contraseña
          <input
            type="password"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            minLength={6}
            maxLength={72}
            required
          />
          {modo === 'registrarse' && <span className="cuenta__hint">Mínimo 6 caracteres.</span>}
        </label>
      )}

      {error && <p className="field-error">{error}</p>}
      {aviso && <div className="notice">{aviso}</div>}

      <button type="submit" className="btn btn--block" disabled={!listo || enviando}>
        {enviando
          ? 'Un momento…'
          : modo === 'entrar'
            ? 'Entrar'
            : modo === 'registrarse'
              ? 'Crear cuenta'
              : 'Enviar enlace'}
      </button>

      {modo !== 'restablecer' && (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => {
            setModo(modo === 'entrar' ? 'registrarse' : 'entrar');
            setError('');
          }}
        >
          {modo === 'entrar' ? '¿No tienes cuenta? Crear cuenta' : '¿Ya tienes cuenta? Entrar'}
        </button>
      )}

      {modo === 'entrar' && (
        <button
          type="button"
          className="cuenta__link"
          onClick={() => {
            setModo('restablecer');
            setError('');
          }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      )}

      {modo === 'restablecer' && (
        <button
          type="button"
          className="cuenta__link"
          onClick={() => {
            setModo('entrar');
            setError('');
          }}
        >
          Volver a iniciar sesión
        </button>
      )}
    </form>
  );
}

function PerfilPanel({ uid }: { uid: string }) {
  const { perfil, cargando, guardando, error, guardar } = usePerfil(uid);
  const [form, setForm] = useState<Perfil>(PERFIL_INICIAL);
  const [guardado, setGuardado] = useState(false);
  // Si el cliente ya está escribiendo, la llegada del snapshot (su propia
  // guardada o una corrección del admin) no debe pisarle lo que teclea.
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (perfil && !tocado) setForm(perfil);
  }, [perfil, tocado]);

  const set =
    (campo: keyof Perfil) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setGuardado(false);
      setTocado(true);
      const valor = campo === 'telefono' ? soloDigitos(e.target.value) : e.target.value;
      setForm((f) => ({ ...f, [campo]: valor }));
    };

  const completo = form.nombre.trim() && form.telefono.trim() && form.ciudad.trim() && form.direccion.trim();

  async function manejar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await guardar({
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      ciudad: form.ciudad.trim(),
      direccion: form.direccion.trim(),
    });
    setGuardado(ok);
    if (ok) setTocado(false);
  }

  return (
    <section className="cuenta__panel">
      <h2>Datos de envío</h2>
      <p className="cuenta__sub">
        Los usamos para llenar el checkout automáticamente. Solo tú (y el equipo de Prólogos) los
        ves.
      </p>

      {cargando ? (
        <p>Cargando…</p>
      ) : (
        <form className="cuenta__form" onSubmit={manejar}>
          <label>
            Nombre completo
            <input value={form.nombre} onChange={set('nombre')} maxLength={120} required />
          </label>
          <label>
            Teléfono / WhatsApp
            <input
              value={form.telefono}
              onChange={set('telefono')}
              inputMode="numeric"
              autoComplete="tel"
              maxLength={30}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Ciudad
              <input value={form.ciudad} onChange={set('ciudad')} maxLength={80} required />
            </label>
            <label>
              Dirección
              <input value={form.direccion} onChange={set('direccion')} maxLength={200} required />
            </label>
          </div>

          {error && <p className="field-error">{error}</p>}
          {guardado && <div className="notice">Tus datos quedaron guardados.</div>}

          <button
            type="submit"
            className={`btn ${!completo || guardando ? 'btn--disabled' : ''}`}
            disabled={!completo || guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}
    </section>
  );
}

function MisPedidos({ uid }: { uid: string }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [error, setError] = useState('');

  useEffect(
    () =>
      suscribirsePedidosCliente(
        uid,
        (lista) => {
          setPedidos(lista);
          setError('');
        },
        () => setError('No se pudieron cargar tus pedidos.')
      ),
    [uid]
  );

  return (
    <section className="cuenta__panel">
      <h2>Mis pedidos</h2>

      {error && <p className="field-error">{error}</p>}

      {pedidos.length === 0 && !error ? (
        <p className="cuenta__sub">
          Aún no tienes pedidos. <Link to="/">Explora el catálogo</Link> cuando quieras.
        </p>
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
                {fechaPedido(p)} · {p.items.length} artículo{p.items.length === 1 ? '' : 's'}
              </p>
              <ul className="pedido-card__items">
                {p.items.map((i) => (
                  <li key={i.libro_id}>
                    {i.cantidad} × {i.titulo}
                  </li>
                ))}
              </ul>
              <p className="pedido-card__total">{formatearPrecio(p.total)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
