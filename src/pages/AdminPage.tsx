import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usandoFirebase } from '../lib/firebase';
import { LoginForm } from '../components/admin/LoginForm';
import { ResumenPanel } from '../components/admin/ResumenPanel';
import { PedidosPanel } from '../components/admin/PedidosPanel';
import { LibrosPanel } from '../components/admin/LibrosPanel';
import { LeadsInbox } from '../components/admin/LeadsInbox';

type Pestana = 'resumen' | 'pedidos' | 'leads' | 'libros';

const NAV: { id: Pestana; label: string; icono: React.ReactNode }[] = [
  {
    id: 'resumen',
    label: 'Resumen',
    icono: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    icono: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: 'leads',
    label: 'Leads',
    icono: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      </svg>
    ),
  },
  {
    id: 'libros',
    label: 'Libros',
    icono: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
];

export function AdminPage() {
  const { usuario, cargando, salir } = useAuth();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [menuAbierto, setMenuAbierto] = useState(false);

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

  const seleccionar = (id: Pestana) => {
    setPestana(id);
    setMenuAbierto(false);
  };

  const tituloActual = NAV.find((n) => n.id === pestana)?.label ?? '';

  return (
    <div className="admin">
      <aside className={`admin__sidebar${menuAbierto ? ' is-open' : ''}`}>
        <div className="admin__brand">
          <span className="admin__brand-name">Prólogos</span>
          <span className="admin__brand-tag">Panel admin</span>
        </div>

        <nav className="admin__nav" aria-label="Secciones del panel">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`admin__nav-item${pestana === item.id ? ' is-active' : ''}`}
              onClick={() => seleccionar(item.id)}
              aria-current={pestana === item.id ? 'page' : undefined}
            >
              {item.icono}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin__sidebar-foot">
          <p className="admin__user">{usuario.email}</p>
          <button className="btn btn--sec" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuAbierto && (
        <div
          className="admin__overlay"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <div className="admin__main">
        <header className="admin__topbar">
          <button
            className="admin__burger"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="admin__title">{tituloActual}</h1>
        </header>

        <div className="admin__content">
          {pestana === 'resumen' && <ResumenPanel />}
          {pestana === 'pedidos' && <PedidosPanel />}
          {pestana === 'leads' && <LeadsInbox />}
          {pestana === 'libros' && <LibrosPanel />}
        </div>
      </div>
    </div>
  );
}
