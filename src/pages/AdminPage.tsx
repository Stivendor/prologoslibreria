import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usandoFirebase } from '../lib/firebase';
import { LoginForm } from '../components/admin/LoginForm';
import { PedidosPanel } from '../components/admin/PedidosPanel';
import { LibrosPanel } from '../components/admin/LibrosPanel';

export function AdminPage() {
  const { usuario, cargando, salir } = useAuth();
  const [pestana, setPestana] = useState<'pedidos' | 'libros'>('pedidos');

  if (!usandoFirebase) {
    return (
      <div className="container section">
        <h1>Panel de administración</h1>
        <p>
          El panel requiere Firebase configurado. Copia <code>.env.example</code> a{' '}
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

  if (!usuario) return <LoginForm />;

  return (
    <div className="container section admin">
      <header className="admin__head">
        <div>
          <h1>Panel de administración</h1>
          <p className="admin__user">{usuario.email}</p>
        </div>
        <button className="btn btn--sec" onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <nav className="admin__tabs" aria-label="Secciones del panel">
        <button
          className={pestana === 'pedidos' ? 'is-active' : ''}
          onClick={() => setPestana('pedidos')}
        >
          Pedidos
        </button>
        <button
          className={pestana === 'libros' ? 'is-active' : ''}
          onClick={() => setPestana('libros')}
        >
          Libros
        </button>
      </nav>

      {pestana === 'pedidos' ? <PedidosPanel /> : <LibrosPanel />}
    </div>
  );
}
