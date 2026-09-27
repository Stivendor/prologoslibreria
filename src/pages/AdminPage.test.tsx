import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { UID_ADMIN } from '../config';
import { useAuth } from '../context/AuthContext';
import { AdminPage } from './AdminPage';

vi.mock('../lib/firebase', () => ({
  usandoFirebase: true,
  db: {},
  auth: null,
  storage: null,
}));

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/admin/ResumenPanel', () => ({
  ResumenPanel: () => <div data-testid="panel-resumen">Resumen</div>,
}));
vi.mock('../components/admin/PedidosPanel', () => ({
  PedidosPanel: () => <div data-testid="panel-pedidos">Pedidos</div>,
}));
vi.mock('../components/admin/LibrosPanel', () => ({
  LibrosPanel: () => <div data-testid="panel-libros">Libros</div>,
}));
vi.mock('../components/admin/UsuariosPanel', () => ({
  UsuariosPanel: () => <div data-testid="panel-usuarios">Usuarios</div>,
}));

function sesion(uid: string | null, email = 'cliente@correo.com') {
  vi.mocked(useAuth).mockReturnValue({
    usuario: uid ? ({ uid, email } as User) : null,
    cargando: false,
    cuentaDesactivada: false,
    entrar: vi.fn(),
    registrarse: vi.fn(),
    restablecerClave: vi.fn(),
    salir: vi.fn(),
  });
}

const pintar = () =>
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );

describe('AdminPage: guards', () => {
  it('espera la primera respuesta de sesión', () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      cargando: true,
      cuentaDesactivada: false,
      entrar: vi.fn(),
      registrarse: vi.fn(),
      restablecerClave: vi.fn(),
      salir: vi.fn(),
    });
    pintar();

    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('sin sesión muestra el login', () => {
    sesion(null);
    pintar();

    expect(screen.getByText('Panel de Prólogos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Secciones del panel' })).not.toBeInTheDocument();
  });

  it('una cuenta de cliente logueada no ve el panel', () => {
    sesion('uid-de-cliente', 'cliente@correo.com');
    pintar();

    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
    expect(screen.getByText(/cliente@correo\.com no tiene acceso/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi cuenta' })).toHaveAttribute('href', '/cuenta');
    expect(screen.queryByRole('navigation', { name: 'Secciones del panel' })).not.toBeInTheDocument();
  });
});

describe('AdminPage: panel del administrador', () => {
  it('muestra las cuatro secciones y arranca en Resumen', () => {
    sesion(UID_ADMIN, 'admin@correo.com');
    pintar();

    expect(screen.getByRole('navigation', { name: 'Secciones del panel' })).toBeInTheDocument();
    for (const seccion of ['Resumen', 'Pedidos', 'Libros', 'Usuarios']) {
      expect(screen.getByRole('button', { name: seccion })).toBeInTheDocument();
    }
    expect(screen.getByTestId('panel-resumen')).toBeInTheDocument();
    expect(screen.getByText('admin@correo.com')).toBeInTheDocument();
  });

  it('cambia de pestaña', async () => {
    const usuario = userEvent.setup();
    sesion(UID_ADMIN);
    pintar();

    await usuario.click(screen.getByRole('button', { name: 'Pedidos' }));

    expect(screen.getByTestId('panel-pedidos')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-resumen')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Resumen' })).not.toHaveAttribute('aria-current');
  });

  it('cierra la sesión desde el panel', async () => {
    const usuario = userEvent.setup();
    const salir = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: UID_ADMIN, email: 'admin@correo.com' } as User,
      cargando: false,
      cuentaDesactivada: false,
      entrar: vi.fn(),
      registrarse: vi.fn(),
      restablecerClave: vi.fn(),
      salir,
    });
    pintar();

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(salir).toHaveBeenCalledTimes(1);
  });
});
