import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/AuthContext';
import { AdminPage } from './AdminPage';
import { CuentaPage } from './CuentaPage';

// Modo sin backend: las dos páginas deben explicar qué falta en vez de fallar.
vi.mock('../lib/firebase', () => ({
  usandoFirebase: false,
  db: null,
  auth: null,
  storage: null,
}));
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    usuario: null,
    cargando: false,
    cuentaDesactivada: false,
    entrar: vi.fn(),
    registrarse: vi.fn(),
    restablecerClave: vi.fn(),
    salir: vi.fn(),
  });
});

describe('Páginas sin Firebase configurado', () => {
  it('el panel explica cómo configurar el backend', () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/El panel requiere Firebase configurado\./, { selector: 'p' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Secciones del panel' }),
    ).not.toBeInTheDocument();
  });

  it('la cuenta explica que las cuentas requieren backend', () => {
    render(
      <MemoryRouter>
        <CuentaPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Las cuentas requieren Firebase configurado\./, { selector: 'p' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
